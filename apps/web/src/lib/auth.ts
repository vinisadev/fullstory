import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/drizzle";
import * as schema from "@/drizzle/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
    apiKey({
      // Show key prefix in lists ("fs_live_…") so users recognize keys.
      defaultPrefix: "fs_",
      // Allow per-key expirations; default null = never expires unless set.
      enableMetadata: true,
      // Make `auth.api.getSession({ headers })` resolve API-key-authed
      // requests to a session — the plugin's session-injection hook is
      // opt-in. Without this, `/api/v1/*` always sees `null` and 401s.
      enableSessionForAPIKeys: true,
      // Read keys from `Authorization: Bearer fs_…` (and the legacy
      // `x-api-key` header as a fallback). The default is `x-api-key`
      // only, which doesn't match the contract documented in API.md.
      customAPIKeyGetter: (ctx) => {
        const auth = ctx.headers?.get("authorization");
        if (auth) {
          const match = auth.match(/^Bearer\s+(.+)$/i);
          if (match) return match[1].trim();
        }
        return ctx.headers?.get("x-api-key") ?? null;
      },
      // The plugin defaults to 10 requests / 24h, which is unusable for
      // anything beyond a smoke test. 1000 req/min is generous enough for
      // dev + the MCP-driven workflows; task 110 will replace this with a
      // properly-configured per-route limit. Note: these only apply to
      // newly created keys — existing rows store their own values.
      rateLimit: {
        enabled: true,
        maxRequests: 1000,
        timeWindow: 60_000,
      },
    }),
  ],
});
