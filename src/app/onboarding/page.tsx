import { requireSession } from "@/lib/session";
import { listWorkspaces } from "@/lib/workspace";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  await requireSession();
  const workspaces = await listWorkspaces();
  const hasExistingWorkspaces = workspaces.length > 0;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <OnboardingForm hasExistingWorkspaces={hasExistingWorkspaces} />
    </main>
  );
}
