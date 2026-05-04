// Knowledge Base - Transfer Command

import { copyFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { ensureDataFolder, readArticle } from '../storage.js';
import type {
  Article,
  KnowledgeBaseConfig,
  TransferOptions,
  TransferResult,
} from '../types.js';

export type { TransferOptions };

function scopeLabel(config: KnowledgeBaseConfig): string {
  return config.isLocal ? 'local' : 'global';
}

function buildDestinationArticle(article: Article, destinationPath: string): Article {
  return {
    ...article,
    filePath: destinationPath,
  };
}

export function transferCommand(
  options: TransferOptions,
  sourceConfig: KnowledgeBaseConfig,
  destinationConfig: KnowledgeBaseConfig
): TransferResult {
  try {
    ensureDataFolder(destinationConfig);

    const article = readArticle(options.slug, sourceConfig);
    if (!article) {
      return {
        success: false,
        error: `Article not found in ${scopeLabel(sourceConfig)} knowledge base: ${options.slug}`,
      };
    }

    const sourcePath = article.filePath;
    const destinationPath = join(destinationConfig.dataPath, `${options.slug}.md`);
    const destinationExists = existsSync(destinationPath);

    if (destinationExists && !options.overwrite) {
      return {
        success: false,
        error: `Destination article already exists: ${destinationPath}. Use overwrite to replace it.`,
      };
    }

    copyFileSync(sourcePath, destinationPath);

    if (options.action === 'promote') {
      unlinkSync(sourcePath);
    }

    return {
      success: true,
      action: options.action,
      article: buildDestinationArticle(article, destinationPath),
      sourcePath,
      destinationPath,
      overwritten: destinationExists,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function formatTransferResult(result: TransferResult): string {
  if (!result.success) {
    return `Error transferring article: ${result.error}`;
  }

  const article = result.article;
  const actionLabel = result.action === 'promote' ? 'Promoted' : 'Copied';
  const targetLabel = result.action === 'promote' ? 'global' : 'local';
  const lines = [
    `${actionLabel}: ${article.title}`,
    `Slug: ${article.slug}`,
    `From: ${result.sourcePath}`,
    `To: ${result.destinationPath}`,
    `Target: ${targetLabel}`,
  ];

  if (result.action === 'promote') {
    lines.push('Source removed after promotion.');
  }

  if (result.overwritten) {
    lines.push('Replaced existing destination article.');
  }

  return lines.join('\n');
}