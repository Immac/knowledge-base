# Architecture

## Purpose

`knowledge-base` is a pi tool extension for managing a file-based knowledge base of markdown articles organized as **folder-based block documents**. It keeps article data separate from extension code, stores metadata in YAML frontmatter, and uses structured value tags to make discovery and filtering LLM-friendly. Articles can be composed of taggable block files that are resolved inline at read time.

## Goals

- Keep article data outside the extension repository
- Make articles easy to inspect, diff, and move
- Support **block composition** — articles as folders with `ARTICLE.md` + taggable block files
- Support **cross-article block references** (`!block:article-slug/name`)
- Support both **inline** and **structured** read modes
- Provide a small, explicit tool surface
- Support both global and workspace-local knowledge bases
- Support media uploads and arbitrary raw files alongside articles
- Support tagging, search, move, delete, and attachment links for assets
- Keep promotion/copy workflows one-way and unambiguous for LLMs
- **Auto-migrate** legacy flat `.md` files to folder-based layout

## System Components

| Component | File(s) | Responsibility |
|---|---|---|
| Extension entrypoint | `knowledge-base.ts`, `src/index.ts` | Registers pi tools |
| Configuration | `src/config.ts` | Resolves global/local data paths, articles subfolder |
| Storage layer | `src/storage.ts` | Reads, writes, lists, edits, deletes articles; resolves block references; manages media/raw files |
| Parser/serializer | `src/parser.ts` | Converts between markdown/frontmatter and typed articles; parses `!block:` references; serializes block files |
| Tag graph | `src/tag-graph.ts` | Tag deduplication, relationship parsing, semantic tag merging |
| Git integration | `src/git.ts` | Initializes and commits the data repo |
| Command layer | `src/commands/*.ts` | Formats tool output and handles action-specific logic |

## Data Layout

The extension code is installed separately from user data:

```
Extension code:  ~/.pi-extensions/knowledge-base/
Global data:     ~/.pi/knowledge-base/
Local data:      ./knowledge-base/   (when present in workspace)
```

### Data directory structure

```
~/.pi/knowledge-base/
├── articles/                  # All articles as folders
│   ├── python-errors/
│   │   ├── ARTICLE.md         # Entry point (frontmatter + content)
│   │   ├── overview.md        # Block file (own frontmatter + tags)
│   │   └── examples.md        # Block file
│   ├── error-handling/
│   │   └── ARTICLE.md
│   └── .../
├── media/                     # Managed media files with .meta.json sidecars
├── raw/                       # Managed raw files with .meta.json sidecars
├── search-index.json          # Auto-generated search index (legacy)
└── .git/                      # Git repo for history
```

### Block reference resolution

Content in `ARTICLE.md` can contain `!block:` references:

| Syntax | Resolution |
|--------|------------|
| `!block:name` | Same-article: `articles/{slug}/{name}.md` |
| `!block:other-article/name` | Cross-article: `articles/{other-article}/{name}.md` |

**Inline mode (default):** `!block:` references are replaced with the resolved block content at read time.

**Structured mode:** `!block:` references are preserved in `rawContent`, and blocks are returned as a separate `ArticleBlock[]` array.

Block content is also searched — `kb-search --content "text"` searches the inline-resolved content of all articles.

### Block tags

Each block file can have its own frontmatter with `title` and `tags`. Block-level tags are automatically merged into the article's semantic tag set. This means:

- `kb-tags` includes block tags in the tag index
- `kb-search --tags "key:value"` matches block-level tags
- `getArticleSemanticTags()` returns deduplicated tags from article + relationships + blocks

### Managed files

Media and raw files store tags in a small sidecar `.meta.json` file so the file payload and metadata stay separate. Attachment links are tracked both on the article frontmatter and in the asset sidecar metadata.

### Git integration

Each knowledge base folder is initialized as a git repository on first use. Every create, edit, upload, move, delete, and attach/detach operation attempts a git commit (best-effort — file ops succeed even if git fails).

### Legacy migration

If the data directory contains flat `.md` files at the root (from the previous single-file-per-article layout), they are automatically migrated to the folder-based layout on first `kb-list` or `kb-create`:

1. `articles/` subfolder is created
2. Each `{slug}.md` is copied to `articles/{slug}/ARTICLE.md`
3. The flat file is deleted
4. Subsequent reads go through the folder-based path

## Core Principles

### 1. Keep data flat but composable

