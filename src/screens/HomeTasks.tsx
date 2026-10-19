import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsers } from '../lib/useUsers'
import { configError } from '../lib/supabase'
import {
  CATEGORY_LABEL,
  REPEAT_UNITS,
  completeTask,
  createTask,
  deleteTask,
  describeDue,
  fetchHome,
  formatInterval,
  groupTasks,
  homeTablesReady,
  isRecurring,
  reopenTask,
  todayIso,
  updateTask,
  type HomeData,
  type HomeTask,
  type RepeatUnit,
  type TaskCategory,
} from '../lib/homeTasks'
import { Card, ErrorState, Loading, Screen, SectionLabel } from '../components/Ui'

type Draft = {
  title: string
  notes: string
  due_date: string
  assigned_to: string
  repeats: boolean
  repeat_every: string
  repeat_unit: RepeatUnit
}

function blankDraft(): Draft {
  return {
    title: '',
    notes: '',
    due_date: todayIso(),
    assigned_to: '',
    repeats: false,
    repeat_every: '3',
    repeat_unit: 'months',
  }
}

function draftFrom(task: HomeTask): Draft {
  return {
    title: task.title,
    notes: task.notes,
    due_date: task.due_date,
    assigned_to: task.assigned_to ?? '',
    repeats: isRecurring(task),
    repeat_every: task.repeat_every === null ? '3' : String(task.repeat_every),
    repeat_unit: task.repeat_unit ?? 'months',
  }
}

