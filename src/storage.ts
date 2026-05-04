// Knowledge Base - Storage Layer

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter, serializeArticle, generateSlug } from './parser.js';
import { resolveDataPath, ensureDataPath } from './config.js';
import type { Article, CreateOptions, EditOptions, KnowledgeBaseConfig } from './types.js';

export function getKnowledgeBaseConfig(preferLocal: boolean = false): KnowledgeBaseConfig {
  const dataPath = resolveDataPath(preferLocal);
  return {
    dataPath,
    isLocal: preferLocal,
  };
}

export function ensureDataFolder(config: KnowledgeBaseConfig): void {
  ensureDataPath(config.dataPath);
}

function isMarkdownFile(fileName: string): boolean {
  return fileName.endsWith('.md');
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
    article.modified
  );
  writeFileSync(article.filePath, content, 'utf-8');
}

export function createArticle(options: CreateOptions, config: KnowledgeBaseConfig): Article {
  const slug = generateSlug(options.title);
  const now = new Date();

  // Build tags array
  const tags = options.tags ?? [];

  // Build content
  const content = options.content ?? '';

  const article: Article = {
    slug,
    title: options.title,
    content,
    tags,
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
      // Skip invalid files
      continue;
    }
  }

  // Sort by modified date, newest first
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