import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createCommand } from '../dist/commands/create.js';
import {
  uploadFileCommand,
  listFilesCommand,
  searchFilesCommand,
  moveFileCommand,
  deleteFileCommand,
  attachFileCommand,
  detachFileCommand,
  listArticleAttachmentsCommand,
  formatUploadFileResult,
  formatListFilesResult,
  formatSearchFilesResult,
  formatMoveFileResult,
  formatDeleteFileResult,
  formatAttachFileResult,
  formatDetachFileResult,
  formatArticleAttachments,
} from '../dist/commands/files.js';
import { readArticle } from '../dist/storage.js';

function makeConfig(dataPath, isLocal) {
  return { dataPath, isLocal };
}

function writeBinaryFile(filePath, bytes) {
  writeFileSync(filePath, bytes);
}

test('uploads media and can search it by tags', () => {
  const root = mkdtempSync(join(tmpdir(), 'kb-media-'));
  const sourceDir = join(root, 'source');
  const globalDir = join(root, 'global');
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(globalDir, { recursive: true });

  const sourcePath = join(sourceDir, 'banner.png');
  const sourceBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  writeBinaryFile(sourcePath, sourceBytes);

  const uploadResult = uploadFileCommand(
    'media',
    {
      sourcePath,
      name: 'banner.png',
      tags: [
        { key: 'kind', value: 'media' },
        { key: 'project', value: 'knowledge-base' },
      ],
    },
    makeConfig(globalDir, false)
  );
  assert.equal(uploadResult.success, true);
  assert.equal(existsSync(join(globalDir, 'media', 'banner.png')), true);
  assert.equal(existsSync(join(globalDir, 'media', 'banner.png.meta.json')), true);
  assert.deepEqual(readFileSync(join(globalDir, 'media', 'banner.png')), sourceBytes);
  assert.match(formatUploadFileResult(uploadResult), /Uploaded: banner\.png/);
  assert.match(formatUploadFileResult(uploadResult), /Tags: kind:media, project:knowledge-base/);

  const listResult = listFilesCommand('media', {}, makeConfig(globalDir, false));
  assert.equal(listResult.count, 1);
  assert.equal(listResult.files[0].name, 'banner.png');
  assert.equal(listResult.files[0].tags.length, 2);
  assert.match(formatListFilesResult(listResult), /Found 1 media file\(s\)/);
  assert.match(formatListFilesResult(listResult), /Tags: kind:media, project:knowledge-base/);

  const searchResult = searchFilesCommand(
    'media',
    {
      kind: 'media',
      tags: [{ key: 'kind', value: 'media' }],
      query: 'banner',
    },
    makeConfig(globalDir, false)
  );
  assert.equal(searchResult.count, 1);
  assert.match(formatSearchFilesResult(searchResult), /Found 1 media file\(s\)/);

  rmSync(root, { recursive: true, force: true });
});

