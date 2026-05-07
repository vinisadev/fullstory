"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, Copy, Plus } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { toastError } from "@/lib/toast";

export type ApiKeyRow = {
  id: string;
  name: string | null;
  prefix: string | null;
  start: string | null;
  enabled: boolean;
  createdAt: Date;
  lastRequest: Date | null;
};

export function ApiKeysSection({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <CreateApiKeyDialog />
      </div>
      {apiKeys.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          You don't have any API keys yet. Create one to give the MCP server (or
          any external tool) access to your account.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((k) => (
              <ApiKeyRowItem key={k.id} apiKey={k} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ApiKeyRowItem({ apiKey: k }: { apiKey: ApiKeyRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onRevoke() {
    setPending(true);
    const { error } = await authClient.apiKey.delete({ keyId: k.id });
    if (error) {
      toastError(error.message ?? "Could not revoke key.");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell>{k.name ?? <span className="text-muted-foreground">(unnamed)</span>}</TableCell>
      <TableCell>
        <span className="font-mono text-xs text-muted-foreground">
          {(k.prefix ?? "") + (k.start ?? "")}…
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(k.createdAt, { addSuffix: true })}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {k.lastRequest
          ? formatDistanceToNow(k.lastRequest, { addSuffix: true })
          : "Never"}
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              className="text-destructive"
            >
              Revoke
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
              <AlertDialogDescription>
                Any tool using this key will lose access immediately. This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRevoke}>Revoke</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

function CreateApiKeyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setPending(false);
    setCreatedKey(null);
    setCopied(false);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { data, error: createError } = await authClient.apiKey.create({
      name,
    });
    if (createError || !data?.key) {
      setError(createError?.message ?? "Could not create key.");
      setPending(false);
      return;
    }
    setCreatedKey(data.key);
    setPending(false);
  }

  async function copy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function close() {
    setOpen(false);
    // Refresh after closing if a key was created so the table picks it up.
    if (createdKey) router.refresh();
    // Defer reset until after the close animation.
    setTimeout(reset, 200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();
        } else {
          setOpen(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-3.5" />
          Create key
        </Button>
      </DialogTrigger>
      <DialogContent>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Save this key now</DialogTitle>
              <DialogDescription>
                This is the only time you'll see the full key. Copy it into your
                MCP config or password manager — we won't show it again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input value={createdKey} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={copy}>
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
            <DialogFooter>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Name the key so you can recognize it later. Keys belong to your
                user account, not a specific workspace.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="api-key-name">Name</FieldLabel>
                <Input
                  id="api-key-name"
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MCP server (laptop)"
                />
                <FieldDescription>
                  Anything that helps you identify the key. You can revoke
                  individual keys later.
                </FieldDescription>
              </Field>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name}>
                {pending ? "Creating..." : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
