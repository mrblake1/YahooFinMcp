import axios from "axios";
import { createServer } from "node:http";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from "@modelcontextprotocol/sdk/types.js";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
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

const mcpServer = new McpServer(
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

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => tool.definition)
  };
});

 mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
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

const transport = new NodeStreamableHTTPServerTransport({
  sessionIdGenerator: undefined
});

const start = async (): Promise<void> => {
  await mcpServer.connect(transport);

  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "0.0.0.0";

  const httpServer = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

    if (requestUrl.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (requestUrl.pathname !== "/mcp") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
      return;
    }

    await transport.handleRequest(req, res);
  });

  const shutdown = async (): Promise<void> => {
    await transport.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  httpServer.listen(port, host, () => {
    console.log(
      JSON.stringify({
        status: "started",
        name: manifest.name,
        endpoint: `http://${host}:${port}/mcp`,
        health: `http://${host}:${port}/health`
      })
    );
  });
};

start().catch((error) => {
  const message = normalizeError(error);
  console.error(JSON.stringify({ error: "Failed to start yahoo-finance-mcp", message }));
  process.exit(1);
});
