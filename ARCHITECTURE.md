# Architecture

## Purpose

`knowledge-base` is a pi tool extension for managing a file-based knowledge base. It stores articles as markdown files with YAML frontmatter and uses structured value tags to create links between articles without relying on folder hierarchy.

## Goals

- Keep article data separate from the extension code
- Make article storage simple, inspectable, and git-friendly
- Provide a small tool surface that is easy for LLMs to reason about
- Support tag-based discovery, filtering, and search

## System Components

| Component | File(s) | Responsibility |
|---|---|---|
| Extension entry point | `knowledge-base.ts`, `src/index.ts` | Registers all tools with pi |
| Configuration | `src/config.ts` | Resolves global/local data paths |
| Storage layer | `src/storage.ts` | Reads, writes, lists, edits, and deletes article files |
| Parser/serializer | `src/parser.ts` | Converts between markdown/frontmatter and typed articles |
| Git integration | `src/git.ts` | Initializes the data repo and commits article changes |
| Command layer | `src/commands/*.ts` | Formats tool results and handles command-specific logic |
| Tagging skill | `skills/suggest-tags/SKILL.md` | Helps choose consistent article tags |

## Data Layout

The extension code is installed separately from the knowledge base data:

- Extension code: `~/.pi-extensions/knowledge-base/`
- Global article data: `~/.pi/knowledge-base/`
- Local article data: `./knowledge-base/` when present in the current workspace

The article folder is initialized as a git repository on first use.

## Core Principles

### 1. Keep data flat
Articles are stored as individual `.md` files, one per slug. That keeps the knowledge base easy to inspect, diff, and move.

### 2. Use value tags
Tags are stored as key/value pairs instead of free-form labels. This makes it easier to filter by dimensions such as language, level, status, or project.

### 3. Keep tools small
Each tool maps to a single user action:

- `kb-list`
- `kb-create`
- `kb-read`
- `kb-edit`
- `kb-tags`
- `kb-search`

### 4. Be resilient
If git initialization or commit creation fails, article operations still complete. Git is used for history, not as a hard dependency for basic reads and writes.

### 5. Prefer readable output
Tool responses are formatted as plain text so they are easy for both humans and LLMs to inspect.

## Interaction Flow

### Create article
1. User calls `kb-create`
2. `src/index.ts` ensures the data folder exists
3. `src/storage.ts` generates a slug and writes the markdown file
4. `src/git.ts` attempts to commit the change
5. A formatted confirmation is returned

### Read/list/search
1. User calls `kb-read`, `kb-list`, `kb-tags`, or `kb-search`
2. The command layer queries article files through `src/storage.ts`
3. Results are formatted into plain text
4. The tool returns the rendered result to pi

### Edit article
1. User calls `kb-edit`
2. The existing article is loaded from disk
3. Fields are updated and the modified timestamp is refreshed
4. The file is rewritten and the change is optionally committed

## Command Pipeline

```text
pi tool call
  → src/index.ts
    → command module
      → storage/parser/config/git helpers
        → filesystem + git repo
```

## Why This Structure Works

- The extension entry point is tiny and easy to audit
- Storage logic is isolated from formatting logic
- File-based data makes syncing and backups straightforward
- The git repo gives article history without adding database complexity
- The tag skill keeps metadata consistent across articles
