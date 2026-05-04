# Knowledge Base

A file-based knowledge base for LLMs where articles are linked via shared "value tags" rather than folder hierarchy.

## Installation

Copy this extension to your pi extensions folder:
- Global: `~/.pi/agent/extensions/`
- Local: `.pi/extensions/`

## Usage

The extension provides these tools:

### kb-list
List all articles in the knowledge base.

### kb-create
Create a new article.
```
kb-create --title "Article Title" --tags "language:python,level:beginner" --content "Markdown content..."
```

### kb-read
Read an article by slug.
```
kb-read --slug python-errors
```

### kb-edit
Edit an existing article.
```
kb-edit --slug python-errors --title "New Title" --tags "language:python,level:intermediate"
```

### kb-tags
Show tag index and relationships.
```
kb-tags
kb-tags --key language
```

### kb-search
Search articles by tags or content.
```
kb-search --tags "language:python,level:beginner"
kb-search --content "error handling"
```

## Data Location

- **Global**: `~/.pi/knowledge-base/`
- **Local**: `./knowledge-base/` (relative to cwd)

## Value Tags

Tags are structured key-value pairs:
```yaml
tags:
  language: python
  level: beginner
  framework: fastapi
  status: draft
```

This enables:
- **Emergent links**: Articles share connections via shared tag values
- **Filtering**: `level:intermediate` finds all intermediate articles
- **Organic structure**: Knowledge shape emerges from tags, not folders