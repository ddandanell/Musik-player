import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-[var(--color-bg)]/85 backdrop-blur border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
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

          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2 text-[13px]">
            <Link
              href="/chambers"
              className="hidden sm:inline px-3 py-1.5 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]"
            >
              Chambers
            </Link>
            <Link
              href="/events"
              className="hidden sm:inline px-3 py-1.5 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]"
            >
              Events
            </Link>
            <Link
              href="/for-chambers"
              className="hidden md:inline px-3 py-1.5 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]"
            >
              For chambers
            </Link>
            {process.env.NEXT_PUBLIC_DEMO_MODE === "1" && (
              <Link href="/demo" className="btn btn-sm btn-secondary">
                Try demo
              </Link>
            )}
            <Link href="/login" className="btn btn-sm btn-primary">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid gap-6 sm:grid-cols-4 text-[13px]">
          <div>
            <p className="font-semibold">DanChamp</p>
            <p className="text-[var(--color-fg-muted)] mt-1.5 leading-relaxed">
              The operating system for business chambers.
            </p>
          </div>
          <div>
            <p className="font-medium mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Platform
            </p>
            <ul className="space-y-1.5 text-[var(--color-fg-muted)]">
              <li>
                <Link href="/chambers" className="hover:text-[var(--color-fg)]">
                  Chambers
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-[var(--color-fg)]">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/activity" className="hover:text-[var(--color-fg)]">
                  Activity
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              For chambers
            </p>
            <ul className="space-y-1.5 text-[var(--color-fg-muted)]">
              <li>
                <Link href="/for-chambers" className="hover:text-[var(--color-fg)]">
                  Why DanChamp
                </Link>
              </li>
              <li>
                <Link href="/for-chambers/pricing" className="hover:text-[var(--color-fg)]">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Company
            </p>
            <ul className="space-y-1.5 text-[var(--color-fg-muted)]">
              <li>
                <Link href="/about" className="hover:text-[var(--color-fg)]">
                  About
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)] py-4 px-4 sm:px-6">
          <p className="mx-auto max-w-6xl text-xs text-[var(--color-fg-subtle)]">
            © DanChamp {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
