import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errorResult, normalizeError, parseInput, successResult, type ToolHandler } from "../utils/formatters.js";
import yahooFinance from "../utils/yahooClient.js";

const inputSchema = z.object({
  query: z.string().trim().min(1, "query is required"),
  limit: z.number().int().positive().max(50).optional().default(10)
});

export const definition: Tool = {
  name: "search_ticker",
  description: "Search for ticker symbols by company name or keyword",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Company name or search keyword"
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
        minimum: 1,
        maximum: 50
      }
    },
    required: ["query"],
    additionalProperties: false
  }
};

export const handler: ToolHandler = async (input) => {
  const parsed = parseInput(inputSchema, input);
  if (!parsed.ok) {
    return parsed.result;
  }

  try {
    const result = await yahooFinance.search(parsed.data.query, {
      quotesCount: parsed.data.limit,
      newsCount: 0
    });

    return successResult(
      result.quotes.slice(0, parsed.data.limit).map((item) => ({
        symbol: item.symbol ?? null,
        shortname: item.shortname ?? null,
        exchange: item.exchange ?? null,
        quoteType: item.quoteType ?? null
      }))
    );
  } catch (error) {
    return errorResult("Failed to search ticker", normalizeError(error));
  }
};
