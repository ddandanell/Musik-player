import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function initialsOf(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return date.toISOString().slice(0, 10);
}

export default async function InboxPage() {
  const session = await requireSession();

  const participantRows = await prisma.conversationParticipant.findMany({
    where: { userId: session.userId },
    select: { conversationId: true, lastReadAt: true },
  });

  if (participantRows.length === 0) {
    return <EmptyInbox />;
  }

  const conversations = await prisma.conversation.findMany({
    where: { id: { in: participantRows.map((p) => p.conversationId) } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      chamber: { select: { id: true, name: true, slug: true } },
      participants: {
        select: {
          userId: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, authorId: true },
      },
    },
  });

  const otherUserIds = Array.from(
    new Set(
      conversations.flatMap((c) =>
        c.participants
          .map((p) => p.userId)
          .filter((id) => id !== session.userId),
      ),
    ),
  );

  const otherUsers = otherUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: otherUserIds } },
        select: { id: true, name: true, email: true, avatarUrl: true },
      })
    : [];
  const userById = new Map(otherUsers.map((u) => [u.id, u]));
  const lastReadById = new Map(
    participantRows.map((p) => [p.conversationId, p.lastReadAt]),
  );

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
          Inbox
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
          Direct messages
        </h1>
        <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
          {conversations.length} conversation{conversations.length === 1 ? "" : "s"}{" "}
          across your chambers.
        </p>
      </header>

      <ul className="mt-8 divide-y divide-[var(--color-line)] rounded-[var(--radius-card)] border border-[var(--color-line)] overflow-hidden bg-[var(--color-surface)]">
        {conversations.map((c) => {
          const others = c.participants
            .map((p) => userById.get(p.userId))
            .filter((u): u is NonNullable<typeof u> => Boolean(u && u.id !== session.userId));
          const lastMessage = c.messages[0];
          const lastReadAt = lastReadById.get(c.id);
          const unread = Boolean(
            lastMessage &&
              lastMessage.authorId !== session.userId &&
              (!lastReadAt || lastMessage.createdAt > lastReadAt),
          );
          const headline = others
            .map((u) => u.name ?? u.email)
            .join(", ");

          return (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="flex gap-4 p-5 hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <div className="flex -space-x-2 shrink-0">
                  {others.slice(0, 2).map((u) => (
                    <div
                      key={u.id}
                      className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-2)] flex items-center justify-center"
                    >
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="h-12 w-12 object-cover"
                        />
                      ) : (
                        <span className="font-[family-name:var(--font-display)] text-sm text-[var(--color-ink-muted)]">
                          {initialsOf(u.name ?? u.email)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>
                      {headline || "Conversation"}
                    </p>
                    <span className="rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                      {c.chamber.name}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm truncate ${
                      unread
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {lastMessage?.body ?? "No messages yet."}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    {formatRelative(c.lastMessageAt)}
                  </span>
                  {unread && (
                    <span className="rounded-full bg-[var(--color-accent)] text-white text-[10px] px-2 py-0.5">
                      New
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EmptyInbox() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
          Inbox
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
          Direct messages
        </h1>
      </header>
      <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-12 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]">
          <MessageCircle size={20} strokeWidth={1.7} />
        </span>
        <p className="mt-4 font-[family-name:var(--font-display)] text-2xl">
          No conversations yet
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Open a member directory and tap &quot;Send message&quot; to start one.
        </p>
      </div>
    </section>
  );
}
