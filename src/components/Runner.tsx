import { useEffect, useState } from 'react'
import type { FlatBlock } from '../lib/log'
import type { Movement } from '../lib/types'
import { formatClock, formatSigned, formatStampPadded } from '../lib/time'
import type { PersistedRun } from '../lib/runner'
import { WatchLink } from './Ui'

/* ---------------------------------------------------------------------------
   The clock.

   It counts DOWN and never stops between movements. It is rendered inline
   immediately above the current movement -- in list view that means it travels
   down the page as lines get checked off, so it is always right next to
   whatever you are doing. `sticky` keeps it on screen once you scroll past its
   resting place, so "moves down" and "always visible" are both true.
   --------------------------------------------------------------------------- */
export function ClockBar({
  remaining,
  pace,
  paused,
  onTogglePause,
}: {
  remaining: number
  pace: number | null
  paused: boolean
  onTogglePause: () => void
}) {
  const ahead = pace !== null && pace >= 0
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-2 border-y border-line bg-page/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-xl items-center gap-3">
        <span
          className="font-[family-name:var(--font-stamp)] text-display font-semibold tabular-nums"
          aria-live="off"
        >
          {formatClock(remaining)}
        </span>

        {pace !== null && (
          <span
            className={`text-small font-medium tabular-nums ${ahead ? 'text-accent' : 'text-faint'}`}
            title={ahead ? 'Ahead of the target time' : 'Behind the target time'}
          >
            {formatSigned(pace)}
          </span>
        )}

        <button
          type="button"
          onClick={onTogglePause}
          className="ml-auto min-h-11 rounded-card px-3 text-small text-muted active:bg-sunken"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      {paused && (
        <p className="mx-auto w-full max-w-xl pb-1 text-label text-faint">Clock paused</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------- */

export function NoteField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const [open, setOpen] = useState(value.length > 0)
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded px-1 text-small text-muted"
        aria-expanded={open}
      >
        <span aria-hidden className="text-faint">
          ✎
        </span>
        {value ? 'Note' : 'Add note'}
        {value && !open && <span aria-hidden className="size-1.5 rounded-pill bg-accent" />}
      </button>
      {open && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          aria-label={`Notes for ${label}`}
          className="mt-1 w-full rounded-card border border-line bg-surface p-2 text-small
                     outline-none focus:border-line-strong"
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------- */

/** The one-movement-at-a-time view. */
export function FocusCard({
  block,
  movement,
  variation,
  note,
  onNote,
  index,
}: {
  block: FlatBlock
  movement: Movement | undefined
  variation: string | null
  note: string
  onNote: (v: string) => void
  index: number
}) {
  const [showDescription, setShowDescription] = useState(false)

  // Collapse the description again whenever we move to a new movement --
  // otherwise it stays open for the rest of the session.
  useEffect(() => {
    setShowDescription(false)
  }, [index])

  return (
    <div key={index} className="animate-card-in rounded-card border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          {block.section}
        </span>
        <span className="font-[family-name:var(--font-stamp)] text-small tabular-nums text-faint">
          target {formatStampPadded(block.start_remaining_seconds)}
        </span>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <h2 className="min-w-0 text-title font-semibold">{block.name}</h2>
        <WatchLink url={movement?.video_url} label={block.name} />
      </div>

      <p className="mt-1 text-heading">
        {block.prescription}
        {variation && (
          <>
            {' '}
            &middot; <span className="font-medium text-accent-ink">{variation}</span>
          </>
        )}
      </p>

      {block.cue && <p className="mt-1 text-small text-muted">{block.cue}</p>}

      {movement?.description && (
        <>
          <button
            type="button"
            onClick={() => setShowDescription((s) => !s)}
            className="mt-2 min-h-9 rounded px-1 text-small text-muted"
            aria-expanded={showDescription}
          >
            {showDescription ? 'Hide how-to' : 'How to'}
          </button>
          {showDescription && (
            <p className="mt-1 rounded-card bg-sunken p-3 text-small text-muted">
              {movement.description}
            </p>
          )}
        </>
      )}

      <NoteField value={note} onChange={onNote} label={block.name} />
    </div>
  )
}

/* ------------------------------------------------------------------------- */

/** One row of the list view. */
export function ListRow({
  block,
  run,
  index,
  onToggle,
  onNote,
  isCurrent,
}: {
  block: FlatBlock
  run: PersistedRun
  index: number
  onToggle: () => void
  onNote: (v: string) => void
  isCurrent: boolean
}) {
  const item = run.items[index]!
  return (
    <li
      className={`rounded-card border bg-surface px-3 py-2 ${
        isCurrent ? 'border-line-strong' : 'border-line'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={item.checked}
          aria-label={`Mark ${block.name} done`}
          onClick={onToggle}
          className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-card border
                      ${
                        item.checked
                          ? 'border-accent bg-accent text-white'
                          : 'border-line-strong bg-surface'
                      }`}
        >
          {item.checked && (
            <span aria-hidden className="animate-check-in text-body font-semibold">
              ✓
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`min-w-0 font-medium ${item.checked ? 'text-muted line-through' : ''}`}
            >
              {block.name}
            </span>
            <span className="shrink-0 font-[family-name:var(--font-stamp)] text-label tabular-nums text-faint">
              {formatStampPadded(block.start_remaining_seconds)}
            </span>
          </div>
          <p className="text-small text-muted">{block.prescription}</p>
          <NoteField value={item.notes} onChange={onNote} label={block.name} />
        </div>
      </div>
    </li>
  )
}
