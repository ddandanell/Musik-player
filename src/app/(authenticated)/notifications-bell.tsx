import Link from "next/link";
import { Bell } from "lucide-react";
import { recentNotifications } from "@/lib/notifications";
import { markAllNotificationsRead } from "./messages/actions";

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

export async function NotificationsBell({ userId }: { userId: string }) {
  const items = await recentNotifications(userId, 8);
  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <details className="relative group">
      <summary
        className="list-none cursor-pointer relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] [&::-webkit-details-marker]:hidden"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={16} strokeWidth={1.7} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-surface)]" />
        )}
      </summary>

      <div className="absolute right-0 mt-2 w-80 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] z-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
            Notifications
          </p>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="text-[11px] text-[var(--color-accent)] hover:underline"
              >
                Mark all read
              </button>
            </form>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">
            Nothing yet.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto divide-y divide-[var(--color-line)]">
            {items.map((n) => {
              const content = (
                <div className="flex gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.readAt ? "bg-transparent" : "bg-[var(--color-accent)]"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate ${
                        n.readAt ? "text-[var(--color-ink-muted)]" : "font-medium"
                      }`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--color-ink-muted)] mt-1 uppercase tracking-[0.14em]">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link href={n.href} className="block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
