// Knowledge Base - Read Command

import { getArticleSemanticTags, readArticle } from '../storage.js';
import { formatTagRelationship } from '../tag-graph.js';
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
  const tagsStr = getArticleSemanticTags(article).map((t) => `${t.key}:${t.value}`).join(', ');
  const relationshipsStr = article.relationships.length
    ? `
Relationships:
${article.relationships.map((relationship) => `- ${formatTagRelationship(relationship)}`).join('\n')}`
    : '';

  return `Title: ${article.title}
Slug: ${article.slug}
Tags: ${tagsStr}${relationshipsStr}
Created: ${article.created.toISOString()}
Modified: ${article.modified.toISOString()}

---

${article.content}`;
}
