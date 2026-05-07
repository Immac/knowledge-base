// Knowledge Base - Storage Layer

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
  unlinkSync,
  copyFileSync,
  mkdirSync,
  renameSync,
  rmSync,
} from 'fs';
import { basename, join, resolve } from 'path';
import {
  parseFrontmatter,
  parseFrontmatterMeta,
  parseBlockFile,
  parseBlockReferences,
  resolveBlockReferencesInline,
  serializeArticle,
  serializeBlock,
  generateSlug,
  type BlockReference,
} from './parser.js';
import { dedupeTagRelationships, dedupeValueTags, semanticTagsForArticle } from './tag-graph.js';
import {
  resolveDataPath,
  ensureDataPath,
  getKnowledgeBasePaths,
  getArticlesPath,
  getArticleFolderPath,
  getArticleMainPath,
  getArticleBlockPath,
} from './config.js';
import type {
  Article,
  ArticleBlock,
  CreateOptions,
  EditOptions,
  KnowledgeBaseConfig,
  FileKind,
  FileListResult,
  FileScope,
  FileUploadOptions,
  FileUploadResult,
  FileSearchOptions,
  FileSearchResult,
  FileMoveOptions,
  FileMoveResult,
  FileDeleteResult,
  FileAttachmentOptions,
  FileAttachmentResult,
  ManagedFile,
  ManagedFileMeta,
  ValueTag,
} from './types.js';

// ── Path resolution ─────────────────────────────────────────────

const ARTICLE_MAIN = 'ARTICLE.md';

export function getKnowledgeBaseConfig(preferLocal: boolean = false): KnowledgeBaseConfig {
  const dataPath = resolveDataPath(preferLocal);
  return {
    dataPath,
    isLocal: preferLocal,
  };
}

export function getGlobalKnowledgeBaseConfig(): KnowledgeBaseConfig {
  const { globalDataPath } = getKnowledgeBasePaths();
  return {
    dataPath: globalDataPath,
    isLocal: false,
  };
}

export function getLocalKnowledgeBaseConfig(): KnowledgeBaseConfig {
  const { localDataPath } = getKnowledgeBasePaths();
  return {
    dataPath: localDataPath,
    isLocal: true,
  };
}

export function ensureDataFolder(config: KnowledgeBaseConfig): void {
  ensureDataPath(config.dataPath);
  // Ensure articles subfolder exists
  ensureDataPath(getArticlesPath(config.dataPath));
}

// ── Flat-file → folder migration ───────────────────────────────

/** Check if legacy flat .md files exist at the root dataPath */
export function hasLegacyFlatArticles(config: KnowledgeBaseConfig): boolean {
  if (!existsSync(config.dataPath)) return false;
  const entries = readdirSync(config.dataPath);
  return entries.some((e) => e.endsWith('.md') && !e.startsWith('.'));
}

/** Migrate all legacy flat .md files into articles/{slug}/ARTICLE.md folders.
 *  Returns list of migrated slugs. */
export function migrateLegacyArticles(config: KnowledgeBaseConfig): readonly string[] {
  if (!existsSync(config.dataPath)) return [];

  const entries = readdirSync(config.dataPath);
  const migrated: string[] = [];

  for (const entry of entries) {
    if (entry === 'search-index.json' || entry.startsWith('.') || !entry.endsWith('.md')) continue;

    const filePath = join(config.dataPath, entry);
    if (!statSync(filePath).isFile()) continue;

    const slug = entry.replace(/\.md$/, '');
    const articleFolder = getArticleFolderPath(config.dataPath, slug);

    if (existsSync(articleFolder)) continue; // already migrated

    mkdirSync(articleFolder, { recursive: true });
    const destPath = join(articleFolder, ARTICLE_MAIN);
    copyFileSync(filePath, destPath);
    unlinkSync(filePath);
    migrated.push(slug);
  }

  return migrated;
}

// ── Article CRUD ────────────────────────────────────────────────

function isMarkdownFile(fileName: string): boolean {
  return fileName.endsWith('.md');
}

