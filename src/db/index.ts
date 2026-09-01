import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "⚠️  DATABASE_URL não definida. Usando fallback local (postgresql://...@127.0.0.1:5432/app_db). " +
    "Defina DATABASE_URL nas variáveis de ambiente para conectar ao banco de produção."
  );
}

const effectiveUrl = databaseUrl || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: effectiveUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
