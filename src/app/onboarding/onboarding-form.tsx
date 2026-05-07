"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error: createError } = await authClient.organization.create({
      name,
      slug,
    });
    if (createError) {
      setError(createError.message ?? "Could not create workspace.");
      setPending(false);
      return;
    }
    router.push(`/${slug}`);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle role="heading" aria-level={1}>
          Create your workspace
        </CardTitle>
        <CardDescription>
          A workspace is where your team's projects and issues live.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
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
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
              />
              <FieldDescription>
                Lowercase letters, numbers, and hyphens. Used in URLs.
              </FieldDescription>
            </Field>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={pending || !name || !slug}
            className="w-full"
          >
            {pending ? "Creating..." : "Create workspace"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