Articles are stored as folders, each containing an `ARTICLE.md` entry point and optional block files. This keeps the knowledge base easy to inspect and move between scopes while allowing content reuse through block references.

### 2. Use value tags, relationship tags, and block tags

Tags are stored as key/value pairs instead of free-form labels. This makes filtering and relationship building predictable for LLMs.

When the knowledge needs graph structure, add relationship records with predicates like `part-of`, `instance-of`, `appears-in`, or `alias-of`. Those relations can carry qualifier tags such as `role:major` or `medium:game`.

Block files can have their own tags, which enrich the article's semantic signature without duplicating metadata in the parent.

The tagging system is intentionally open-ended:

- repeat keys freely when they describe different things
- introduce new keys when the article needs them
- keep exact duplicate key/value pairs out of articles
- let the article corpus determine which tag combinations are useful over time
- use relationship predicates for DAG edges instead of forcing everything into one flat tag

### 3. Keep tools narrow

Each tool maps to a single user intent:

- `kb-list`
- `kb-create` / `kb-create-local`
- `kb-read` (inline by default, `structured=true` for blocks)
- `kb-edit` (manage blocks via `blocks` parameter)
- `kb-tags` (includes block tags)
- `kb-search` (searches block content and tags)
- `kb-promote` / `kb-copy-local`
- `kb-upload-media` / `kb-list-media` / `kb-search-media` / `kb-move-media` / `kb-delete-media` / `kb-attach-media` / `kb-detach-media`
- `kb-upload-raw` / `kb-list-raw` / `kb-search-raw` / `kb-move-raw` / `kb-delete-raw` / `kb-attach-raw` / `kb-detach-raw`
- `kb-list-attachments`

### 4. Be resilient

Git initialization and commits are best-effort. Core file operations still succeed if git operations fail.

### 5. Prefer readable output

Tool responses are plain text, making them easy for both humans and LLMs to inspect.

## Interaction Flows

### Create article

1. User calls `kb-create` for a global article or `kb-create-local` for a workspace article
2. `src/index.ts` resolves the correct knowledge base scope
3. `src/storage.ts` generates a slug, creates `articles/{slug}/` folder, writes `ARTICLE.md` and any block files
4. `src/git.ts` attempts to commit the change
5. A formatted confirmation with slug, path, and block list is returned

### Read/list/search

1. User calls `kb-read`, `kb-list`, `kb-tags`, or `kb-search`
2. The command layer queries article files through `src/storage.ts`
3. For `kb-read`, block references are resolved inline (default) or returned structured
4. For `kb-list`, articles are returned with resolved block information and counts
5. For `kb-tags`, block-level tags are merged into the tag index
6. For `kb-search`, both article and block content/tags are searched
7. Results are formatted into plain text

### Edit article

1. User calls `kb-edit`
2. The existing article is loaded from disk (structured mode)
3. Fields are updated, block files are created/updated/removed as specified in the `blocks` parameter
4. The modified timestamp is refreshed
5. `ARTICLE.md` is rewritten with updated block references
6. The change is optionally committed

### Promote or copy between scopes

1. User calls `kb-promote` or `kb-copy-local`
2. The source scope is resolved explicitly in `src/index.ts`
3. The entire article folder (including blocks) is read from the source
4. The destination folder is created with all files copied
5. `kb-promote` removes the source folder after successful transfer; `kb-copy-local` leaves the source intact

### Upload media or raw files

1. User calls `kb-upload-media` or `kb-upload-raw`
2. `src/index.ts` resolves the target scope and file kind
3. `src/storage.ts` copies the source file into the managed `media/` or `raw/` folder and writes sidecar tag metadata
4. `src/git.ts` attempts to commit the new file

### Search, move, delete, and attach assets

1. User calls the relevant managed-file tool
2. `src/index.ts` resolves the target scope and file kind
3. `src/storage.ts` filters by tags, renames or deletes files, and updates attachment metadata
4. Article frontmatter stores attachment links while asset sidecars track reverse links

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
- Block composition enables content reuse without duplication
- Block-level tags enrich search and discovery automatically
- Folder-based data makes syncing and backups straightforward
- The git repo gives article history without adding database complexity
- Separate one-way transfer tools reduce ambiguity for LLM callers
- The tag model keeps metadata consistent across articles while still allowing open-ended, multi-faceted descriptions
- Auto-migration ensures backward compatibility with existing knowledge bases
