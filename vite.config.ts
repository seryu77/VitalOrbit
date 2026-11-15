// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A relative base lets the built app run from any path, such as GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
