import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative, so the build runs from any path: GitHub Pages serves it under /<repo>/ (decision 12).
  base: "./",
  // The app's tests and the gate's own (skills/verify-repo/rules.test.mjs, AGENTS.md §9.2).
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx", "skills/**/*.test.mjs"] },
} as Parameters<typeof defineConfig>[0]);
