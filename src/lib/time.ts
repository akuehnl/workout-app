/** Seconds -> "MM:SS". Used for every countdown stamp in the app.
 *  Handles totals past an hour by letting minutes run to 90+ rather than
 *  introducing an hours field — no session is that long. */
export function formatStamp(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds))
  const m = Math.floor(clamped / 60)
  const s = clamped % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Same, but zero-padded to MM:SS so a column of stamps stays aligned. */
export function formatStampPadded(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds))
  const m = Math.floor(clamped / 60)
  const s = clamped % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** The big countdown. Goes negative once you run past the session total, and
 *  shows that honestly rather than sitting at 0:00. */
export function formatClock(seconds: number): string {
  const rounded = Math.ceil(seconds)
  return rounded < 0 ? `\u2212${formatStamp(-rounded)}` : formatStamp(rounded)
}

/** The pace figure: "+2:10" ahead, "\u22121:30" behind. Always signed. */
export function formatSigned(seconds: number): string {
  const rounded = Math.round(seconds)
  return rounded < 0 ? `\u2212${formatStamp(-rounded)}` : `+${formatStamp(rounded)}`
}