/** Resolve block references for an article. Returns block list and optionally inlined content. */
function resolveBlocks(
  slug: string,
  rawContent: string,
  dataPath: string,
  inline: boolean
): { blocks: readonly ArticleBlock[]; content: string } {
  const articleFolder = getArticleFolderPath(dataPath, slug);

  // Load block content given a slug and block name
  const loadBlockContent = (blockSlug: string, blockName: string): string | null => {
    const blockPath = getArticleBlockPath(dataPath, blockSlug, blockName);
    if (!existsSync(blockPath)) return null;
    try {
      const blockRaw = readFileSync(blockPath, 'utf-8');
      return parseBlockFile(blockRaw, blockPath, blockName).content;
    } catch {
      return null;
    }
  };

  // Resolver: receives ref + defaultSlug from parser; for same-article refs defaultSlug is set
  const resolver = (ref: BlockReference, defaultSlug: string): string | null => {
    const effectiveSlug = ref.crossArticle ? ref.slug : defaultSlug;
    if (!effectiveSlug) return null;
    return loadBlockContent(effectiveSlug, ref.name);
  };

  // Parse all block references to build the block list
  const refs = parseBlockReferences(rawContent);
  const blockSet = new Set<string>();
  const blocks: ArticleBlock[] = [];

  for (const ref of refs) {
    const effectiveSlug = ref.crossArticle ? ref.slug : slug;
    const blockPath = getArticleBlockPath(dataPath, effectiveSlug, ref.name);
    if (!existsSync(blockPath)) continue;

    const key = `${effectiveSlug}/${ref.name}`;
    if (blockSet.has(key)) continue;
    blockSet.add(key);

    try {
      const blockRaw = readFileSync(blockPath, 'utf-8');
      const block = parseBlockFile(blockRaw, blockPath, ref.name);
      blocks.push(block);
    } catch {
      // skip unreadable blocks
    }
  }

  // Discover orphan blocks (not referenced in content but present in folder)
  // These are still included but won't affect inline content
  if (existsSync(articleFolder)) {
    const folderEntries = readdirSync(articleFolder);
    for (const entry of folderEntries) {
      if (entry === ARTICLE_MAIN || !isMarkdownFile(entry)) continue;
      const name = entry.replace(/\.md$/, '');
      const key = `${slug}/${name}`;
      if (blockSet.has(key)) continue;
      blockSet.add(key);

      try {
        const blockPath = join(articleFolder, entry);
        const blockRaw = readFileSync(blockPath, 'utf-8');
        const block = parseBlockFile(blockRaw, blockPath, name);
        blocks.push(block);
      } catch {
        // skip
      }
    }
  }

  let content: string;
  if (inline) {
    // Resolve references inline, replacing !block: with actual content
    content = resolveBlockReferencesInline(rawContent, slug, (ref, defaultSlug) => {
      const effectiveSlug = ref.crossArticle ? ref.slug : defaultSlug;
      if (!effectiveSlug) return null;
      return loadBlockContent(effectiveSlug, ref.name);
    });
  } else {
    content = rawContent;
  }

  return { blocks, content };
}

/** Read article — resolves blocks inline by default.
 *  If structured=true, rawContent contains the !block: references and blocks are separate. */
export function readArticle(
  slug: string,
  config: KnowledgeBaseConfig,
  options?: { structured?: boolean }
): Article | null {
  const { structured = false } = options ?? {};

  // 1. Try folder-based path
  const articlePath = getArticleMainPath(config.dataPath, slug);
  if (existsSync(articlePath)) {
    const rawContent = readFileSync(articlePath, 'utf-8');
    const meta = parseFrontmatter(rawContent, articlePath);

    const { blocks, content } = resolveBlocks(
      slug,
      meta.content,  // content without frontmatter
      config.dataPath,
      !structured  // inline if not structured
    );

    return {
      ...meta,
      rawContent: meta.content,  // the pre-resolved content
      content,                    // inline-resolved (default) or raw (structured)
      blocks,
      isFolder: true,
    };
  }

  // 2. Fallback to legacy flat file
  const flatPath = join(config.dataPath, `${slug}.md`);
  if (existsSync(flatPath)) {
    const rawContent = readFileSync(flatPath, 'utf-8');
    const meta = parseFrontmatter(rawContent, flatPath);
    return {
      ...meta,
      rawContent: meta.content,
      content: meta.content,
      blocks: [],
      isFolder: false,
    };
  }

  return null;
}

function resolveArticleContent(article: Article): string {
  if (!article.isFolder || article.blocks.length === 0) {
    return article.rawContent || article.content;
  }
  return article.content;
}

