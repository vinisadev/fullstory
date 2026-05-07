"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GlobalShortcuts({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [cheatOpen, setCheatOpen] = useState(false);
  // ref-based so rerenders don't reset the pending prefix mid-keystroke
  const pendingPrefix = useRef<"g" | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function clearPending() {
      pendingPrefix.current = null;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function handleKey(e: KeyboardEvent) {
      // Don't fire when the user is typing somewhere; modifier-tagged
      // shortcuts (cmd+k etc.) are handled by other listeners.
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Resolve a pending two-key sequence (currently just `g X`).
      if (pendingPrefix.current === "g") {
        const key = e.key.toLowerCase();
        clearPending();
        if (key === "i") {
          e.preventDefault();
          router.push(`/${workspaceSlug}/inbox`);
          return;
        }
        if (key === "m") {
          e.preventDefault();
          router.push(`/${workspaceSlug}/my-issues`);
          return;
        }
        // Unknown second key — silently drop the prefix and let the second
        // key fall through (so `g x` doesn't swallow `x`).
      }

      if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        pendingPrefix.current = "g";
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(clearPending, 1500);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setCheatOpen(true);
        return;
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      clearPending();
    };
  }, [router, workspaceSlug]);

  return <ShortcutsCheatSheet open={cheatOpen} onOpenChange={setCheatOpen} />;
}

function ShortcutsCheatSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Most actions are reachable from the keyboard. Press shortcuts when
            no input is focused.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <Group title="Navigation">
            <Shortcut keys={["g", "m"]}>Go to my issues</Shortcut>
            <Shortcut keys={["g", "i"]}>Go to inbox</Shortcut>
            <Shortcut keys={["⌘", "K"]}>Open command palette</Shortcut>
            <Shortcut keys={[","]}>Open command palette (alt)</Shortcut>
            <Shortcut keys={["/"]}>Open command palette (alt)</Shortcut>
          </Group>
          <Group title="Create">
            <Shortcut keys={["c"]}>New issue</Shortcut>
          </Group>
          <Group title="General">
            <Shortcut keys={["?"]}>Show this cheat sheet</Shortcut>
            <Shortcut keys={["e"]} disabled>
              Edit (coming soon)
            </Shortcut>
          </Group>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

function Shortcut({
  keys,
  disabled,
  children,
}: {
  keys: string[];
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={
        disabled
          ? "flex items-center justify-between gap-2 text-sm text-muted-foreground"
          : "flex items-center justify-between gap-2 text-sm"
      }
    >
      <span>{children}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            // biome-ignore lint/suspicious/noArrayIndexKey: small static list
            key={i}
            className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]"
          >
            {k}
          </kbd>
        ))}
      </span>
    </li>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  return el instanceof HTMLElement && el.isContentEditable;
}
