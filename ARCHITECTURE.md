# Architecture

## Purpose

`knowledge-base` is a pi tool extension for managing a file-based knowledge base of markdown articles. It keeps article data separate from extension code, stores metadata in YAML frontmatter, and uses structured value tags to make discovery and filtering LLM-friendly.

## Goals

- Keep article data outside the extension repository
- Make articles easy to inspect, diff, and move
- Provide a small, explicit tool surface
- Support both global and workspace-local knowledge bases
- Support media uploads and arbitrary raw files alongside articles
- Support tagging, search, move, delete, and attachment links for assets
- Keep promotion/copy workflows one-way and unambiguous for LLMs

## System Components

| Component | File(s) | Responsibility |
|---|---|---|
| Extension entrypoint | `knowledge-base.ts`, `src/index.ts` | Registers pi tools |
| Configuration | `src/config.ts` | Resolves global/local data paths |
| Storage layer | `src/storage.ts` | Reads, writes, lists, edits, and links article files plus managed media/raw files |
| Parser/serializer | `src/parser.ts` | Converts between markdown/frontmatter and typed articles |
| Git integration | `src/git.ts` | Initializes and commits the data repo |
| Command layer | `src/commands/*.ts` | Formats tool output and handles action-specific logic |

## Data Layout

The extension code is installed separately from user data:

- Extension code: `~/.pi-extensions/knowledge-base/`
- Global article data: `~/.pi/knowledge-base/`
- Local article data: `./knowledge-base/` when present in the current workspace
- Managed media files: `media/` inside each knowledge base folder
- Managed raw files: `raw/` inside each knowledge base folder

Each managed file stores tags in a small sidecar metadata file so the file payload and the metadata stay separate. Attachment links are tracked both on the article frontmatter and in the asset sidecar metadata.

Each knowledge base folder is initialized as a git repository on first use.

## Core Principles

### 1. Keep data flat

Articles are stored as individual `.md` files, one per slug. This keeps the knowledge base easy to inspect and move between scopes.

### 2. Use value tags and relationship tags

Tags are stored as key/value pairs instead of free-form labels. This makes filtering and relationship building predictable for LLMs.

When the knowledge needs graph structure, add relationship records with predicates like `part-of`, `instance-of`, `appears-in`, or `alias-of`. Those relations can carry qualifier tags such as `role:major` or `medium:game`.

The tagging system is intentionally open-ended:

- repeat keys freely when they describe different things
- introduce new keys when the article needs them
- keep exact duplicate key/value pairs out of articles
- let the article corpus determine which tag combinations are useful over time
- use relationship predicates for DAG edges instead of forcing everything into one flat tag

### 3. Keep tools narrow

Each tool maps to a single user intent:

- `kb-list`
- `kb-create`
- `kb-create-local`
- `kb-read`
- `kb-edit`
- `kb-tags`
- `kb-search`
- `kb-promote`
- `kb-copy-local`
- `kb-upload-media`
- `kb-list-media`
- `kb-search-media`
- `kb-move-media`
- `kb-delete-media`
- `kb-attach-media`
- `kb-detach-media`
- `kb-upload-raw`
- `kb-list-raw`
- `kb-search-raw`
- `kb-move-raw`
- `kb-delete-raw`
- `kb-attach-raw`
- `kb-detach-raw`
- `kb-list-attachments`

### 4. Be resilient

Git initialization and commits are best-effort. Core file operations still succeed if git operations fail.

### 5. Prefer readable output

Tool responses are plain text, making them easy for both humans and LLMs to inspect.

## Interaction Flows

### Create article

1. User calls `kb-create` for a global article or `kb-create-local` for a workspace article
2. `src/index.ts` resolves the correct knowledge base scope
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

### Promote or copy between scopes

1. User calls `kb-promote` or `kb-copy-local`
2. The source scope is resolved explicitly in `src/index.ts`
3. The article is read from the source folder
4. The destination file is written, optionally replacing an existing article
5. `kb-promote` removes the source file after successful transfer; `kb-copy-local` leaves the source intact

### Upload media or raw files

1. User calls `kb-upload-media` or `kb-upload-raw`
2. `src/index.ts` resolves the target scope and file kind
3. `src/storage.ts` copies the source file into the managed `media/` or `raw/` folder and writes sidecar tag metadata
4. `src/git.ts` attempts to commit the new file
5. `kb-list-media` or `kb-list-raw` can enumerate the stored files and their tags

### Search, move, delete, and attach assets

1. User calls `kb-search-media`, `kb-search-raw`, `kb-move-media`, `kb-move-raw`, `kb-delete-media`, `kb-delete-raw`, `kb-attach-media`, or `kb-attach-raw`
2. `src/index.ts` resolves the target scope and file kind
3. `src/storage.ts` filters by tags, renames or deletes files, and updates attachment metadata
4. Article frontmatter stores attachment links while asset sidecars track reverse links
5. `kb-list-attachments` can show the attachment list for an article

## Command Pipeline

```text
pi tool call
  → src/index.ts
    → command module
      → storage/parser/config/git helpers
        → filesystem + git repo
```

## Why This Structure Works

- The extension entrypoint is tiny and easy to audit
- Storage logic is isolated from formatting logic
- File-based data makes syncing and backups straightforward
- The git repo gives article history without adding database complexity
- Separate one-way transfer tools reduce ambiguity for LLM callers
- The tag model keeps metadata consistent across articles while still allowing open-ended, multi-faceted descriptions
