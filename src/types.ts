// Knowledge Base - Type Definitions

export interface ValueTag {
  readonly key: string;
  readonly value: string;
}

export interface TagRelationship {
  readonly predicate: string;
  readonly target: string;
  readonly qualifiers: readonly ValueTag[];
}

export interface ArticleFrontmatter {
  readonly title: string;
  readonly slug?: string;
  readonly tags: readonly string[];
  readonly blocks?: readonly string[];
  readonly relationships?: readonly TagRelationship[];
  readonly attachments?: readonly string[];
  readonly created: string; // ISO 8601
  readonly modified: string; // ISO 8601
}

export interface ArticleBlock {
  readonly name: string;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly ValueTag[];
  readonly filePath: string;
}

export interface Article {
  readonly slug: string;
  readonly title: string;
  readonly content: string;
  readonly rawContent: string;
  readonly blocks: readonly ArticleBlock[];
  readonly tags: readonly ValueTag[];
  readonly attachments: readonly string[];
  readonly relationships: readonly TagRelationship[];
  readonly created: Date;
  readonly modified: Date;
  readonly filePath: string;
  readonly isFolder: boolean; // discriminant: folder-based article
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
  readonly blocks?: readonly { name: string; title?: string; content?: string; tags?: readonly ValueTag[] }[];
  readonly attachments?: readonly string[];
  readonly relationships?: readonly TagRelationship[];
};

export type EditOptions = {
  readonly slug: string;
  readonly title?: string;
  readonly tags?: readonly ValueTag[];
  readonly content?: string;
  readonly blocks?: readonly { name: string; title?: string; content?: string; tags?: readonly ValueTag[] }[];
  readonly attachments?: readonly string[];
  readonly relationships?: readonly TagRelationship[];
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
  readonly structured?: boolean;
};

export type TransferAction = 'promote' | 'copy';

export type TransferOptions = {
  readonly slug: string;
  readonly action: TransferAction;
  readonly overwrite?: boolean;
};

export type TransferResult =
  | {
      readonly success: true;
      readonly action: TransferAction;
      readonly article: Article;
      readonly sourcePath: string;
      readonly destinationPath: string;
      readonly overwritten: boolean;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export type FileKind = 'media' | 'raw';

export type FileScope = 'global' | 'local';

export interface ManagedFile {
  readonly kind: FileKind;
  readonly scope: FileScope;
  readonly name: string;
  readonly filePath: string;
  readonly size: number;
  readonly modified: Date;
  readonly tags: readonly ValueTag[];
  readonly attachedArticles: readonly string[];
}

export interface ManagedFileMeta {
  readonly tags: readonly ValueTag[];
  readonly attachedArticles: readonly string[];
}

export type FileUploadOptions = {
  readonly sourcePath: string;
  readonly name?: string;
  readonly tags?: readonly ValueTag[];
  readonly overwrite?: boolean;
};

export type FileListOptions = {
  readonly kind: FileKind;
};

export type FileSearchOptions = {
  readonly kind: FileKind;
  readonly tags?: readonly ValueTag[];
  readonly query?: string;
};

export type FileMoveOptions = {
  readonly sourceName: string;
  readonly destinationName?: string;
  readonly overwrite?: boolean;
};

export type FileDeleteOptions = {
  readonly name: string;
};

export type FileAttachmentOptions = {
  readonly articleSlug: string;
  readonly fileName: string;
};

export type FileUploadResult =
  | {
      readonly success: true;
      readonly file: ManagedFile;
      readonly sourcePath: string;
      readonly destinationPath: string;
      readonly overwritten: boolean;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export interface FileListResult {
  readonly kind: FileKind;
  readonly files: readonly ManagedFile[];
  readonly count: number;
}

export type FileSearchResult = FileListResult;

export type FileMoveResult =
  | {
      readonly success: true;
      readonly file: ManagedFile;
      readonly sourcePath: string;
      readonly destinationPath: string;
      readonly overwritten: boolean;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export type FileDeleteResult =
  | {
      readonly success: true;
      readonly filePath: string;
      readonly metaPath?: string;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export type FileAttachmentResult =
  | {
      readonly success: true;
      readonly article: Article;
      readonly file: ManagedFile;
      readonly attachmentPath: string;
    }
  | {
      readonly success: false;
      readonly error: string;
    };
