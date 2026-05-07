"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { setProjectArchived, updateProject } from "@/lib/projects";

// Radix Select rejects empty-string values, so use a sentinel for "no lead".
const NO_LEAD = "__none__";

type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  leadId: string | null;
  archivedAt: Date | null;
};

type Member = {
  userId: string;
  name: string;
  email: string;
};

export function ProjectSettingsForm({
  project,
  members,
}: {
  project: Project;
  members: Member[];
}) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [leadId, setLeadId] = useState<string>(project.leadId ?? NO_LEAD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "archive" | null>(null);

  const dirty =
    name !== project.name ||
    description !== (project.description ?? "") ||
    leadId !== (project.leadId ?? NO_LEAD);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending("save");
    setError(null);
    const result = await updateProject({
      projectId: project.id,
      name,
      description,
      leadId: leadId === NO_LEAD ? null : leadId,
    });
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  async function onToggleArchive() {
    setPending("archive");
    setError(null);
    const result = await setProjectArchived({
      projectId: project.id,
      archived: !project.archivedAt,
    });
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="project-key">Key</FieldLabel>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {project.key}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Issues: {project.key}-1, {project.key}-2, …
              </span>
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="project-name">Name</FieldLabel>
            <Input
              id="project-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="project-description">Description</FieldLabel>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="project-lead">Project lead</FieldLabel>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger id="project-lead">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LEAD}>No lead</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name}{" "}
                    <span className="text-muted-foreground">({m.email})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Optional. Used to default issue assignment and surface the lead on
              the project page.
            </FieldDescription>
          </Field>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={pending !== null || !dirty}
            className="w-fit"
          >
            {pending === "save" ? "Saving..." : "Save changes"}
          </Button>
        </FieldGroup>
      </form>

      <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
        <div>
          <p className="text-sm font-medium">
            {project.archivedAt ? "Archived" : "Active"}
          </p>
          <p className="text-xs text-muted-foreground">
            {project.archivedAt
              ? "Archived projects stay readable but are hidden from default views."
              : "Archive when the project is finished or paused."}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant={project.archivedAt ? "outline" : "destructive"}
              disabled={pending !== null}
            >
              {project.archivedAt ? "Unarchive" : "Archive project"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {project.archivedAt
                  ? "Unarchive this project?"
                  : "Archive this project?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {project.archivedAt
                  ? "It will reappear in default views and on the workspace home."
                  : "It will be hidden from default views. Existing issues remain accessible by URL."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onToggleArchive}>
                {project.archivedAt ? "Unarchive" : "Archive"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
