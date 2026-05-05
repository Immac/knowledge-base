// Knowledge Base - Tags Index Command

import { getArticleSemanticTags, listArticles } from '../storage.js';
import type { Article, TagIndex, TagIndexEntry, TagsOptions, KnowledgeBaseConfig, ValueTag } from '../types.js';

export type { TagsOptions };

export function buildTagIndex(articles: readonly Article[]): TagIndex {
  const tagMap = new Map<string, TagIndexEntry>();

  for (const article of articles) {
    const slug = article.slug;

    for (const tag of getArticleSemanticTags(article)) {
      const key = tag.key;
      const value = tag.value;
      const compositeKey = `${key}:${value}`;

      if (!tagMap.has(compositeKey)) {
        tagMap.set(compositeKey, {
          key,
          value,
          articles: [slug],
          relatedTags: [],
        });
      } else {
        const entry = tagMap.get(compositeKey)!;
        tagMap.set(compositeKey, {
          ...entry,
          articles: [...entry.articles, slug],
        });
      }
    }
  }

  // Build related tags
  for (const [_, entry] of tagMap) {
    const related: ValueTag[] = [];

    for (const article of articles) {
      if (entry.articles.includes(article.slug)) continue;

      for (const tag of getArticleSemanticTags(article)) {
        if (tag.key !== entry.key) {
          related.push(tag);
        }
      }
    }

    tagMap.set(`${entry.key}:${entry.value}`, {
      ...entry,
      relatedTags: related.slice(0, 10), // Limit to 10 related tags
    });
  }

  return {
    tags: Array.from(tagMap.values()),
  };
}

export function tagsCommand(options: TagsOptions, config: KnowledgeBaseConfig): TagIndex {
  const articles = listArticles(config);
  const index = buildTagIndex(articles);

  if (options.key) {
    return {
      tags: index.tags.filter((t) => t.key === options.key),
    };
  }

  return index;
}

export function formatTagIndex(index: TagIndex): string {
  if (index.tags.length === 0) {
    return 'No tags found.';
  }

  const lines: string[] = ['Tag Index:\n'];

  // Group by key
  const byKey = new Map<string, TagIndexEntry[]>();
  for (const entry of index.tags) {
    if (!byKey.has(entry.key)) {
      byKey.set(entry.key, []);
    }
    byKey.get(entry.key)!.push(entry);
  }

  for (const [key, entries] of byKey) {
    lines.push(`## ${key}`);

    for (const entry of entries) {
      lines.push(`  ${entry.value}: ${entry.articles.length} article(s)`);
      for (const slug of entry.articles.slice(0, 5)) {
        lines.push(`    - ${slug}`);
      }
      if (entry.articles.length > 5) {
        lines.push(`    ... and ${entry.articles.length - 5} more`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}