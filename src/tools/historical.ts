import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errorResult, formatDateOnly, normalizeError, parseInput, successResult, type ToolHandler } from "../utils/formatters.js";
import yahooFinance from "../utils/yahooClient.js";

const inputSchema = z
  .object({
    symbol: z.string().trim().min(1, "symbol is required"),
    period1: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    period2: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    interval: z.enum(["1d", "1wk", "1mo"])
  })
  .refine((value) => new Date(value.period1).getTime() <= new Date(value.period2).getTime(), {
    message: "period1 must be less than or equal to period2",
    path: ["period1"]
  });

export const definition: Tool = {
  name: "get_historical_prices",
  description: "Get OHLCV historical data for a ticker",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Ticker symbol, for example MSFT"
      },
      period1: {
        type: "string",
        description: "Start date as ISO date, for example 2025-01-01"
      },
      period2: {
        type: "string",
        description: "End date as ISO date, for example 2025-03-31"
      },
      interval: {
        type: "string",
        enum: ["1d", "1wk", "1mo"]
      }
    },
    required: ["symbol", "period1", "period2", "interval"],
    additionalProperties: false
  }
};

export const handler: ToolHandler = async (input) => {
  const parsed = parseInput(inputSchema, input);
  if (!parsed.ok) {
    return parsed.result;
  }

  try {
    const historical = await yahooFinance.historical(parsed.data.symbol, {
      period1: new Date(parsed.data.period1),
      period2: new Date(parsed.data.period2),
      interval: parsed.data.interval
    });

    return successResult(
      historical.map((item) => ({
        date: formatDateOnly(item.date),
        open: item.open ?? null,
        high: item.high ?? null,
        low: item.low ?? null,
        close: item.close ?? null,
        volume: item.volume ?? null,
        adjClose: item.adjClose ?? null
      }))
    );
  } catch (error) {
    return errorResult("Failed to fetch historical prices", normalizeError(error));
  }
};
