"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type FocusedIssueContextValue = {
  issueId: string | null;
  setIssueId: (id: string | null) => void;
};

const FocusedIssueContext = createContext<FocusedIssueContextValue | null>(
  null,
);

export function FocusedIssueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [issueId, setIssueIdState] = useState<string | null>(null);

  const setIssueId = useCallback((id: string | null) => {
    setIssueIdState(id);
  }, []);

  return (
    <FocusedIssueContext.Provider value={{ issueId, setIssueId }}>
      {children}
    </FocusedIssueContext.Provider>
  );
}

export function useFocusedIssue(): string | null {
  const ctx = useContext(FocusedIssueContext);
  return ctx?.issueId ?? null;
}

// Render this from any page that wants the command palette's "Issue actions"
// section to operate on its issue. Sets the focused id on mount; clears on
// unmount so navigating elsewhere drops the section.
export function FocusIssue({ id }: { id: string }) {
  const ctx = useContext(FocusedIssueContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setIssueId(id);
    return () => ctx.setIssueId(null);
  }, [ctx, id]);
  return null;
}
