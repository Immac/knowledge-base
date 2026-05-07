# Knowledge Base Extension - Plan

## Overview

A file-based knowledge base for LLMs where articles are organized as **folder-based block documents**. Each article is a folder containing an `ARTICLE.md` entry point and optional block files. Articles are linked via shared "value tags" and block references.

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
- **Format**: Folder-per-article with blocks

### Directory structure

```
~/.pi/knowledge-base/
├── articles/            # All articles as folders
│   ├── python-errors/
│   │   ├── ARTICLE.md   # Entry point (frontmatter + content)
│   │   ├── overview.md  # Block file
│   │   └── examples.md  # Block file
│   ├── error-handling/
│   │   └── ARTICLE.md
│   └── .../
├── media/               # Managed media files (unchanged)
├── raw/                 # Managed raw files (unchanged)
├── search-index.json    # Auto-generated search index (legacy)
└── .git/                # Git repo for history
```

- **Version control**: Each data folder is a git repository for history
- **Legacy migration**: Existing flat `{slug}.md` files are auto-migrated to `articles/{slug}/ARTICLE.md` on first list/read

## Article Format

### ARTICLE.md (entry point)

```markdown
---
title: Python Errors
slug: python-errors
tags:
  - language:python
  - level:intermediate
blocks:
  - overview
  - examples
created: 2026-05-03T10:00:00.000Z
modified: 2026-05-06T10:00:00.000Z
---

# Python Errors

Common errors and patterns.

!block:overview
!block:examples
```

- **Frontmatter**: title, tags, blocks list (optional), relationships, attachments, timestamps
- **Content**: Markdown with `!block:` references where blocks should be inlined
- **`!block:name`** → resolves to a block in the same article folder
- **`!block:other-article/name`** → resolves to a block in another article

### Block file (e.g., `overview.md`)

```markdown
---
title: Overview
tags:
  - kind:introduction
---

## Error Categories

Python errors fall into three categories: syntax, runtime, and logical.
```

- Blocks have their own frontmatter (title, tags)
- Blocks are taggable and searchable independently
- Block tags merge with parent article tags for indexing

## Block References

| Syntax | Resolution |
|--------|------------|
| `!block:name` | Same-article: `articles/{slug}/name.md` |
| `!block:article-slug/name` | Cross-article: `articles/{article-slug}/name.md` |

### Resolution modes

- **Inline (default)**: `!block:` references are replaced with block content at read time
- **Structured**: Raw `!block:` references preserved, blocks returned as separate items

### Semantic tags

When computing article tags for search/tag-index, block-level tags are merged:
- Article tags from frontmatter
- Relationship-derived tags
- Block tags from each block's frontmatter

## Extension Architecture

### Project Structure

```
knowledge-base/           # extension name
├── src/
│   ├── index.ts          # main entry, registers commands
│   ├── types.ts          # strict type definitions
│   ├── commands/         # tool implementations
│   │   ├── create.ts
│   │   ├── read.ts
│   │   ├── edit.ts
│   │   ├── list.ts
│   │   ├── tags.ts
│   │   ├── search.ts
│   │   ├── transfer.ts   # promote/copy between local and global
│   │   └── files.ts      # media/raw managed file operations
│   ├── storage.ts        # file read/write + block resolution
│   ├── git.ts            # git operations
│   ├── parser.ts         # frontmatter parsing + block ref parsing
│   ├── config.ts         # path resolution
│   └── tag-graph.ts      # tag dedup, relationship parsing
├── articles/             # sample/demo articles (reference only)
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
└── PLAN.md
```

### Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: pi extension runner
- **Dependencies**: 
  - `gray-matter` (frontmatter parsing)
  - `simple-git` (git operations)
  - `typebox` (tool parameter schemas)

## Type Definitions

```typescript
// Key types

interface ValueTag {
  readonly key: string;
  readonly value: string;
}

interface ArticleBlock {
  readonly name: string;       // block filename (without .md)
  readonly title: string;      // from block frontmatter
  readonly content: string;    // block content (after frontmatter)
  readonly tags: readonly ValueTag[];
  readonly filePath: string;
}

interface Article {
  readonly slug: string;
  readonly title: string;
  readonly content: string;       // inline-resolved content (default)
  readonly rawContent: string;    // original ARTICLE.md content
  readonly blocks: readonly ArticleBlock[];
  readonly tags: readonly ValueTag[];
  readonly attachments: readonly string[];
  readonly relationships: readonly TagRelationship[];
  readonly created: Date;
  readonly modified: Date;
  readonly filePath: string;
  readonly isFolder: boolean;     // true = folder-based, false = legacy flat
}
```

## Commands

### Article commands

| Tool | Description |
|------|-------------|
| `kb-list` | List all articles (shows block counts) |
| `kb-read` | Read article by slug (inline by default, `structured=true` for blocks) |
| `kb-create` | Create new article with optional blocks |
| `kb-create-local` | Create article in local knowledge base |
| `kb-edit` | Edit article (manage blocks: add/update/remove) |
| `kb-tags` | Show tag index (includes block tags) |
| `kb-search` | Search by tags or content (searches block content too) |
| `kb-promote` | Promote local article to global |
| `kb-copy-local` | Copy global article to local |

### Managed file commands (unchanged)

| Tool | Description |
|------|-------------|
| `kb-upload-media` | Upload media file |
| `kb-list-media` | List media files |
| `kb-search-media` | Search media files |
| `kb-move-media` | Rename media file |
| `kb-delete-media` | Delete media file |
| `kb-attach-media` | Attach media to article |
| `kb-detach-media` | Detach media from article |
| `kb-upload-raw` | Upload raw file |
| `kb-list-raw` | List raw files |
| `kb-search-raw` | Search raw files |
| `kb-move-raw` | Rename raw file |
| `kb-delete-raw` | Delete raw file |
| `kb-attach-raw` | Attach raw to article |
| `kb-detach-raw` | Detach raw from article |
| `kb-list-attachments` | List all attachments for an article |

## Git Integration

Each data folder is a git repository:
- Initialized if not exists
- Every edit/upload/create creates a commit
- History tracked via `git log`

## Migration

Legacy flat `{slug}.md` files at the data root are auto-migrated:
1. Create `articles/` folder if missing
2. For each `{slug}.md`, create `articles/{slug}/ARTICLE.md` with same content
3. Delete the flat file
4. Migration runs on first `kb-list` or `kb-create`

## Value Tags

Tags are structured key-value pairs:

```yaml
tags:
  - language:python
  - level:beginner
  - framework:fastapi
  - status:draft
```

This enables:
- **Emergent links**: Articles share connections via shared tag values
- **Filtering**: `level:intermediate` finds all intermediate articles
- **Block tags**: Blocks can have their own tags, merged into article's semantic tag set
