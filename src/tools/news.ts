import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errorResult, normalizeError, parseInput, successResult, type ToolHandler } from "../utils/formatters.js";
import yahooFinance from "../utils/yahooClient.js";

const inputSchema = z.object({
  symbol: z.string().trim().min(1, "symbol is required"),
  count: z.number().int().positive().max(25).optional().default(10)
});

export const definition: Tool = {
  name: "get_news",
  description: "Get recent news headlines for a ticker",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Ticker symbol, for example NVDA"
      },
      count: {
        type: "number",
        description: "Number of headlines to return",
        minimum: 1,
        maximum: 25
      }
    },
    required: ["symbol"],
    additionalProperties: false
  }
};

export const handler: ToolHandler = async (input) => {
  const parsed = parseInput(inputSchema, input);
  if (!parsed.ok) {
    return parsed.result;
  }

  try {
    const result = await yahooFinance.search(parsed.data.symbol, {
      quotesCount: 0,
      newsCount: parsed.data.count
    });

    return successResult(
      result.news.slice(0, parsed.data.count).map((item) => ({
        title: item.title ?? null,
        publisher: item.publisher ?? null,
        link: item.link ?? null,
        providerPublishTime: item.providerPublishTime ?? null
      }))
    );
  } catch (error) {
    return errorResult("Failed to fetch news", normalizeError(error));
  }
};
