// Knowledge Base - Search Command

import { getArticleSemanticTags, listArticles } from '../storage.js';
import type { Article, SearchOptions, KnowledgeBaseConfig, ValueTag } from '../types.js';

export type { SearchOptions };

export interface SearchResult {
  readonly articles: readonly Article[];
  readonly count: number;
}

function matchesTags(articleTags: readonly ValueTag[], searchTags: readonly ValueTag[]): boolean {
  // AND logic: all search tags must be present
  for (const searchTag of searchTags) {
    const found = articleTags.some(
      (at) =>
        at.key === searchTag.key &&
        (searchTag.value === '*' || at.value.startsWith(searchTag.value))
    );
    if (!found) {
      return false;
    }
  }
  return true;
}

function matchesContent(content: string, searchContent: string): boolean {
  return content.toLowerCase().includes(searchContent.toLowerCase());
}

export function searchCommand(options: SearchOptions, config: KnowledgeBaseConfig): SearchResult {
  const articles = listArticles(config);
  const results: Article[] = [];

  for (const article of articles) {
    let match = true;

    const semanticTags = getArticleSemanticTags(article);

    // Check tags (AND logic)
    if (options.tags && options.tags.length > 0) {
      match = matchesTags(semanticTags, options.tags);
    }

    // Check content
    if (match && options.content) {
      match = matchesContent(article.content, options.content);
    }

    if (match) {
      results.push(article);
    }
  }

  return {
    articles: results,
    count: results.length,
  };
}

export function formatSearchResult(result: SearchResult): string {
  if (result.count === 0) {
    return 'No articles found matching criteria.';
  }

  const lines: string[] = [`Found ${result.count} article(s):\n`];

  for (const article of result.articles) {
    const tagsStr = getArticleSemanticTags(article).map((t) => `${t.key}:${t.value}`).join(', ');
    lines.push(`- ${article.title} [${article.slug}]`);
    lines.push(`  Tags: ${tagsStr}`);
    lines.push('');
  }

  return lines.join('\n');
}