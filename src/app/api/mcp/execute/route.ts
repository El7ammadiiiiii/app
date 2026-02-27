/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.6 — MCP Tool Execution API Route
 * ═══════════════════════════════════════════════════════════════
 *
 * POST /api/mcp/execute
 * Executes an MCP tool call and returns the result.
 *
 * Body: { tool: string, args: Record<string, string> }
 * Returns: MCPToolResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeMCPTool, getMCPTools } from '@/lib/mcp/mcpManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, args } = body;

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "tool" parameter' },
        { status: 400 }
      );
    }

    // Execute the tool (VFS context not available server-side — web tools only from this route)
    // Filesystem tools are handled client-side via the VFS store
    const result = await executeMCPTool(tool, args || {});

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('MCP execute error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    tools: getMCPTools().map((t) => ({
      name: t.name,
      description: t.description,
      server: t.server,
    })),
  });
}
