// Knowledge Base - Storage Layer

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, unlinkSync, copyFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { parseFrontmatter, serializeArticle, generateSlug } from './parser.js';
import { resolveDataPath, ensureDataPath, getKnowledgeBasePaths } from './config.js';
import type {
  Article,
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
}

function isMarkdownFile(fileName: string): boolean {
  return fileName.endsWith('.md');
}

function getManagedFilesFolder(config: KnowledgeBaseConfig, kind: FileKind): string {
  return join(config.dataPath, kind);
}

function ensureManagedFilesFolder(config: KnowledgeBaseConfig, kind: FileKind): string {
  const folder = getManagedFilesFolder(config, kind);
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
  return updated;
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

export function readArticle(slug: string, config: KnowledgeBaseConfig): Article | null {
  const filePath = join(config.dataPath, `${slug}.md`);

  if (!existsSync(filePath)) {
    return null;
  }

  const rawContent = readFileSync(filePath, 'utf-8');
  return parseFrontmatter(rawContent, filePath);
}

export function writeArticle(article: Article): void {
  const content = serializeArticle(
    article.title,
    article.tags,
    article.content,
    article.created,
    article.modified,
    article.attachments
  );
  writeFileSync(article.filePath, content, 'utf-8');
}

export function createArticle(options: CreateOptions, config: KnowledgeBaseConfig): Article {
  const slug = generateSlug(options.title);
  const now = new Date();
  const article: Article = {
    slug,
    title: options.title,
    content: options.content ?? '',
    tags: options.tags ?? [],
    attachments: options.attachments ?? [],
    created: now,
    modified: now,
    filePath: join(config.dataPath, `${slug}.md`),
  };

  writeArticle(article);
  return article;
}

export function editArticle(options: EditOptions, config: KnowledgeBaseConfig): Article | null {
  const existing = readArticle(options.slug, config);
  if (!existing) {
    return null;
  }

  const now = new Date();
  const updated: Article = {
    ...existing,
    title: options.title ?? existing.title,
    tags: options.tags ?? existing.tags,
    content: options.content ?? existing.content,
    attachments: options.attachments ?? existing.attachments,
    modified: now,
  };

  writeArticle(updated);
  return updated;
}

export function listArticles(config: KnowledgeBaseConfig): readonly Article[] {
  ensureDataFolder(config);

  const files = readdirSync(config.dataPath);
  const articles: Article[] = [];

  for (const fileName of files) {
    if (!isMarkdownFile(fileName)) continue;

    const filePath = join(config.dataPath, fileName);
    const stat = statSync(filePath);

    if (!stat.isFile()) continue;

    try {
      const rawContent = readFileSync(filePath, 'utf-8');
      const article = parseFrontmatter(rawContent, filePath);
      articles.push(article);
    } catch {
      continue;
    }
  }

  articles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  return articles;
}

export function deleteArticle(slug: string, config: KnowledgeBaseConfig): boolean {
  const filePath = join(config.dataPath, `${slug}.md`);

  if (!existsSync(filePath)) {
    return false;
  }

  unlinkSync(filePath);
  return true;
}

export function uploadManagedFile(
  kind: FileKind,
  options: FileUploadOptions,
  config: KnowledgeBaseConfig
): FileUploadResult {
  try {
    ensureDataFolder(config);
    const folder = ensureManagedFilesFolder(config, kind);
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

  const folder = getManagedFilesFolder(config, kind);
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
    const filePath = join(getManagedFilesFolder(config, kind), name);
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
    const folder = ensureManagedFilesFolder(config, kind);
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

    const filePath = join(getManagedFilesFolder(config, kind), options.fileName);
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

    return {
      success: true,
      article: updatedArticle,
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

    const filePath = join(getManagedFilesFolder(config, kind), options.fileName);
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

    return {
      success: true,
      article: updatedArticle,
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
