# Knowledge Base Extension - Plan

## Overview

A file-based knowledge base for LLMs where articles are linked via shared "value tags" rather than folder hierarchy. Articles are stored as flat markdown files with YAML frontmatter, stored separately from the extension code.

## Data vs Extension Separation

The extension code and the knowledge base data live in completely separate locations:

| Component | Location | Description |
|-----------|----------|-------------|
| Extension (code) | `~/pi-extensions/knowledge-base/` | This repo - the tools/commands |
| Data (articles) | `~/.pi/knowledge-base/` (global) or `./knowledge-base/` (local) | Actual user articles |

The extension reads/writes articles from the data path at runtime. The `articles/` folder in this repo contains sample demo articles for reference only - not used by the running extension.

## Data Storage

- **Global articles**: `~/.pi/knowledge-base/`
- **Local articles**: `./knowledge-base/` (resolved from cwd, local takes priority)
- **Format**: Flat folder of `.md` files
- **Version control**: Each data folder is a git repository for history

## Article Format

```markdown
---
title: Article Title
tags:
  language: python
  level: beginner
created: 2026-05-03T10:00:00.000Z
modified: 2026-05-03T10:00:00.000Z
---

# Article Title

Article content in markdown...
```

- **File naming**: `{slug}.md` (slug derived from title)
- **Tags**: Key-value pairs for rich metadata
- **Timestamps**: ISO 8601 dates

## Value Tags

Tags are structured key-value pairs, not flat tags:

```yaml
tags:
  language: python
  level: beginner
  framework: fastapi
  status: draft
```

This enables:
- **Emergent links**: Articles share connections via shared tag values
- **Filtering**: `level:intermediate` finds all intermediate articles
- **Organic structure**: Knowledge shape emerges from tags, not folders

## Extension Architecture

### Project Structure

```
knowledge-base/           # extension name
├── src/
│   ├── index.ts          # main entry, registers commands
│   ├── types.ts         # strict type definitions
│   ├── commands/        # tool implementations
│   │   ├── create.ts
│   │   ├── read.ts
│   │   ├── edit.ts
│   │   ├── list.ts
│   │   ├── tags.ts
│   │   └── search.ts
│   ├── storage.ts        # file read/write operations
│   ├── git.ts           # git operations
│   ├── parser.ts        # frontmatter parsing
│   └── config.ts        # path resolution
├── articles/           # sample/demo articles (reference only)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: pi extension runner
- **Dependencies**: 
  - `gray-matter` (frontmatter parsing)
  - `simple-git` (git operations)
  - minimal others

## Type Definitions

```typescript
// src/types.ts

export interface ValueTag {
  readonly key: string;
  readonly value: string;
}

export interface ArticleFrontmatter {
  readonly title: string;
  readonly tags: readonly ValueTag[];
  readonly created: string;  // ISO 8601
  readonly modified: string; // ISO 8601
}

export interface Article {
  readonly slug: string;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly ValueTag[];
  readonly created: Date;
  readonly modified: Date;
  readonly filePath: string;
}

export interface TagIndexEntry {
  readonly key: string;
  readonly value: string;
  readonly articles: readonly string[];  // slugs
  readonly relatedTags: readonly ValueTag[];
}

export interface TagIndex {
  readonly tags: readonly TagIndexEntry[];
}

export interface KnowledgeBaseConfig {
  readonly dataPath: string;  // resolved path
  readonly isLocal: boolean;
}

export type CreateOptions = {
  readonly title: string;
  readonly tags?: readonly ValueTag[];
  readonly content?: string;
};

export type EditOptions = {
  readonly slug: string;
  readonly title?: string;
  readonly tags?: readonly ValueTag[];
  readonly content?: string;
};

