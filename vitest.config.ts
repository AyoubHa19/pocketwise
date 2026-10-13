import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The same "@/..." shortcut as in tsconfig.json, so tests can import
    // app code the way the app does.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // The code under test is plain TypeScript, so Node is enough; tests that
    // need localStorage provide a small in-memory one themselves.
    environment: "node",
  },
});
