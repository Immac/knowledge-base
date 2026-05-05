---
name: suggest-tags
description: Suggest relationship-aware tags for knowledge base articles based on their title, content, and graph context.
---

# Suggest Tags - Knowledge Base Tagging Skill

This skill helps the LLM analyze an article and suggest tags for the knowledge base's graph-aware tagging model.

Use it for:
- creating a new article via `kb-create`
- editing an article's tags via `kb-edit`
- reviewing existing articles and improving their metadata
- designing graph-shaped knowledge entries where concepts point to other concepts

## Core idea

The knowledge base now treats metadata as a **semantic graph**:

- **value tags** label the thing the article is about
- **relationship tags** connect that thing to other concepts
- **qualifier tags** add detail to a relationship

Examples:
- `topic:yasaka-kanako`
- `kind:character`
- `part-of:touhou-project`
- `instance-of:video-game`
- `appears-in:touhou-10` with qualifier `role:major`

## Tagging strategy

### 1. Use value tags for the article's identity
These are the primary labels for the article itself.

| Key | Description | Examples |
|---|---|---|
| `topic` | Main concept/name | `yasaka-kanako`, `touhou-project`, `pi-harness` |
| `kind` | What the article represents | `article`, `character`, `franchise`, `work`, `tool`, `skill` |
| `type` | Document style | `tutorial`, `reference`, `overview`, `theory` |
| `status` | Draft state | `draft`, `review`, `published`, `deprecated` |
| `project` | Project grouping | `knowledge-base` |
| `domain` | Broader area | `game-knowledge`, `ai-tools`, `software` |

### 2. Use relationship tags for graph edges
Use these when the article should point to another concept.

Recommended predicates:
- `instance-of` — what the subject is
- `part-of` — where the subject belongs
- `appears-in` — character/work appearances
- `alias-of` — alternate name resolution
- `has-trait` — descriptive characteristics
- `related-to` — fallback only when a stronger predicate does not fit

### 3. Add qualifier tags when a relationship needs context
Qualifiers describe the edge, not the article globally.

Examples:
- `role:major`
- `role:minor`
- `medium:game`
- `medium:manga`
- `importance:primary`

Example structure:

```yaml
title: Yasaka Kanako
tags:
  - topic:yasaka-kanako
  - kind: character
  - project:knowledge-base
relationships:
  - predicate: appears-in
    target: touhou-10
    qualifiers:
      - key: role
        value: major
      - key: medium
        value: game
  - predicate: part-of
    target: touhou-project
```

## DAG guidance

Think in terms of a DAG, not a tree:

- the same concept can have multiple parents
- the same item can be described by multiple collections
- a work can be both `instance-of:video-game` and `part-of:touhou-project`
- a character can `appear-in` several works

### Good pattern
Use canonical concept labels consistently:
- `touhou-project`
- `touhou-10`
- `yasaka-kanako`

If a concept is ambiguous, add a clarifying relation or alias:
- `topic:pi-harness`
- `alias-of:pi`
- `has-trait:opinionated`
- `has-trait:minimalistic`

### Avoid
- packing multiple meanings into one flat tag
- using vague tags like `important` or `misc`
- duplicating exact tag pairs
- using `related-to` when a more precise predicate exists

## Tagging principles

1. **Prefer the most specific concept available**
2. **Use relationships when the article points to another concept**
3. **Use qualifiers for edge-specific detail**
4. **Repeat keys freely when they describe different facts**
5. **Do not repeat the exact same key/value pair twice**
6. **Keep values canonical and reusable**
7. **Let the graph encode meaning instead of overloading a single tag**

## Suggested vocabulary

Common values:

- `kind`: article, character, franchise, work, tool, skill, media, raw, collection, item
- `type`: tutorial, reference, guide, cheatsheet, theory, concept, overview
- `status`: draft, review, published, deprecated
- `domain`: webdev, devops, data-science, game-knowledge, ai-tools, software
- `role`: major, minor, cameo, supporting
- `medium`: game, manga, anime, book, video, image
- `project`: knowledge-base

## How to use

When suggesting tags for an article, return:
- the primary value tags
- any relationship tags needed to connect the article to parent concepts
- qualifiers only when they clarify a specific relationship

### Example: Touhou character

```text
Suggested tags:
- topic:yasaka-kanako      (the article is about Kanako)
- kind:character           (the subject is a character)
- part-of:touhou-project   (she belongs to the Touhou Project franchise)
- appears-in:touhou-10     (major appearance in Touhou 10)
- appears-in:touhou-11     (minor appearance in Touhou 11)
- appears-in:touhou-17-5   (major appearance in Touhou 17.5)
```

If a relationship needs detail, add qualifiers to that edge:

```yaml
relationships:
  - predicate: appears-in
    target: touhou-10
    qualifiers:
      - key: role
        value: major
      - key: medium
        value: game
```

## Output format

Respond with:
- proposed `key:value` tags
- any relationship tags that should be added
- brief reasoning for each choice
- alternative tags if the concept could be described another way

Example:

```text
Suggested tags:
- topic:yasaka-kanako
- kind:character
- part-of:touhou-project
- appears-in:touhou-10

Relationships:
- appears-in:touhou-10 [role:major, medium:game]
- appears-in:touhou-11 [role:minor, medium:game]
```
