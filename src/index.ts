// Knowledge Base - Main Entry Point

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

// Commands
import { listCommand, formatListResult, type ListOptions } from "./commands/list.js";
import { createCommand, formatCreateResult, parseTagsString, type CreateOptions } from "./commands/create.js";
import { readCommand, formatReadResult, type ReadOptions } from "./commands/read.js";
import { editCommand, formatEditResult, type EditOptions } from "./commands/edit.js";
import { tagsCommand, formatTagIndex, type TagsOptions } from "./commands/tags.js";
import { searchCommand, formatSearchResult, type SearchOptions } from "./commands/search.js";

// Storage & Config
import { getKnowledgeBaseConfig, getGlobalKnowledgeBaseConfig, getLocalKnowledgeBaseConfig, ensureDataFolder } from "./storage.js";
import { initRepo, commitChanges } from "./git.js";
import { transferCommand, formatTransferResult, type TransferOptions } from "./commands/transfer.js";
import type { KnowledgeBaseConfig, TransferAction } from "./types.js";

// Initialize data folder on first use
function initKnowledgeBase(): KnowledgeBaseConfig {
  const config = getKnowledgeBaseConfig();
  ensureDataFolder(config);
  initRepo(config);
  return config;
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
      content: Type.Optional(Type.String({ description: "Article content in markdown" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const config = initKnowledgeBase();

      const title = params.title as string;
      if (!title) {
        return {
          content: [{ type: "text", text: "Error: title is required" }],
          details: {},
        };
      }

      const tagsStr = params.tags as string | undefined;
      const content = params.content as string | undefined;

      const options: CreateOptions = {
        title,
        tags: tagsStr ? parseTagsString(tagsStr) : undefined,
        content,
      };

      const result = createCommand(options, config);
      
      // Try to commit changes
      try {
        await commitChanges(config, `Create article: ${title}`);
      } catch {
        // Git commit may fail, that's okay
      }

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
      const content = params.content as string | undefined;

      const options: EditOptions = {
        slug,
        title,
        tags: tagsStr ? parseTagsString(tagsStr) : undefined,
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