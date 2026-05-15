# Knowledge Base — User Manual

> **Version 1.0** · A personal wiki with smart tagging and graph relationships, built for LLM agents (and humans).

---

## Table of Contents

1. [What Is the Knowledge Base?](#1-what-is-the-knowledge-base)
2. [Quick Start — 5 Minutes to Your First Article](#2-quick-start--5-minutes-to-your-first-article)
3. [Core Concepts](#3-core-concepts)
   - [3.1 Articles — the building blocks](#31-articles--the-building-blocks)
   - [3.2 Tags — how you find things](#32-tags--how-you-find-things)
   - [3.3 Relationships — connecting articles](#33-relationships--connecting-articles)
   - [3.4 Managed Files — media and raw files](#34-managed-files--media-and-raw-files)
   - [3.5 Scopes — global vs local](#35-scopes--global-vs-local)
4. [Step-by-Step Workflows](#4-step-by-step-workflows)
   - [4.1 Building a topic cluster with relationships](#41-building-a-topic-cluster-with-relationships)
   - [4.2 Drafting locally, then promoting to global](#42-drafting-locally-then-promoting-to-global)
   - [4.3 Attaching an image to an article](#43-attaching-an-image-to-an-article)
   - [4.4 Searching and filtering your knowledge base](#44-searching-and-filtering-your-knowledge-base)
5. [Tagging Strategy Guide](#5-tagging-strategy-guide)
6. [Full Tool Reference](#6-full-tool-reference)
7. [Troubleshooting](#7-troubleshooting)
8. [Glossary](#8-glossary)

---

## 1. What Is the Knowledge Base?

The **Knowledge Base** is a personal wiki system. You write articles as simple markdown files, tag them with key:value pairs, connect them with relationships, and attach media or raw files. Everything is stored as plain files on disk — no database required.

**Who is this for?**

- LLM agents that need to store and retrieve structured knowledge
- Users who want a searchable, taggable personal wiki
- Teams that want to share a lightweight knowledge base via git

**What makes it different?**

| Feature | What it does |
|---|---|
| **Value tags** | `key:value` pairs (e.g., `language:python`) — filter and discover articles |
| **Relationship tags** | Graph edges between articles (`part-of`, `appears-in`) with optional qualifiers |
| **Semantic search** | Searching by tag also finds articles connected via relationships |
| **Dual scope** | A global knowledge base (`~/.pi/knowledge-base/`) and local ones per workspace |
| **Managed files** | Upload images, PDFs, datasets — tag them and attach to articles |
| **Auto-git** | Every knowledge base folder is its own git repo with automatic commits |

---

## 2. Quick Start — 5 Minutes to Your First Article

### Step 1: Install

```bash
pi install ./knowledge-base
```

The extension installs to `~/.pi-extensions/knowledge-base/`. Your articles will be stored separately.

### Step 2: Create your first article

```text
kb-create --title "Python Errors" --tags "language:python,level:beginner,concept:errors" --content "
Common Python errors beginners encounter:

- **NameError**: variable not defined
- **TypeError**: operation on wrong type
- **IndexError**: list index out of range
"
```

You'll see:

```
Created: Python Errors
Slug: python-errors
Scope: global
Path: ~/.pi/knowledge-base/articles/python-errors.md
Tags: language:python, level:beginner, concept:errors
```

### Step 3: Read it back

```text
kb-read --slug python-errors
```

### Step 4: Search by tag

```text
kb-search --tags "language:python"
```

The search returns all articles tagged with `language:python`.

### Step 5: Upload and attach an image

```text
kb-upload-media --sourcePath ./diagram.png --tags "kind:diagram,language:python" --scope global
kb-attach-media --articleSlug python-errors --fileName diagram.png
```

### Step 6: View the tag index

```text
kb-tags
```

This shows every tag key in your knowledge base, its values, and which articles use them.

---

## 3. Core Concepts

### 3.1 Articles — the building blocks

Every article is a markdown file with **YAML frontmatter**.

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
Content goes here in **markdown**.
```

**Slug**: The filename (without `.md`) is the slug. It's derived from the title: lowercase, hyphens instead of spaces, special characters removed.

**Creating articles**:

| Tool | Scope | Use case |
|---|---|---|
| `kb-create` | Global | Permanent articles everyone can see |
| `kb-create-local` | Local | Drafts, workspace notes, experiments |

**Reading articles**: `kb-read --slug <slug>`

**Editing articles**: `kb-edit --slug <slug> --title "..." --tags "..." --content "..."`

**Moving between scopes**:

| Tool | Direction | What happens |
|---|---|---|
| `kb-promote` | Local → Global | Copies to global, removes local |
| `kb-copy-local` | Global → Local | Copies to local, keeps global |

### 3.2 Tags — how you find things

Tags are `key:value` pairs. Think of them as dimensions for filtering.

**Commonly used tag keys:**

| Key | Purpose | Examples |
|---|---|---|
| `language` | Programming language | `python`, `javascript`, `typescript` |
| `level` | Skill level | `beginner`, `intermediate`, `advanced` |
| `concept` | Subject matter | `errors`, `architecture`, `async` |
| `kind` | Type of content | `article`, `tutorial`, `reference`, `extension` |
| `type` | Classification | `overview`, `guide`, `api-doc` |
| `topic` | Broad topic area | `knowledge-base`, `tools`, `tagging` |
| `project` | Project name | `knowledge-base`, `pi-coding-agent` |
| `domain` | Application domain | `backend`, `frontend`, `devops` |
| `source` | Origin | `repo`, `manual`, `imported` |
| `status` | Lifecycle | `draft`, `published`, `archived` |

**Rules for tagging:**

- ✅ Repeat the same key with different values: `concept:errors`, `concept:debugging`
- ❌ Don't repeat the exact same key:value pair in one article
- ✅ Introduce new keys when they help
- ✅ Let the corpus decide which tag combinations are useful

**The tag index** (`kb-tags`) aggregates all tags across all articles. It shows:

```
language: python, javascript, typescript
level: beginner, intermediate
concept: errors, architecture
```

### 3.3 Relationships — connecting articles

Relationships turn your flat list of articles into a **directed acyclic graph (DAG)**.

**How they look in frontmatter:**

```yaml
---
title: Yasaka Kanako
tags:
  topic: touhou
  kind: character
relationships:
  - predicate: appears-in
    target: touhou-10
    qualifiers:
      - key: role
        value: major
  - predicate: appears-in
    target: touhou-11
    qualifiers:
      - key: role
        value: minor
  - predicate: appears-in
    target: touhou-17-5
    qualifiers:
      - key: role
        value: major
  - predicate: part-of
    target: moriya-shrine
---
```

**Creating articles with relationships:**

```text
kb-create --title "Yasaka Kanako" --tags "topic:touhou,kind:character" --relationships "[{\"predicate\":\"appears-in\",\"target\":\"touhou-10\",\"qualifiers\":[{\"key\":\"role\",\"value\":\"major\"}]}]" --content "..."
```

**Available predicates:**

| Predicate | Meaning | Example |
|---|---|---|
| `part-of` | Child → Parent | A character belongs to a group |
| `instance-of` | Instance → Category | A specific error is an instance of a class |
| `appears-in` | Entity → Container | A character appears in a game |
| `alias-of` | Synonym | A nickname maps to the canonical name |
| `related-to` | Undirected link | Two loosely related articles |

**How relationships affect search:**

When you search by a tag, the system also considers **semantic tags** derived from relationships. For example, if `Yasaka Kanako` has `appears-in` → `touhou-10` with qualifier `role:major`, then searching `topic:touhou` will find `Yasaka Kanako` even though the tag is on `touhou-10`, not on `Kanako` directly.

![Relationship graph diagram](diagrams/output/relationships.png)
*Figure: Articles connected via relationship predicates with qualifier tags.*

### 3.4 Managed Files — media and raw files

You can upload files alongside your articles. There are two categories:

| Category | Folder | Use for | Tools |
|---|---|---|---|
| **Media** | `media/` | Images, audio, video | `kb-upload-media`, `kb-list-media`, `kb-search-media`, `kb-attach-media`, ... |
| **Raw** | `raw/` | PDFs, datasets, code archives, binaries | `kb-upload-raw`, `kb-list-raw`, `kb-search-raw`, `kb-attach-raw`, ... |

**The difference is conceptual, not functional.** Both work identically under the hood — the split helps LLMs and users decide where to look.

**Upload a file:**

```text
kb-upload-media --sourcePath ./architecture.png --name architecture.png --tags "kind:diagram,project:knowledge-base" --scope global
```

**Attach a file to an article:**

```text
kb-attach-media --articleSlug python-errors --fileName architecture.png
```

**List attachments on an article:**

```text
kb-list-attachments --slug python-errors
```

**Detach and delete:**

```text
kb-detach-media --articleSlug python-errors --fileName architecture.png
kb-delete-media --name architecture.png --scope global
```

**How file metadata works:**

Each file has a **sidecar** metadata file that stores tags and attachment links. This keeps the file content untouched.

```
media/
  architecture.png
  architecture.png.meta.yaml   ← tags + attachment links
```

### 3.5 Scopes — global vs local

| Scope | Location | Purpose |
|---|---|---|
| **Global** | `~/.pi/knowledge-base/` | Permanent, shared across all workspaces |
| **Local** | `./knowledge-base/` (in current directory) | Workspace-specific, ephemeral |

**When to use local:**

- Drafting articles before promoting
- Project-specific notes you don't want in the global KB
- Workspace configuration documentation

**When to use global:**

- Reference articles you reuse across projects
- Shared team knowledge
- Completed, polished content

---

## 4. Step-by-Step Workflows

### 4.1 Building a topic cluster with relationships

This workflow creates a set of connected articles — like a mini-wiki on one topic.

**Goal:** Create a Touhou Project knowledge cluster with games, characters, and groups.

#### Step 1: Create a game article

```text
kb-create --title "Touhou 10: Mountain of Faith" --tags "topic:touhou,kind:game,series:windows" --content "Touhou 10 is the 10th game in the Touhou Project series..."
```

Slug: `touhou-10-mountain-of-faith`

#### Step 2: Create a character article with a relationship

```text
kb-create --title "Yasaka Kanako" --tags "topic:touhou,kind:character,species:goddess" --relationships "[{\"predicate\":\"appears-in\",\"target\":\"touhou-10-mountain-of-faith\",\"qualifiers\":[{\"key\":\"role\",\"value\":\"major\"}]}]" --content "Yasaka Kanako is the main antagonist of Touhou 10..."
```

#### Step 3: Create a group article

```text
kb-create --title "Moriya Shrine" --tags "topic:touhou,kind:group" --relationships "[{\"predicate\":\"appears-in\",\"target\":\"touhou-10-mountain-of-faith\",\"qualifiers\":[{\"key\":\"role\",\"value\":\"setting\"}]}]" --content "The Moriya Shrine is a location in Touhou 10..."
```

#### Step 4: Link the character to the group

```text
kb-edit --slug yasaka-kanako --relationships "[{\"predicate\":\"appears-in\",\"target\":\"touhou-10-mountain-of-faith\",\"qualifiers\":[{\"key\":\"role\",\"value\":\"major\"}]},{\"predicate\":\"part-of\",\"target\":\"moriya-shrine\",\"qualifiers\":[]}]"
```

#### Step 5: Verify with tag index

```text
kb-tags --key topic
```

Shows all articles tagged `topic:touhou`.

#### Step 6: Search finds connected articles

```text
kb-search --tags "topic:touhou"
```

This finds the game, the character, and the group — all linked via the relationship graph.

![Building a topic cluster workflow](diagrams/output/create-cluster.png)
*Figure: Step-by-step flow for creating a topic cluster with relationships.*

### 4.2 Drafting locally, then promoting to global

**Goal:** Write a draft in the workspace, polish it, then make it permanent.

#### Step 1: Create a local draft

```text
kb-create-local --title "Draft: Async Patterns" --tags "status:draft,topic:async,language:python" --content "Working notes on async/await patterns..."
```

#### Step 2: Edit and refine

```text
kb-edit --slug draft-async-patterns --title "Async Patterns in Python" --tags "status:published,language:python,level:intermediate,concept:async" --content "Complete guide to async/await..."
```

#### Step 3: Promote to global

```text
kb-promote --slug draft-async-patterns
```

The local copy is removed. The global copy is now at `~/.pi/knowledge-base/articles/async-patterns-in-python.md`.

![Promote workflow diagram](diagrams/output/promote.png)
*Figure: Promoting a local draft article to the global knowledge base.*

### 4.3 Attaching an image to an article

**Goal:** Upload a architecture diagram and link it to an article.

#### Step 1: Upload the media file

```text
kb-upload-media --sourcePath ./architecture.png --name arch-diagram.png --tags "kind:diagram,project:knowledge-base" --scope global
```

#### Step 2: Attach it to the article

```text
kb-attach-media --articleSlug knowledge-base --fileName arch-diagram.png
```

#### Step 3: Verify the attachment

```text
kb-list-attachments --slug knowledge-base
```

Returns:

```
Attachments for knowledge-base:
- arch-diagram.png (media)
```

#### Step 4: Detach when no longer needed

```text
kb-detach-media --articleSlug knowledge-base --fileName arch-diagram.png
```

#### Step 5: Delete the file

```text
kb-delete-media --name arch-diagram.png --scope global
```

![Media attachment workflow](diagrams/output/attach-media.png)
*Figure: The lifecycle of attaching and detaching a media file to an article.*

### 4.4 Searching and filtering your knowledge base

**Goal:** Find the right article quickly.

#### Search by tags (AND logic)

```text
# Find articles tagged with both language:python AND level:beginner
kb-search --tags "language:python,level:beginner"
```

#### Search by content text

```text
# Find articles that mention "async" in the body
kb-search --content "async"
```

#### Search by both

```text
# Combine tag filter and text search
kb-search --tags "language:python" --content "error handling"
```

#### Explore the tag index

```text
# See all tags
kb-tags

# Filter by a specific key
kb-tags --key language
```

Shows:

```
language: python (2 articles), javascript (1 article), typescript (3 articles)
```

#### List all articles

```text
kb-list
```

---

## 5. Tagging Strategy Guide

### Choosing good tags

A good tag set answers these questions:

| Question | Tag key | Example |
|---|---|---|
| What is this? | `kind` | `article`, `tutorial`, `reference` |
| What topic? | `topic` | `python`, `architecture`, `async` |
| What concept? | `concept` | `errors`, `patterns`, `design` |
| What project? | `project` | `knowledge-base`, `my-app` |
| What language? | `language` | `python`, `typescript` |
| What level? | `level` | `beginner`, `advanced` |
| What status? | `status` | `draft`, `published` |

### Value tags vs relationships — when to use what

| Situation | Use value tags | Use relationships |
|---|---|---|
| Describing the article itself | ✅ `language:python` | ❌ |
| Filtering and discovery | ✅ `topic:async` | ❌ |
| Linking two specific articles | ❌ | ✅ `appears-in` |
| Stating hierarchy | ❌ | ✅ `part-of` |
| Categorization | ✅ `kind:character` | ❌ |
| Qualifying a link with details | ❌ | ✅ qualifier `role:major` |

### Real-world example

```
Article: "Yasaka Kanako"
  Tags: topic:touhou, kind:character, species:goddess
  Relationships:
    - appears-in → "Touhou 10"        [role: major]
    - appears-in → "Touhou 11"        [role: minor]
    - part-of    → "Moriya Shrine"    []
```

The value tags tell the system *what* this article is. The relationships tell it *how this article connects to others*.

### The open-ended principle

Don't overthink the tag taxonomy upfront. Follow these rules:

1. **Start simple** — a few tags per article is fine
2. **Add tags as needed** — if a new dimension helps, introduce a new key
3. **Repeat keys freely** — `concept:errors,concept:debugging` is perfectly valid
4. **Avoid exact duplicates** — don't write the same key:value pair twice in one article
5. **Let the corpus evolve** — useful tag combinations emerge naturally as you add more articles

---

## 6. Full Tool Reference

### Article tools

| Tool | Description | Parameters |
|---|---|---|
| `kb-list` | List all articles | _(none)_ |
| `kb-create` | Create a global article | `title` (required), `tags` (optional), `relationships` (optional), `content` (optional) |
| `kb-create-local` | Create a local article | Same as `kb-create` |
| `kb-read` | Read an article | `slug` (required) |
| `kb-edit` | Edit an article | `slug` (required), `title`, `tags`, `relationships`, `content` (all optional — only provided fields change) |
| `kb-tags` | Show tag index | `key` (optional — filter by tag key) |
| `kb-search` | Search articles | `tags` (optional — AND logic), `content` (optional) |

### Transfer tools

| Tool | Description | Parameters |
|---|---|---|
| `kb-promote` | Move local → global | `slug` (required), `overwrite` (optional) |
| `kb-copy-local` | Copy global → local | `slug` (required), `overwrite` (optional) |

### Media file tools

| Tool | Description | Parameters |
|---|---|---|
| `kb-upload-media` | Upload a media file | `sourcePath` (required), `name` (optional), `tags` (optional), `scope` (optional) |
| `kb-list-media` | List media files | `scope` (optional) |
| `kb-search-media` | Search media files | `scope`, `tags`, `query` (all optional) |
| `kb-move-media` | Rename a media file | `scope`, `sourceName` (required), `destinationName` (required) |
| `kb-delete-media` | Delete a media file | `scope`, `name` (required) |
| `kb-attach-media` | Attach media to article | `scope`, `articleSlug` (required), `fileName` (required) |
| `kb-detach-media` | Detach media from article | `scope`, `articleSlug` (required), `fileName` (required) |

### Raw file tools

Identical to media tools but with `-raw` suffix: `kb-upload-raw`, `kb-list-raw`, `kb-search-raw`, `kb-move-raw`, `kb-delete-raw`, `kb-attach-raw`, `kb-detach-raw`.

### Attachment tools

| Tool | Description | Parameters |
|---|---|---|
| `kb-list-attachments` | List all file attachments for an article | `scope` (optional), `slug` (required) |

---

## 7. Troubleshooting

### "Git commit failed"

File operations succeed even if git commits fail. Your article is saved. The git error is non-fatal.

### "Article not found"

Check:
- Did you use the correct slug? Use `kb-list` to see all slugs.
- Is the article in a different scope? Try with the other scope (local vs global).
- No articles yet? Create one with `kb-create`.

### "Tag search returned nothing"

Tags use AND logic. If you search `language:python,level:advanced`, both tags must be on the same article.

### "Relationships not showing in search"

Relationships create **semantic tags** during search. The article the relationship *points to* determines what semantic tags are added. Verify:
- The target article slug is correct
- The target article has the tags you expect

### "Media file upload failed"

- Check the source path exists and is readable
- File names must be unique within a scope
- If the destination file already exists, use `kb-move-media` to rename or `kb-delete-media` first

### "kb-edit overwrote my content"

`kb-edit` replaces the full content field when you pass `--content`. If you only want to change tags, omit the `--content` parameter.

---

## 8. Glossary

| Term | Definition |
|---|---|
| **Article** | A markdown file with YAML frontmatter, stored as `<slug>.md` |
| **Slug** | URL-safe version of the title, used as the filename |
| **Value tag** | A `key:value` pair stored in the article's frontmatter |
| **Relationship** | A directed edge between two articles with a predicate and optional qualifiers |
| **Predicate** | The type of relationship (`part-of`, `instance-of`, `appears-in`, etc.) |
| **Qualifier** | A `key:value` pair attached to a relationship edge (e.g., `role:major`) |
| **Semantic tag** | A tag derived from a relationship (e.g., the target article's tags) used for search |
| **Global scope** | The system-wide knowledge base at `~/.pi/knowledge-base/` |
| **Local scope** | A workspace-specific knowledge base at `./knowledge-base/` |
| **Managed file** | A file uploaded into `media/` or `raw/` with tag metadata |
| **Sidecar** | A `.meta.yaml` file that stores tags and attachment links for managed files |
| **DAG** | Directed Acyclic Graph — the structure created by relationship links |

---

> **Knowledge Base** — Part of the pi extension ecosystem.
> For developer documentation, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> For tagging guidance, see [`skills/suggest-tags/SKILL.md`](../skills/suggest-tags/SKILL.md).
