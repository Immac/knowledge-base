// Knowledge Base - Frontmatter Parser

import matter from 'gray-matter';
import type { Article, ArticleFrontmatter, ValueTag } from './types.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isISODate(value: string): boolean {
  return ISO_DATE.test(value);
}

function parseTagString(tag: string): ValueTag | null {
  const index = tag.indexOf(':');
  if (index === -1) return null;
  const key = tag.slice(0, index).trim();
  const value = tag.slice(index + 1).trim();
  if (!key) return null;
  return { key, value };
}

function parseValueTags(tags: unknown): readonly ValueTag[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    const parsed: ValueTag[] = [];
    for (const tag of tags) {
      if (typeof tag === 'string') {
        const parsedTag = parseTagString(tag);
        if (parsedTag) parsed.push(parsedTag);
      } else if (tag && typeof tag === 'object') {
        const entries = Object.entries(tag as Record<string, unknown>);
        for (const [key, value] of entries) {
          if (typeof value === 'string') {
            parsed.push({ key, value });
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

function parseStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseFrontmatter(rawContent: string, filePath: string): Article {
  const parsed = matter(rawContent);
  const data = parsed.data as ArticleFrontmatter & {
    tags?: unknown;
    attachments?: unknown;
  };

  const title = data.title ?? '';
  const tags = parseValueTags(data.tags);
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
  attachments: readonly string[] = []
): string {
  const frontmatter: ArticleFrontmatter = {
    title,
    tags: tags.map((tag) => `${tag.key}:${tag.value}`),
    created: created.toISOString(),
    modified: modified.toISOString(),
    attachments,
  };

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
