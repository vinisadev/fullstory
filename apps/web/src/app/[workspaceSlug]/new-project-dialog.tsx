"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/projects";

// "Web App" -> "WA"; "Backend" -> "BACKE". User can override; we stop
// auto-deriving once they touch the key field.
function deriveKey(name: string): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 5);
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 5);
}

export function NewProjectDialog({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setName("");
    setKey("");
    setDescription("");
    setKeyTouched(false);
    setError(null);
    setPending(false);
  }

  function onNameChange(value: string) {
    setName(value);
    if (!keyTouched) setKey(deriveKey(value));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createProject({
      workspaceSlug,
      name,
      key,
      description: description || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a project</DialogTitle>
          <DialogDescription>
            Pick a name and a 2–5 character key. The key prefixes every issue in
            the project (e.g. WEB-1, WEB-2…).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input
                id="project-name"
                type="text"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-key">Key</FieldLabel>
              <Input
                id="project-key"
                type="text"
                required
                pattern="[A-Z][A-Z0-9]{1,4}"
                maxLength={5}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value.toUpperCase());
                  setKeyTouched(true);
                }}
              />
              <FieldDescription>
                Issues will look like{" "}
                <span className="font-mono">{key || "WEB"}-1</span>.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="project-description">Description</FieldLabel>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <FieldDescription>Optional.</FieldDescription>
            </Field>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name || !key}>
              {pending ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
