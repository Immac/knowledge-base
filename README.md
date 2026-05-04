# Knowledge Base

A file-based knowledge base extension for managing markdown articles with structured value tags, plus one-way promotion and local-copy tools for moving content between global and workspace scopes.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Pi Extension](https://img.shields.io/badge/pi--extension-orange?style=flat-square)

## Features

- 🔍 Store, read, search, and edit markdown articles
- 🛠️ Use value tags for structured discovery and filtering
- 📚 Build a tag index with related-tag relationships
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

### Test

```bash
npm test
```

### Key files

| File | Purpose |
|---|---|
| `knowledge-base.ts` | Extension entrypoint used by the pi installer |
| `src/index.ts` | Registers the tools |
| `src/storage.ts` | Resolves paths and reads/writes article files |
| `src/parser.ts` | Parses and serializes frontmatter |
| `src/git.ts` | Initializes and commits the data repo |
| `src/commands/*.ts` | Command-specific logic and formatting |

## Resources

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — extension structure and interaction flows
- [`skills/suggest-tags/SKILL.md`](./skills/suggest-tags/SKILL.md) — tag suggestion guidance
- [`PLAN.md`](./PLAN.md) — implementation notes and project plan
- [pi-extension-builder](https://github.com/Immac/pi-extension-builder) — documentation style reference
