// Environment configuration for the MCP server.
//
// Read once at startup and validated. If the host CLI's config doesn't
// supply a key, the server fails to launch — better than starting up
// successfully and erroring on every tool call.

export type Env = {
  apiUrl: string;
  apiKey: string;
};

const DEFAULT_API_URL = "http://localhost:3000";

export function readEnv(): Env {
  const apiKey = process.env.FULLSTORY_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "FULLSTORY_API_KEY is required. Generate one at " +
        "<your-host>/[workspace]/settings → 'Your API keys' and add it to " +
        "your MCP server config (Claude Code / Cursor / etc.).",
    );
  }

  const rawUrl = process.env.FULLSTORY_API_URL ?? DEFAULT_API_URL;
  let apiUrl: string;
  try {
    // Strip trailing slash so callers don't accidentally hit `//api/v1/...`.
    apiUrl = new URL(rawUrl).toString().replace(/\/$/, "");
  } catch {
    throw new Error(
      `FULLSTORY_API_URL is not a valid URL: ${JSON.stringify(rawUrl)}`,
    );
  }

  return { apiUrl, apiKey };
}
