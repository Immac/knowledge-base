// Knowledge Base - Create Command

import { createArticle as storeCreateArticle, ensureDataFolder } from '../storage.js';
import type { Article, CreateOptions, KnowledgeBaseConfig, ValueTag } from '../types.js';

export type { CreateOptions, ValueTag };

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
  return `Created: ${article.title}
Slug: ${article.slug}
Path: ${article.filePath}`;
}

export function parseTagsString(tagsStr: string): readonly ValueTag[] {
  if (!tagsStr) return [];

  return tagsStr.split(',').map((t) => {
    const [key, value] = t.split(':');
    return {
      key: key.trim(),
      value: value?.trim() ?? '',
    };
  });
}