---
title: Python Errors
tags:
  language: python
  level: beginner
  concept: errors
  status: published
created: 2026-05-03T11:00:00.000Z
modified: 2026-05-03T11:00:00.000Z
---

# Python Errors

Common Python errors and how to handle them.

## SyntaxError

Occurs when code doesn't follow Python syntax rules.

```python
if x = 1:  # Should be == not =
    pass
```

## NameError

Occurs when using an undefined variable.

```python
print(x)  # x was never defined
```

## TypeError

Occurs when operations are applied to wrong types.

```python
"1" + 1  # Can't add string and int
```