import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations usam DIRECT_URL (session pooler porta 5432) — suporta DDL
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
