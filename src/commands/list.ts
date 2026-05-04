// Knowledge Base - List Command

import { listArticles } from '../storage.js';
import type { Article, ListOptions, KnowledgeBaseConfig } from '../types.js';

export type { ListOptions };

export interface ListResult {
  readonly articles: readonly Article[];
  readonly count: number;
}

export function listCommand(_options: ListOptions, config: KnowledgeBaseConfig): ListResult {
  const articles = listArticles(config);
  return {
    articles,
    count: articles.length,
  };
}

export function formatListResult(result: ListResult): string {
  if (result.count === 0) {
    return 'No articles found.';
  }

  const lines: string[] = [`Found ${result.count} article(s):\n`];

  for (const article of result.articles) {
    const tagsStr = article.tags.map((t) => `${t.key}:${t.value}`).join(', ');
    lines.push(`- ${article.title} [${article.slug}]`);
    lines.push(`  Modified: ${article.modified.toISOString().split('T')[0]}`);
    if (tagsStr) {
      lines.push(`  Tags: ${tagsStr}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}