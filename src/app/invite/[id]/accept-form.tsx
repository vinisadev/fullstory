"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function AcceptForm({
  invitationId,
  workspaceSlug,
}: {
  invitationId: string;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);

  async function onAccept() {
    setPending("accept");
    setError(null);
    const { error: acceptError } =
      await authClient.organization.acceptInvitation({
        invitationId,
      });
    if (acceptError) {
      setError(acceptError.message ?? "Could not accept invitation.");
      setPending(null);
      return;
    }
    router.push(`/${workspaceSlug}`);
    router.refresh();
  }

  async function onDecline() {
    setPending("decline");
    setError(null);
    const { error: rejectError } =
      await authClient.organization.rejectInvitation({
        invitationId,
      });
    if (rejectError) {
      setError(rejectError.message ?? "Could not decline invitation.");
      setPending(null);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        onClick={onAccept}
        disabled={pending !== null}
        className="w-full"
      >
        {pending === "accept" ? "Joining..." : "Accept invitation"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onDecline}
        disabled={pending !== null}
        className="w-full"
      >
        {pending === "decline" ? "Declining..." : "Decline"}
      </Button>
    </div>
  );
}
