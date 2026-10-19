import { supabase } from './supabase'

/* ---------------------------------------------------------------------------
   Home to-do and home maintenance.

   ONE table, two categories. Both take due dates, both can recur, both can be
   assigned -- the category is the only difference between the sections, so
   splitting them into two tables would have duplicated recurrence, assignment
   and the completion log to encode a tag.
   --------------------------------------------------------------------------- */

export type TaskCategory = 'todo' | 'maintenance'
export type RepeatUnit = 'days' | 'weeks' | 'months' | 'years'

export type HomeTask = {
  id: string
  category: TaskCategory
  title: string
  notes: string
  due_date: string
  assigned_to: string | null
  /** Null means a one-off. */
  repeat_every: number | null
  repeat_unit: RepeatUnit | null
  completed: boolean
  completed_at: string | null
  created_at: string
}

export type TaskCompletion = {
  id: string
  task_id: string
  completed_on: string
  completed_by: string | null
  notes: string
}

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  todo: 'Home to-do',
  maintenance: 'Home maintenance',
}

export const REPEAT_UNITS: { value: RepeatUnit; label: string; one: string }[] = [
  { value: 'days', label: 'days', one: 'day' },
  { value: 'weeks', label: 'weeks', one: 'week' },
  { value: 'months', label: 'months', one: 'month' },
  { value: 'years', label: 'years', one: 'year' },
]

// --- dates ------------------------------------------------------------------

const DAY_MS = 86_400_000

export function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export function isoOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayIso(now: Date = new Date()): string {
  return isoOf(now)
}

export function daysBetween(aIso: string, bIso: string): number {
  return Math.round((localDate(bIso).getTime() - localDate(aIso).getTime()) / DAY_MS)
}

/** Add whole calendar days.
 *
 *  Not milliseconds: a day is 23 or 25 hours when the clocks change, so
 *  `time + n * 86400000` lands an hour short and reads as the previous date.
 *  A weekly task crossing a DST boundary would creep a day earlier, twice a
 *  year, forever. The Date constructor normalises calendar days instead. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Add months without the end-of-month overflow JS gives you by default.
 *  Jan 31 plus one month is Feb 28, not Mar 3 -- setMonth rolls the surplus
 *  into the next month, which would quietly walk a monthly task forward. */
function addMonths(date: Date, months: number): Date {
  const y = date.getFullYear()
  const m = date.getMonth() + months
  const targetYear = y + Math.floor(m / 12)
  const targetMonth = ((m % 12) + 12) % 12
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  return new Date(targetYear, targetMonth, Math.min(date.getDate(), lastDay))
}

/** The next due date for a recurring task, counted from the day it was
 *  actually done. Chosen over counting from the scheduled date so intervals
 *  stay honest to the real work -- do the filter a month late and the next one
 *  is still a full interval away. */
export function nextDueDate(
  completedOn: string,
  every: number,
  unit: RepeatUnit,
): string {
  const from = localDate(completedOn)
  switch (unit) {
    case 'days':
      return isoOf(addDays(from, every))
    case 'weeks':
      return isoOf(addDays(from, every * 7))
    case 'months':
      return isoOf(addMonths(from, every))
    case 'years':
      return isoOf(addMonths(from, every * 12))
  }
}

export function formatInterval(every: number | null, unit: RepeatUnit | null): string | null {
  if (every === null || unit === null) return null
  const spec = REPEAT_UNITS.find((u) => u.value === unit)
  if (!spec) return null
  return every === 1 ? `every ${spec.one}` : `every ${every} ${spec.label}`
}

export function isRecurring(task: HomeTask): boolean {
  return task.repeat_every !== null && task.repeat_unit !== null
}

/** "Overdue by 3 days", "Today", "Tomorrow", "In 9 days". */
export function describeDue(dueIso: string, today: string = todayIso()): string {
  const delta = daysBetween(today, dueIso)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Overdue by a day'
  if (delta < 0) return `Overdue by ${-delta} days`
  if (delta < 14) return `In ${delta} days`
  const weeks = Math.round(delta / 7)
  return weeks < 9 ? `In ${weeks} weeks` : `In ${Math.round(delta / 30)} months`
}

// --- grouping ---------------------------------------------------------------

export type TaskGroup = { key: string; label: string; tasks: HomeTask[] }

