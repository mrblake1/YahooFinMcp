import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errorResult, normalizeError, parseInput, successResult, type ToolHandler } from "../utils/formatters.js";
import yahooFinance from "../utils/yahooClient.js";

const inputSchema = z.object({
  symbol: z.string().trim().min(1, "symbol is required")
});

export const definition: Tool = {
  name: "get_quote",
  description: "Get the current price and key stats for a stock ticker",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Ticker symbol, for example AAPL"
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

  const symbol = parsed.data.symbol.toUpperCase();

  try {
    const quote = await yahooFinance.quote(symbol);

    return successResult({
      symbol,
      price: quote.regularMarketPrice ?? null,
      previousClose: quote.regularMarketPreviousClose ?? null,
      open: quote.regularMarketOpen ?? null,
      dayHigh: quote.regularMarketDayHigh ?? null,
      dayLow: quote.regularMarketDayLow ?? null,
      volume: quote.regularMarketVolume ?? null,
      marketCap: quote.marketCap ?? null,
      currency: quote.currency ?? null,
      exchange: quote.fullExchangeName ?? quote.exchange ?? null
    });
  } catch (error) {
    const message = normalizeError(error);

    // yahoo-finance2 may fail crumb retrieval in some regions due consent redirects.
    const shouldTryChartFallback =
      message.includes("Unsupported redirect") ||
      message.includes("No set-cookie header") ||
      message.includes("Could not find crumb");

    if (!shouldTryChartFallback) {
      return errorResult("Failed to fetch quote", message);
    }

    try {
      const chart = await yahooFinance.chart(symbol, {
        period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        interval: "1d",
        return: "array"
      });

      const latest = chart.quotes.at(-1);

      return successResult({
        symbol,
        price: chart.meta.regularMarketPrice ?? latest?.close ?? null,
        previousClose: chart.meta.previousClose ?? chart.meta.chartPreviousClose ?? null,
        open: latest?.open ?? null,
        dayHigh: latest?.high ?? null,
        dayLow: latest?.low ?? null,
        volume: latest?.volume ?? null,
        marketCap: null,
        currency: chart.meta.currency ?? null,
        exchange: chart.meta.exchangeName ?? null,
        note: "quote fallback used chart endpoint due crumb/redirect issue"
      });
    } catch (fallbackError) {
      return errorResult("Failed to fetch quote", {
        primaryError: message,
        fallbackError: normalizeError(fallbackError)
      });
    }
  }
};
