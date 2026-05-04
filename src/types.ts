// Knowledge Base - Type Definitions

export interface ValueTag {
  readonly key: string;
  readonly value: string;
}

export interface ArticleFrontmatter {
  readonly title: string;
  readonly tags: readonly ValueTag[];
  readonly created: string; // ISO 8601
  readonly modified: string; // ISO 8601
}

export interface Article {
  readonly slug: string;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly ValueTag[];
  readonly created: Date;
  readonly modified: Date;
  readonly filePath: string;
}

export interface TagIndexEntry {
  readonly key: string;
  readonly value: string;
  readonly articles: readonly string[]; // slugs
  readonly relatedTags: readonly ValueTag[];
}

export interface TagIndex {
  readonly tags: readonly TagIndexEntry[];
}

export interface KnowledgeBaseConfig {
  readonly dataPath: string; // resolved path
  readonly isLocal: boolean;
}

export type CreateOptions = {
  readonly title: string;
  readonly tags?: readonly ValueTag[];
  readonly content?: string;
};

export type EditOptions = {
  readonly slug: string;
  readonly title?: string;
  readonly tags?: readonly ValueTag[];
  readonly content?: string;
};

export type SearchOptions = {
  readonly tags?: readonly ValueTag[]; // tags to match (AND logic)
  readonly content?: string; // search in content
};

export type ListOptions = {
  // Future options (filtering, sorting, etc.)
};

export type TagsOptions = {
  readonly key?: string; // filter by specific key
};

export type ReadOptions = {
  readonly slug: string;
};