test('attaches files to articles and keeps attachment links in sync', () => {
  const root = mkdtempSync(join(tmpdir(), 'kb-attach-'));
  const globalDir = join(root, 'global');
  const sourceDir = join(root, 'source');
  mkdirSync(globalDir, { recursive: true });
  mkdirSync(sourceDir, { recursive: true });

  const sourcePath = join(sourceDir, 'diagram.svg');
  writeBinaryFile(sourcePath, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));

  const articleResult = createCommand(
    {
      title: 'Attachment Demo',
      tags: [{ key: 'kind', value: 'article' }],
      content: 'Demo content',
    },
    makeConfig(globalDir, false)
  );
  assert.equal(articleResult.success, true);
  assert.equal(articleResult.article?.slug, 'attachment-demo');

  const uploadResult = uploadFileCommand(
    'media',
    {
      sourcePath,
      name: 'diagram.svg',
      tags: [{ key: 'kind', value: 'media' }],
    },
    makeConfig(globalDir, false)
  );
  assert.equal(uploadResult.success, true);

  const attachResult = attachFileCommand('media', { articleSlug: 'attachment-demo', fileName: 'diagram.svg' }, makeConfig(globalDir, false));
  assert.equal(attachResult.success, true);
  assert.match(formatAttachFileResult(attachResult), /Attached: media\/diagram\.svg/);

  const article = readArticle('attachment-demo', makeConfig(globalDir, false));
  assert.ok(article);
  assert.deepEqual(article?.attachments, ['media/diagram.svg']);

  const attachmentList = listArticleAttachmentsCommand('attachment-demo', makeConfig(globalDir, false));
  assert.deepEqual(attachmentList, ['media/diagram.svg']);
  assert.match(formatArticleAttachments('attachment-demo', attachmentList), /Attachments for attachment-demo/);

  const fileMeta = JSON.parse(readFileSync(join(globalDir, 'media', 'diagram.svg.meta.json'), 'utf-8'));
  assert.deepEqual(fileMeta.attachedArticles, ['attachment-demo']);

  const detachResult = detachFileCommand('media', { articleSlug: 'attachment-demo', fileName: 'diagram.svg' }, makeConfig(globalDir, false));
  assert.equal(detachResult.success, true);
  assert.match(formatDetachFileResult(detachResult), /Detached: media\/diagram\.svg/);

  const detachedArticle = readArticle('attachment-demo', makeConfig(globalDir, false));
  assert.ok(detachedArticle);
  assert.deepEqual(detachedArticle?.attachments, []);

  rmSync(root, { recursive: true, force: true });
});

test('moves and deletes raw files while keeping article links updated', () => {
  const root = mkdtempSync(join(tmpdir(), 'kb-move-delete-'));
  const globalDir = join(root, 'global');
  const sourceDir = join(root, 'source');
  mkdirSync(globalDir, { recursive: true });
  mkdirSync(sourceDir, { recursive: true });

  const sourcePath = join(sourceDir, 'dataset.bin');
  writeBinaryFile(sourcePath, Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]));

  const articleResult = createCommand(
    {
      title: 'Raw Attachment Demo',
      tags: [{ key: 'kind', value: 'article' }],
      content: 'Demo content',
    },
    makeConfig(globalDir, false)
  );
  assert.equal(articleResult.success, true);

  const uploadResult = uploadFileCommand(
    'raw',
    {
      sourcePath,
      name: 'dataset.bin',
      tags: [{ key: 'kind', value: 'raw' }],
    },
    makeConfig(globalDir, false)
  );
  assert.equal(uploadResult.success, true);

  const attachResult = attachFileCommand('raw', { articleSlug: 'raw-attachment-demo', fileName: 'dataset.bin' }, makeConfig(globalDir, false));
  assert.equal(attachResult.success, true);

  const moveResult = moveFileCommand('raw', { sourceName: 'dataset.bin', destinationName: 'dataset-renamed.bin' }, makeConfig(globalDir, false));
  assert.equal(moveResult.success, true);
  assert.match(formatMoveFileResult(moveResult), /Moved: dataset-renamed\.bin/);
  assert.equal(existsSync(join(globalDir, 'raw', 'dataset.bin')), false);
  assert.equal(existsSync(join(globalDir, 'raw', 'dataset-renamed.bin')), true);

  const movedArticle = readArticle('raw-attachment-demo', makeConfig(globalDir, false));
  assert.ok(movedArticle);
  assert.deepEqual(movedArticle?.attachments, ['raw/dataset-renamed.bin']);

  const deleteResult = deleteFileCommand('raw', { name: 'dataset-renamed.bin' }, makeConfig(globalDir, false));
  assert.equal(deleteResult.success, true);
  assert.match(formatDeleteFileResult(deleteResult), /Deleted file:/);
  assert.equal(existsSync(join(globalDir, 'raw', 'dataset-renamed.bin')), false);
  assert.equal(existsSync(join(globalDir, 'raw', 'dataset-renamed.bin.meta.json')), false);

  const cleanedArticle = readArticle('raw-attachment-demo', makeConfig(globalDir, false));
  assert.ok(cleanedArticle);
  assert.deepEqual(cleanedArticle?.attachments, []);

  rmSync(root, { recursive: true, force: true });
});
