import { VoteStreaks } from "@/types/decision";

/**
 * Calendar-day helpers for the Daily Voting Streak.
 *
 * Timezone strategy: every calculation in the app uses the device's local
 * calendar via this single utility, so a vote always belongs to exactly one
 * calendar date no matter where the streak is displayed.
 */

/** Format a Date as its local calendar date, e.g. "2026-03-15". */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Milliseconds-in-a-day distance between two YYYY-MM-DD strings (calendar based). */
function dayDistance(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcA - utcB) / 86400000);
}

/**
 * Compute the current and longest daily voting streak from vote timestamps.
 * Multiple votes on the same calendar day count as one active day.
 */
export function computeStreaks(voteTimestamps: string[]): VoteStreaks {
  const uniqueDays = Array.from(
    new Set(
      voteTimestamps
        .map((ts) => {
          const parsed = new Date(ts);
          return Number.isNaN(parsed.getTime()) ? null : toLocalDateString(parsed);
        })
        .filter((d): d is string => d !== null)
    )
  );

  if (uniqueDays.length === 0) return { current: 0, longest: 0 };

  uniqueDays.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // newest first

  // Longest: scan newest->oldest counting consecutive-day runs.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const gap = dayDistance(uniqueDays[i - 1], uniqueDays[i]);
    if (gap === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current: only counts if the most recent active day is today or yesterday.
  const today = toLocalDateString(new Date());
  const gapToLatest = dayDistance(today, uniqueDays[0]);
  if (gapToLatest > 1) return { current: 0, longest };

  let current = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (dayDistance(uniqueDays[i - 1], uniqueDays[i]) === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}
