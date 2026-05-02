export type ReminderWindow = "T-7d" | "T-1d" | "T-1h";

const WINDOW_MINUTES: Record<ReminderWindow, { fromMinutes: number; toMinutes: number }> = {
  "T-7d": { fromMinutes: 6 * 24 * 60, toMinutes: 8 * 24 * 60 },
  "T-1d": { fromMinutes: 22 * 60, toMinutes: 26 * 60 },
  "T-1h": { fromMinutes: 30, toMinutes: 90 },
};

export function eventsToRemind(now: Date): Array<{
  window: ReminderWindow;
  rangeStart: Date;
  rangeEnd: Date;
}> {
  return (Object.keys(WINDOW_MINUTES) as ReminderWindow[]).map((window) => {
    const { fromMinutes, toMinutes } = WINDOW_MINUTES[window];
    return {
      window,
      rangeStart: new Date(now.getTime() + fromMinutes * 60 * 1000),
      rangeEnd: new Date(now.getTime() + toMinutes * 60 * 1000),
    };
  });
}

export function reminderTemplateKey(eventId: string, window: ReminderWindow): string {
  return `event_reminder:${window}:${eventId}`;
}
