import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` only needs a syntactically valid URL — it does not connect.
// Fall back to a placeholder so builds (e.g. Vercel postinstall) don't fail when
// DATABASE_URL isn't set. The real value from the environment is used at runtime.
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
