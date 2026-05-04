// Knowledge Base - Read Command

import { readArticle } from '../storage.js';
import type { Article, ReadOptions, KnowledgeBaseConfig } from '../types.js';

export type { ReadOptions };

export interface ReadResult {
  readonly success: boolean;
  readonly article?: Article;
  readonly error?: string;
}

export function readCommand(options: ReadOptions, config: KnowledgeBaseConfig): ReadResult {
  const article = readArticle(options.slug, config);

  if (!article) {
    return {
      success: false,
      error: `Article not found: ${options.slug}`,
    };
  }

  return {
    success: true,
    article,
  };
}

export function formatReadResult(result: ReadResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const article = result.article!;
  const tagsStr = article.tags.map((t) => `${t.key}:${t.value}`).join(', ');

  return `Title: ${article.title}
Slug: ${article.slug}
Tags: ${tagsStr}
Created: ${article.created.toISOString()}
Modified: ${article.modified.toISOString()}

---

${article.content}`;
}