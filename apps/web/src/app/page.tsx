import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/workspace";

export default async function Home() {
  const { workspaces } = await requireOnboarded();
  redirect(`/${workspaces[0].slug}`);
}
