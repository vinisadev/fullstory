import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

// API-route variant: same lookup as `getSession`, but on failure returns a
// 401 JSON Response that the route handler can pass straight through. The
// Better Auth `apiKey` plugin makes `auth.api.getSession()` accept either a
// session cookie OR an `Authorization: Bearer <fs_…>` header, so callers
// don't need to know which auth method the request used.
//
// Discriminated-union return so route handlers branch without try/catch:
//
//   const auth = await requireApiSession();
//   if (!auth.ok) return auth.response;
//   const { user } = auth;
//   …
export type ApiSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export type RequireApiSessionResult =
  | { ok: true; session: ApiSession["session"]; user: ApiSession["user"] }
  | { ok: false; response: Response };

export async function requireApiSession(): Promise<RequireApiSessionResult> {
  let result: Awaited<ReturnType<typeof getSession>>;
  try {
    result = await getSession();
  } catch (err) {
    // The apiKey plugin throws when the key's per-key rate limit is hit.
    // Surface it as a real 429 — without this catch, the unhandled error
    // bubbles up and Next returns 500 ("Internal Server Error"), which
    // is wrong and breaks MCP clients that retry on 5xx.
    const rateLimited = parseRateLimitError(err);
    if (rateLimited) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(rateLimited.tryAgainIn / 1000),
      );
      return {
        ok: false,
        response: Response.json(
          { error: "Rate limit exceeded", tryAgainIn: rateLimited.tryAgainIn },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfterSeconds) },
          },
        ),
      };
    }
    throw err;
  }
  if (!result) {
    return {
      ok: false,
      response: Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            // Hint to clients that they can authenticate with an API key.
            "WWW-Authenticate":
              'Bearer realm="Full Story API", error="invalid_token"',
          },
        },
      ),
    };
  }
  return { ok: true, session: result.session, user: result.user };
}

// The apiKey plugin throws a Better Auth APIError with code "RATE_LIMITED"
// and `details.tryAgainIn` (milliseconds). Pluck those out without depending
// on the error class — Better Auth's APIError isn't re-exported in a
// stable place, and matching by shape keeps the import surface small.
function parseRateLimitError(err: unknown): { tryAgainIn: number } | null {
  if (!err || typeof err !== "object") return null;
  const body = (err as { body?: unknown }).body;
  if (!body || typeof body !== "object") return null;
  const code = (body as { code?: unknown }).code;
  if (code !== "RATE_LIMITED") return null;
  const details = (body as { details?: unknown }).details;
  const tryAgainIn =
    typeof (details as { tryAgainIn?: unknown })?.tryAgainIn === "number"
      ? (details as { tryAgainIn: number }).tryAgainIn
      : 60_000;
  return { tryAgainIn };
}
