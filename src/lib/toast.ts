"use client";

import { toast } from "sonner";

// Normalizes various error shapes (string, Error, Better-Auth-style
// `{ message }`, server-action `{ ok: false, error }`) into a single error
// toast. Falls back to a generic message if nothing useful is extractable.
export function toastError(error: unknown, fallback = "Something went wrong.") {
  toast.error(extractMessage(error) ?? fallback);
}

export function toastSuccess(message: string) {
  toast.success(message);
}

function extractMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error.length > 0 ? error : null;
  }
  if (error instanceof Error) {
    return error.message || null;
  }
  if (error && typeof error === "object") {
    if ("error" in error && typeof error.error === "string") {
      return error.error || null;
    }
    if ("message" in error && typeof error.message === "string") {
      return error.message || null;
    }
  }
  return null;
}
