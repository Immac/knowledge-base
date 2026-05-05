// Knowledge Base - Frontmatter Parser

import matter from 'gray-matter';
import type { Article, ArticleFrontmatter, ValueTag } from './types.js';
import {
  dedupeTagRelationships,
  dedupeValueTags,
  parseTagRelationshipsFromUnknown,
  parseValueTagsFromUnknown,
} from './tag-graph.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isISODate(value: string): boolean {
  return ISO_DATE.test(value);
}

function parseStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseFrontmatter(rawContent: string, filePath: string): Article {
  const parsed = matter(rawContent);
  const data = parsed.data as ArticleFrontmatter & {
    tags?: unknown;
    relationships?: unknown;
    relations?: unknown;
    attachments?: unknown;
  };

  const title = data.title ?? '';
  const tags = dedupeValueTags(parseValueTagsFromUnknown(data.tags));
  const relationships = dedupeTagRelationships(
    parseTagRelationshipsFromUnknown(data.relationships ?? data.relations)
  );
  const attachments = parseStringArray(data.attachments);

  // Parse dates
  let created: Date;
  let modified: Date;

  if (data.created && isISODate(data.created)) {
    created = new Date(data.created);
  } else {
    created = new Date();
  }

  if (data.modified && isISODate(data.modified)) {
    modified = new Date(data.modified);
  } else {
    modified = new Date();
  }

  // Generate slug from file path
  const fileName = filePath.split('/').pop() ?? '';
  const slug = fileName.replace(/\.md$/, '');

  return {
    slug,
    title,
    content: parsed.content,
    tags,
    attachments,
    relationships,
    created,
    modified,
    filePath,
  };
}

export function serializeArticle(
  title: string,
  tags: readonly ValueTag[],
  content: string,
  created: Date,
  modified: Date,
  attachments: readonly string[] = [],
  relationships: readonly { predicate: string; target: string; qualifiers: readonly ValueTag[] }[] = []
): string {
  const frontmatter: Record<string, unknown> = {
    title,
    tags: dedupeValueTags(tags).map((tag) => `${tag.key}:${tag.value}`),
    created: created.toISOString(),
    modified: modified.toISOString(),
    attachments,
  };

  if (relationships.length > 0) {
    frontmatter.relationships = relationships.map((relationship) => ({
      predicate: relationship.predicate,
      target: relationship.target,
      qualifiers: dedupeValueTags(relationship.qualifiers),
    }));
  }

  return matter.stringify(content, frontmatter);
}

export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
  );
}
