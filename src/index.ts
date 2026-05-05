// Knowledge Base - Main Entry Point

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

// Commands
import { listCommand, formatListResult, type ListOptions } from "./commands/list.js";
import { createCommand, formatCreateResult, parseTagsString, parseRelationsString, type CreateOptions } from "./commands/create.js";
import { readCommand, formatReadResult, type ReadOptions } from "./commands/read.js";
import { editCommand, formatEditResult, type EditOptions } from "./commands/edit.js";
import { tagsCommand, formatTagIndex, type TagsOptions } from "./commands/tags.js";
import { searchCommand, formatSearchResult, type SearchOptions } from "./commands/search.js";
import {
  uploadFileCommand,
  listFilesCommand,
  searchFilesCommand,
  moveFileCommand,
  deleteFileCommand,
  attachFileCommand,
  detachFileCommand,
  listArticleAttachmentsCommand,
  formatUploadFileResult,
  formatListFilesResult,
  formatSearchFilesResult,
  formatMoveFileResult,
  formatDeleteFileResult,
  formatAttachFileResult,
  formatDetachFileResult,
  formatArticleAttachments,
  type FileListOptions,
  type FileUploadOptions,
  type FileKind,
  type FileSearchOptions,
  type FileMoveOptions,
  type FileAttachmentOptions,
} from "./commands/files.js";

// Storage & Config
import { getKnowledgeBaseConfig, getGlobalKnowledgeBaseConfig, getLocalKnowledgeBaseConfig, ensureDataFolder } from "./storage.js";
import { initRepo, commitChanges } from "./git.js";
import { transferCommand, formatTransferResult, type TransferOptions } from "./commands/transfer.js";
import type { KnowledgeBaseConfig, TransferAction, FileScope } from "./types.js";

// Initialize data folder on first use
function initKnowledgeBase(config: KnowledgeBaseConfig = getKnowledgeBaseConfig()): KnowledgeBaseConfig {
  ensureDataFolder(config);
  initRepo(config);
  return config;
}

async function executeCreateAction(
  config: KnowledgeBaseConfig,
  title: string,
  tagsStr?: string,
  relationshipsStr?: string,
  content?: string
) {
  const initializedConfig = initKnowledgeBase(config);
  const options: CreateOptions = {
    title,
    tags: tagsStr ? parseTagsString(tagsStr) : undefined,
    relationships: relationshipsStr ? parseRelationsString(relationshipsStr) : undefined,
    content,
  };

  const result = createCommand(options, initializedConfig);

  try {
    await commitChanges(initializedConfig, `Create article: ${title}`);
  } catch {
    // Git commit may fail, that's okay
  }

  return result;
}

function getScopeConfig(scope: FileScope): KnowledgeBaseConfig {
  return scope === "local" ? getLocalKnowledgeBaseConfig() : getGlobalKnowledgeBaseConfig();
}

async function executeFileUpload(kind: FileKind, scope: FileScope, options: FileUploadOptions) {
  const config = initKnowledgeBase(getScopeConfig(scope));
  const result = uploadFileCommand(kind, options, config);

  if (result.success) {
    try {
      await commitChanges(config, `Upload ${kind} file: ${result.file.name}`);
    } catch {
      // Git commit may fail, that's okay
    }
  }

  return result;
}

function executeFileList(kind: FileKind, scope: FileScope, options: FileListOptions) {
  const config = initKnowledgeBase(getScopeConfig(scope));
  return listFilesCommand(kind, options, config);
}

