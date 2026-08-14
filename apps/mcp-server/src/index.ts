#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from '@sentinel/shared';
import { readFileTool } from './tools/read-file.js';
import { databaseQueryTool } from './tools/database-query.js';
import { resolveSecretTool } from './tools/resolve-secret.js';
import { toZodSchema } from './tools/types.js';

async function main() {
  const config = loadConfig();

  const server = new McpServer({
    name: 'sentinel-mcp-server',
    version: '1.0.0',
  });

  server.tool(
    readFileTool.name,
    readFileTool.description,
    toZodSchema(readFileTool.schema),
    async ({ path }) => readFileTool.handler({ path }, config),
  );

  server.tool(
    databaseQueryTool.name,
    databaseQueryTool.description,
    toZodSchema(databaseQueryTool.schema),
    async ({ connectionString, query }) =>
      databaseQueryTool.handler({ connectionString, query }, config),
  );

  server.tool(
    resolveSecretTool.name,
    resolveSecretTool.description,
    toZodSchema(resolveSecretTool.schema),
    async ({ reference }) => resolveSecretTool.handler({ reference }, config),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('sentinel-mcp-server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
