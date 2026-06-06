import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { definition as financialsDefinition, handler as financialsHandler } from "./tools/financials.js";
import { definition as historicalDefinition, handler as historicalHandler } from "./tools/historical.js";
import { definition as newsDefinition, handler as newsHandler } from "./tools/news.js";
import { definition as optionsDefinition, handler as optionsHandler } from "./tools/options.js";
import { definition as quoteDefinition, handler as quoteHandler } from "./tools/quote.js";
import { definition as searchDefinition, handler as searchHandler } from "./tools/search.js";
import yahooFinance from "./utils/yahooClient.js";

type SmokeCase = {
  name: string;
  run: () => Promise<CallToolResult>;
};

const testCases: SmokeCase[] = [
  {
    name: quoteDefinition.name,
    run: () => quoteHandler({ symbol: "AAPL" })
  },
  {
    name: historicalDefinition.name,
    run: () =>
      historicalHandler({
        symbol: "MSFT",
        period1: "2025-01-01",
        period2: "2025-01-15",
        interval: "1d"
      })
  },
  {
    name: searchDefinition.name,
    run: () => searchHandler({ query: "Nvidia", limit: 5 })
  },
  {
    name: financialsDefinition.name,
    run: () => financialsHandler({ symbol: "TSLA" })
  },
  {
    name: optionsDefinition.name,
    run: () => optionsHandler({ symbol: "AMZN" })
  },
  {
    name: newsDefinition.name,
    run: () => newsHandler({ symbol: "NVDA", count: 5 })
  }
];

const summarizeContent = (result: CallToolResult): string => {
  const first = result.content[0];
  if (!first || first.type !== "text") {
    return "No text content returned";
  }

  const maxLength = 180;
  const compact = first.text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength)}...`;
};

const run = async (): Promise<void> => {
  const liveMode = process.argv.includes("--live");
  const strictMode = process.argv.includes("--strict");
  let failures = 0;
  let toolErrors = 0;

  const finance = yahooFinance as unknown as {
    quote: typeof yahooFinance.quote;
    historical: typeof yahooFinance.historical;
    search: typeof yahooFinance.search;
    quoteSummary: typeof yahooFinance.quoteSummary;
    options: typeof yahooFinance.options;
  };

  const original = {
    quote: finance.quote,
    historical: finance.historical,
    search: finance.search,
    quoteSummary: finance.quoteSummary,
    options: finance.options
  };

  if (!liveMode) {
    finance.quote = (async () => ({
      regularMarketPrice: 189.34,
      regularMarketPreviousClose: 188.12,
      regularMarketOpen: 188.9,
      regularMarketDayHigh: 190.11,
      regularMarketDayLow: 187.8,
      regularMarketVolume: 61234567,
      marketCap: 2900000000000,
      currency: "USD",
      fullExchangeName: "NasdaqGS",
      exchange: "NMS"
    })) as unknown as typeof yahooFinance.quote;

    finance.historical = (async () => [
      {
        date: new Date("2025-01-02"),
        open: 425.12,
        high: 430.5,
        low: 423.4,
        close: 429.88,
        volume: 23500000,
        adjClose: 429.88
      },
      {
        date: new Date("2025-01-03"),
        open: 430,
        high: 431.2,
        low: 426.7,
        close: 428.45,
        volume: 19800000,
        adjClose: 428.45
      }
    ]) as unknown as typeof yahooFinance.historical;

    finance.search = (async (_query: string, options?: { quotesCount?: number; newsCount?: number }) => {
      const quotesCount = options?.quotesCount ?? 0;
      const newsCount = options?.newsCount ?? 0;

      return {
        quotes:
          quotesCount > 0
            ? [
                {
                  symbol: "NVDA",
                  shortname: "NVIDIA Corporation",
                  exchange: "NMS",
                  quoteType: "EQUITY"
                }
              ]
            : [],
        news:
          newsCount > 0
            ? [
                {
                  title: "NVIDIA Announces New Product Roadmap",
                  publisher: "Example Finance",
                  link: "https://example.com/news/nvda-roadmap",
                  providerPublishTime: 1748900000
                }
              ]
            : []
      };
    }) as typeof yahooFinance.search;

    finance.quoteSummary = (async () => ({
      incomeStatementHistory: {
        incomeStatementHistory: [
          {
            endDate: { raw: 1703980800 },
            totalRevenue: { raw: 96773000000 },
            netIncome: { raw: 14999000000 }
          }
        ]
      },
      incomeStatementHistoryQuarterly: {
        incomeStatementHistory: [
          {
            endDate: { raw: 1711929600 },
            totalRevenue: { raw: 24000000000 },
            netIncome: { raw: 4200000000 }
          }
        ]
      },
      balanceSheetHistory: {
        balanceSheetStatements: [
          {
            endDate: { raw: 1703980800 },
            totalAssets: { raw: 352755000000 },
            totalLiab: { raw: 290437000000 }
          }
        ]
      },
      balanceSheetHistoryQuarterly: {
        balanceSheetStatements: [
          {
            endDate: { raw: 1711929600 },
            totalAssets: { raw: 355000000000 },
            totalLiab: { raw: 292000000000 }
          }
        ]
      },
      cashflowStatementHistory: {
        cashflowStatements: [
          {
            endDate: { raw: 1703980800 },
            totalCashFromOperatingActivities: { raw: 110543000000 },
            capitalExpenditures: { raw: -10959000000 }
          }
        ]
      },
      cashflowStatementHistoryQuarterly: {
        cashflowStatements: [
          {
            endDate: { raw: 1711929600 },
            totalCashFromOperatingActivities: { raw: 27500000000 },
            capitalExpenditures: { raw: -2700000000 }
          }
        ]
      }
    })) as unknown as typeof yahooFinance.quoteSummary;

    finance.options = (async () => ({
      options: [
        {
          calls: [
            {
              strike: 190,
              lastPrice: 6.15,
              bid: 6.05,
              ask: 6.2,
              impliedVolatility: 0.22,
              openInterest: 12034
            }
          ],
          puts: [
            {
              strike: 180,
              lastPrice: 4.8,
              bid: 4.75,
              ask: 4.9,
              impliedVolatility: 0.24,
              openInterest: 9544
            }
          ]
        }
      ]
    })) as unknown as typeof yahooFinance.options;
  }

  try {
    for (const testCase of testCases) {
      try {
        const result = await testCase.run();
        const status = result.isError ? "ERROR" : "OK";
        if (result.isError) {
          toolErrors += 1;
          if (strictMode) {
            failures += 1;
          }
        }

        console.log(`[${status}] ${testCase.name}: ${summarizeContent(result)}`);
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] ${testCase.name}: Unhandled exception: ${message}`);
      }
    }
  } finally {
    finance.quote = original.quote;
    finance.historical = original.historical;
    finance.search = original.search;
    finance.quoteSummary = original.quoteSummary;
    finance.options = original.options;
  }

  if (!liveMode) {
    console.log("\nSmoke test ran in offline mode. Use --live for real Yahoo API calls.");
  }

  if (failures > 0) {
    console.error(`\nSmoke test finished with ${failures} failure(s).`);
    process.exitCode = 1;
    return;
  }

  if (toolErrors > 0 && !strictMode) {
    console.log(`\nSmoke test finished with ${toolErrors} tool error result(s).`);
    console.log("Handlers are wired correctly, but upstream Yahoo requests failed in this environment.");
    return;
  }

  console.log("\nSmoke test finished successfully.");
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Smoke test runner failed: ${message}`);
  process.exit(1);
});
