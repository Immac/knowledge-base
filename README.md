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
| `kb-list` | List articles in the knowledge base |
| `kb-create` / `kb-create-local` | Create a new article (global / local workspace) |
| `kb-read` | Read an article by slug (inline or structured mode) |
| `kb-edit` | Edit an existing article |
| `kb-search` | Search articles by tags or content |
| `kb-tags` | Show tag index and relationships |
| `kb-promote` | Promote a local article to the global knowledge base |
| `kb-copy-local` | Copy a global article into the local knowledge base |
| `kb-upload-media` / `kb-list-media` / `kb-search-media` | Media file management |
| `kb-move-media` / `kb-delete-media` | Media file operations |
| `kb-attach-media` / `kb-detach-media` | Attach/detach media to articles |
| `kb-upload-raw` / `kb-list-raw` / `kb-search-raw` | Raw file management |
| `kb-move-raw` / `kb-delete-raw` | Raw file operations |
| `kb-attach-raw` / `kb-detach-raw` | Attach/detach raw files to articles |
| `kb-list-attachments` | List attachment links from an article |

## Architecture

```
~/.pi/knowledge-base/         ← Global KB data (user-wide)
├── articles/                 ← Folder-based article storage
│   ├── <article-slug>/
│   │   ├── ARTICLE.md        ← Entry point
│   │   └── <block-name>.md   ← Optional block files
│   └── ...
└── media/                    ← Managed media files
    └── raw/                  ← Managed raw files

<project>/.pi/knowledge-base/ ← Local KB data (per-workspace)
└── ...                       ← Same structure as global

src/
├── index.ts                  ← Main entry, tool registration
├── storage.ts                ← Data folder management
├── types.ts                  ← Shared types
├── git.js                    ← Git init/commit helpers
├── commands/                 ← One file per tool/group
│   ├── list.ts
│   ├── create.ts
│   ├── read.ts
│   ├── edit.ts
│   ├── tags.ts
│   ├── search.ts
│   ├── files.ts              ← Media & raw file commands
│   └── transfer.ts           ← Promote/copy-local
└── __tests__/                ← Tests
```

## Development

```bash
npm run build    # Compile TypeScript
npm test         # Run tests
```

## Related

- [`knowledge-base-skills`](../knowledge-base-skills/) — Save/install skills from the KB
- [`knowledge-base-reader`](../knowledge-base-reader/) — Standalone web UI for browsing the KB
