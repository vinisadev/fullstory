"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/redirects";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const signUpHref =
    redirectTo === "/"
      ? "/sign-up"
      : `/sign-up?redirect=${encodeURIComponent(redirectTo)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message ?? "Could not sign in.");
      setPending(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            Sign in
          </CardTitle>
          <CardDescription>Welcome back to Full Story.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-sm text-muted-foreground">
              No account?{" "}
              <Link href={signUpHref} className="underline underline-offset-4">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
