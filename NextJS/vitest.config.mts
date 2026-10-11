import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": __dirname } },
  test: { environment: "node", include: ["**/*.test.{js,ts}"], exclude: ["node_modules/**", ".next/**"] },
});
