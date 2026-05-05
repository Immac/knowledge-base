// Knowledge Base - Tag graph helpers

import type { Article, TagRelationship, ValueTag } from './types.js';

function parseTagString(tag: string): ValueTag | null {
  const index = tag.indexOf(':');
  if (index === -1) return null;
  const key = tag.slice(0, index).trim();
  const value = tag.slice(index + 1).trim();
  if (!key) return null;
  return { key, value };
}

export function parseValueTagsFromUnknown(tags: unknown): readonly ValueTag[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    const parsed: ValueTag[] = [];
    for (const tag of tags) {
      if (typeof tag === 'string') {
        const parsedTag = parseTagString(tag);
        if (parsedTag) parsed.push(parsedTag);
      } else if (tag && typeof tag === 'object') {
        const objectTag = tag as Record<string, unknown>;
        const directKey = typeof objectTag.key === 'string' ? objectTag.key.trim() : '';
        const directValue = typeof objectTag.value === 'string' ? objectTag.value.trim() : '';
        if (directKey) {
          parsed.push({ key: directKey, value: directValue });
          continue;
        }

        const entries = Object.entries(objectTag);
        for (const [key, value] of entries) {
          if (typeof value === 'string') {
            parsed.push({ key, value });
          } else if (Array.isArray(value)) {
            for (const item of value) {
              if (typeof item === 'string') {
                parsed.push({ key, value: item });
              }
            }
          }
        }
      }
    }
    return parsed;
  }

  if (typeof tags === 'object') {
    return Object.entries(tags as Record<string, unknown>).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        return [{ key, value }];
      }
      if (Array.isArray(value)) {
        return value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => ({ key, value: item }));
      }
      return [];
    });
  }

  return [];
}

export function dedupeValueTags(tags: readonly ValueTag[]): readonly ValueTag[] {
  const seen = new Set<string>();
  const result: ValueTag[] = [];

  for (const tag of tags) {
    const key = `${tag.key}:${tag.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ key: tag.key.trim(), value: tag.value.trim() });
  }

  return result;
}

function normalizeRelationValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeTagRelationship(relationship: TagRelationship): TagRelationship {
  return {
    predicate: relationship.predicate.trim(),
    target: relationship.target.trim(),
    qualifiers: dedupeValueTags(relationship.qualifiers ?? []),
  };
}

export function parseTagRelationshipFromUnknown(value: unknown): TagRelationship | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const index = value.indexOf(':');
    if (index === -1) return null;
    const predicate = value.slice(0, index).trim();
    const target = value.slice(index + 1).trim();
    if (!predicate || !target) return null;
    return {
      predicate,
      target,
      qualifiers: [],
    };
  }

  if (typeof value !== 'object') return null;

  const relation = value as Record<string, unknown>;
  const predicate = normalizeRelationValue(relation.predicate ?? relation.key);
  const target = normalizeRelationValue(relation.target ?? relation.value);
  if (!predicate || !target) return null;

  const qualifiers = parseValueTagsFromUnknown(relation.qualifiers ?? relation.tags ?? []);
  return {
    predicate,
    target,
    qualifiers,
  };
}

export function parseTagRelationshipsFromUnknown(value: unknown): readonly TagRelationship[] {
  if (!value) return [];

  const entries = Array.isArray(value) ? value : [value];
  return dedupeTagRelationships(entries.map(parseTagRelationshipFromUnknown).filter((item): item is TagRelationship => item !== null));
}

export function dedupeTagRelationships(relations: readonly TagRelationship[]): readonly TagRelationship[] {
  const seen = new Set<string>();
  const result: TagRelationship[] = [];

  for (const relation of relations) {
    const normalized = normalizeTagRelationship(relation);
    const qualifierKey = normalized.qualifiers.map((tag) => `${tag.key}:${tag.value}`).join('|');
    const key = `${normalized.predicate}->${normalized.target}[${qualifierKey}]`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function semanticTagsForArticle(article: Pick<Article, 'tags' | 'relationships'>): readonly ValueTag[] {
  const relationTags: ValueTag[] = [];

  for (const relation of article.relationships ?? []) {
    relationTags.push({ key: relation.predicate, value: relation.target });
    relationTags.push(...(relation.qualifiers ?? []));
  }

  return dedupeValueTags([...article.tags, ...relationTags]);
}

export function formatTagRelationship(relationship: TagRelationship): string {
  const qualifiers = relationship.qualifiers?.length
    ? ` [${relationship.qualifiers.map((tag) => `${tag.key}:${tag.value}`).join(', ')}]`
    : '';
  return `${relationship.predicate} -> ${relationship.target}${qualifiers}`;
}
