import axios from "axios";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from "@modelcontextprotocol/sdk/types.js";
import { handler as financialsHandler, definition as financialsDefinition } from "./tools/financials.js";
import { handler as historicalHandler, definition as historicalDefinition } from "./tools/historical.js";
import { handler as newsHandler, definition as newsDefinition } from "./tools/news.js";
import { handler as optionsHandler, definition as optionsDefinition } from "./tools/options.js";
import { handler as quoteHandler, definition as quoteDefinition } from "./tools/quote.js";
import { handler as searchHandler, definition as searchDefinition } from "./tools/search.js";
import { errorResult, normalizeError, type ToolHandler } from "./utils/formatters.js";
import "./utils/yahooClient.js";

export const manifest = {
  name: "yahoo-finance-mcp",
  version: "1.0.0",
  description: "MCP server exposing Yahoo Finance market data tools"
};

type RegisteredTool = {
  definition: Tool;
  handler: ToolHandler;
};

const tools: RegisteredTool[] = [
  { definition: quoteDefinition, handler: quoteHandler },
  { definition: historicalDefinition, handler: historicalHandler },
  { definition: searchDefinition, handler: searchHandler },
  { definition: financialsDefinition, handler: financialsHandler },
  { definition: optionsDefinition, handler: optionsHandler },
  { definition: newsDefinition, handler: newsHandler }
];

const toolsByName = new Map<string, RegisteredTool>(tools.map((tool) => [tool.definition.name, tool]));

axios.defaults.timeout = 15000;

const server = new Server(
  {
    name: manifest.name,
    version: manifest.version
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => tool.definition)
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const tool = toolsByName.get(toolName);

  if (!tool) {
    return errorResult(`Unknown tool: ${toolName}`);
  }

  try {
    return await tool.handler(request.params.arguments ?? {});
  } catch (error) {
    return errorResult(`Unhandled tool error in ${toolName}`, normalizeError(error));
  }
});

const start = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

start().catch((error) => {
  const message = normalizeError(error);
  console.error(JSON.stringify({ error: "Failed to start yahoo-finance-mcp", message }));
  process.exit(1);
});
