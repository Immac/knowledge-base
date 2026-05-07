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
  const article = readArticle(options.slug, config, { structured: options.structured });

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

  const blockInfo = article.blocks.length > 0
    ? `
Blocks: ${article.blocks.length}
${article.blocks.map((b) => `  - ${b.name}${b.tags.length > 0 ? ` [${b.tags.map(t => `${t.key}:${t.value}`).join(', ')}]` : ''}`).join('\n')}`
    : '';

  const typeLabel = article.isFolder ? 'folder' : 'flat';

  return `Title: ${article.title}
Slug: ${article.slug}
Type: ${typeLabel}
Tags: ${tagsStr}${relationshipsStr}${blockInfo}
Created: ${article.created.toISOString()}
Modified: ${article.modified.toISOString()}

---

${article.content}`;
}

/** Structured output: shows raw content with block references instead of inlined blocks */
export function formatStructuredReadResult(result: ReadResult): string {
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

  const lines: string[] = [
    `Title: ${article.title}`,
    `Slug: ${article.slug}`,
    `Tags: ${tagsStr}${relationshipsStr}`,
    `Created: ${article.created.toISOString()}`,
    `Modified: ${article.modified.toISOString()}`,
    '',
    '--- ARTICLE CONTENT ---',
    article.rawContent,
    '',
    '--- BLOCKS ---',
  ];

  if (article.blocks.length === 0) {
    lines.push('(no blocks)');
  } else {
    for (const block of article.blocks) {
      const blockTags = block.tags.length > 0
        ? ` [${block.tags.map(t => `${t.key}:${t.value}`).join(', ')}]`
        : '';
      lines.push('');
      lines.push(`## Block: ${block.name}${blockTags}`);
      lines.push(block.content);
    }
  }

  return lines.join('\n');
}
