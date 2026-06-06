import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errorResult, formatDateOnly, normalizeError, parseInput, successResult, type ToolHandler } from "../utils/formatters.js";
import yahooFinance from "../utils/yahooClient.js";

const inputSchema = z.object({
  symbol: z.string().trim().min(1, "symbol is required")
});

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
};

const extractDate = (value: unknown): string | null => {
  if (value instanceof Date) {
    return formatDateOnly(value);
  }

  if (typeof value === "string") {
    return formatDateOnly(value);
  }

  if (typeof value === "number") {
    return formatDateOnly(new Date(value * 1000));
  }

  if (typeof value === "object" && value !== null) {
    const maybeRaw = (value as { raw?: unknown }).raw;
    if (typeof maybeRaw === "number") {
      return formatDateOnly(new Date(maybeRaw * 1000));
    }
  }

  return null;
};

const normalizeStatement = (statement: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(statement).reduce<Record<string, unknown>>((acc, [key, rawValue]) => {
    if (key === "maxAge") {
      return acc;
    }

    if (key === "endDate") {
      acc.endDate = extractDate(rawValue);
      return acc;
    }

    if (typeof rawValue === "object" && rawValue !== null && "raw" in rawValue) {
      const maybeNumber = (rawValue as { raw?: unknown }).raw;
      acc[key] = maybeNumber ?? null;
      return acc;
    }

    acc[key] = rawValue;
    return acc;
  }, {});
};

export const definition: Tool = {
  name: "get_financials",
  description: "Get income statement, balance sheet, and cash flow summary",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Ticker symbol, for example TSLA"
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
    const summary = await yahooFinance.quoteSummary(parsed.data.symbol, {
      modules: [
        "incomeStatementHistory",
        "incomeStatementHistoryQuarterly",
        "balanceSheetHistory",
        "balanceSheetHistoryQuarterly",
        "cashflowStatementHistory",
        "cashflowStatementHistoryQuarterly"
      ]
    });

    const annualIncome = toRecordArray(summary.incomeStatementHistory?.incomeStatementHistory).map(normalizeStatement);
    const quarterlyIncome = toRecordArray(summary.incomeStatementHistoryQuarterly?.incomeStatementHistory).map(normalizeStatement);

    const annualBalance = toRecordArray(summary.balanceSheetHistory?.balanceSheetStatements).map(normalizeStatement);
    const quarterlyBalance = toRecordArray(summary.balanceSheetHistoryQuarterly?.balanceSheetStatements).map(normalizeStatement);

    const annualCashFlow = toRecordArray(summary.cashflowStatementHistory?.cashflowStatements).map(normalizeStatement);
    const quarterlyCashFlow = toRecordArray(summary.cashflowStatementHistoryQuarterly?.cashflowStatements).map(normalizeStatement);

    return successResult({
      symbol: parsed.data.symbol.toUpperCase(),
      annual: {
        incomeStatement: annualIncome,
        balanceSheet: annualBalance,
        cashFlow: annualCashFlow
      },
      quarterly: {
        incomeStatement: quarterlyIncome,
        balanceSheet: quarterlyBalance,
        cashFlow: quarterlyCashFlow
      }
    });
  } catch (error) {
    return errorResult("Failed to fetch financials", normalizeError(error));
  }
};
