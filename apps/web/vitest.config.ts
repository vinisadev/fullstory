import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    alias: {
      "server-only": path.resolve(
        import.meta.dirname,
        "vitest.server-only-stub.ts",
      ),
    },
  },
});
