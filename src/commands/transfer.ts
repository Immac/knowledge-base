// Knowledge Base - Transfer Command

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { ensureDataFolder, readArticle } from '../storage.js';
import { getArticleFolderPath, getArticleMainPath, getArticlesPath } from '../config.js';
import type {
  Article,
  KnowledgeBaseConfig,
  TransferOptions,
  TransferResult,
} from '../types.js';

export type { TransferOptions };

const ARTICLE_MAIN = 'ARTICLE.md';

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
    const destArticlesPath = getArticlesPath(destinationConfig.dataPath);
    const destFolder = getArticleFolderPath(destinationConfig.dataPath, options.slug);
    const destArticlePath = getArticleMainPath(destinationConfig.dataPath, options.slug);
    const destinationExists = existsSync(destArticlePath);

    if (destinationExists && !options.overwrite) {
      return {
        success: false,
        error: `Destination article already exists: ${destArticlePath}. Use overwrite to replace it.`,
      };
    }

    if (article.isFolder && article.isFolder === true) {
      // Folder-based transfer: copy entire folder
      if (destinationExists) {
        // Remove existing destination folder
        const existingEntries = readdirSync(destFolder);
        for (const entry of existingEntries) {
          unlinkSync(join(destFolder, entry));
        }
      } else {
        mkdirSync(destFolder, { recursive: true });
      }

      // Copy all files from source folder to destination folder
      const sourceFolder = getArticleFolderPath(sourceConfig.dataPath, options.slug);
      if (existsSync(sourceFolder)) {
        const sourceEntries = readdirSync(sourceFolder);
        for (const entry of sourceEntries) {
          const srcFile = join(sourceFolder, entry);
          if (!statSync(srcFile).isFile()) continue;
          copyFileSync(srcFile, join(destFolder, entry));
        }
      }

      if (options.action === 'promote') {
        // Remove source folder
        const sourceFolder2 = getArticleFolderPath(sourceConfig.dataPath, options.slug);
        if (existsSync(sourceFolder2)) {
          rmSync(sourceFolder2, { recursive: true, force: true });
        }
      }
    } else {
      // Legacy flat file transfer
      if (destinationExists && !options.overwrite) {
        return {
          success: false,
          error: `Destination article already exists: ${destArticlePath}. Use overwrite to replace it.`,
        };
      }

      if (destinationExists) {
        rmSync(destArticlePath, { force: true });
      } else {
        mkdirSync(destFolder, { recursive: true });
      }

      copyFileSync(sourcePath, destArticlePath);

      if (options.action === 'promote') {
        unlinkSync(sourcePath);
      }
    }

    const destArticle = readArticle(options.slug, destinationConfig);

    if (!destArticle) {
      return {
        success: false,
        error: 'Transfer completed but could not read destination article.',
      };
    }

    return {
      success: true,
      action: options.action,
      article: destArticle,
      sourcePath,
      destinationPath: destArticlePath,
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

  if (article.isFolder && article.blocks?.length > 0) {
    lines.push(`Blocks: ${article.blocks.map((b) => b.name).join(', ')}`);
  }

  return lines.join('\n');
}
