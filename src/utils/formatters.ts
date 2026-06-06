import { z, ZodError } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ToolHandler = (input: unknown) => Promise<CallToolResult>;

const textResult = (payload: unknown): CallToolResult => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(payload, null, 2)
    }
  ]
});

export const successResult = (payload: unknown): CallToolResult => textResult(payload);

export const errorResult = (message: string, details?: unknown): CallToolResult => ({
  isError: true,
  content: [
    {
      type: "text",
      text: JSON.stringify(
        {
          error: message,
          details
        },
        null,
        2
      )
    }
  ]
});

export const validationErrorResult = (error: ZodError): CallToolResult =>
  errorResult(
    "Validation error",
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code
    }))
  );

export const parseInput = <T>(schema: z.ZodType<T>, input: unknown): { ok: true; data: T } | { ok: false; result: CallToolResult } => {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      result: validationErrorResult(parsed.error)
    };
  }

  return {
    ok: true,
    data: parsed.data
  };
};

export const normalizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
};

export const formatDateOnly = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split("T")[0];
};
