import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
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
 * Yandex Cloud Pooler иногда сбрасывает первый коннект Prisma, отдавая P1001.
 * Здесь ретраим только эту конкретную ошибку — максимум 2 повтора с короткой
 * паузой. Бизнес-ошибки (валидация, уникальность и т.п.) пробрасываются как есть.
 */
const RETRYABLE_PRISMA_CODES = new Set(["P1001", "P1002", "P1017"]);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 250;

function isRetryablePrismaError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    RETRYABLE_PRISMA_CODES.has(err.code)
  ) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES || !isRetryablePrismaError(err)) throw err;
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * Список свойств клиента, на которые НЕ навешиваем retry. Транзакции и хуки
 * управляют коннектами самостоятельно, ретрай на уровне делегата сломал бы их.
 */
const NON_RETRYABLE_PROPS = new Set([
  "$connect",
  "$disconnect",
  "$on",
  "$use",
  "$transaction",
  "$extends",
  "$queryRaw",
  "$queryRawUnsafe",
  "$executeRaw",
  "$executeRawUnsafe",
]);

/** Делегаты вида `prisma.user` — заворачиваем их методы (findUnique и т.п.) в retry. */
function wrapDelegate(delegate: object): object {
  return new Proxy(delegate, {
    get(target, methodProp) {
      const method = (target as Record<string | symbol, unknown>)[
        methodProp as string
      ];
      if (typeof method !== "function") return method;
      return (...args: unknown[]) =>
        withRetry(() =>
          Promise.resolve(
            (method as (...a: unknown[]) => unknown).apply(target, args),
          ),
        );
    },
  });
}

function isModelDelegateKey(prop: string | symbol): boolean {
  if (typeof prop !== "string") return false;
  if (prop.startsWith("$") || prop.startsWith("_")) return false;
  if (NON_RETRYABLE_PROPS.has(prop)) return false;
  return true;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient() as unknown as Record<
      string | symbol,
      unknown
    >;
    const value = client[prop as string];
    if (typeof value === "function") return value.bind(client);
    if (value && typeof value === "object" && isModelDelegateKey(prop)) {
      return wrapDelegate(value as object);
    }
    return value;
  },
});
