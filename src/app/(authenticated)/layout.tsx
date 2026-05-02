import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SignOutButton } from "./sign-out-button";
import { NotificationsBell } from "./notifications-bell";
import { DemoBanner } from "./demo-banner";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  let demoName = session.email;
  let demoRole: string = session.platformRole;
  if (session.isDemo) {
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    if (me?.name) demoName = me.name;
    demoRole = session.memberships[0]?.role ?? session.platformRole;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {session.isDemo && <DemoBanner name={demoName} role={demoRole} />}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link
            href="/me"
            className="flex items-center gap-2 font-semibold tracking-tight text-[15px]"
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] text-white"
              style={{ background: "var(--color-accent)" }}
              aria-hidden="true"
            >
              D
            </span>
            DanChamp
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationsBell userId={session.userId} />
            <p className="hidden sm:inline text-[12px] text-[var(--color-fg-muted)]">
              {session.email}
            </p>
            {session.isDemo ? (
              <Link href="/demo" className="btn btn-sm btn-ghost">
                Switch
              </Link>
            ) : (
              <SignOutButton />
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
