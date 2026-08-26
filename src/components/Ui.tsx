import type { ReactNode } from 'react'
import { formatStampPadded } from '../lib/time'

export function Screen({ title, subtitle, children }: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-title font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-small text-muted">{subtitle}</p>}
      </header>
      {children}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface ${className}`}>{children}</div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-label font-semibold uppercase tracking-[0.06em] text-faint">{children}</h2>
  )
}

/** A countdown stamp -- the time that should be LEFT on the clock. */
export function Stamp({ seconds, className = '' }: { seconds: number; className?: string }) {
  return (
    <span
      className={`font-[family-name:var(--font-stamp)] tabular-nums text-muted ${className}`}
      title="Time left on the clock when this starts"
    >
      {formatStampPadded(seconds)}
    </span>
  )
}

export function PhaseBadge({ phase, total = 4 }: { phase: number; total?: number }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-accent-soft px-2.5 py-1 text-label font-semibold text-accent-ink">
      Phase {phase} of {total}
    </span>
  )
}

/** Text link only -- no embedded players anywhere in this app. */
export function WatchLink({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="shrink-0 rounded px-1 text-small font-medium text-accent underline decoration-accent/30 underline-offset-2"
      aria-label={`Watch a demonstration of ${label}`}
    >
      Watch
    </a>
  )
}

export function Loading({ what }: { what: string }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-16 text-center text-small text-muted">
      Loading {what}&hellip;
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-10">
      <Card className="p-4">
        <h2 className="text-heading font-semibold">Couldn&rsquo;t reach the database</h2>
        <p className="mt-2 text-small text-muted">
          Check that <code className="rounded bg-sunken px-1">.env</code> points at the right
          Supabase project and that you&rsquo;ve run both files in{' '}
          <code className="rounded bg-sunken px-1">supabase/</code>.
        </p>
        <p className="mt-3 rounded-card bg-sunken p-3 text-small text-muted">{message}</p>
      </Card>
    </div>
  )
}

/** Placeholder for Today and Streaks in Step 1. Says what comes next rather
 *  than sitting empty. */
export function ComingNext({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-heading font-semibold">{title}</h2>
      <p className="mt-2 text-small text-muted">{body}</p>
    </Card>
  )
}
