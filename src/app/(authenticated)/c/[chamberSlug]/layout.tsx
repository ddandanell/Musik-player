import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Users,
  Calendar,
  MessageSquare,
  Store,
  BookOpen,
  Building2,
  Vote,
  FileText,
  ScrollText,
  ShieldAlert,
  Briefcase,
  Inbox,
  Settings as SettingsIcon,
  Banknote,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor, hasChamberRole } from "@/lib/auth/permissions";

type NavItem = { href: string; label: string; Icon: LucideIcon };
type NavSection = { title: string; items: NavItem[] };

export default async function ChamberLayout({
  params,
  children,
}: {
  params: Promise<{ chamberSlug: string }>;
  children: React.ReactNode;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, slug: true, name: true, brandColor: true },
  });
  if (!chamber) notFound();

  const role = chamberRoleFor(session, chamber.id);
  if (!role) redirect("/me");

  const isAdmin = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");
  const isBoard = hasChamberRole(session, chamber.id, "BOARD_MEMBER");
  const isCorporate = hasChamberRole(session, chamber.id, "CORPORATE_CONTACT");

  const slug = chamber.slug;
  const sections: NavSection[] = [
    {
      title: "Workspace",
      items: [
        { href: `/c/${slug}`, label: "Home", Icon: Home },
        { href: `/c/${slug}/directory`, label: "Members", Icon: Users },
        { href: `/c/${slug}/events`, label: "Events", Icon: Calendar },
        { href: `/c/${slug}/forum`, label: "Forum", Icon: MessageSquare },
        { href: `/c/${slug}/marketplace`, label: "Marketplace", Icon: Store },
        { href: `/c/${slug}/knowledge`, label: "Knowledge", Icon: BookOpen },
      ],
    },
  ];

  if (isCorporate) {
    sections.push({
      title: "Corporate",
      items: [
        { href: `/c/${slug}/corporate`, label: "Dashboard", Icon: Briefcase },
      ],
    });
  }

  if (isBoard) {
    sections.push({
      title: "Board",
      items: [
        { href: `/c/${slug}/board`, label: "Workspace", Icon: Building2 },
        { href: `/c/${slug}/board/motions`, label: "Motions", Icon: Vote },
        { href: `/c/${slug}/board/vault`, label: "Vault", Icon: FileText },
        { href: `/c/${slug}/board/meetings`, label: "Meetings", Icon: ScrollText },
        { href: `/c/${slug}/board/coi`, label: "COI register", Icon: ShieldAlert },
      ],
    });
  }

  if (isAdmin) {
    sections.push({
      title: "Admin",
      items: [
        { href: `/c/${slug}/admin`, label: "Overview", Icon: Home },
        { href: `/c/${slug}/admin/members`, label: "Members", Icon: Users },
        { href: `/c/${slug}/admin/applications`, label: "Applications", Icon: Inbox },
        { href: `/c/${slug}/admin/events`, label: "Events", Icon: Calendar },
        { href: `/c/${slug}/admin/communication`, label: "Communication", Icon: Megaphone },
        { href: `/c/${slug}/admin/finance`, label: "Finance", Icon: Banknote },
        { href: `/c/${slug}/admin/sponsors`, label: "Sponsors", Icon: Briefcase },
        { href: `/c/${slug}/admin/settings`, label: "Settings", Icon: SettingsIcon },
      ],
    });
  }

  const allItems = sections.flatMap((s) => s.items);

  return (
    <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[228px_1fr]">
      <aside className="hidden lg:block border-r border-[var(--color-border)] min-h-[calc(100vh-3rem)]">
        <div className="sticky top-12 px-4 py-6">
          <div className="flex items-center gap-2.5 px-2 mb-4">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-semibold text-white shrink-0"
              style={{ background: chamber.brandColor }}
              aria-hidden="true"
            >
              {chamber.name[0]}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate">{chamber.name}</p>
              <p className="text-[11px] text-[var(--color-fg-subtle)] capitalize">
                {role.replaceAll("_", " ").toLowerCase()}
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-5">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  {section.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]"
                      >
                        <item.Icon size={15} strokeWidth={1.7} />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="lg:hidden border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <div className="px-4 py-3 flex items-center gap-2.5">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold text-white shrink-0"
            style={{ background: chamber.brandColor }}
            aria-hidden="true"
          >
            {chamber.name[0]}
          </span>
          <p className="text-[13px] font-medium truncate flex-1">{chamber.name}</p>
          <p className="text-[11px] text-[var(--color-fg-muted)] capitalize">
            {role.replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
        <nav className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
          {allItems.map((item) => (
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
