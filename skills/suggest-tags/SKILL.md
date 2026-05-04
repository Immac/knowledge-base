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
| `language` | Programming language | `python`, `javascript`, `rust`, `go` |
| `level` | Difficulty/Audience | `beginner`, `intermediate`, `advanced` |
| `concept` | Main topic/concept | `errors`, `async`, `testing`, `api` |
| `framework` | Framework used | `fastapi`, `react`, `express` |
| `type` | Article type | `tutorial`, `reference`, `cheatsheet`, `theory` |
| `status` | Publication state | `draft`, `review`, `published`, `deprecated` |
| `domain` | Knowledge domain | `webdev`, `devops`, `data-science`, `security` |
| `source` | Where it came from | `documentation`, `community`, `course`, `conference` |

### Tagging Principles

1. **Use 3-7 tags per article**: Enough to describe without overcrowding
2. **Prefer specific over general**: `fastapi` over `python`, `oauth` over `auth`
3. **Include category tag**: Always add `type:*` (tutorial, reference, guide)
4. **Add level when applicable**: `level:beginner` for learning content
5. **Use consistent values**: Build a vocabulary of allowed values per key

### Avoid

- **Generic tags**: `important`, `useful`, `info`
- **Too many tags**: More than 8 tags usually indicates unclear focus
- **Redundant tags**: `language:python` and `framework:fastapi` both imply Python
- **Inconsistent naming**: `web-dev` vs `webdev` vs `web_development`
- **Single-use tags**: Tags that apply to only one article aren't useful

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
   - Who is the audience?
3. Map to existing tag vocabulary (check `kb-tags`)
4. Suggest new tags if needed

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

Alternative: concept:debugging (if more practical focus)
```

## Tag Vocabulary

Maintain a consistent vocabulary. Common values:

- `language`: python, javascript, rust, go, typescript, bash, sql
- `level`: beginner, intermediate, advanced
- `type`: tutorial, reference, guide, cheatsheet, theory, concept, news, error
- `concept`: (open - choose specific)
- `framework`: (open - choose specific)
- `status`: draft, review, published, deprecated
- `domain`: webdev, devops, data-science, security, mobile, desktop, backend