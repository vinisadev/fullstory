// Validates a post-auth redirect target is a same-origin path. Anything else
// (protocol-relative `//evil.com`, absolute URL, javascript:, etc.) falls back
// to "/" to prevent open-redirect phishing.
export function safeRedirect(target: string | null | undefined): string {
  if (!target) return "/";
  if (!target.startsWith("/")) return "/";
  if (target.startsWith("//")) return "/";
  if (target.startsWith("/\\")) return "/";
  return target;
}
