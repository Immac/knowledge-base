// Knowledge Base - Edit Command

import { editArticle as storeEditArticle, ensureDataFolder } from '../storage.js';
import type { Article, EditOptions, KnowledgeBaseConfig } from '../types.js';

export type { EditOptions };

export interface EditResult {
  readonly success: boolean;
  readonly article?: Article;
  readonly error?: string;
}

export function editCommand(options: EditOptions, config: KnowledgeBaseConfig): EditResult {
  try {
    ensureDataFolder(config);
    const article = storeEditArticle(options, config);

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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function formatEditResult(result: EditResult): string {
  if (!result.success) {
    return `Error editing article: ${result.error}`;
  }

  const article = result.article!;
  return `Updated: ${article.title}
Slug: ${article.slug}
Modified: ${article.modified.toISOString()}`;
}