export function writeArticle(article: Article): void {
  if (article.isFolder) {
    // Folder-based: write ARTICLE.md
    const content = serializeArticle(
      article.title,
      article.tags,
      article.rawContent,
      article.created,
      article.modified,
      article.attachments,
      article.relationships,
      article.slug,
      article.blocks.length > 0 ? article.blocks.map((b) => b.name) : undefined
    );
    writeFileSync(article.filePath, content, 'utf-8');
  } else {
    // Legacy flat file — maintain backward compat
    const content = serializeArticle(
      article.title,
      article.tags,
      article.content,
      article.created,
      article.modified,
      article.attachments,
      article.relationships
    );
    writeFileSync(article.filePath, content, 'utf-8');
  }
}

export function createArticle(options: CreateOptions, config: KnowledgeBaseConfig): Article {
  const slug = generateSlug(options.title);
  const now = new Date();

  // Ensure articles folder exists
  ensureDataFolder(config);
  const articleFolder = getArticleFolderPath(config.dataPath, slug);
  ensureDataPath(articleFolder);

  const articleFilePath = join(articleFolder, ARTICLE_MAIN);

  // Write blocks first
  const blockNames: string[] = [];
  if (options.blocks) {
    for (const blockDef of options.blocks) {
      const blockName = generateSlug(blockDef.name);
      const blockPath = join(articleFolder, `${blockName}.md`);
      const blockContent = serializeBlock(
        blockName,
        blockDef.content ?? '',
        blockDef.tags ?? [],
        blockDef.title
      );
      writeFileSync(blockPath, blockContent, 'utf-8');
      blockNames.push(blockName);
    }
  }

  // Build ARTICLE.md content — inject !block: references if blocks exist and content doesn't already have them
  let articleContent = options.content ?? '';
  let blockRefsInContent = parseBlockReferences(articleContent).length > 0;

  if (blockNames.length > 0 && !blockRefsInContent) {
    // Auto-append !block: references at end of content
    const refLines = blockNames.map((n) => `!block:${n}`).join('\n');
    articleContent = articleContent ? `${articleContent}\n\n${refLines}` : refLines;
  }

  const article: Article = {
    slug,
    title: options.title,
    content: articleContent, // will be resolved at read time
    rawContent: articleContent,
    blocks: [],
    tags: dedupeValueTags(options.tags ?? []),
    attachments: options.attachments ?? [],
    relationships: dedupeTagRelationships(options.relationships ?? []),
    created: now,
    modified: now,
    filePath: articleFilePath,
    isFolder: true,
  };

  // Write ARTICLE.md
  const serialized = serializeArticle(
    article.title,
    article.tags,
    article.rawContent,
    article.created,
    article.modified,
    article.attachments,
    article.relationships,
    article.slug,
    blockNames.length > 0 ? blockNames : undefined
  );
  writeFileSync(articleFilePath, serialized, 'utf-8');

  // Now read back to resolve blocks
  return readArticle(slug, config) ?? article;
}

