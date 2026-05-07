// Helpers for turning API responses + ApiErrors into the
// `{ content: [...], isError? }` shape MCP tool callbacks return.

import { ApiError } from "./client.js";

export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

export function ok(value: unknown): ToolResult {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }] };
}

export function fail(err: unknown): ToolResult {
  const message =
    err instanceof ApiError
      ? `API ${err.status}: ${err.body || err.message}`
      : err instanceof Error
        ? err.message
        : String(err);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
