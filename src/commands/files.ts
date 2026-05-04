// Knowledge Base - Managed File Commands

import {
  attachManagedFileToArticle,
  deleteManagedFile,
  detachManagedFileFromArticle,
  listArticleAttachments,
  listManagedFiles,
  moveManagedFile,
  searchManagedFiles,
  uploadManagedFile,
} from '../storage.js';
import type {
  FileAttachmentOptions,
  FileAttachmentResult,
  FileDeleteOptions,
  FileDeleteResult,
  FileKind,
  FileListOptions,
  FileListResult,
  FileMoveOptions,
  FileMoveResult,
  FileSearchOptions,
  FileSearchResult,
  FileUploadOptions,
  FileUploadResult,
  KnowledgeBaseConfig,
} from '../types.js';

export type {
  FileAttachmentOptions,
  FileDeleteResult,
  FileKind,
  FileListOptions,
  FileMoveOptions,
  FileSearchOptions,
  FileUploadOptions,
};

export function uploadFileCommand(
  kind: FileKind,
  options: FileUploadOptions,
  config: KnowledgeBaseConfig
): FileUploadResult {
  return uploadManagedFile(kind, options, config);
}

export function listFilesCommand(kind: FileKind, _options: FileListOptions, config: KnowledgeBaseConfig): FileListResult {
  return listManagedFiles(kind, config);
}

export function searchFilesCommand(kind: FileKind, options: FileSearchOptions, config: KnowledgeBaseConfig): FileSearchResult {
  return searchManagedFiles(kind, options, config);
}

export function moveFileCommand(kind: FileKind, options: FileMoveOptions, config: KnowledgeBaseConfig): FileMoveResult {
  return moveManagedFile(kind, options, config);
}

export function deleteFileCommand(kind: FileKind, options: FileDeleteOptions, config: KnowledgeBaseConfig): FileDeleteResult {
  return deleteManagedFile(kind, options.name, config);
}

export function attachFileCommand(
  kind: FileKind,
  options: FileAttachmentOptions,
  config: KnowledgeBaseConfig
): FileAttachmentResult {
  return attachManagedFileToArticle(kind, options, config);
}

export function detachFileCommand(
  kind: FileKind,
  options: FileAttachmentOptions,
  config: KnowledgeBaseConfig
): FileAttachmentResult {
  return detachManagedFileFromArticle(kind, options, config);
}

export function listArticleAttachmentsCommand(slug: string, config: KnowledgeBaseConfig): readonly string[] {
  return listArticleAttachments(slug, config);
}

export function formatUploadFileResult(result: FileUploadResult): string {
  if (!result.success) {
    return `Error uploading file: ${result.error}`;
  }

  const tagsStr = result.file.tags.map((tag) => `${tag.key}:${tag.value}`).join(', ');
  const lines = [
    `Uploaded: ${result.file.name}`,
    `Kind: ${result.file.kind}`,
    `Scope: ${result.file.scope}`,
    `From: ${result.sourcePath}`,
    `To: ${result.destinationPath}`,
    `Size: ${result.file.size} bytes`,
  ];

  if (tagsStr) {
    lines.push(`Tags: ${tagsStr}`);
  }

  if (result.overwritten) {
    lines.push('Replaced existing file.');
  }

  return lines.join('\n');
}

export function formatListFilesResult(result: FileListResult): string {
  if (result.count === 0) {
    return `No ${result.kind} files found.`;
  }

  const lines = [`Found ${result.count} ${result.kind} file(s):\n`];

  for (const file of result.files) {
    lines.push(`- ${file.name}`);
    lines.push(`  Scope: ${file.scope}`);
    lines.push(`  Size: ${file.size} bytes`);
    lines.push(`  Modified: ${file.modified.toISOString()}`);
    lines.push(`  Path: ${file.filePath}`);
    const tagsStr = file.tags.map((tag) => `${tag.key}:${tag.value}`).join(', ');
    if (tagsStr) {
      lines.push(`  Tags: ${tagsStr}`);
    }
    if (file.attachedArticles.length > 0) {
      lines.push(`  Attached articles: ${file.attachedArticles.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatSearchFilesResult(result: FileSearchResult): string {
  if (result.count === 0) {
    return `No ${result.kind} files matched.`;
  }

  return formatListFilesResult(result);
}

export function formatMoveFileResult(result: FileMoveResult): string {
  if (!result.success) {
    return `Error moving file: ${result.error}`;
  }

  const lines = [
    `Moved: ${result.file.name}`,
    `Kind: ${result.file.kind}`,
    `Scope: ${result.file.scope}`,
    `From: ${result.sourcePath}`,
    `To: ${result.destinationPath}`,
  ];

  if (result.overwritten) {
    lines.push('Replaced existing file.');
  }

  return lines.join('\n');
}

export function formatDeleteFileResult(result: FileDeleteResult): string {
  if (!result.success) {
    return `Error deleting file: ${result.error}`;
  }

  return `Deleted file: ${result.filePath}`;
}

export function formatAttachFileResult(result: FileAttachmentResult): string {
  if (!result.success) {
    return `Error attaching file: ${result.error}`;
  }

  return [
    `Attached: ${result.attachmentPath}`,
    `Article: ${result.article.slug}`,
    `Modified: ${result.article.modified.toISOString()}`,
  ].join('\n');
}

export function formatDetachFileResult(result: FileAttachmentResult): string {
  if (!result.success) {
    return `Error detaching file: ${result.error}`;
  }

  return [
    `Detached: ${result.attachmentPath}`,
    `Article: ${result.article.slug}`,
    `Modified: ${result.article.modified.toISOString()}`,
  ].join('\n');
}

export function formatArticleAttachments(slug: string, attachments: readonly string[]): string {
  if (attachments.length === 0) {
    return `No attachments found for ${slug}.`;
  }

  return [`Attachments for ${slug}:`, '', ...attachments.map((attachment) => `- ${attachment}`)].join('\n');
}
