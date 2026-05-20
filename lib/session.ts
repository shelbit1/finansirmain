import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const SESSION_COOKIE = "finansir_session";

/** Срок при включённом «Запомнить меня». */
const REMEMBER_TTL_DAYS = 30;
/** Срок сессии без галочки (на случай долго открытой вкладки). */
const BRIEF_TTL_DAYS = 1;

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set in environment");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  userId: string;
}

export async function encryptSession(
  payload: SessionPayload,
  ttlDays: number,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlDays}d`)
    .sign(getKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  options?: { remember?: boolean },
): Promise<void> {
  const remember = options?.remember ?? true;
  const ttlDays = remember ? REMEMBER_TTL_DAYS : BRIEF_TTL_DAYS;
  const token = await encryptSession({ userId }, ttlDays);
  const store = await cookies();

  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  if (remember) {
    store.set(SESSION_COOKIE, token, {
      ...base,
      maxAge: REMEMBER_TTL_DAYS * 24 * 60 * 60,
    });
  } else {
    // Без maxAge/expires — cookie сессии браузера (до закрытия)
    store.set(SESSION_COOKIE, token, base);
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
