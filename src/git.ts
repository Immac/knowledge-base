// Knowledge Base - Git Integration

import { existsSync, mkdirSync } from 'fs';
import { simpleGit } from 'simple-git';
import type { KnowledgeBaseConfig } from './types.js';

const GIT_FOLDER = '.git';

function isGitRepo(path: string): boolean {
  return existsSync(path + '/' + GIT_FOLDER);
}

export function initRepo(config: KnowledgeBaseConfig): void {
  const dataPath = config.dataPath;

  if (!existsSync(dataPath)) {
    mkdirSync(dataPath, { recursive: true });
  }

  if (!isGitRepo(dataPath)) {
    const git = simpleGit(dataPath);
    git.init(['-b', 'master']);
  }
}

export async function commitChanges(config: KnowledgeBaseConfig, message: string): Promise<boolean> {
  const dataPath = config.dataPath;

  if (!isGitRepo(dataPath)) {
    initRepo(config);
  }

  try {
    const git = simpleGit(dataPath);

    // Stage all changes
    await git.add('.');
    
    // Check if there are changes to commit
    const status = await git.status();
    if (status.files.length > 0) {
      await git.commit(message);
    }

    return true;
  } catch {
    return false;
  }
}

export async function getLog(config: KnowledgeBaseConfig, limit: number = 10): Promise<string[]> {
  const dataPath = config.dataPath;

  if (!isGitRepo(dataPath)) {
    return [];
  }

  const git = simpleGit(dataPath);
  const log = await git.log({ maxCount: limit });
  return log.all.map((entry) => entry.hash + ' ' + entry.message);
}

export async function isClean(config: KnowledgeBaseConfig): Promise<boolean> {
  const dataPath = config.dataPath;

  if (!isGitRepo(dataPath)) {
    return true;
  }

  const git = simpleGit(dataPath);
  const status = await git.status();
  return status.files.length === 0;
}