/** Overdue first, because that is the thing to act on. Done last and
 *  collapsed, because a one-off that is finished is history, not a list item.
 *
 *  Recurring tasks never land in "done" -- completing one rolls it forward, so
 *  it reappears under whatever its new due date deserves. */
export function groupTasks(tasks: HomeTask[], today: string = todayIso()): TaskGroup[] {
  const open = tasks.filter((t) => !t.completed)
  const byDue = (a: HomeTask, b: HomeTask) =>
    a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : a.title.localeCompare(b.title)

  const overdue = open.filter((t) => t.due_date < today).sort(byDue)
  const dueToday = open.filter((t) => t.due_date === today).sort(byDue)
  const soon = open
    .filter((t) => t.due_date > today && daysBetween(today, t.due_date) <= 7)
    .sort(byDue)
  const later = open.filter((t) => daysBetween(today, t.due_date) > 7).sort(byDue)
  const done = tasks
    .filter((t) => t.completed)
    .sort((a, b) => (a.completed_at ?? '') < (b.completed_at ?? '') ? 1 : -1)

  return [
    { key: 'overdue', label: 'Overdue', tasks: overdue },
    { key: 'today', label: 'Today', tasks: dueToday },
    { key: 'soon', label: 'This week', tasks: soon },
    { key: 'later', label: 'Later', tasks: later },
    { key: 'done', label: 'Done', tasks: done },
  ].filter((g) => g.tasks.length > 0)
}

// --- loading and writing ----------------------------------------------------

export type HomeData = {
  tasks: HomeTask[]
  completions: TaskCompletion[]
  /** task_id -> its completions, newest first. */
  byTask: Map<string, TaskCompletion[]>
}

export async function fetchHome(category: TaskCategory): Promise<HomeData> {
  const [t, c] = await Promise.all([
    supabase.from('home_tasks').select('*').eq('category', category).order('due_date'),
    supabase
      .from('home_task_completions')
      .select('*')
      .order('completed_on', { ascending: false }),
  ])
  if (t.error) throw new Error(t.error.message)
  if (c.error) throw new Error(c.error.message)

  const tasks = (t.data ?? []) as HomeTask[]
  const ids = new Set(tasks.map((x) => x.id))
  // The completions query isn't filtered by category, so drop anything
  // belonging to the other list.
  const completions = ((c.data ?? []) as TaskCompletion[]).filter((x) => ids.has(x.task_id))

  const byTask = new Map<string, TaskCompletion[]>()
  for (const done of completions) {
    const list = byTask.get(done.task_id) ?? []
    list.push(done)
    byTask.set(done.task_id, list)
  }
  return { tasks, completions, byTask }
}

export type TaskInput = {
  category: TaskCategory
  title: string
  notes: string
  due_date: string
  assigned_to: string | null
  repeat_every: number | null
  repeat_unit: RepeatUnit | null
}

export async function createTask(input: TaskInput): Promise<void> {
  const { error } = await supabase.from('home_tasks').insert(input)
  if (error) throw new Error(error.message)
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<void> {
  const { error } = await supabase.from('home_tasks').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('home_tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Record that a task was done.
 *
 *  A recurring task logs the work and rolls its due date forward from the day
 *  it was actually done; it never closes. A one-off logs the work and closes.
 *  The log row goes in first either way, so a failure can't mark something
 *  done without recording it. */
export async function completeTask(
  task: HomeTask,
  completedOn: string,
  completedBy: string | null,
): Promise<void> {
  const { error: logError } = await supabase.from('home_task_completions').insert({
    task_id: task.id,
    completed_on: completedOn,
    completed_by: completedBy,
  })
  if (logError) throw new Error(logError.message)

  const patch =
    isRecurring(task)
      ? { due_date: nextDueDate(completedOn, task.repeat_every!, task.repeat_unit!) }
      : { completed: true, completed_at: new Date().toISOString() }

  const { error } = await supabase.from('home_tasks').update(patch).eq('id', task.id)
  if (error) throw new Error(error.message)
}

/** Undo a close-out on a one-off. Leaves the log alone -- the work did happen,
 *  and deleting history to un-tick a box would lose more than it fixes. */
export async function reopenTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('home_tasks')
    .update({ completed: false, completed_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Whether migration 012 has been run. Lets the home sections show a setup
 *  message rather than an error. */
export async function homeTablesReady(): Promise<boolean> {
  const { error } = await supabase.from('home_tasks').select('id').limit(1)
  return !error
}
