import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/session";

export const listWorkspaces = cache(async () => {
  return auth.api.listOrganizations({
    headers: await headers(),
  });
});

export async function requireOnboarded() {
  const session = await requireSession();
  const workspaces = await listWorkspaces();
  if (workspaces.length === 0) {
    redirect("/onboarding");
  }
  return { session, workspaces };
}

export async function requireWorkspace(slug: string) {
  const { session, workspaces } = await requireOnboarded();
  const workspace = workspaces.find((w) => w.slug === slug);
  if (!workspace) {
    redirect("/");
  }
  return { session, workspace, workspaces };
}
