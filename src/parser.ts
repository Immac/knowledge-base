// Knowledge Base - Frontmatter Parser

import matter from 'gray-matter';
import type { Article, ArticleBlock, ArticleFrontmatter, ValueTag } from './types.js';
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

/** Parse content from a raw markdown file (can be ARTICLE.md or a block) */
export function parseFrontmatter(rawContent: string, filePath: string): Omit<Article, 'blocks' | 'rawContent' | 'isFolder'> {
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
  const slug = data.slug ?? fileName.replace(/\.md$/, '');

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

/** Parse just the frontmatter without content */
export function parseFrontmatterMeta(rawContent: string, filePath: string): {
  title: string;
  tags: readonly ValueTag[];
  blocks: readonly string[];
  slug: string;
  created: Date;
  modified: Date;
  relationships: readonly import('./types.js').TagRelationship[];
  attachments: readonly string[];
} {
  const parsed = matter(rawContent);
  const data = parsed.data as ArticleFrontmatter & {
    tags?: unknown;
    relationships?: unknown;
    blocks?: unknown;
  };

  const title = data.title ?? '';
  const tags = dedupeValueTags(parseValueTagsFromUnknown(data.tags));
  const blocks = parseStringArray(data.blocks);
  const relationships = dedupeTagRelationships(
    parseTagRelationshipsFromUnknown(data.relationships)
  );
  const attachments = parseStringArray(data.attachments);

  const fileName = filePath.split('/').pop() ?? '';
  const slug = data.slug ?? fileName.replace(/\.md$/, '');

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

  return { title, tags, blocks, slug, created, modified, relationships, attachments };
}

/** Parse a block file (markdown with optional frontmatter) */
export function parseBlockFile(rawContent: string, filePath: string, name: string): ArticleBlock {
  const parsed = matter(rawContent);
  const data = parsed.data as { title?: string; tags?: unknown } | undefined;

  const title = (data && typeof data === 'object' && 'title' in data ? (data as Record<string, unknown>).title : undefined) as string | undefined;
  const tagsRaw = data && typeof data === 'object' ? (data as Record<string, unknown>).tags : undefined;
  const tags = dedupeValueTags(parseValueTagsFromUnknown(tagsRaw));

  return {
    name,
    title: title ?? name,
    content: parsed.content,
    tags,
    filePath,
  };
}

/**
 * Serialize an article to markdown with frontmatter.
 * The content may contain !block: references.
 */
export function serializeArticle(
  title: string,
  tags: readonly ValueTag[],
  content: string,
  created: Date,
  modified: Date,
  attachments: readonly string[] = [],
  relationships: readonly { predicate: string; target: string; qualifiers: readonly ValueTag[] }[] = [],
  slug?: string,
  blockNames?: readonly string[]
): string {
  const frontmatter: Record<string, unknown> = {
    title,
    tags: dedupeValueTags(tags).map((tag) => `${tag.key}:${tag.value}`),
    created: created.toISOString(),
    modified: modified.toISOString(),
    attachments,
  };

  if (slug) {
    frontmatter.slug = slug;
  }

  if (blockNames && blockNames.length > 0) {
    frontmatter.blocks = [...blockNames];
  }

  if (relationships.length > 0) {
    frontmatter.relationships = relationships.map((relationship) => ({
      predicate: relationship.predicate,
      target: relationship.target,
      qualifiers: dedupeValueTags(relationship.qualifiers),
    }));
  }

  return matter.stringify(content, frontmatter);
}

/** Serialize a block file */
export function serializeBlock(
  name: string,
  content: string,
  tags: readonly ValueTag[],
  title?: string
): string {
  const frontmatter: Record<string, unknown> = {};

  if (title && title !== name) {
    frontmatter.title = title;
  }

  if (tags.length > 0) {
    frontmatter.tags = tags.map((tag) => `${tag.key}:${tag.value}`);
  }

  if (Object.keys(frontmatter).length > 0) {
    return matter.stringify(content, frontmatter);
  }

  return content;
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

/**
 * Block reference patterns:
 *   !block:name                  → same-article block
 *   !block:article-slug/name     → cross-article block
 */
const BLOCK_REF_RE = /!block:([a-z0-9-]+(?:\/[a-z0-9-]+)?)/g;

export interface BlockReference {
  readonly raw: string;    // full match e.g. "!block:overview"
  readonly slug: string;   // article slug (same article if no slash)
  readonly name: string;   // block name
  readonly crossArticle: boolean;
}

/** Extract all block references from content */
export function parseBlockReferences(content: string): readonly BlockReference[] {
  const refs: BlockReference[] = [];
  let match: RegExpExecArray | null;

  while ((match = BLOCK_REF_RE.exec(content)) !== null) {
    const raw = match[0];
    const ref = match[1]; // e.g. "overview" or "other-article/code"

    let slug: string;
    let name: string;
    let crossArticle: boolean;

    const slashIndex = ref.indexOf('/');
    if (slashIndex !== -1) {
      slug = ref.slice(0, slashIndex);
      name = ref.slice(slashIndex + 1);
      crossArticle = true;
    } else {
      // Same article – slug will be filled in by the caller
      slug = '';
      name = ref;
      crossArticle = false;
    }

    refs.push({ raw, slug, name, crossArticle });
  }

  return refs;
}

/** Resolve block references inline: replace !block:... with block content */
export function resolveBlockReferencesInline(
  content: string,
  articleSlug: string,
  resolver: (ref: BlockReference, defaultSlug: string) => string | null
): string {
  const refs = parseBlockReferences(content);

  // Process in reverse so positions don't shift
  let resolved = content;
  for (let i = refs.length - 1; i >= 0; i--) {
    const ref = refs[i];
    // For same-article refs, fill in the article slug
    const blockContent = resolver(ref, ref.crossArticle ? '' : articleSlug);

    if (blockContent !== null) {
      resolved = resolved.slice(0, resolved.indexOf(ref.raw)) +
        blockContent +
        resolved.slice(resolved.indexOf(ref.raw) + ref.raw.length);
    }
    // If block not found, leave the !block: reference as-is
  }

  return resolved;
}
