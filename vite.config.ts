import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/
// so `base` must be "/<repo>/" with both slashes. Change REPO_NAME below to
// match your repository name exactly (case-sensitive) if it isn't "workout-app".
// If you ever move to a user site (<user>.github.io) or a custom domain, set it to "/".
const REPO_NAME = 'workout-app'

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [react(), tailwindcss()],
})
