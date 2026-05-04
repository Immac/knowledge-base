// Knowledge Base - Frontmatter Parser

import { readFileSync } from 'fs';
import matter from 'gray-matter';
import type { Article, ArticleFrontmatter, ValueTag } from './types.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isISODate(value: string): boolean {
  return ISO_DATE.test(value);
}

function parseValueTags(tags: Record<string, string> | undefined): readonly ValueTag[] {
  if (!tags) return [];
  return Object.entries(tags).map(([key, value]) => ({
    key,
    value,
  }));
}

export function parseFrontmatter(rawContent: string, filePath: string): Article {
  const parsed = matter(rawContent);
  const data = parsed.data as {
    title?: string;
    tags?: Record<string, string>;
    created?: string;
    modified?: string;
  };

  const title = data.title ?? '';
  const tags = parseValueTags(data.tags);

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
  modified: Date
): string {
  // Convert tags to object format
  const tagsObj: Record<string, string> = {};
  for (const tag of tags) {
    tagsObj[tag.key] = tag.value;
  }

  const frontmatter = {
    title,
    tags: tagsObj,
    created: created.toISOString(),
    modified: modified.toISOString(),
  };

  // Use gray-matter to serialize
  const result = matter.stringify(content, frontmatter);
  return result;
}

export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove characters that aren't letters, numbers, or hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Replace multiple hyphens with single hyphen
      .replace(/-+/g, '-')
  );
}