export default function HomeTasks({ category }: { category: TaskCategory }) {
  const { users, current } = useUsers()
  const [data, setData] = useState<HomeData | null>(null)
  const [ready, setReady] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setData(await fetchHome(category))
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [category])

  useEffect(() => {
    if (configError) {
      setLoadError(configError)
      return
    }
    void homeTablesReady().then((ok) => {
      setReady(ok)
      if (ok) void reload()
    })
  }, [reload])

  // Switching sections resets whatever was half-typed.
  useEffect(() => {
    setDraft(blankDraft())
    setEditingId(null)
    setAdding(false)
    setError(null)
  }, [category])

  const title = CATEGORY_LABEL[category]
  const header = (
    <div className="mb-4">
      <Link to="/" className="text-small font-medium text-muted underline underline-offset-2">
        ← Menu
      </Link>
    </div>
  )

  if (loadError) return <ErrorState message={loadError} />
  if (ready === false) {
    return (
      <Screen title={title}>
        {header}
        <Card className="p-5">
          <h2 className="text-heading font-semibold">Not set up yet</h2>
          <p className="mt-2 text-small text-muted">
            Run <code className="rounded bg-sunken px-1">supabase/012_users_and_home_tasks.sql</code>{' '}
            in the Supabase SQL editor and this starts working.
          </p>
        </Card>
      </Screen>
    )
  }
  if (ready === null || data === null) return <Loading what={title.toLowerCase()} />

  const today = todayIso()
  const groups = groupTasks(data.tasks, today)
  const nameOf = (id: string | null) => users.find((u) => u.id === id)?.name ?? null

  function startAdd() {
    setDraft(blankDraft())
    setEditingId(null)
    setAdding(true)
    setError(null)
  }

  function startEdit(task: HomeTask) {
    setDraft(draftFrom(task))
    setEditingId(task.id)
    setAdding(true)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancel() {
    setAdding(false)
    setEditingId(null)
    setDraft(blankDraft())
    setError(null)
  }

  async function save() {
    const trimmed = draft.title.trim()
    if (!trimmed) {
      setError('Give it a title.')
      return
    }
    const every = Number(draft.repeat_every)
    if (draft.repeats && (!Number.isFinite(every) || every < 1)) {
      setError('How often should it repeat?')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const payload = {
        category,
        title: trimmed,
        notes: draft.notes.trim(),
        due_date: draft.due_date,
        assigned_to: draft.assigned_to || null,
        repeat_every: draft.repeats ? Math.round(every) : null,
        repeat_unit: draft.repeats ? draft.repeat_unit : null,
      }
      if (editingId) await updateTask(editingId, payload)
      else await createTask(payload)
      cancel()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  async function act(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  return (
    <Screen title={title}>
      {header}

      {!adding && (
        <button
          type="button"
          onClick={startAdd}
          className="flex min-h-14 w-full items-center justify-center rounded-card bg-accent px-4
                     text-body font-semibold text-white active:opacity-90"
        >
          Add a task
        </button>
      )}

      {adding && (
        <Card className="p-4">
          <SectionLabel>{editingId ? 'Edit task' : 'New task'}</SectionLabel>

          <label className="mt-3 block">
            <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              What
            </span>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder={category === 'todo' ? 'Order new vacuum cleaner' : 'Change furnace filter'}
              className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                         text-body outline-none focus:border-line-strong"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              Due
            </span>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
              className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                         text-body outline-none focus:border-line-strong"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              Who <span className="font-normal normal-case">(optional)</span>
            </span>
            <select
              value={draft.assigned_to}
              onChange={(e) => setDraft((d) => ({ ...d, assigned_to: e.target.value }))}
              className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                         text-body outline-none focus:border-line-strong"
            >
              <option value="">Anyone</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4">
            <button
              type="button"
              role="switch"
              aria-checked={draft.repeats}
              onClick={() => setDraft((d) => ({ ...d, repeats: !d.repeats }))}
              className="flex w-full items-center gap-3 text-left"
            >
              <span
                aria-hidden
                className={`flex h-7 w-12 shrink-0 items-center rounded-pill px-1 ${
                  draft.repeats ? 'justify-end bg-accent' : 'justify-start bg-line-strong'
                }`}
              >
                <span className="block size-5 rounded-pill bg-surface" />
              </span>
              <span className="text-small font-medium">Repeats</span>
            </button>

            {draft.repeats && (
              <div className="mt-2 flex items-end gap-2">
                <label className="w-24">
                  <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
                    Every
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={draft.repeat_every}
                    onChange={(e) => setDraft((d) => ({ ...d, repeat_every: e.target.value }))}
                    className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface
                               px-3 text-body outline-none focus:border-line-strong"
                  />
                </label>
                <label className="min-w-0 flex-1">
                  <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
                    Unit
                  </span>
                  <select
                    value={draft.repeat_unit}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, repeat_unit: e.target.value as RepeatUnit }))
                    }
                    className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface
                               px-3 text-body outline-none focus:border-line-strong"
                  >
                    {REPEAT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {draft.repeats && (
              <p className="mt-2 text-small text-faint">
                Counted from the day you actually do it, not from the date it was due.
              </p>
            )}
          </div>

          <label className="mt-3 block">
            <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              Notes <span className="font-normal normal-case">(optional)</span>
            </span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-card border border-line bg-surface p-3 text-body
                         outline-none focus:border-line-strong"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-card bg-sunken p-3 text-small text-muted">{error}</p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="mt-4 flex min-h-14 w-full items-center justify-center rounded-card bg-accent
                       px-4 text-body font-semibold text-white active:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add it'}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="mt-2 min-h-12 w-full rounded-card text-small text-muted active:bg-sunken"
          >
            Cancel
          </button>
        </Card>
      )}

      {error && !adding && (
        <p className="mt-3 rounded-card bg-sunken p-3 text-small text-muted">{error}</p>
      )}

      {groups.length === 0 ? (
        <Card className="mt-4 p-5">
          <p className="text-small text-muted">
            Nothing here yet.{' '}
            {category === 'todo'
              ? 'Add the first errand above.'
              : 'Add the first job above — anything that repeats will roll itself forward.'}
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <SectionLabel>
                {group.label} · {group.tasks.length}
              </SectionLabel>
              <ul className="mt-2 space-y-2">
                {group.tasks.map((task) => (
                  <li key={task.id}>
                    <TaskRow
                      task={task}
                      today={today}
                      assignee={nameOf(task.assigned_to)}
                      lastDone={data.byTask.get(task.id)?.[0]?.completed_on ?? null}
                      doneCount={data.byTask.get(task.id)?.length ?? 0}
                      overdueGroup={group.key === 'overdue'}
                      busy={busy}
                      confirming={confirmDelete === task.id}
                      onConfirmDelete={() => setConfirmDelete(task.id)}
                      onCancelDelete={() => setConfirmDelete(null)}
                      onDelete={() =>
                        act(async () => {
                          await deleteTask(task.id)
                          setConfirmDelete(null)
                        })
                      }
                      onComplete={() =>
                        act(() => completeTask(task, today, current?.id ?? null))
                      }
                      onReopen={() => act(() => reopenTask(task.id))}
                      onEdit={() => startEdit(task)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Screen>
  )
}

function TaskRow({
  task,
  today,
  assignee,
  lastDone,
  doneCount,
  overdueGroup,
  busy,
  confirming,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onComplete,
  onReopen,
  onEdit,
}: {
  task: HomeTask
  today: string
  assignee: string | null
  lastDone: string | null
  doneCount: number
  overdueGroup: boolean
  busy: boolean
  confirming: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
  onComplete: () => void
  onReopen: () => void
  onEdit: () => void
}) {
  const interval = formatInterval(task.repeat_every, task.repeat_unit)

  return (
    <Card className={overdueGroup ? 'border-line-strong p-3' : 'p-3'}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={task.completed ? `Reopen ${task.title}` : `Mark ${task.title} done`}
          disabled={busy}
          onClick={task.completed ? onReopen : onComplete}
          className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-card border
                      disabled:opacity-50 ${
                        task.completed
                          ? 'border-accent bg-accent text-white'
                          : 'border-line-strong bg-surface'
                      }`}
        >
          {task.completed && (
            <span aria-hidden className="text-body font-semibold">
              ✓
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`font-medium ${task.completed ? 'text-muted line-through' : ''}`}>
            {task.title}
          </p>

          <p className="text-small text-muted">
            {task.completed ? `Done · was due ${task.due_date}` : describeDue(task.due_date, today)}
            {!task.completed && <> · {task.due_date}</>}
            {assignee && <> · {assignee}</>}
          </p>

          {(interval || lastDone) && (
            <p className="text-small text-faint">
              {interval}
              {interval && lastDone && ' · '}
              {lastDone && `last done ${lastDone}`}
              {doneCount > 1 && ` · ${doneCount} times`}
            </p>
          )}

          {task.notes && <p className="mt-1 text-small text-muted">{task.notes}</p>}

          {confirming ? (
            <div className="mt-2">
              <p className="text-small">
                Delete &ldquo;{task.title}&rdquo;
                {doneCount > 0 && ` and its ${doneCount === 1 ? 'completion' : doneCount + ' completions'}`}?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onCancelDelete}
                  disabled={busy}
                  className="min-h-11 flex-1 rounded-card border border-line text-small font-medium
                             active:bg-sunken"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="min-h-11 flex-1 rounded-card bg-ink text-small font-semibold text-white
                             active:opacity-90 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                disabled={busy}
                className="min-h-11 rounded-card border border-line px-4 text-small font-medium
                           active:bg-sunken disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={busy}
                className="min-h-11 rounded-card px-4 text-small text-muted active:bg-sunken
                           disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
