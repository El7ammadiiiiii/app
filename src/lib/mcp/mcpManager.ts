/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.6 — MCP (Model Context Protocol) Manager
 * ═══════════════════════════════════════════════════════════════
 *
 * Lightweight MCP client that provides tool definitions and
 * execution for two built-in servers:
 *   1. Filesystem — read/write/list files in the virtual FS
 *   2. Web Search — query web search API for grounding
 *
 * This module exposes:
 *   - `getMCPTools()` — returns tool definitions for LLM function calling
 *   - `executeMCPTool(name, args)` — executes a tool call and returns result
 *   - `MCPToolResult` type
 */

// ═══ Types ═══

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  /** Which MCP server provides this tool */
  server: 'filesystem' | 'web_search';
}

export interface MCPToolResult {
  success: boolean;
  content: string;
  /** Structured data for further processing */
  data?: unknown;
  error?: string;
}

// ═══ Tool Definitions ═══

const FILESYSTEM_TOOLS: MCPToolDefinition[] = [
  {
    name: 'fs_read_file',
    description: 'Read the contents of a file from the virtual file system',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read, e.g. "src/index.ts"' },
      },
      required: ['path'],
    },
    server: 'filesystem',
  },
  {
    name: 'fs_write_file',
    description: 'Write content to a file in the virtual file system. Creates the file if it does not exist.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write to' },
        content: { type: 'string', description: 'File content to write' },
        language: { type: 'string', description: 'Programming language (auto-detected if omitted)' },
      },
      required: ['path', 'content'],
    },
    server: 'filesystem',
  },
  {
    name: 'fs_list_files',
    description: 'List all files in the virtual file system',
    parameters: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Optional directory prefix to filter. Lists all files if omitted.' },
      },
      required: [],
    },
    server: 'filesystem',
  },
  {
    name: 'fs_delete_file',
    description: 'Delete a file from the virtual file system',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to delete' },
      },
      required: ['path'],
    },
    server: 'filesystem',
  },
];

const WEB_SEARCH_TOOLS: MCPToolDefinition[] = [
  {
    name: 'web_search',
    description: 'Search the web and return relevant results. Use for current events, facts, or information not in training data.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num_results: { type: 'string', description: 'Number of results to return (default: 5, max: 10)' },
      },
      required: ['query'],
    },
    server: 'web_search',
  },
  {
    name: 'web_fetch',
    description: 'Fetch the text content of a specific URL',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        max_length: { type: 'string', description: 'Maximum content length in characters (default: 5000)' },
      },
      required: ['url'],
    },
    server: 'web_search',
  },
];

/**
 * Get all MCP tool definitions for injection into LLM function calling
 */
export function getMCPTools(): MCPToolDefinition[] {
  return [...FILESYSTEM_TOOLS, ...WEB_SEARCH_TOOLS];
}

/**
 * Get tools as OpenAI-compatible function definitions
 */
export function getMCPToolsAsOpenAIFunctions() {
  return getMCPTools().map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// ═══ Tool Execution ═══

/**
 * Execute an MCP tool by name with given arguments.
 * This runs server-side — call it from an API route.
 */
export async function executeMCPTool(
  name: string,
  args: Record<string, string>,
  context?: { vfsRead?: (path: string) => any; vfsWrite?: (path: string, content: string, lang?: string) => void; vfsDelete?: (path: string) => void; vfsListFiles?: () => any[] }
): Promise<MCPToolResult> {
  try {
    switch (name) {
      // ── Filesystem Tools ──
      case 'fs_read_file': {
        if (!context?.vfsRead) return { success: false, content: '', error: 'VFS not available' };
        const file = context.vfsRead(args.path);
        if (!file) return { success: false, content: '', error: `File not found: ${args.path}` };
        return { success: true, content: file.content, data: file };
      }

      case 'fs_write_file': {
        if (!context?.vfsWrite) return { success: false, content: '', error: 'VFS not available' };
        context.vfsWrite(args.path, args.content, args.language);
        return { success: true, content: `Successfully wrote ${args.path}`, data: { path: args.path, size: args.content.length } };
      }

      case 'fs_list_files': {
        if (!context?.vfsListFiles) return { success: false, content: '', error: 'VFS not available' };
        let files = context.vfsListFiles();
        if (args.directory) {
          files = files.filter((f: any) => f.path.startsWith(args.directory));
        }
        const listing = files.map((f: any) => `${f.path} (${f.language}, ${f.size}B)`).join('\n');
        return { success: true, content: listing || 'No files found', data: files };
      }

      case 'fs_delete_file': {
        if (!context?.vfsDelete) return { success: false, content: '', error: 'VFS not available' };
        context.vfsDelete(args.path);
        return { success: true, content: `Deleted ${args.path}` };
      }

      // ── Web Search Tools ──
      case 'web_search': {
        return await executeWebSearch(args.query, parseInt(args.num_results || '5'));
      }

      case 'web_fetch': {
        return await executeWebFetch(args.url, parseInt(args.max_length || '5000'));
      }

      default:
        return { success: false, content: '', error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { success: false, content: '', error: err.message || 'Tool execution failed' };
  }
}

// ═══ Web Search Implementation ═══

async function executeWebSearch(query: string, numResults: number = 5): Promise<MCPToolResult> {
  // Use DuckDuckGo HTML API as a free, no-key-required search
  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&no_redirect=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return { success: false, content: '', error: `Search API returned ${response.status}` };
    }

    const data = await response.json();

    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // Abstract (instant answer)
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Instant Answer',
        url: data.AbstractURL || '',
        snippet: data.Abstract,
      });
    }

    // Related Topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, numResults)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.slice(0, 80),
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    if (results.length === 0) {
      return { success: true, content: `No results found for: "${query}"`, data: [] };
    }

    const formatted = results
      .slice(0, numResults)
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
      .join('\n\n');

    return { success: true, content: formatted, data: results };
  } catch (err: any) {
    return { success: false, content: '', error: `Web search failed: ${err.message}` };
  }
}

async function executeWebFetch(url: string, maxLength: number = 5000): Promise<MCPToolResult> {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'text/html,text/plain' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, content: '', error: `Fetch returned ${response.status}` };
    }

    const text = await response.text();

    // Strip HTML tags for readability
    const cleaned = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, maxLength);

    return { success: true, content: cleaned, data: { url, length: cleaned.length } };
  } catch (err: any) {
    return { success: false, content: '', error: `Fetch failed: ${err.message}` };
  }
}
