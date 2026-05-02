import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { markConversationRead } from "@/lib/messaging";
import { sendMessage } from "../actions";

export const dynamic = "force-dynamic";

function initialsOf(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTimestamp(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await requireSession();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      chamber: { select: { id: true, name: true, slug: true } },
      participants: { select: { userId: true } },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!conversation) notFound();

  const isParticipant = conversation.participants.some(
    (p) => p.userId === session.userId,
  );
  if (!isParticipant) redirect("/messages");

  await markConversationRead(conversation.id, session.userId);

  const participantUsers = await prisma.user.findMany({
    where: { id: { in: conversation.participants.map((p) => p.userId) } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  const userById = new Map(participantUsers.map((u) => [u.id, u]));
  const others = participantUsers.filter((u) => u.id !== session.userId);
  const headline = others.map((u) => u.name ?? u.email).join(", ") || "Conversation";

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/messages"
        className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Back to inbox
      </Link>

      <header className="mt-3 flex items-center gap-4">
        <div className="flex -space-x-2">
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
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-2xl truncate">
            {headline}
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            {conversation.chamber.name}
          </p>
        </div>
      </header>

      <ol className="mt-8 space-y-3">
        {conversation.messages.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-8 text-center text-sm text-[var(--color-ink-muted)]">
            No messages yet. Say hello.
          </li>
        )}
        {conversation.messages.map((m) => {
          const author = userById.get(m.authorId);
          const isMine = m.authorId === session.userId;
          return (
            <li
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-[var(--radius-card)] px-4 py-3 ${
                  isMine
                    ? "bg-[var(--color-ink)] text-[var(--color-surface)]"
                    : "bg-[var(--color-surface-2)] border border-[var(--color-line)]"
                }`}
              >
                <p
                  className={`text-[10px] uppercase tracking-[0.18em] ${
                    isMine ? "text-white/70" : "text-[var(--color-ink-muted)]"
                  }`}
                >
                  {author?.name ?? author?.email ?? "Unknown"} ·{" "}
                  {formatTimestamp(m.createdAt)}
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm">{m.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <form action={sendMessage} className="mt-8 space-y-3">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <label className="block text-sm">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
            Reply
          </span>
          <textarea
            name="body"
            rows={4}
            required
            minLength={1}
            maxLength={4000}
            className="mt-1.5 w-full rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            placeholder="Write a message…"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2 text-sm hover:opacity-90"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
