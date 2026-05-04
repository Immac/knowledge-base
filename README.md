# Knowledge Base

A file-based knowledge base extension for managing markdown articles with structured value tags, plus one-way promotion and local-copy tools for moving content between global and workspace scopes.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Pi Extension](https://img.shields.io/badge/pi--extension-orange?style=flat-square)

## Features

- 🔍 Store, read, search, and edit markdown articles
- 🛠️ Use value tags for structured discovery and filtering
- 📚 Build a tag index with related-tag relationships
- 🧩 Let tags stay open-ended: repeat keys when needed, but avoid exact duplicate tag pairs
- 🖼️ Upload media files into managed `media/` folders with tags
- 📦 Store arbitrary raw files in managed `raw/` folders with tags
- 🔎 Search, move, delete, and attach managed files
- 🔗 Link articles to media/raw attachments
- ↔️ Promote local articles to global or copy global articles into a local workspace
- ✍️ Create articles globally or in a local workspace with explicit tools
- 🔁 Auto-initialize the article folder and git repo on first use
- 🧱 Keep extension code separate from article data

## Tools

| Tool | Description |
|---|---|
| `kb-list` | List all articles in the current knowledge base |
| `kb-create` | Create a new article in the global knowledge base |
| `kb-create-local` | Create a new article in the local knowledge base |
| `kb-read` | Read an article by slug |
| `kb-edit` | Update an existing article |
| `kb-tags` | Show the tag index and related tags |
| `kb-search` | Search by tags, content, or both |
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

On first use, the folder is created and initialized as a git repository.

### Create an article globally

```text
kb-create --title "Python Errors" --tags "language:python,level:beginner,concept:errors,project:knowledge-base" --content "Common Python errors and how to handle them."
```

### Create an article locally

```text
kb-create-local --title "Draft Note" --tags "status:draft,project:knowledge-base" --content "Working notes for the current workspace."
```

## Usage Examples

### List articles

```text
kb-list
```

### Read an article

```text
kb-read --slug python-errors
```

### Update an article

```text
kb-edit --slug python-errors --title "Python Error Handling" --tags "language:python,level:intermediate,concept:errors,project:knowledge-base"
```

### Search by tags or content

```text
kb-search --tags "language:python,level:beginner"
kb-search --content "error handling"
```

### Promote a local article to global

```text
kb-promote --slug python-errors
```

### Copy a global article into the local workspace

```text
kb-copy-local --slug shared-reference
```

### Upload media

```text
kb-upload-media --sourcePath ./banner.png --name banner.png --tags "kind:media,project:knowledge-base" --scope global
kb-list-media --scope global
kb-search-media --scope global --tags "kind:media"
kb-attach-media --scope global --articleSlug python-errors --fileName banner.png
kb-list-attachments --scope global --slug python-errors
```

### Upload raw files

```text
kb-upload-raw --sourcePath ./dataset.bin --name dataset.bin --tags "kind:raw,project:knowledge-base" --scope local
kb-list-raw --scope local
kb-search-raw --scope local --tags "kind:raw"
kb-move-raw --scope local --sourceName dataset.bin --destinationName dataset-renamed.bin
kb-delete-raw --scope local --name dataset-renamed.bin
```

## Data Model

Articles are stored as markdown files with YAML frontmatter:

```yaml
---
title: Python Errors
tags:
  language: python
  level: beginner
  concept: errors
  project: knowledge-base
created: 2026-05-03T11:00:00.000Z
modified: 2026-05-03T11:00:00.000Z
---
```

Tags are stored as key/value pairs, which makes filtering and cross-linking easy. The tagging model is intentionally open-ended: repeat keys when needed, do not duplicate the exact same tag pair, and introduce new keys when they help describe the article. Managed media and raw files store the same style of tags in sidecar metadata files.

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
| `src/storage.ts` | Resolves paths and reads/writes article and file assets |
| `src/parser.ts` | Parses and serializes frontmatter |
| `src/git.ts` | Initializes and commits the data repo |
| `src/commands/*.ts` | Command-specific logic and formatting |

## Resources

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — extension structure and interaction flows
- [`skills/suggest-tags/SKILL.md`](./skills/suggest-tags/SKILL.md) — tag suggestion guidance
- [`PLAN.md`](./PLAN.md) — implementation notes and project plan
- [pi-extension-builder](https://github.com/Immac/pi-extension-builder) — documentation style reference
