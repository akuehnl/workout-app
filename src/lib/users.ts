import { supabase } from './supabase'

/* ---------------------------------------------------------------------------
   Who is using this device, and which sections it shows.

   NOT AUTHENTICATION. Picking a name is a display preference. Anyone who opens
   the app can pick Aden; the anon key in the bundle reads and writes every
   table regardless of what is on screen. These permissions decide what a
   device DISPLAYS and nothing more -- do not add anything that relies on them
   to keep data from someone.
   --------------------------------------------------------------------------- */

export type SectionKey = 'workout' | 'study' | 'home-todo' | 'home-maintenance'

/** Keys match the route segments so the gate and the router can't drift. */
export const SECTIONS: { key: SectionKey; name: string; blurb: string; home: string }[] = [
  {
    key: 'workout',
    name: 'Workout',
    blurb: 'Five kettlebell sessions on a countdown clock, with the log and your weight.',
    home: '/workout/today',
  },
  {
    key: 'study',
    name: 'Bible study',
    blurb: 'A two-year plan. Three half-hour sessions a week, Monday, Thursday and Friday.',
    home: '/study/today',
  },
  {
    key: 'home-todo',
    name: 'Home to-do',
    blurb: 'The shared list. Errands and odd jobs, with due dates.',
    home: '/home-todo',
  },
  {
    key: 'home-maintenance',
    name: 'Home maintenance',
    blurb: 'Upkeep and improvements, including anything that repeats.',
    home: '/home-maintenance',
  },
]

export function sectionFor(key: string): (typeof SECTIONS)[number] | undefined {
  return SECTIONS.find((s) => s.key === key)
}

export type AppUser = {
  id: string
  name: string
  is_admin: boolean
  sort_order: number
}

export type UserDirectory = {
  users: AppUser[]
  /** user id -> the sections granted to them. Admins are not listed here;
   *  they see everything. */
  grants: Map<string, Set<SectionKey>>
}

export async function fetchUsers(): Promise<UserDirectory> {
  const [u, g] = await Promise.all([
    supabase.from('app_users').select('*').order('sort_order'),
    supabase.from('app_user_sections').select('*'),
  ])
  if (u.error) throw new Error(u.error.message)
  if (g.error) throw new Error(g.error.message)

  const users = (u.data ?? []) as AppUser[]
  const grants = new Map<string, Set<SectionKey>>()
  for (const row of (g.data ?? []) as { user_id: string; section: SectionKey }[]) {
    const set = grants.get(row.user_id) ?? new Set<SectionKey>()
    set.add(row.section)
    grants.set(row.user_id, set)
  }
  return { users, grants }
}

/** An admin sees every section. Everyone else sees what they were granted. */
export function sectionsFor(user: AppUser, grants: Map<string, Set<SectionKey>>): SectionKey[] {
  if (user.is_admin) return SECTIONS.map((s) => s.key)
  const granted = grants.get(user.id)
  return SECTIONS.filter((s) => granted?.has(s.key)).map((s) => s.key)
}

export function canSee(
  user: AppUser | null,
  grants: Map<string, Set<SectionKey>>,
  section: SectionKey,
): boolean {
  if (!user) return false
  return user.is_admin || (grants.get(user.id)?.has(section) ?? false)
}

export async function grantSection(
  userId: string,
  section: SectionKey,
  granted: boolean,
): Promise<void> {
  if (granted) {
    const { error } = await supabase
      .from('app_user_sections')
      .upsert({ user_id: userId, section }, { onConflict: 'user_id,section' })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('app_user_sections')
      .delete()
      .eq('user_id', userId)
      .eq('section', section)
    if (error) throw new Error(error.message)
  }
}

// --- which name this device picked ------------------------------------------

/** Per-device, so Kate's phone stays Kate's without re-picking every open.
 *  A preference, not a session token -- nothing is authorised by it. */
const PICKED_KEY = 'app:user-id'

export function loadPickedUserId(): string | null {
  try {
    return localStorage.getItem(PICKED_KEY)
  } catch {
    return null
  }
}

export function savePickedUserId(id: string): void {
  try {
    localStorage.setItem(PICKED_KEY, id)
  } catch {
    // Private mode. The picker will just ask again next open.
  }
}

export function clearPickedUserId(): void {
  try {
    localStorage.removeItem(PICKED_KEY)
  } catch {
    /* see above */
  }
}
