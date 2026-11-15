// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useEffect, useRef, useState } from "react";

interface Input {
  /** Reminders alert the user only when this is on. */
  notify: boolean;
  checkupDone: boolean;
  moodDone: boolean;
  exerciseDone: boolean;
  lastWater: number | null;
  waterEveryMin: number;
  onReminder: (text: string) => void;
}

const TICK_MS = 5000;

/** Shows the browser notification when permission was granted. The in-app toast is always shown. */
function systemNotify(text: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("VitalOrbit reminder", { body: text });
    }
  } catch {
    // Some browsers only allow notifications from a service worker. The toast still shows.
  }
}

/** Keeps track of which reminders are due, and alerts once when one becomes due. */
export function useReminders(i: Input) {
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(Date.now());
  const fired = useRef(new Set<string>());
  const latest = useRef(i);
  latest.current = i;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const waterBase = i.lastWater ?? started.current;
  const waterDueAt = waterBase + i.waterEveryMin * 60_000;
  const waterDue = now >= waterDueAt;
  const waterInMin = Math.max(0, Math.ceil((waterDueAt - now) / 60_000));

  useEffect(() => {
    const due: [string, boolean, string][] = [
      ["checkup", !i.checkupDone, "Blood pressure and body mass checkup is due."],
      ["mood", !i.moodDone, "Daily mood check is due."],
      ["exercise", !i.exerciseDone, "Exercise session is not finished yet."],
      [`water-${waterBase}`, waterDue, "Time to drink water."],
    ];
    for (const [key, isDue, text] of due) {
      if (!isDue) {
        fired.current.delete(key);
      } else if (i.notify && !fired.current.has(key)) {
        fired.current.add(key);
        latest.current.onReminder(text);
        systemNotify(text);
      }
    }
  }, [i.notify, i.checkupDone, i.moodDone, i.exerciseDone, waterDue, waterBase]);

  return { waterDue, waterInMin };
}

export async function askNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
