// Knowledge Base - Configuration & Path Resolution

import { homedir } from 'os';
import { join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface KnowledgeBasePaths {
  readonly globalDataPath: string;
  readonly localDataPath: string;
}

export function getKnowledgeBasePaths(): KnowledgeBasePaths {
  return {
    globalDataPath: join(homedir(), '.pi', 'knowledge-base'),
    localDataPath: resolve('.', 'knowledge-base'),
  };
}

export function resolveDataPath(preferLocal: boolean = false): string {
  const paths = getKnowledgeBasePaths();

  if (preferLocal) {
    if (existsSync(paths.localDataPath)) {
      return paths.localDataPath;
    }
    // Fall through to global
  }

  // Return global path for now (caller should ensure it exists)
  return paths.globalDataPath;
}

export function ensureDataPath(dataPath: string): void {
  if (!existsSync(dataPath)) {
    mkdirSync(dataPath, { recursive: true });
  }
}

export function isLocalDataPath(cwd: string): boolean {
  const localPath = resolve(cwd, 'knowledge-base');
  return existsSync(localPath);
}

/** Articles subfolder path */
export function getArticlesPath(dataPath: string): string {
  return join(dataPath, 'articles');
}

/** Path to a specific article folder */
export function getArticleFolderPath(dataPath: string, slug: string): string {
  return join(getArticlesPath(dataPath), slug);
}

/** Path to ARTICLE.md within an article folder */
export function getArticleMainPath(dataPath: string, slug: string): string {
  return join(getArticleFolderPath(dataPath, slug), 'ARTICLE.md');
}

/** Path to a block file within an article folder */
export function getArticleBlockPath(dataPath: string, slug: string, blockName: string): string {
  return join(getArticleFolderPath(dataPath, slug), `${blockName}.md`);
}
