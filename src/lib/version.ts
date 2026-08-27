declare const __BUILD_ID__: string

/** Baked in at build time by vite.config.ts. */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'

/** The build id currently deployed, or null if it can't be determined.
 *
 *  GitHub Pages sends `Cache-Control: max-age=600` on everything and there's
 *  no way to change that, so this defeats the cache twice over: `no-store`
 *  for the browser, and a unique query string so no cached response can be
 *  reused for this URL. */
export async function fetchDeployedBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    const id = (data as { buildId?: unknown })?.buildId
    return typeof id === 'string' ? id : null
  } catch {
    // Offline, or mid-deploy. Not worth reporting -- we just try again later.
    return null
  }
}
