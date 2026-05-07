"use client";

import { useParams, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createIssue } from "@/lib/issue-actions";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_TYPE_LABELS,
  ISSUE_TYPE_ORDER,
} from "@/lib/issue-display";

type Project = {
  key: string;
  name: string;
};

type IssueType = (typeof ISSUE_TYPE_ORDER)[number];
type IssuePriority = (typeof ISSUE_PRIORITY_ORDER)[number];

type NewIssueContextValue = {
  open: (opts?: { projectKey?: string }) => void;
};

const NewIssueContext = createContext<NewIssueContextValue | null>(null);

export function useNewIssueDialog(): NewIssueContextValue {
  const ctx = useContext(NewIssueContext);
  if (!ctx) {
    throw new Error(
      "useNewIssueDialog must be used inside NewIssueDialogProvider",
    );
  }
  return ctx;
}

export function NewIssueDialogProvider({
  workspaceSlug,
  projects,
  children,
}: {
  workspaceSlug: string;
  projects: Project[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [seedProjectKey, setSeedProjectKey] = useState<string | undefined>();

  const open = useCallback((opts?: { projectKey?: string }) => {
    setSeedProjectKey(opts?.projectKey);
    setIsOpen(true);
  }, []);

  // Global `c` shortcut. Only fires when no input/textarea/contenteditable
  // is focused, so users can type 'c' freely in titles, descriptions, etc.
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (
        e.key === "c" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        !isInputFocused()
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <NewIssueContext.Provider value={{ open }}>
      {children}
      <NewIssueDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        workspaceSlug={workspaceSlug}
        projects={projects}
        seedProjectKey={seedProjectKey}
      />
    </NewIssueContext.Provider>
  );
}

function NewIssueDialog({
  open,
  onOpenChange,
  workspaceSlug,
  projects,
  seedProjectKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  projects: Project[];
  seedProjectKey: string | undefined;
}) {
  const router = useRouter();
  const params = useParams<{ projectKey?: string }>();
  // Pre-fill priority order: explicit seed (e.g., from CommandPalette's
  // future "New issue in <project>") > current URL > first project. May be
  // undefined when there are zero projects in the workspace.
  const urlProjectKey = params.projectKey?.toUpperCase();
  const defaultProjectKey = seedProjectKey ?? urlProjectKey ?? projects[0]?.key;

  const [projectKey, setProjectKey] = useState(defaultProjectKey ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<IssueType>("task");
  const [priority, setPriority] = useState<IssuePriority>("no_priority");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Reset state when the dialog opens (so each invocation is fresh) and when
  // the seed/URL project changes between opens.
  useEffect(() => {
    if (!open) return;
    setProjectKey(defaultProjectKey ?? "");
    setTitle("");
    setDescription("");
    setType("task");
    setPriority("no_priority");
    setError(null);
    setPending(false);
  }, [open, defaultProjectKey]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createIssue({
      workspaceSlug,
      projectKey,
      title,
      description: description || undefined,
      type,
      priority,
    });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    onOpenChange(false);
    router.push(`/${workspaceSlug}/${projectKey}/${result.issue.number}`);
    router.refresh();
  }

  // Cmd+Enter / Ctrl+Enter submits without leaving the description textarea.
  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && title) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  if (projects.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>
              You need at least one project before you can create an issue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
          <DialogDescription>
            Create an issue in{" "}
            {projects.find((p) => p.key === projectKey)?.name ?? "a project"}.
            Press{" "}
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
              ⌘↵
            </kbd>{" "}
            to submit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} onKeyDown={onKeyDown}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="issue-title">Title</FieldLabel>
              <Input
                id="issue-title"
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="issue-description">Description</FieldLabel>
              <Textarea
                id="issue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more context (optional)"
                rows={4}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field>
                <FieldLabel htmlFor="issue-project">Project</FieldLabel>
                <Select value={projectKey} onValueChange={setProjectKey}>
                  <SelectTrigger id="issue-project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        <span className="font-mono text-xs text-muted-foreground">
                          {p.key}
                        </span>{" "}
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-type">Type</FieldLabel>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as IssueType)}
                >
                  <SelectTrigger id="issue-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ISSUE_TYPE_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-priority">Priority</FieldLabel>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as IssuePriority)}
                >
                  <SelectTrigger id="issue-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITY_ORDER.map((p) => (
                      <SelectItem key={p} value={p}>
                        {ISSUE_PRIORITY_LABELS[p] ?? p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title || !projectKey}>
              {pending ? "Creating..." : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  return el instanceof HTMLElement && el.isContentEditable;
}
