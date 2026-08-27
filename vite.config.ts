import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/
// so `base` must be "/<repo>/" with both slashes. Change REPO_NAME below to
// match your repository name exactly (case-sensitive) if it isn't "workout-app".
// If you ever move to a user site (<user>.github.io) or a custom domain, set it to "/".
const REPO_NAME = 'workout-app'

// A new id every build. The app compares the id baked into its bundle against
// the one in version.json and reloads itself when they differ.
const BUILD_ID = Date.now().toString(36)

/** Writes version.json next to index.html at build time. */
function emitVersionFile(buildId: string): Plugin {
  return {
    name: 'emit-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      })
    },
  }
}

export default defineConfig({
  base: `/${REPO_NAME}/`,
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), tailwindcss(), emitVersionFile(BUILD_ID)],
})
