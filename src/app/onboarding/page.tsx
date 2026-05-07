import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { listWorkspaces } from "@/lib/workspace";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  await requireSession();
  const workspaces = await listWorkspaces();
  if (workspaces.length > 0) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <OnboardingForm />
    </main>
  );
}