export type SearchOptions = {
  readonly tags?: readonly ValueTag[];  // tags to match (AND logic)
  readonly content?: string;             // search in content
};
```

## Commands

### `kb-create`

Create a new article.

```typescript
kb-create --title "Python Errors" --tags "language:python,concept:errors,level:intermediate"
```

- Generates slug from title
- Creates file in data folder
- Commits to git

### `kb-read`

Read an article by slug.

```typescript
kb-read --slug python-errors
```

- Parses frontmatter
- Returns formatted output with tags

### `kb-edit`

Edit an existing article.

```typescript
kb-edit --slug python-errors --tags "language:python,concept:errors,level:beginner"
```

- Regenerates timestamps
- Commits changes to git

### `kb-list`

List all articles.

```typescript
kb-list
```

- Returns list with basic metadata

### `kb-tags`

Show tag index and relationships.

```typescript
kb-tags
kb-tags --key language  // filter by key
```

- Shows all tags
- Shows article counts
- Shows related tags

### `kb-search`

Search articles by tags or content.

```typescript
kb-search --tags "language:python,level:beginner"
kb-search --content "error handling"
```

- AND logic for multiple tags
- Full-text search in content

## Git Integration

Each data folder is a git repository:
- Initialized if not exists
- Every edit creates a commit
- History tracked via `git log`
- Can restore previous versions

## Path Resolution

At runtime, the extension resolves the data path when needed:

```typescript
function getDataPath(): KnowledgeBaseConfig {
  // 1. Check local: ./knowledge-base/ (from cwd)
  // 2. Fall back to global: ~/.pi/knowledge-base/
  // 3. Initialize if missing (create folder, git init)
}
```

The `config.ts` handles this resolution. The extension directory itself is NOT the data location - it's the tool. User data always lives in `~/.pi/knowledge-base/` or `./knowledge-base/`.

## Sample Article

```markdown
---
title: Knowledge Base
tags:
  type: index
  status: published
created: 2026-05-03T10:00:00.000Z
modified: 2026-05-03T10:00:00.000Z
---

# Knowledge Base

Welcome to the knowledge base. This is the index article.

## Using the Knowledge Base

- **kb-list**: List all articles
- **kb-tags**: See tag index
- **kb-search**: Find articles by tags

## Tag Categories

