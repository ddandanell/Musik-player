import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

async function signOutAction() {
  "use server";
  await signOut();
  redirect("/");
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="btn btn-sm btn-ghost">
        Sign out
      </button>
    </form>
  );
}
