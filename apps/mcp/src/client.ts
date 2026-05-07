// Thin HTTP client over the Full Story REST API. Pre-attaches the bearer
// token, JSON-encodes bodies, and turns non-2xx responses into typed errors
// the tool handlers can surface to the host CLI.

import type { Env } from "./env.js";

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `API error ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type ApiClient = {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
};

export function createApiClient({ apiUrl, apiKey }: Env): ApiClient {
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = { ...baseHeaders };
    let payload: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: payload,
    });

    const text = await res.text();
    if (!res.ok) {
      // Surface the API's `{ "error": "..." }` shape when present.
      let message = text;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.error === "string") {
          message = parsed.error;
        }
      } catch {
        // body wasn't JSON; keep raw text
      }
      throw new ApiError(res.status, text, `${method} ${path}: ${message}`);
    }
    if (text === "") {
      // 204 / empty success
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    patch: (path, body) => request("PATCH", path, body),
    delete: (path) => request("DELETE", path),
  };
}
