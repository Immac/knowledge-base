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