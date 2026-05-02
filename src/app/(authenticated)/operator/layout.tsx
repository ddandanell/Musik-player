import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Building2,
  CreditCard,
  Activity,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { isPlatformOperator } from "@/lib/auth/permissions";

const NAV: Array<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: "/operator", label: "Overview", Icon: Home },
  { href: "/operator/chambers", label: "Chambers", Icon: Building2 },
  { href: "/operator/billing", label: "Billing", Icon: CreditCard },
  { href: "/operator/health", label: "Health", Icon: Activity },
  { href: "/operator/audit", label: "Audit log", Icon: ScrollText },
];

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!isPlatformOperator(session)) redirect("/me");

  return (
    <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[228px_1fr]">
      <aside className="hidden lg:block border-r border-[var(--color-border)] min-h-[calc(100vh-3rem)]">
        <div className="sticky top-12 px-4 py-6">
          <p className="px-2 mb-3 text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
            Operator
          </p>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]"
              >
                <item.Icon size={15} strokeWidth={1.7} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="lg:hidden border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)] mb-2">
          Operator
        </p>
        <nav className="flex gap-1.5 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[12px] hover:bg-[var(--color-bg-muted)]"
            >
              <item.Icon size={13} strokeWidth={1.8} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="min-w-0 px-4 sm:px-6 py-6 lg:py-10">{children}</section>
    </div>
  );
}
