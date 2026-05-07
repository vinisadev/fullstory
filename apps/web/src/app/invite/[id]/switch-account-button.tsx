"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SwitchAccountButton({ inviteHref }: { inviteHref: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signOut();
    router.refresh();
    router.push(inviteHref);
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="w-full"
    >
      {pending ? "Signing out..." : "Sign out and use a different account"}
    </Button>
  );
}
