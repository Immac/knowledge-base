---
title: Knowledge Base
tags:
  type: index
  status: published
  project: knowledge-base
created: 2026-05-03T10:00:00.000Z
modified: 2026-05-04T00:00:00.000Z
---

# Knowledge Base

Welcome to the knowledge base. This is the index article.

## Using the Knowledge Base

- **kb-list**: List all articles
- **kb-tags**: See tag index
- **kb-search**: Find articles by tags
- **kb-promote**: Promote a local article to global
- **kb-copy-local**: Copy a global article into the local workspace

## Tag Categories

- `language:*` - Programming language
- `level:*` - Difficulty level
- `type:*` - Article type
- `status:*` - Publication status
- `concept:*` - Main topic or concept
- `domain:*` - Knowledge domain
- `source:*` - Where it came from
- **`project:*`** - **Project identifier** (always include this)

## Project Tagging

All articles should include a `project:<project-name>` tag to categorize by project. For this knowledge base, use `project:knowledge-base`.

## Scope Notes

- Global articles live in `~/.pi/knowledge-base/`
- Local articles live in `./knowledge-base/` when the workspace has its own knowledge base folder
- Use `kb-promote` to move a local draft into the global knowledge base when it is ready
- Use `kb-copy-local` to bring a shared global article into the current workspace