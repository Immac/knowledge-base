# Knowledge Base

A file-based knowledge base for LLMs where articles are linked via shared value tags instead of folders.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Pi Extension](https://img.shields.io/badge/pi--extension-orange?style=flat-square)

## Features

- 🔍 Store and discover articles by structured value tags
- 🛠️ Create, read, edit, list, and search markdown articles
- 📚 Build a tag index with related tag relationships
- 🧱 Keep extension code separate from article data
- 🔁 Auto-initialize the knowledge base folder and git repo on first use
- 🏷️ Suggest consistent tags with the bundled `suggest-tags` skill

## Tools

| Tool | Description |
|---|---|
| `kb-list` | List all articles in the knowledge base |
| `kb-create` | Create a new article from title, tags, and optional markdown content |
| `kb-read` | Read an article by slug |
| `kb-edit` | Update title, tags, or content for an existing article |
| `kb-tags` | Show the tag index and related tags |
| `kb-search` | Search by tags, content, or both |

## Quick Start

### Install

```bash
pi install ./knowledge-base
```

### First use

The extension stores article data outside the extension repo:

- Global: `~/.pi/knowledge-base/`
- Local: `./knowledge-base/` if that folder exists in the current workspace

On first use, the data folder is created and initialized as a git repository.

### Create an article

```text
kb-create --title "Python Errors" --tags "language:python,level:beginner,concept:errors,project:knowledge-base" --content "Common Python errors and how to handle them."
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

### Show tag relationships

```text
kb-tags
kb-tags --key language
```

### Search by tags or content

```text
kb-search --tags "language:python,level:beginner"
kb-search --content "error handling"
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

Tags are stored as key/value pairs, which makes filtering and cross-linking easy.

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

### Key files

| File | Purpose |
|---|---|
| `knowledge-base.ts` | Extension entry point used by the pi installer |
| `src/index.ts` | Registers the tools |
| `src/storage.ts` | Reads and writes article files |
| `src/parser.ts` | Parses and serializes frontmatter |
| `src/git.ts` | Initializes and commits the data repo |
| `skills/suggest-tags/SKILL.md` | Tagging guidance for articles |

## Resources

- [`skills/suggest-tags/SKILL.md`](./skills/suggest-tags/SKILL.md) — tag suggestion guidance
- [`PLAN.md`](./PLAN.md) — implementation notes and project plan
- [`articles/`](./articles) — sample/reference articles
- [pi-extension-builder](https://github.com/Immac/pi-extension-builder) — documentation style reference
