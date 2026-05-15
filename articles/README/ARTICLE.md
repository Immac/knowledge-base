# Knowledge Base

A file-based knowledge base extension for managing markdown articles as **folder-based block documents** with structured value tags. Each article is a folder containing an `ARTICLE.md` entry point and optional block files, plus one-way promotion and local-copy tools for moving content between global and workspace scopes.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Pi Extension](https://img.shields.io/badge/pi--extension-orange?style=flat-square)

## Features

- 🔍 Store, read, search, and edit markdown articles as **folder-based block documents**
- 🧱 Compose articles from **taggable block files** — blocks can be referenced within the same article or across articles
- 🔄 **Block references** (`!block:name` and `!block:article-slug/name`) resolved inline at read time
- 📋 Read articles in **inline** (default, blocks resolved into content) or **structured** mode (raw references + separate blocks)
- 🛠️ Use value tags plus relationship tags for structured discovery and filtering
- 📚 Build a semantic tag index with relationship-aware graph links — block-level tags are included automatically
- 🖼️ Upload media files into managed `media/` folders with tags
- 📦 Store arbitrary raw files in managed `raw/` folders with tags
- 🔎 Search, move, delete, and attach managed files — search also finds content inside blocks
- 🔗 Link articles to media/raw attachments
- ↔️ Promote local articles to global or copy global articles into a local workspace
- ✍️ Create articles globally or in a local workspace with explicit tools
- 🔁 Auto-initialize the article folder and git repo on first use
- 🧱 Keep extension code separate from article data
- 📦 **Auto-migration** from legacy flat `.md` files to folder-based layout

## Tools

| Tool | Description |
|---|---|
| `kb-list` | List all articles in the current knowledge base (shows block counts) |
| `kb-create` | Create a new article in the global knowledge base (optional blocks) |
| `kb-create-local` | Create a new article in the local knowledge base |
| `kb-read` | Read an article by slug (inline by default, `structured=true` for blocks) |
| `kb-edit` | Update an existing article (manage blocks: add/update/remove) |
| `kb-tags` | Show the tag index and related tags (includes block tags) |
| `kb-search` | Search by tags, content, or both (searches block content too) |
| `kb-promote` | Promote a local article to the global knowledge base |
| `kb-copy-local` | Copy a global article into the local knowledge base |
| `kb-upload-media` | Upload a tagged media file into the global or local knowledge base |
| `kb-list-media` | List uploaded media files and their tags |
| `kb-search-media` | Search media files by tags or name |
| `kb-move-media` | Rename a media file within a scope |
| `kb-delete-media` | Delete a media file and detach its links |
| `kb-attach-media` | Attach a media file to an article |
| `kb-detach-media` | Detach a media file from an article |
| `kb-upload-raw` | Upload a tagged arbitrary raw file into the global or local knowledge base |
| `kb-list-raw` | List uploaded raw files and their tags |
| `kb-search-raw` | Search raw files by tags or name |
| `kb-move-raw` | Rename a raw file within a scope |
| `kb-delete-raw` | Delete a raw file and detach its links |
| `kb-attach-raw` | Attach a raw file to an article |
| `kb-detach-raw` | Detach a raw file from an article |
| `kb-list-attachments` | List attachments for an article |

## Quick Start

### Install

```bash
pi install ./knowledge-base
```

### First use

The extension stores article data outside the extension repo:

- Global: `~/.pi/knowledge-base/`
- Local: `./knowledge-base/` if that folder exists in the current workspace

On first use, the folder is created and initialized as a git repository. Existing flat `.md` files are automatically migrated to the folder-based layout.

### Create an article globally

```text
kb-create --title "Python Errors" --tags "language:python,level:beginner,concept:errors,project:knowledge-base" --content "Common Python errors and how to handle them."
```

### Create an article with blocks

Pass a JSON array of block definitions:

```text
kb-create --title "Python Errors" --tags "language:python,level:intermediate" \
  --content "# Python Errors\n\nCommon patterns.\n\n!block:overview\n!block:examples" \
  --blocks '[{"name":"overview","content":"## Overview\n\nThree categories of errors.","tags":"kind:introduction"},{"name":"examples","content":"## Examples\n\n```python\nprint(1/0)\n```","tags":"language:python"}]'
```

This creates:
```
~/.pi/knowledge-base/articles/python-errors/
├── ARTICLE.md       ← entry point
├── overview.md      ← block (taggable)
└── examples.md      ← block (taggable)
```

## Usage Examples

### List articles

```text
kb-list
```

Shows article titles with block counts and tag summaries.

### Read an article (inline — default)

Blocks are resolved into the content automatically:

```text
kb-read --slug python-errors
```

### Read an article (structured)

Shows raw `!block:` references and blocks separately:

```text
kb-read --slug python-errors --structured true
```

### Update an article

```text
kb-edit --slug python-errors --title "Python Error Handling" --tags "language:python,level:intermediate,concept:errors,project:knowledge-base"
```

### Update article blocks

```text
kb-edit --slug python-errors \
  --content "# Updated\n\n!block:intro\n!block:details" \
  --blocks '[{"name":"intro","content":"New intro."},{"name":"details","content":"New details.","tags":"kind:body"}]'
```

Old blocks not in the new list are removed.

### Search by tags or content

Block-level tags and content are included:

```text
kb-search --tags "language:python,level:beginner"
kb-search --content "error handling"
kb-search --tags "kind:introduction"       ← finds articles with a block tagged kind:introduction
```

### Promote a local article to global

```text
kb-promote --slug python-errors
```

Entire article folder (including blocks) is moved to global scope.

### Copy a global article into the local workspace

```text
kb-copy-local --slug shared-reference
```

### Upload media

```text
kb-upload-media --sourcePath ./banner.png --name banner.png --tags "kind:media,project:knowledge-base" --scope global
```

## Data Model

Articles are stored as folder-based block documents:

```
~/.pi/knowledge-base/
├── articles/                  # All articles as folders
│   ├── python-errors/
│   │   ├── ARTICLE.md         # Entry point (frontmatter + content)
│   │   ├── overview.md        # Block file (own frontmatter + tags)
│   │   └── examples.md        # Block file
│   └── .../
├── media/                     # Managed media files
├── raw/                       # Managed raw files
└── .git/                      # Git repo for history
```

### ARTICLE.md (entry point)

```yaml
---
title: Python Errors
slug: python-errors
tags:
  - language:python
  - level:intermediate
blocks:
  - overview
  - examples
created: 2026-05-03T11:00:00.000Z
modified: 2026-05-06T11:00:00.000Z
---

# Python Errors

Common patterns.

!block:overview
!block:examples
```

### Block file (e.g., `overview.md`)

```yaml
---
title: Overview
tags:
  - kind:introduction
---

## Error Categories

Python errors fall into three categories.
```

### Block reference syntax

| Syntax | Resolution |
|--------|------------|
| `!block:name` | Same-article: `articles/{slug}/{name}.md` |
| `!block:other-article/name` | Cross-article: `articles/{other-article}/{name}.md` |

### Tags

Tags are stored as key/value pairs, which makes filtering and cross-linking easy. Block-level tags are automatically merged into the article's semantic tag set for search and tag indexing.

For graph-shaped knowledge, articles can also include relationship records in frontmatter (for example `part-of`, `instance-of`, or `appears-in`) with optional qualifier tags.

Managed media and raw files store the same style of tags in sidecar `.meta.json` files.

## Development

### Prerequisites

- Node.js 18+
- npm
- A pi coding-agent runtime with the extension loader

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Type-check

```bash
npx tsc --noEmit
```

### Test

```bash
npm test
```

### Key files

| File | Purpose |
|---|---|
| `knowledge-base.ts` | Extension entrypoint used by the pi installer |
| `src/index.ts` | Registers the tools |
| `src/storage.ts` | Resolves paths, reads/writes articles, resolves block references |
| `src/parser.ts` | Parses and serializes frontmatter, parses `!block:` references |
| `src/config.ts` | Path resolution including articles subfolder |
| `src/git.ts` | Initializes and commits the data repo |
| `src/commands/*.ts` | Command-specific logic and formatting |

## Resources

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — extension structure and interaction flows
- [`skills/suggest-tags/SKILL.md`](./skills/suggest-tags/SKILL.md) — tag suggestion guidance
- [`PLAN.md`](./PLAN.md) — implementation notes and project plan
