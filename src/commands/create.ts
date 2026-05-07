// Knowledge Base - Create Command

import { createArticle as storeCreateArticle, ensureDataFolder } from '../storage.js';
import { parseTagRelationshipsFromUnknown, parseValueTagsFromUnknown } from '../tag-graph.js';
import type { Article, CreateOptions, KnowledgeBaseConfig, TagRelationship, ValueTag } from '../types.js';

export type { CreateOptions, ValueTag, TagRelationship };

export interface CreateResult {
  readonly success: boolean;
  readonly article?: Article;
  readonly error?: string;
}

export function createCommand(options: CreateOptions, config: KnowledgeBaseConfig): CreateResult {
  try {
    ensureDataFolder(config);
    const article = storeCreateArticle(options, config);

    return {
      success: true,
      article,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function formatCreateResult(result: CreateResult): string {
  if (!result.success) {
    return `Error creating article: ${result.error}`;
  }

  const article = result.article!;
  const lines = [
    `Created: ${article.title}`,
    `Slug: ${article.slug}`,
    `Path: ${article.filePath}`,
  ];

  if (article.blocks.length > 0) {
    lines.push(`Blocks: ${article.blocks.map((b) => b.name).join(', ')}`);
  }

  return lines.join('\n');
}

export function parseTagsString(tagsStr: string): readonly ValueTag[] {
  if (!tagsStr) return [];
  return parseValueTagsFromUnknown(
    tagsStr.split(',').map((tag) => {
      const [key, value] = tag.split(':');
      return { key: key.trim(), value: value?.trim() ?? '' };
    })
  );
}

export function parseRelationsString(relationsStr: string): readonly TagRelationship[] {
  if (!relationsStr) return [];

  try {
    const parsed = JSON.parse(relationsStr) as unknown;
    return parseTagRelationshipsFromUnknown(parsed);
  } catch {
    return [];
  }
}