async function executeTransferAction(action: TransferAction, slug: string, overwrite?: boolean) {
  const sourceConfig = action === "promote" ? getLocalKnowledgeBaseConfig() : getGlobalKnowledgeBaseConfig();
  const destinationConfig = action === "promote" ? getGlobalKnowledgeBaseConfig() : getLocalKnowledgeBaseConfig();
  const options: TransferOptions = {
    slug,
    action,
    overwrite,
  };

  const result = transferCommand(options, sourceConfig, destinationConfig);

  if (result.success) {
    try {
      await commitChanges(destinationConfig, action === "promote"
        ? `Promote article: ${slug}`
        : `Copy article to local: ${slug}`);
    } catch {
      // Git commit may fail, that's okay
    }

    if (action === "promote") {
      try {
        await commitChanges(sourceConfig, `Remove promoted article: ${slug}`);
      } catch {
        // Git commit may fail, that's okay
      }
    }
  }

  return result;
}

function registerManagedFileTools(pi: ExtensionAPI, kind: FileKind, kindName: string) {
  const uploadToolName = `kb-upload-${kind}`;
  const listToolName = `kb-list-${kind}`;
  const searchToolName = `kb-search-${kind}`;
  const moveToolName = `kb-move-${kind}`;
  const deleteToolName = `kb-delete-${kind}`;
  const attachToolName = `kb-attach-${kind}`;
  const detachToolName = `kb-detach-${kind}`;

  pi.registerTool({
    name: uploadToolName,
    label: `Upload ${kindName}`,
    description: `Upload a ${kindName.toLowerCase()} file into the knowledge base`,
    parameters: Type.Object({
      sourcePath: Type.String({ description: "Path to the source file" }),
      name: Type.Optional(Type.String({ description: "Optional destination file name" })),
      tags: Type.Optional(Type.String({ description: "Tags as comma-separated key:value pairs" })),
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Target knowledge base scope" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const sourcePath = params.sourcePath as string;
      if (!sourcePath) {
        return {
          content: [{ type: "text", text: "Error: sourcePath is required" }],
          details: {},
        };
      }

      const scope = (params.scope as FileScope | undefined) ?? "global";
      const name = params.name as string | undefined;
      const tagsStr = params.tags as string | undefined;
      const result = await executeFileUpload(kind, scope, {
        sourcePath,
        name,
        tags: tagsStr ? parseTagsString(tagsStr) : undefined,
      });

      return {
        content: [{ type: "text", text: formatUploadFileResult(result) }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: listToolName,
    label: `List ${kindName}`,
    description: `List ${kindName.toLowerCase()} files in the knowledge base`,
    parameters: Type.Object({
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Knowledge base scope" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scope = (params.scope as FileScope | undefined) ?? "global";
      const result = executeFileList(kind, scope, { kind });
      return {
        content: [{ type: "text", text: formatListFilesResult(result) }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: searchToolName,
    label: `Search ${kindName}`,
    description: `Search ${kindName.toLowerCase()} files by tags or query`,
    parameters: Type.Object({
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Knowledge base scope" })),
      tags: Type.Optional(Type.String({ description: "Tags to match (AND logic) as comma-separated key:value pairs" })),
      query: Type.Optional(Type.String({ description: "Search text for file name or path" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scope = (params.scope as FileScope | undefined) ?? "global";
      const tagsStr = params.tags as string | undefined;
      const query = params.query as string | undefined;
      const result = searchFilesCommand(kind, {
        kind,
        tags: tagsStr ? parseTagsString(tagsStr) : undefined,
        query,
      }, initKnowledgeBase(getScopeConfig(scope)));
      return {
        content: [{ type: "text", text: formatSearchFilesResult(result) }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: moveToolName,
    label: `Move ${kindName}`,
    description: `Rename or move a ${kindName.toLowerCase()} file within the same knowledge base`,
    parameters: Type.Object({
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Knowledge base scope" })),
      sourceName: Type.String({ description: "Current file name" }),
      destinationName: Type.Optional(Type.String({ description: "New file name" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scope = (params.scope as FileScope | undefined) ?? "global";
      const sourceName = params.sourceName as string;
      const destinationName = params.destinationName as string | undefined;
      if (!sourceName) {
        return { content: [{ type: "text", text: "Error: sourceName is required" }], details: {} };
      }

      const config = initKnowledgeBase(getScopeConfig(scope));
      const result = moveFileCommand(kind, { sourceName, destinationName }, config);
      if (result.success) {
        try {
          await commitChanges(config, `Move ${kind} file: ${sourceName}`);
        } catch {
          // Git commit may fail, that's okay
        }
      }
      return {
        content: [{ type: "text", text: formatMoveFileResult(result) }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: deleteToolName,
    label: `Delete ${kindName}`,
    description: `Delete a ${kindName.toLowerCase()} file from the knowledge base`,
    parameters: Type.Object({
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Knowledge base scope" })),
      name: Type.String({ description: "File name" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scope = (params.scope as FileScope | undefined) ?? "global";
      const name = params.name as string;
      if (!name) {
        return { content: [{ type: "text", text: "Error: name is required" }], details: {} };
      }

      const config = initKnowledgeBase(getScopeConfig(scope));
      const result = deleteFileCommand(kind, { name }, config);
      if (result.success) {
        try {
          await commitChanges(config, `Delete ${kind} file: ${name}`);
        } catch {
          // Git commit may fail, that's okay
        }
      }
      return {
        content: [{ type: "text", text: formatDeleteFileResult(result) }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: attachToolName,
    label: `Attach ${kindName}`,
    description: `Attach a ${kindName.toLowerCase()} file to an article`,
    parameters: Type.Object({
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Knowledge base scope" })),
      articleSlug: Type.String({ description: "Article slug" }),
      fileName: Type.String({ description: "File name" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scope = (params.scope as FileScope | undefined) ?? "global";
      const articleSlug = params.articleSlug as string;
      const fileName = params.fileName as string;
      if (!articleSlug || !fileName) {
        return { content: [{ type: "text", text: "Error: articleSlug and fileName are required" }], details: {} };
      }

      const config = initKnowledgeBase(getScopeConfig(scope));
      const result = attachFileCommand(kind, { articleSlug, fileName }, config);
      if (result.success) {
        try {
          await commitChanges(config, `Attach ${kind} file: ${fileName}`);
        } catch {
          // Git commit may fail, that's okay
        }
      }
      return {
        content: [{ type: "text", text: formatAttachFileResult(result) }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: detachToolName,
    label: `Detach ${kindName}`,
    description: `Detach a ${kindName.toLowerCase()} file from an article`,
    parameters: Type.Object({
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Knowledge base scope" })),
      articleSlug: Type.String({ description: "Article slug" }),
      fileName: Type.String({ description: "File name" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scope = (params.scope as FileScope | undefined) ?? "global";
      const articleSlug = params.articleSlug as string;
      const fileName = params.fileName as string;
      if (!articleSlug || !fileName) {
        return { content: [{ type: "text", text: "Error: articleSlug and fileName are required" }], details: {} };
      }

      const config = initKnowledgeBase(getScopeConfig(scope));
      const result = detachFileCommand(kind, { articleSlug, fileName }, config);
      if (result.success) {
        try {
          await commitChanges(config, `Detach ${kind} file: ${fileName}`);
        } catch {
          // Git commit may fail, that's okay
        }
      }
      return {
        content: [{ type: "text", text: formatDetachFileResult(result) }],
        details: {},
      };
    },
  });
}

export default function (pi: ExtensionAPI) {
  // kb-list tool
  pi.registerTool({
    name: "kb-list",
    label: "List Articles",
    description: "List all articles in the knowledge base",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      const config = initKnowledgeBase();
      const options: ListOptions = {};
      const result = listCommand(options, config);
      return {
        content: [{ type: "text", text: formatListResult(result) }],
        details: {},
      };
    },
  });

  // kb-create tool
  pi.registerTool({
    name: "kb-create",
    label: "Create Article",
    description: "Create a new article in the knowledge base",
    parameters: Type.Object({
      title: Type.String({ description: "Article title" }),
      tags: Type.Optional(Type.String({ description: "Tags as comma-separated key:value pairs (e.g. language:python,level:beginner)" })),
      relationships: Type.Optional(Type.String({ description: "Relationships as JSON array of {predicate,target,qualifiers?} objects" })),
      content: Type.Optional(Type.String({ description: "Article content in markdown" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const title = params.title as string;
      if (!title) {
        return {
          content: [{ type: "text", text: "Error: title is required" }],
          details: {},
        };
      }

      const tagsStr = params.tags as string | undefined;
      const relationshipsStr = params.relationships as string | undefined;
      const content = params.content as string | undefined;
      const result = await executeCreateAction(getKnowledgeBaseConfig(), title, tagsStr, relationshipsStr, content);

      return {
        content: [{ type: "text", text: formatCreateResult(result) }],
        details: {},
      };
    },
  });

  // kb-create-local tool
  pi.registerTool({
    name: "kb-create-local",
    label: "Create Article Locally",
    description: "Create a new article in the local knowledge base",
    parameters: Type.Object({
      title: Type.String({ description: "Article title" }),
      tags: Type.Optional(Type.String({ description: "Tags as comma-separated key:value pairs (e.g. language:python,level:beginner)" })),
      relationships: Type.Optional(Type.String({ description: "Relationships as JSON array of {predicate,target,qualifiers?} objects" })),
      content: Type.Optional(Type.String({ description: "Article content in markdown" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const title = params.title as string;
      if (!title) {
        return {
          content: [{ type: "text", text: "Error: title is required" }],
          details: {},
        };
      }

      const tagsStr = params.tags as string | undefined;
      const relationshipsStr = params.relationships as string | undefined;
      const content = params.content as string | undefined;
      const result = await executeCreateAction(getLocalKnowledgeBaseConfig(), title, tagsStr, relationshipsStr, content);

      return {
        content: [{ type: "text", text: formatCreateResult(result) }],
        details: {},
      };
    },
  });

  // kb-read tool
  pi.registerTool({
    name: "kb-read",
    label: "Read Article",
    description: "Read an article by slug",
    parameters: Type.Object({
      slug: Type.String({ description: "Article slug (filename without .md)" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const config = initKnowledgeBase();

      const slug = params.slug as string;
      if (!slug) {
        return {
          content: [{ type: "text", text: "Error: slug is required" }],
          details: {},
        };
      }

      const options: ReadOptions = { slug };
      const result = readCommand(options, config);
      return {
        content: [{ type: "text", text: formatReadResult(result) }],
        details: {},
      };
    },
  });

  // kb-edit tool
  pi.registerTool({
    name: "kb-edit",
    label: "Edit Article",
    description: "Edit an existing article",
    parameters: Type.Object({
      slug: Type.String({ description: "Article slug to edit" }),
      title: Type.Optional(Type.String({ description: "New title" })),
      tags: Type.Optional(Type.String({ description: "Tags as comma-separated key:value pairs" })),
      relationships: Type.Optional(Type.String({ description: "Relationships as JSON array of {predicate,target,qualifiers?} objects" })),
      content: Type.Optional(Type.String({ description: "New content in markdown" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const config = initKnowledgeBase();

      const slug = params.slug as string;
      if (!slug) {
        return {
          content: [{ type: "text", text: "Error: slug is required" }],
          details: {},
        };
      }

      const title = params.title as string | undefined;
      const tagsStr = params.tags as string | undefined;
      const relationshipsStr = params.relationships as string | undefined;
      const content = params.content as string | undefined;

      const options: EditOptions = {
        slug,
        title,
        tags: tagsStr ? parseTagsString(tagsStr) : undefined,
        relationships: relationshipsStr ? parseRelationsString(relationshipsStr) : undefined,
        content,
      };

      const result = editCommand(options, config);
      
      // Try to commit changes
      try {
        await commitChanges(config, `Update article: ${slug}`);
      } catch {
        // Git commit may fail, that's okay
      }

      return {
        content: [{ type: "text", text: formatEditResult(result) }],
        details: {},
      };
    },
  });

  // kb-tags tool
  pi.registerTool({
    name: "kb-tags",
    label: "Tag Index",
    description: "Show tag index and relationships",
    parameters: Type.Object({
      key: Type.Optional(Type.String({ description: "Filter by specific tag key" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const config = initKnowledgeBase();

      const key = params.key as string | undefined;
      const options: TagsOptions = { key };

      const result = tagsCommand(options, config);
      return {
        content: [{ type: "text", text: formatTagIndex(result) }],
        details: {},
      };
    },
  });

  // kb-search tool
  pi.registerTool({
    name: "kb-search",
    label: "Search Articles",
    description: "Search articles by tags or content",
    parameters: Type.Object({
      tags: Type.Optional(Type.String({ description: "Tags to match (AND logic) as comma-separated key:value pairs" })),
      content: Type.Optional(Type.String({ description: "Search text in content" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const config = initKnowledgeBase();

      const tagsStr = params.tags as string | undefined;
      const content = params.content as string | undefined;

      const options: SearchOptions = {
        tags: tagsStr ? parseTagsString(tagsStr) : undefined,
        content,
      };

      const result = searchCommand(options, config);
      return {
        content: [{ type: "text", text: formatSearchResult(result) }],
        details: {},
      };
    },
  });

  registerManagedFileTools(pi, "media", "Media");
  registerManagedFileTools(pi, "raw", "Raw File");

  // kb-list-attachments tool
  pi.registerTool({
    name: "kb-list-attachments",
    label: "List Article Attachments",
    description: "List attachment links from an article to managed files",
    parameters: Type.Object({
      scope: Type.Optional(Type.Union([
        Type.Literal("global"),
        Type.Literal("local"),
      ], { description: "Knowledge base scope" })),
      slug: Type.String({ description: "Article slug" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scope = (params.scope as FileScope | undefined) ?? "global";
      const slug = params.slug as string;
      if (!slug) {
        return { content: [{ type: "text", text: "Error: slug is required" }], details: {} };
      }

      const attachments = listArticleAttachmentsCommand(slug, initKnowledgeBase(getScopeConfig(scope)));
      return {
        content: [{ type: "text", text: formatArticleAttachments(slug, attachments) }],
        details: {},
      };
    },
  });

  // kb-promote tool
  pi.registerTool({
    name: "kb-promote",
    label: "Promote Article",
    description: "Promote a local article to the global knowledge base",
    parameters: Type.Object({
      slug: Type.String({ description: "Local article slug to promote" }),
      overwrite: Type.Optional(Type.Boolean({ description: "Replace the global article if it already exists" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const slug = params.slug as string;
      const overwrite = params.overwrite as boolean | undefined;

      if (!slug) {
        return {
          content: [{ type: "text", text: "Error: slug is required" }],
          details: {},
        };
      }

      const result = await executeTransferAction("promote", slug, overwrite);
      return {
        content: [{ type: "text", text: formatTransferResult(result) }],
        details: {},
      };
    },
  });

  // kb-copy-local tool
  pi.registerTool({
    name: "kb-copy-local",
    label: "Copy Article Locally",
    description: "Copy a global article into the local knowledge base",
    parameters: Type.Object({
      slug: Type.String({ description: "Global article slug to copy" }),
      overwrite: Type.Optional(Type.Boolean({ description: "Replace the local article if it already exists" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const slug = params.slug as string;
      const overwrite = params.overwrite as boolean | undefined;

      if (!slug) {
        return {
          content: [{ type: "text", text: "Error: slug is required" }],
          details: {},
        };
      }

      const result = await executeTransferAction("copy", slug, overwrite);
      return {
        content: [{ type: "text", text: formatTransferResult(result) }],
        details: {},
      };
    },
  });
}