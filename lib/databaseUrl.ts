import fs from "node:fs";
import path from "node:path";

const CERT_FILENAME = "yandex-root.crt";

function findSslCertPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "prisma", CERT_FILENAME),
    path.join(process.cwd(), "..", "prisma", CERT_FILENAME),
    path.join(process.cwd(), "../../prisma", CERT_FILENAME),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Возвращает DATABASE_URL для production (Amvera standalone).
 * Относительный sslrootcert из .env.local не работает, если cwd — .next/standalone,
 * поэтому подменяем его на абсолютный путь к prisma/yandex-root.crt.
 *
 * Возвращает undefined, если переменная не задана — Prisma даст внятную ошибку
 * только при первом запросе (важно, т.к. на этапе сборки на Amvera env недоступны).
 */
export function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  if (!raw.includes("sslrootcert=")) return raw;

  const cert = findSslCertPath();
  if (!cert) return raw;

  const encoded = encodeURIComponent(cert);
  return raw.replace(/sslrootcert=[^&]*/i, `sslrootcert=${encoded}`);
}
