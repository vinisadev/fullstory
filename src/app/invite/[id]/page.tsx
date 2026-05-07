import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/drizzle";
import { invitation, organization } from "@/drizzle/schema";
import { getSession } from "@/lib/session";
import { AcceptForm } from "./accept-form";
import { SwitchAccountButton } from "./switch-account-button";

type Params = Promise<{ id: string }>;

export default async function InvitePage({ params }: { params: Params }) {
  const { id } = await params;

  // Look up the invitation directly so we can render context BEFORE the user
  // signs in. Better Auth's `getInvitation` endpoint is auth-gated; we still
  // rely on it (via the accept call) to enforce email-match on accept, but
  // we surface non-sensitive context here so a fresh-browser invitee isn't
  // dumped on /sign-in with no idea why.
  const invite = await db.query.invitation.findFirst({
    where: eq(invitation.id, id),
  });

  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return <ErrorCard />;
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, invite.organizationId),
  });

  if (!org) {
    return <ErrorCard />;
  }

  const session = await getSession();
  const inviteHref = `/invite/${id}`;
  const encodedRedirect = encodeURIComponent(inviteHref);

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={1}>
              Join {org.name}
            </CardTitle>
            <CardDescription>
              This invite was sent to <strong>{invite.email}</strong>. Sign in
              or create an account with that email to accept.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href={`/sign-up?redirect=${encodedRedirect}`}>
                Create an account
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/sign-in?redirect=${encodedRedirect}`}>
                I already have an account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={1}>
              Switch accounts to accept
            </CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invite.email}</strong>.
              You're signed in as {session.user.email}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SwitchAccountButton inviteHref={inviteHref} />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            Join {org.name}
          </CardTitle>
          <CardDescription>
            You've been invited to join as{" "}
            <span className="capitalize">{invite.role ?? "member"}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptForm invitationId={invite.id} workspaceSlug={org.slug} />
        </CardContent>
      </Card>
    </main>
  );
}

function ErrorCard() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            Couldn't open this invitation
          </CardTitle>
          <CardDescription>
            The link is invalid, expired, or already used. Ask the workspace
            admin to send a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