export function editArticle(options: EditOptions, config: KnowledgeBaseConfig): Article | null {
  const existing = readArticle(options.slug, config, { structured: true });
  if (!existing) {
    return null;
  }

  const now = new Date();

  // Update ARTICLE.md content
  let updatedRawContent = options.content !== undefined ? options.content : existing.rawContent;
  let updatedBlockNames: string[] = existing.blocks.map((b) => b.name);

  // If blocks are provided, manage them
  if (options.blocks) {
    const folder = getArticleFolderPath(config.dataPath, options.slug);
    ensureDataPath(folder);

    const newBlockNames: string[] = [];
    for (const blockDef of options.blocks) {
      const blockName = generateSlug(blockDef.name);
      const blockPath = join(folder, `${blockName}.md`);
      const blockContent = serializeBlock(
        blockName,
        blockDef.content ?? '',
        blockDef.tags ?? [],
        blockDef.title
      );
      writeFileSync(blockPath, blockContent, 'utf-8');
      newBlockNames.push(blockName);
    }

    // Remove old blocks not in new set
    const newSet = new Set(newBlockNames);
    for (const oldBlock of existing.blocks) {
      if (!newSet.has(oldBlock.name)) {
        const oldPath = join(folder, `${oldBlock.name}.md`);
        if (existsSync(oldPath)) {
          unlinkSync(oldPath);
        }
      }
    }
    updatedBlockNames = newBlockNames;

    // Auto-add block references if content doesn't have them
    const refsInContent = parseBlockReferences(updatedRawContent).length > 0;
    if (!refsInContent && newBlockNames.length > 0) {
      const refLines = newBlockNames.map((n) => `!block:${n}`).join('\n');
      updatedRawContent = updatedRawContent ? `${updatedRawContent}\n\n${refLines}` : refLines;
    }
  }

  const updated: Article = {
    slug: options.slug,
    title: options.title ?? existing.title,
    content: updatedRawContent, // will be resolved at read time
    rawContent: updatedRawContent,
    blocks: [], // will be resolved on read
    tags: options.tags ? dedupeValueTags(options.tags) : existing.tags,
    attachments: options.attachments ?? existing.attachments,
    relationships: options.relationships ? dedupeTagRelationships(options.relationships) : existing.relationships,
    created: existing.created,
    modified: now,
    filePath: existing.filePath,
    isFolder: true,
  };

  // Write ARTICLE.md
  const serialized = serializeArticle(
    updated.title,
    updated.tags,
    updated.rawContent,
    updated.created,
    updated.modified,
    updated.attachments,
    updated.relationships,
    updated.slug,
    updatedBlockNames.length > 0 ? updatedBlockNames : undefined
  );
  writeFileSync(updated.filePath, serialized, 'utf-8');

  // Read back to get resolved state
  return readArticle(options.slug, config) ?? updated;
}

export function getArticleSemanticTags(article: Pick<Article, 'tags' | 'relationships' | 'blocks'>): readonly ValueTag[] {
  const fromArticle = semanticTagsForArticle(article as Pick<Article, 'tags' | 'relationships'>);
  const fromBlocks = article.blocks?.flatMap((b) => b.tags ?? []) ?? [];
  return dedupeValueTags([...fromArticle, ...fromBlocks]);
}

export function listArticles(config: KnowledgeBaseConfig): readonly Article[] {
  ensureDataFolder(config);

  // Auto-migrate legacy flat files on list
  if (hasLegacyFlatArticles(config)) {
    migrateLegacyArticles(config);
  }

  const articlesPath = getArticlesPath(config.dataPath);
  if (!existsSync(articlesPath)) return [];

  const entries = readdirSync(articlesPath);
  const articles: Article[] = [];

  for (const entry of entries) {
    const articleFolder = join(articlesPath, entry);
    if (!statSync(articleFolder).isDirectory()) continue;

    const articleMain = join(articleFolder, ARTICLE_MAIN);
    if (!existsSync(articleMain)) continue;

    try {
      const rawContent = readFileSync(articleMain, 'utf-8');
      const meta = parseFrontmatter(rawContent, articleMain);

      // Resolve content inline for accurate listing/search (discovers blocks too)
      const resolved = resolveBlocks(entry, meta.content, config.dataPath, true);

      const article: Article = {
        ...meta,
        rawContent: meta.content,
        content: resolved.content,
        blocks: resolved.blocks,
        isFolder: true,
      };
      articles.push(article);
    } catch {
      continue;
    }
  }

  articles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  return articles;
}

export function deleteArticle(slug: string, config: KnowledgeBaseConfig): boolean {
  // Try folder-based first
  const articleFolder = getArticleFolderPath(config.dataPath, slug);
  if (existsSync(articleFolder)) {
    // Remove all files in folder
    const entries = readdirSync(articleFolder);
    for (const entry of entries) {
      unlinkSync(join(articleFolder, entry));
    }
    // Remove the now-empty directory
    rmSync(articleFolder, { recursive: true, force: true });
    return true;
  }

  // Legacy flat file fallback
  const flatPath = join(config.dataPath, `${slug}.md`);
  if (existsSync(flatPath)) {
    unlinkSync(flatPath);
    return true;
  }

  return false;
}

// ── Block operations ────────────────────────────────────────────

export function readArticleBlock(slug: string, blockName: string, config: KnowledgeBaseConfig): ArticleBlock | null {
  const blockPath = getArticleBlockPath(config.dataPath, slug, blockName);
  if (!existsSync(blockPath)) return null;

  try {
    const rawContent = readFileSync(blockPath, 'utf-8');
    return parseBlockFile(rawContent, blockPath, blockName);
  } catch {
    return null;
  }
}

