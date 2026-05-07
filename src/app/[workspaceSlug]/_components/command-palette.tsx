"use client";

import {
  FlagIcon,
  FolderIcon,
  HomeIcon,
  InboxIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
  UserMinusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { updateIssue } from "@/lib/issue-actions";
import {
  ISSUE_PRIORITY_COLORS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_STATUS_COLORS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
} from "@/lib/issue-display";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useFocusedIssue } from "./focused-issue";
import { useNewIssueDialog } from "./new-issue-dialog";

type Project = {
  key: string;
  name: string;
};

export function CommandPalette({
  workspaceSlug,
  projects,
  currentUserId,
  currentUserName,
}: {
  workspaceSlug: string;
  projects: Project[];
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const newIssue = useNewIssueDialog();
  const focusedIssueId = useFocusedIssue();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      // cmd+k / ctrl+k always works
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // bare comma OR slash open the palette, but only when the user isn't
      // typing somewhere. `/` doubles as the search shortcut (task 43) until
      // a real global search lands (task 66).
      if ((e.key === "," || e.key === "/") && !isInputFocused()) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function runIssueAction(patch: Parameters<typeof updateIssue>[0]) {
    if (!focusedIssueId) return;
    setOpen(false);
    startTransition(async () => {
      const result = await updateIssue(patch);
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem
              value="home workspace"
              onSelect={() => go(`/${workspaceSlug}`)}
            >
              <HomeIcon />
              Workspace home
            </CommandItem>
            <CommandItem
              value="my issues assigned to me"
              onSelect={() => go(`/${workspaceSlug}/my-issues`)}
            >
              <UserIcon />
              My issues
              <CommandShortcut>g m</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="inbox notifications"
              onSelect={() => go(`/${workspaceSlug}/inbox`)}
            >
              <InboxIcon />
              Inbox
              <CommandShortcut>g i</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="workspace settings"
              onSelect={() => go(`/${workspaceSlug}/settings`)}
            >
              <SettingsIcon />
              Workspace settings
            </CommandItem>
          </CommandGroup>

          {projects.length > 0 && (
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={p.key}
                  value={`project ${p.key} ${p.name}`}
                  onSelect={() => go(`/${workspaceSlug}/${p.key}`)}
                >
                  <FolderIcon />
                  <span className="flex-1">{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.key}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {focusedIssueId && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Issue actions">
                {ISSUE_STATUS_ORDER.map((s) => (
                  <CommandItem
                    key={`status-${s}`}
                    value={`set status ${ISSUE_STATUS_LABELS[s] ?? s}`}
                    onSelect={() =>
                      runIssueAction({
                        issueId: focusedIssueId,
                        status: s,
                      })
                    }
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 rounded-full",
                        ISSUE_STATUS_COLORS[s] ?? "bg-zinc-400",
                      )}
                    />
                    Set status to {ISSUE_STATUS_LABELS[s] ?? s}
                  </CommandItem>
                ))}
                {ISSUE_PRIORITY_ORDER.map((p) => (
                  <CommandItem
                    key={`priority-${p}`}
                    value={`set priority ${ISSUE_PRIORITY_LABELS[p] ?? p}`}
                    onSelect={() =>
                      runIssueAction({
                        issueId: focusedIssueId,
                        priority: p,
                      })
                    }
                  >
                    <FlagIcon
                      className={
                        ISSUE_PRIORITY_COLORS[p] ?? "text-muted-foreground"
                      }
                    />
                    Set priority to {ISSUE_PRIORITY_LABELS[p] ?? p}
                  </CommandItem>
                ))}
                <CommandItem
                  value="assign to me"
                  onSelect={() =>
                    runIssueAction({
                      issueId: focusedIssueId,
                      assigneeId: currentUserId,
                    })
                  }
                >
                  <UserIcon />
                  Assign to {currentUserName} (me)
                </CommandItem>
                <CommandItem
                  value="unassign issue"
                  onSelect={() =>
                    runIssueAction({
                      issueId: focusedIssueId,
                      assigneeId: null,
                    })
                  }
                >
                  <UserMinusIcon />
                  Unassign
                </CommandItem>
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          <CommandGroup heading="Create">
            <CommandItem
              value="create new issue"
              onSelect={() => {
                setOpen(false);
                newIssue.open();
              }}
            >
              <PlusIcon />
              New issue
              <CommandShortcut>c</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="create new project"
              onSelect={() => go(`/${workspaceSlug}`)}
            >
              <PlusIcon />
              New project
            </CommandItem>
            <CommandItem
              value="create new workspace"
              onSelect={() => go("/onboarding")}
            >
              <PlusIcon />
              New workspace
            </CommandItem>
          </CommandGroup>

          {/* Recent section is deferred — it needs visited-issue tracking
            (localStorage or DB-backed). Adding when there's data to show. */}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  return el instanceof HTMLElement && el.isContentEditable;
}
