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
 * Нормализует DATABASE_URL для production (Amvera standalone).
 * Относительный sslrootcert из .env.local не работает, если cwd — .next/standalone.
 */
export function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_URL не задан. В Amvera: проект finansyr → Переменные → добавьте DATABASE_URL и перезапустите контейнер.",
    );
  }

  if (!raw.includes("sslrootcert=")) return raw;

  const cert = findSslCertPath();
  if (!cert) return raw;

  const encoded = encodeURIComponent(cert);
  return raw.replace(/sslrootcert=[^&]*/i, `sslrootcert=${encoded}`);
}
