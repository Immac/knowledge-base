import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createCommand } from '../dist/commands/create.js';
import { readCommand, formatReadResult } from '../dist/commands/read.js';
import { searchCommand, formatSearchResult } from '../dist/commands/search.js';
import { tagsCommand, formatTagIndex } from '../dist/commands/tags.js';
import { readArticle } from '../dist/storage.js';

function makeConfig(dataPath, isLocal) {
  return { dataPath, isLocal };
}

test('articles can model DAG relationships and inherited semantic tags', () => {
  const root = mkdtempSync(join(tmpdir(), 'kb-dag-'));
  const globalDir = join(root, 'global');
  mkdirSync(globalDir, { recursive: true });

  const baseTags = (kind, topic) => ([
    { key: 'kind', value: kind },
    { key: 'topic', value: topic },
  ]);

  const touhouProject = createCommand(
    {
      title: 'Touhou Project',
      tags: baseTags('franchise', 'touhou-project'),
      content: 'A long-running bullet-hell franchise.',
    },
    makeConfig(globalDir, false)
  );
  assert.equal(touhouProject.success, true);

  const touhou10 = createCommand(
    {
      title: 'Touhou 10',
      tags: baseTags('work', 'touhou-10'),
      relationships: [
        { predicate: 'instance-of', target: 'video-game', qualifiers: [{ key: 'medium', value: 'game' }] },
        { predicate: 'part-of', target: 'touhou-project', qualifiers: [{ key: 'franchise', value: 'touhou-project' }] },
      ],
      content: 'A mainline Touhou game.',
    },
    makeConfig(globalDir, false)
  );
  assert.equal(touhou10.success, true);

  const kanako = createCommand(
    {
      title: 'Yasaka Kanako',
      tags: baseTags('character', 'yasaka-kanako'),
      relationships: [
        { predicate: 'appears-in', target: 'touhou-10', qualifiers: [{ key: 'role', value: 'major' }] },
        { predicate: 'appears-in', target: 'touhou-11', qualifiers: [{ key: 'role', value: 'minor' }] },
        { predicate: 'appears-in', target: 'touhou-17-5', qualifiers: [{ key: 'role', value: 'major' }] },
        { predicate: 'part-of', target: 'touhou-project' },
      ],
      content: 'A character from Touhou Project.',
    },
    makeConfig(globalDir, false)
  );
  assert.equal(kanako.success, true);

  const storedKanako = readArticle('yasaka-kanako', makeConfig(globalDir, false));
  assert.ok(storedKanako);
  assert.equal(storedKanako?.relationships.length, 4);
  assert.deepEqual(storedKanako?.relationships[0], {
    predicate: 'appears-in',
    target: 'touhou-10',
    qualifiers: [{ key: 'role', value: 'major' }],
  });

  const readResult = readCommand({ slug: 'touhou-10' }, makeConfig(globalDir, false));
  assert.equal(readResult.success, true);
  assert.match(formatReadResult(readResult), /Relationships:/);
  assert.match(formatReadResult(readResult), /instance-of -> video-game \[medium:game\]/);
  assert.match(formatReadResult(readResult), /part-of -> touhou-project \[franchise:touhou-project\]/);

  const franchiseSearch = searchCommand(
    { tags: [{ key: 'part-of', value: 'touhou-project' }] },
    makeConfig(globalDir, false)
  );
  assert.equal(franchiseSearch.count, 2);
  assert.match(formatSearchResult(franchiseSearch), /Touhou 10/);
  assert.match(formatSearchResult(franchiseSearch), /Yasaka Kanako/);

  const majorAppearanceSearch = searchCommand(
    { tags: [{ key: 'role', value: 'major' }] },
    makeConfig(globalDir, false)
  );
  assert.equal(majorAppearanceSearch.count, 1);
  assert.match(formatSearchResult(majorAppearanceSearch), /Yasaka Kanako/);

  const tagIndex = tagsCommand({ key: 'part-of' }, makeConfig(globalDir, false));
  assert.equal(tagIndex.tags.length, 1);
  assert.equal(tagIndex.tags[0].value, 'touhou-project');
  assert.equal(tagIndex.tags[0].articles.length, 2);
  assert.match(formatTagIndex(tagIndex), /part-of/);
  assert.match(formatTagIndex(tagIndex), /touhou-project/);

  rmSync(root, { recursive: true, force: true });
});
