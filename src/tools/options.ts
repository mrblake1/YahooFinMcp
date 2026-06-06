import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errorResult, normalizeError, parseInput, successResult, type ToolHandler } from "../utils/formatters.js";
import yahooFinance from "../utils/yahooClient.js";

const inputSchema = z.object({
  symbol: z.string().trim().min(1, "symbol is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format").optional()
});

const formatContract = (contract: {
  strike?: number;
  lastPrice?: number;
  bid?: number;
  ask?: number;
  impliedVolatility?: number;
  openInterest?: number;
}) => ({
  strike: contract.strike ?? null,
  lastPrice: contract.lastPrice ?? null,
  bid: contract.bid ?? null,
  ask: contract.ask ?? null,
  impliedVolatility: contract.impliedVolatility ?? null,
  openInterest: contract.openInterest ?? null
});

export const definition: Tool = {
  name: "get_options_chain",
  description: "Get the options chain for a symbol and expiry date",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Ticker symbol, for example AMZN"
      },
      date: {
        type: "string",
        description: "Expiry date in YYYY-MM-DD format"
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
    const queryOptions = parsed.data.date ? { date: parsed.data.date } : {};

    const options = await yahooFinance.options(
      parsed.data.symbol,
      queryOptions
    );

    const selectedExpiry = options.options[0];

    return successResult({
      symbol: parsed.data.symbol.toUpperCase(),
      expiryDate: parsed.data.date ?? null,
      calls: (selectedExpiry?.calls ?? []).map(formatContract),
      puts: (selectedExpiry?.puts ?? []).map(formatContract)
    });
  } catch (error) {
    return errorResult("Failed to fetch options chain", normalizeError(error));
  }
};
