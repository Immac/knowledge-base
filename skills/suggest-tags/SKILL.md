---
name: suggest-tags
description: Suggest appropriate tags for knowledge base articles based on their title and content.
---

# Suggest Tags - Knowledge Base Tagging Skill

This skill helps the LLM analyze an article and suggest appropriate tags based on established knowledge organization best practices.

## When to use

Use this skill when:
- Creating a new article via `kb-create`
- Editing an article's tags via `kb-edit`
- Reviewing existing articles to suggest improved tags
- Building a new article from scratch

## Tagging Strategy

### Tag Categories

Good tag systems use multiple orthogonal dimensions:

| Category | Description | Examples |
|----------|------------|----------|
| `kind` | What the artifact is | `tool`, `skill`, `article`, `extension`, `app`, `repo` |
| `language` | Programming language | `python`, `javascript`, `rust`, `go` |
| `level` | Difficulty/Audience | `beginner`, `intermediate`, `advanced` |
| `concept` | Main topic/concept | `errors`, `async`, `testing`, `api`, `tools` |
| `framework` | Framework used | `fastapi`, `react`, `express` |
| `type` | Article/document type | `tutorial`, `reference`, `cheatsheet`, `theory`, `overview` |
| `status` | Publication state | `draft`, `review`, `published`, `deprecated` |
| `domain` | Knowledge domain | `webdev`, `devops`, `data-science`, `security` |
| `source` | Where it came from | `documentation`, `community`, `course`, `conference`, `repo` |
| `project` | Project name | `knowledge-base`, other project identifiers |

### Tagging Principles

1. **Prefer specific over general**: `fastapi` over `python`, `oauth` over `auth`
2. **Include category tags when they fit**: Articles can legitimately have multiple `type:*` values when they span several roles (for example `type:reference` + `type:overview`)
3. **Add level when applicable**: `level:beginner` for learning content
4. **Use consistent values**: Build a vocabulary of allowed values per key
5. **Include a project tag for the target knowledge base**: Add `project:<project-name>` to categorize articles by project
6. **Use as many tags as needed** to capture the artifact cleanly; do not force a short limit if more orthogonal tags improve retrieval
7. **Repeat keys freely when they describe different things**: `concept:tools` and `concept:wiki` can both be valid on the same article
8. **Do not repeat the exact same tag twice**: `concept:tools` should appear once, not duplicated

### Avoid

- **Generic tags**: `important`, `useful`, `info`
- **Too much overlap**: Tags that repeat the same idea in different words
- **Redundant tags**: `language:python` and `framework:fastapi` both imply Python
- **Inconsistent naming**: `web-dev` vs `webdev` vs `web_development`
- **Single-use tags**: Tags that apply to only one article aren't useful
- **Missing project tag**: If the article belongs to a named project, include `project:<project-name>` to group articles

## How to use

### Input

Provide the article's title and content (optional for editing):

```
Title: "Handling Python Errors"
Content: "A guide to common Python errors and how to handle them..."
```

### Process

1. Analyze the article title and content
2. Identify key dimensions:
   - What language(s) are used?
   - What is the difficulty level?
   - What concept/topic is covered?
   - What type of article is it?
   - What project does this belong to?
3. Map to existing tag vocabulary (check `kb-tags`)
4. Suggest new tags if needed
5. When the article is about a tool or toolset, consider `kind:tool` or a `concept:tools`-style tag so the artifact class is explicit
6. If an article spans multiple roles, include multiple `type:*` tags rather than forcing a single label

### Output Format

Respond with:
- Proposed tag suggestions as `key:value` pairs
- Brief explanation of each tag choice
- Any alternative suggestions

Example:
```
Suggested tags:
- language:python    (the article covers Python)
- level:beginner  (accessible to new developers)  
- concept:errors  (main topic: error handling)
- type:tutorial  (learning-oriented article)
- project:knowledge-base  (project identifier)

Alternative: concept:debugging (if more practical focus)
```

## Tag Vocabulary

Maintain a consistent vocabulary. Common values:

- `language`: python, javascript, rust, go, typescript, bash, sql
- `kind`: tool, skill, article, extension, app, repo
- `level`: beginner, intermediate, advanced
- `type`: tutorial, reference, guide, cheatsheet, theory, concept, news, error, overview
- `concept`: (open - choose specific)
- `framework`: (open - choose specific)
- `status`: draft, review, published, deprecated
- `domain`: webdev, devops, data-science, security, mobile, desktop, backend
- `source`: documentation, community, course, conference, repo
- `project`: knowledge-base

**Note:** For Knowledge Base articles, include the appropriate `project:<project-name>` tag so the project can be filtered and grouped consistently.
