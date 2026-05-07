"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";

type Role = "member" | "admin";

type CreatedInvite = {
  email: string;
  url: string;
};

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { data, error: inviteError } =
      await authClient.organization.inviteMember({
        email,
        role,
        organizationId: workspaceId,
      });
    if (inviteError || !data) {
      setError(inviteError?.message ?? "Could not create invitation.");
      setPending(false);
      return;
    }
    setCreated({
      email: data.email,
      url: `${window.location.origin}/invite/${data.id}`,
    });
    setPending(false);
  }

  async function copyLink() {
    if (!created) return;
    await navigator.clipboard.writeText(created.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setEmail("");
    setRole("member");
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  if (created) {
    return (
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="invite-link">
            Invitation link for {created.email}
          </FieldLabel>
          <div className="flex gap-2">
            <Input id="invite-link" readOnly value={created.url} />
            <Button type="button" variant="outline" onClick={copyLink}>
              {copied ? (
                <>
                  <Check />
                  Copied
                </>
              ) : (
                <>
                  <Copy />
                  Copy
                </>
              )}
            </Button>
          </div>
          <FieldDescription>
            Share this link via Slack, email, or any channel. Only{" "}
            {created.email} can accept it.
          </FieldDescription>
        </Field>
        <Button type="button" variant="ghost" onClick={reset} className="w-fit">
          Invite another member
        </Button>
      </FieldGroup>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="invite-email">Email</FieldLabel>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="invite-role">Role</FieldLabel>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || !email} className="w-fit">
          {pending ? "Creating..." : "Create invite link"}
        </Button>
      </FieldGroup>
    </form>
  );
}
