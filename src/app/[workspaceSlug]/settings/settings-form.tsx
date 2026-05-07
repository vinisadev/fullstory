"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Workspace = {
  id: string;
  name: string;
  slug: string;
};

export function SettingsForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const dirty = name !== workspace.name || slug !== workspace.slug;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error: updateError } = await authClient.organization.update({
      data: { name, slug },
      organizationId: workspace.id,
    });
    if (updateError) {
      setError(updateError.message ?? "Could not save changes.");
      setPending(false);
      return;
    }
    if (slug !== workspace.slug) {
      router.push(`/${slug}/settings`);
    }
    router.refresh();
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">URL slug</FieldLabel>
          <Input
            id="slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <FieldDescription>
            Changing the slug updates every URL for this workspace.
          </FieldDescription>
        </Field>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || !dirty} className="w-fit">
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}
