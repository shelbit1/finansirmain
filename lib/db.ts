import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/databaseUrl";

const PRISMA_CLIENT_MARKER = path.join(
  process.cwd(),
  "node_modules",
  ".prisma",
  "client",
  "index.js",
);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  /** mtime сгенерированного клиента — для пересоздания после `prisma generate` */
  prismaClientMtime?: number;
};

function prismaClientMtime(): number {
  try {
    return fs.statSync(PRISMA_CLIENT_MARKER).mtimeMs;
  } catch {
    return 0;
  }
}

function createPrismaClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const mtime = prismaClientMtime();
  const stale =
    globalForPrisma.prisma &&
    globalForPrisma.prismaClientMtime !== undefined &&
    globalForPrisma.prismaClientMtime !== mtime;

  if (stale && globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaClientMtime = mtime;
  }
  return globalForPrisma.prisma;
}

/**
 * Прокси сохраняет «горячую» перезагрузку клиента после `prisma generate`,
 * но не подменяет возвращаемые значения — методы делегатов отдают настоящие
 * `PrismaPromise`, что необходимо для `prisma.$transaction([...])`.
 *
 * Для устойчивости к холодным коннектам Yandex Cloud Pooler в DATABASE_URL
 * добавлены параметры `connection_limit`, `pool_timeout` и `connect_timeout`.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient() as unknown as Record<
      string | symbol,
      unknown
    >;
    const value = client[prop as string];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
