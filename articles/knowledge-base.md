---
title: Knowledge Base
tags:
  kind: article
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
- **kb-upload-media**: Upload media files with tags
- **kb-list-media**: List media files and tags
- **kb-search-media**: Search media files by tags or name
- **kb-move-media**: Rename media files while preserving links
- **kb-delete-media**: Delete media files and detach links
- **kb-attach-media**: Attach media files to articles
- **kb-detach-media**: Detach media files from articles
- **kb-upload-raw**: Upload raw files with tags
- **kb-list-raw**: List raw files and tags
- **kb-search-raw**: Search raw files by tags or name
- **kb-move-raw**: Rename raw files while preserving links
- **kb-delete-raw**: Delete raw files and detach links
- **kb-attach-raw**: Attach raw files to articles
- **kb-detach-raw**: Detach raw files from articles
- **kb-list-attachments**: Show all attachments for an article

## Tag Categories

- `kind:*` - What the thing is (tool, skill, article, extension, app, repo)
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

## Tagging Rules

- Repeat keys when they describe different aspects of the same article or asset
- Do not repeat the exact same key/value pair twice
- Allow the corpus to accumulate enough tags for order to emerge later
- Managed media and raw files can store tags in sidecar metadata files
- Articles can link to managed files using attachment paths like `media/banner.png` or `raw/dataset.bin`

## Scope Notes

- Global articles live in `~/.pi/knowledge-base/`
- Local articles live in `./knowledge-base/` when the workspace has its own knowledge base folder
- Use `kb-promote` to move a local draft into the global knowledge base when it is ready
- Use `kb-copy-local` to bring a shared global article into the current workspace