- `language:*` - Programming language
- `level:*` - Difficulty level
- `type:*` - Article type
- `status:*` - Publication status
```

## Implementation Phases

### Phase 0: Repository Setup

**Goal**: Initialize git repository with master branch

**Steps**:
1. Create directory structure
2. Initialize git: `git init -b master`
3. Create `.gitignore`
4. Create initial `README.md`

**Completed Condition**:
- Git repo exists on `master` branch
- `.gitignore` contains standard entries (node_modules, dist, etc.)

**Proof**:
```bash
git branch         # shows master
git status        # clean
cat .gitignore    # entries present
```

**Note**: The data folder (`~/.pi/knowledge-base/`) is a SEPARATE git repo - not this extension repo. We initialize it when first used.

**Commit**: "init: repository setup with master branch"

---

### Phase 1: Core Types & Utilities

**Goal**: Define types and basic parsing utilities

**Steps**:
1. Create `src/types.ts` with all interfaces
2. Create `src/parser.ts` for frontmatter parsing
3. Create `src/config.ts` for path resolution
4. Set up `tsconfig.json` (strict mode)
5. Set up `package.json`

**Completed Condition**:
- All types defined in `src/types.ts`
- `parser.ts` can parse article frontmatter
- `config.ts` resolves local/global paths
- TypeScript compiles without errors

**Proof**:
```bash
npx tsc --noEmit      # no errors
# Test parser ad-hoc:
node -e "require('./dist/parser').parseFrontmatter(...)"
```

**Commit**: "feat: core types and utilities"

---

### Phase 2: Storage Layer

**Goal**: File system operations for articles

**Steps**:
1. Create `src/storage.ts`
2. Implement `readArticle()`, `writeArticle()`, `listArticles()`
3. Handle slug generation from titles
4. Ensure data folder exists

**Completed Condition**:
- Can create article files
- Can read article files
- Can list all articles
- Files named by slug

**Proof**:
```bash
# Test ad-hoc via pi against ~/.pi/knowledge-base/:
# - create article via storage
# - verify file exists in dataPath
# - read back and verify content
ls ~/.pi/knowledge-base/*.md      # files present
```

**Commit**: "feat: storage layer for articles"

---

### Phase 3: Git Integration

**Goal**: Git operations for history

**Steps**:
1. Create `src/git.ts`
2. Implement `initRepo()`, `commit()`, `log()`
3. Auto-initialize git in data folder
4. Auto-commit on changes

**Completed Condition**:
- Data folder is a git repo
- Commits created on article changes
- Can retrieve history

**Proof**:
```bash
# In data folder:
cd ~/.pi/knowledge-base
git log --oneline    # shows commits
git status          # working tree clean after operations
```

**Commit**: "feat: git integration for history"

---

### Phase 4: List & Read Commands

**Goal**: Basic read operations

**Steps**:
1. Create `src/commands/list.ts`
2. Create `src/commands/read.ts`
3. Wire to extension

**Completed Condition**:
- `kb-list` returns all articles with metadata
- `kb-read --slug X` returns article content

**Proof**:
```bash
# Test ad-hoc via pi:
kb-list           # returns array of articles
kb-read --slug X   # returns article with title, tags, content
```

**Commit**: "feat: implement kb-list and kb-read"

---

### Phase 5: Create & Edit Commands

**Goal**: Write operations

**Steps**:
1. Create `src/commands/create.ts`
2. Create `src/commands/edit.ts`
3. Wire to extension

**Completed Condition**:
- `kb-create` creates new article in data folder
- `kb-edit` updates existing article
- Timestamps auto-updated on edit

**Proof**:
```bash
# Test ad-hoc via pi:
kb-create --title "Test Article" ...
# verify file created with frontmatter
kb-read --slug test-article
kb-edit --slug test-article --title "New Title"
# verify timestamp changed, content updated
```

**Commit**: "feat: implement kb-create and kb-edit"

---

### Phase 6: Tags & Search Commands

**Goal**: Tag index and search

**Steps**:
1. Create `src/commands/tags.ts` (tag index)
2. Create `src/commands/search.ts`
3. Build tag relationships

**Completed Condition**:
- `kb-tags` returns all tags with article counts
- `kb-search --tags "key:value"` finds matching articles
- `kb-search --content "text"` full-text search

**Proof**:
```bash
# Test ad-hoc via pi:
kb-tags                         # returns tag index
kb-search --tags "language:py*"  # finds articles
kb-search --content "error"       # finds articles
```

**Commit**: "feat: implement kb-tags and kb-search"

---

### Phase 7: Main Entry & Registration

**Goal**: Wire all commands to pi

**Steps**:
1. Create `src/index.ts`
2. Register all commands
3. Test extension loads

**Completed Condition**:
- Extension loads without errors
- All commands registered and callable
- Help text available

**Proof**:
```bash
# Test ad-hoc via pi:
kb-help   # or check registered commands
kb-list  # works from extension
```

**Commit**: "feat: main entry and command registration"

---

### Phase 8: Sample Articles & Smoke Test

**Goal**: Working demo and validation

**Steps**:
1. Create sample articles in `articles/`
2. Run smoke tests on all commands
3. Document usage in README

**Completed Condition**:
- Sample articles exist and valid
- All 6 commands work end-to-end
- Extension ready to use

**Proof**:
```bash
# Smoke test all commands:
kb-list                              # returns articles
kb-read --slug sample               # returns content  
kb-create --title "Smoke Test" ...  # creates article
kb-edit --slug smoke-test ...       # edits article
kb-tags                             # shows tag index
kb-search --tags "type:index"      # finds articles
# All work without errors
```

**Commit**: "feat: sample articles and smoke tests"

---

## TypeScript Correctness

After each phase, verify:
```bash
npx tsc --noEmit        # no type errors
npx tsc --strict        # strict mode enabled
```

## Test Strategy

- **Ad-hoc testing**: Use pi to manually test each command after implementation against data in `~/.pi/knowledge-base/`
- **Smoke tests**: Run all 6 commands end-to-end against the data folder
- **Git verification**: Check `git log` in `~/.pi/knowledge-base/` shows correct commits between phases

## .gitignore

```
node_modules/
dist/
.build/
*.log
.env
.env.local
.DS_Store
```

Note: The `articles/` folder in this repo is for demo/reference only. User data lives in `~/.pi/knowledge-base/` - a separate git repository.