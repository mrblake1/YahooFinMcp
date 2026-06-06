# yahoo-finance-mcp

A TypeScript Model Context Protocol (MCP) server that wraps Yahoo Finance data for AI assistants.

## Features

- Stdio transport for Claude Desktop and Copilot compatibility
- Runtime input validation with zod
- Structured market data tools for quotes, history, search, financials, options, and news
- Centralized error responses with MCP-compatible error payloads

## Installation

1. Install dependencies:

   npm install

2. Build:

   npm run build

3. Run:

   npm start

## Claude Desktop Configuration

Add this server to your Claude Desktop MCP config:

{
  "mcpServers": {
    "yahoo-finance-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/yahoo-finance-mcp/dist/index.js"]
    }
  }
}

## Example Prompts

- get_quote: "Get a quote for AAPL including price, open, previous close, day range, volume, market cap, currency, and exchange."
- get_historical_prices: "Get daily historical prices for MSFT from 2025-01-01 to 2025-03-31."
- search_ticker: "Find ticker symbols related to Nvidia with a limit of 5."
- get_financials: "Show annual and quarterly financial summaries for TSLA."
- get_options_chain: "Get the options chain for AMZN for expiry 2026-09-18."
- get_news: "Show the latest 8 news headlines for NVDA."

## Development

- dev: npm run dev
- build: npm run build
- start: npm start
- smoke: npm run smoke (offline deterministic checks)
- smoke:live: npm run smoke:live (real Yahoo API calls)

To fail the smoke test when a tool returns isError, run:

node dist/smoke-test.js --strict

## Data Disclaimer

Yahoo Finance data can be delayed and may be incomplete. Do not use this server for live trading decisions.
