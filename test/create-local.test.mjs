import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createCommand, formatCreateResult } from '../dist/commands/create.js';
import { readArticle } from '../dist/storage.js';

function makeConfig(dataPath, isLocal) {
  return { dataPath, isLocal };
}

test('creates an article in a local knowledge base', () => {
  const root = mkdtempSync(join(tmpdir(), 'kb-create-local-'));
  const localDir = join(root, 'knowledge-base');
  const globalDir = join(root, 'global');
  const title = 'Local Draft';

  mkdirSync(localDir, { recursive: true });
  mkdirSync(globalDir, { recursive: true });

  const result = createCommand(
    {
      title,
      tags: [{ key: 'scope', value: 'local' }],
      content: 'Local content',
    },
    makeConfig(localDir, true)
  );

  assert.equal(result.success, true);
  assert.equal(existsSync(join(localDir, 'local-draft.md')), true);
  assert.equal(existsSync(join(globalDir, 'local-draft.md')), false);

  const article = readArticle('local-draft', makeConfig(localDir, true));
  assert.ok(article);
  assert.equal(article?.title, title);
  assert.equal(article?.content.trim(), 'Local content');
  assert.match(formatCreateResult(result), /Created: Local Draft/);

  rmSync(root, { recursive: true, force: true });
});
