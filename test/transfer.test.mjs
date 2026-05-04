import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { transferCommand, formatTransferResult } from '../dist/commands/transfer.js';
import { readArticle } from '../dist/storage.js';

function makeConfig(dataPath, isLocal) {
  return { dataPath, isLocal };
}

function writeArticleFile(dir, slug, title, content, created, modified) {
  writeFileSync(
    join(dir, `${slug}.md`),
    `---\ntitle: ${title}\ntags:\n  scope: test\ncreated: ${created}\nmodified: ${modified}\n---\n\n${content}\n`,
    'utf8'
  );
}

test('promotes a local article to global', () => {
  const root = mkdtempSync(join(tmpdir(), 'kb-transfer-promote-'));
  const localDir = join(root, 'knowledge-base');
  const globalDir = join(root, 'global');
  const slug = 'sample-article';
  const created = '2026-05-03T10:00:00.000Z';
  const modified = '2026-05-03T11:00:00.000Z';

  mkdirSync(localDir, { recursive: true });
  mkdirSync(globalDir, { recursive: true });

  writeArticleFile(localDir, slug, 'Sample Article', 'Local content', created, modified);

  const result = transferCommand(
    { slug, action: 'promote' },
    makeConfig(localDir, true),
    makeConfig(globalDir, false)
  );

  assert.equal(result.success, true);
  assert.equal(result.action, 'promote');
  assert.equal(existsSync(join(localDir, `${slug}.md`)), false);
  assert.equal(existsSync(join(globalDir, `${slug}.md`)), true);

  const promoted = readArticle(slug, makeConfig(globalDir, false));
  assert.ok(promoted);
  assert.equal(promoted?.title, 'Sample Article');
  assert.equal(promoted?.content.trim(), 'Local content');
  assert.match(formatTransferResult(result), /Promoted: Sample Article/);
  assert.match(formatTransferResult(result), /Source removed after promotion\./);

  rmSync(root, { recursive: true, force: true });
});

test('copies a global article to local', () => {
  const root = mkdtempSync(join(tmpdir(), 'kb-transfer-copy-'));
  const localDir = join(root, 'knowledge-base');
  const globalDir = join(root, 'global');
  const slug = 'shared-article';
  const created = '2026-05-03T10:00:00.000Z';
  const modified = '2026-05-03T11:00:00.000Z';

  mkdirSync(localDir, { recursive: true });
  mkdirSync(globalDir, { recursive: true });

  writeArticleFile(globalDir, slug, 'Shared Article', 'Global content', created, modified);

  const result = transferCommand(
    { slug, action: 'copy' },
    makeConfig(globalDir, false),
    makeConfig(localDir, true)
  );

  assert.equal(result.success, true);
  assert.equal(result.action, 'copy');
  assert.equal(existsSync(join(globalDir, `${slug}.md`)), true);
  assert.equal(existsSync(join(localDir, `${slug}.md`)), true);

  const copied = readArticle(slug, makeConfig(localDir, true));
  assert.ok(copied);
  assert.equal(copied?.title, 'Shared Article');
  assert.equal(copied?.content.trim(), 'Global content');
  assert.match(formatTransferResult(result), /Copied: Shared Article/);

  rmSync(root, { recursive: true, force: true });
});