export function listBlocks(slug: string, config: KnowledgeBaseConfig): readonly ArticleBlock[] {
  const articleFolder = getArticleFolderPath(config.dataPath, slug);
  if (!existsSync(articleFolder)) return [];

  const entries = readdirSync(articleFolder);
  const blocks: ArticleBlock[] = [];

  for (const entry of entries) {
    if (entry === ARTICLE_MAIN || !isMarkdownFile(entry)) continue;
    const blockPath = join(articleFolder, entry);
    try {
      const rawContent = readFileSync(blockPath, 'utf-8');
      const block = parseBlockFile(rawContent, blockPath, entry.replace(/\.md$/, ''));
      blocks.push(block);
    } catch {
      continue;
    }
  }

  return blocks;
}

// ── Managed files (unchanged) ──────────────────────────────────

function getManagedFilesFolder(dataPath: string, kind: FileKind): string {
  return join(dataPath, kind);
}

function ensureManagedFilesFolder(dataPath: string, kind: FileKind): string {
  const folder = getManagedFilesFolder(dataPath, kind);
  ensureDataPath(folder);
  return folder;
}

function getManagedFileMetaPath(filePath: string): string {
  return `${filePath}.meta.json`;
}

function getAttachmentPath(kind: FileKind, name: string): string {
  return `${kind}/${name}`;
}

function parseValueTags(tags: unknown): readonly ValueTag[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => {
        const index = tag.indexOf(':');
        if (index === -1) {
          return { key: tag.trim(), value: '' };
        }
        return {
          key: tag.slice(0, index).trim(),
          value: tag.slice(index + 1).trim(),
        };
      })
      .filter((tag) => tag.key.length > 0);
  }

  if (typeof tags === 'object') {
    return Object.entries(tags as Record<string, unknown>).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        return [{ key, value }];
      }
      if (Array.isArray(value)) {
        return value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => ({ key, value: item }));
      }
      return [];
    });
  }

  return [];
}

function parseStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function readManagedFileMeta(filePath: string): ManagedFileMeta {
  const metaPath = getManagedFileMetaPath(filePath);
  if (!existsSync(metaPath)) {
    return { tags: [], attachedArticles: [] };
  }

  try {
    const raw = readFileSync(metaPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ManagedFileMeta>;
    return {
      tags: parsed.tags ?? [],
      attachedArticles: parsed.attachedArticles ?? [],
    };
  } catch {
    return { tags: [], attachedArticles: [] };
  }
}

function writeManagedFileMeta(filePath: string, meta: ManagedFileMeta): void {
  const metaPath = getManagedFileMetaPath(filePath);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

function removeManagedFileMeta(filePath: string): void {
  const metaPath = getManagedFileMetaPath(filePath);
  if (existsSync(metaPath)) {
    unlinkSync(metaPath);
  }
}

function buildManagedFile(kind: FileKind, scope: FileScope, filePath: string): ManagedFile {
  const stat = statSync(filePath);
  const meta = readManagedFileMeta(filePath);
  return {
    kind,
    scope,
    name: basename(filePath),
    filePath,
    size: stat.size,
    modified: stat.mtime,
    tags: meta.tags,
    attachedArticles: meta.attachedArticles,
  };
}

function normalizeManagedFilesMeta(meta: ManagedFileMeta): ManagedFileMeta {
  const tags = meta.tags.filter((tag, index, arr) =>
    arr.findIndex((other) => other.key === tag.key && other.value === tag.value) === index
  );
  const attachedArticles = Array.from(new Set(meta.attachedArticles));
  return { tags, attachedArticles };
}

function updateArticleAttachment(config: KnowledgeBaseConfig, slug: string, updater: (attachments: readonly string[]) => readonly string[]): Article | null {
  const article = readArticle(slug, config);
  if (!article) return null;

  const updated: Article = {
    ...article,
    attachments: updater(article.attachments),
    modified: new Date(),
  };
  writeArticle(updated);

  // Re-read to get resolved state
  return readArticle(slug, config) ?? updated;
}

function updateManagedFileAttachmentList(filePath: string, updater: (articles: readonly string[]) => readonly string[]): ManagedFileMeta {
  const meta = readManagedFileMeta(filePath);
  const updated: ManagedFileMeta = {
    tags: meta.tags,
    attachedArticles: updater(meta.attachedArticles),
  };
  writeManagedFileMeta(filePath, normalizeManagedFilesMeta(updated));
  return normalizeManagedFilesMeta(updated);
}

function matchesTagFilters(articleTags: readonly ValueTag[], searchTags: readonly ValueTag[]): boolean {
  for (const searchTag of searchTags) {
    const found = articleTags.some(
      (tag) => tag.key === searchTag.key && (searchTag.value === '*' || tag.value.startsWith(searchTag.value))
    );
    if (!found) return false;
  }
  return true;
}

function matchesQuery(file: ManagedFile, query: string): boolean {
  const normalized = query.toLowerCase();
  return file.name.toLowerCase().includes(normalized) || file.filePath.toLowerCase().includes(normalized);
}

// ── Managed file operations (unchanged from original) ──────────

export function uploadManagedFile(
  kind: FileKind,
  options: FileUploadOptions,
  config: KnowledgeBaseConfig
): FileUploadResult {
  try {
    ensureDataFolder(config);
    const folder = ensureManagedFilesFolder(config.dataPath, kind);
    const sourcePath = resolve(options.sourcePath);

    if (!existsSync(sourcePath)) {
      return { success: false, error: `Source file not found: ${options.sourcePath}` };
    }

    const sourceStat = statSync(sourcePath);
    if (!sourceStat.isFile()) {
      return { success: false, error: `Source path is not a file: ${options.sourcePath}` };
    }

    const name = options.name?.trim() || basename(sourcePath);
    const destinationPath = join(folder, name);
    const destinationExists = existsSync(destinationPath);

    if (destinationExists && !options.overwrite) {
      return { success: false, error: `Destination file already exists: ${destinationPath}` };
    }

    copyFileSync(sourcePath, destinationPath);
    writeManagedFileMeta(destinationPath, normalizeManagedFilesMeta({
      tags: options.tags ?? [],
      attachedArticles: [],
    }));

    return {
      success: true,
      file: buildManagedFile(kind, config.isLocal ? 'local' : 'global', destinationPath),
      sourcePath,
      destinationPath,
      overwritten: destinationExists,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function listManagedFiles(kind: FileKind, config: KnowledgeBaseConfig): FileListResult {
  ensureDataFolder(config);

  const folder = getManagedFilesFolder(config.dataPath, kind);
  if (!existsSync(folder)) {
    return { kind, files: [], count: 0 };
  }

  const entries = readdirSync(folder);
  const files: ManagedFile[] = [];

  for (const entry of entries) {
    if (entry.endsWith('.meta.json')) continue;

    const filePath = join(folder, entry);
    try {
      const stat = statSync(filePath);
      if (!stat.isFile()) continue;
      files.push(buildManagedFile(kind, config.isLocal ? 'local' : 'global', filePath));
    } catch {
      continue;
    }
  }

  files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  return { kind, files, count: files.length };
}

export function searchManagedFiles(kind: FileKind, options: FileSearchOptions, config: KnowledgeBaseConfig): FileSearchResult {
  const allFiles = listManagedFiles(kind, config).files;
  const files: ManagedFile[] = [];

  for (const file of allFiles) {
    let match = true;

    if (options.tags && options.tags.length > 0) {
      match = matchesTagFilters(file.tags, options.tags);
    }

    if (match && options.query) {
      match = matchesQuery(file, options.query);
    }

    if (match) {
      files.push(file);
    }
  }

  return { kind, files, count: files.length };
}

export function deleteManagedFile(kind: FileKind, name: string, config: KnowledgeBaseConfig): FileDeleteResult {
  try {
    ensureDataFolder(config);
    const filePath = join(getManagedFilesFolder(config.dataPath, kind), name);
    if (!existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const meta = readManagedFileMeta(filePath);
    const attachmentPath = getAttachmentPath(kind, name);

    for (const articleSlug of meta.attachedArticles) {
      const updated = updateArticleAttachment(config, articleSlug, (attachments) =>
        attachments.filter((attachment) => attachment !== attachmentPath)
      );
      if (!updated) continue;
    }

    unlinkSync(filePath);
    removeManagedFileMeta(filePath);

    return { success: true, filePath, metaPath: getManagedFileMetaPath(filePath) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function moveManagedFile(kind: FileKind, options: FileMoveOptions, config: KnowledgeBaseConfig): FileMoveResult {
  try {
    ensureDataFolder(config);
    const folder = ensureManagedFilesFolder(config.dataPath, kind);
    const sourcePath = join(folder, options.sourceName);

    if (!existsSync(sourcePath)) {
      return { success: false, error: `File not found: ${sourcePath}` };
    }

    const destinationName = options.destinationName?.trim() || options.sourceName;
    const destinationPath = join(folder, destinationName);
    const destinationExists = existsSync(destinationPath);

    if (destinationExists && destinationPath !== sourcePath && !options.overwrite) {
      return { success: false, error: `Destination file already exists: ${destinationPath}` };
    }

    if (destinationPath === sourcePath) {
      return {
        success: true,
        file: buildManagedFile(kind, config.isLocal ? 'local' : 'global', sourcePath),
        sourcePath,
        destinationPath,
        overwritten: false,
      };
    }

    const meta = readManagedFileMeta(sourcePath);
    copyFileSync(sourcePath, destinationPath);
    writeManagedFileMeta(destinationPath, meta);

    const oldAttachmentPath = getAttachmentPath(kind, options.sourceName);
    const newAttachmentPath = getAttachmentPath(kind, destinationName);

    if (oldAttachmentPath !== newAttachmentPath) {
      for (const articleSlug of meta.attachedArticles) {
        const updated = updateArticleAttachment(config, articleSlug, (attachments) =>
          attachments.map((attachment) => (attachment === oldAttachmentPath ? newAttachmentPath : attachment))
        );
        if (!updated) continue;
      }
    }

    unlinkSync(sourcePath);
    removeManagedFileMeta(sourcePath);

    return {
      success: true,
      file: buildManagedFile(kind, config.isLocal ? 'local' : 'global', destinationPath),
      sourcePath,
      destinationPath,
      overwritten: destinationExists,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function attachManagedFileToArticle(
  kind: FileKind,
  options: FileAttachmentOptions,
  config: KnowledgeBaseConfig
): FileAttachmentResult {
  try {
    ensureDataFolder(config);
    const article = readArticle(options.articleSlug, config);
    if (!article) {
      return { success: false, error: `Article not found: ${options.articleSlug}` };
    }

    const filePath = join(getManagedFilesFolder(config.dataPath, kind), options.fileName);
    if (!existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const attachmentPath = getAttachmentPath(kind, options.fileName);
    const updatedArticle: Article = {
      ...article,
      attachments: Array.from(new Set([...article.attachments, attachmentPath])),
      modified: new Date(),
    };
    writeArticle(updatedArticle);

    const meta = updateManagedFileAttachmentList(filePath, (articles) => Array.from(new Set([...articles, options.articleSlug])));

    const reRead = readArticle(options.articleSlug, config);
    return {
      success: true,
      article: reRead ?? updatedArticle,
      file: buildManagedFile(kind, config.isLocal ? 'local' : 'global', filePath),
      attachmentPath,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function detachManagedFileFromArticle(
  kind: FileKind,
  options: FileAttachmentOptions,
  config: KnowledgeBaseConfig
): FileAttachmentResult {
  try {
    ensureDataFolder(config);
    const article = readArticle(options.articleSlug, config);
    if (!article) {
      return { success: false, error: `Article not found: ${options.articleSlug}` };
    }

    const filePath = join(getManagedFilesFolder(config.dataPath, kind), options.fileName);
    if (!existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const attachmentPath = getAttachmentPath(kind, options.fileName);
    const updatedArticle: Article = {
      ...article,
      attachments: article.attachments.filter((attachment) => attachment !== attachmentPath),
      modified: new Date(),
    };
    writeArticle(updatedArticle);

    updateManagedFileAttachmentList(filePath, (articles) => articles.filter((slug) => slug !== options.articleSlug));

    const reRead = readArticle(options.articleSlug, config);
    return {
      success: true,
      article: reRead ?? updatedArticle,
      file: buildManagedFile(kind, config.isLocal ? 'local' : 'global', filePath),
      attachmentPath,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function listArticleAttachments(slug: string, config: KnowledgeBaseConfig): readonly string[] {
  const article = readArticle(slug, config);
  return article?.attachments ?? [];
}
