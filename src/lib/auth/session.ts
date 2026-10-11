import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { findUser, type DemoUser } from "./users";

const COOKIE = "session";
const TTL_MS = 8 * 60 * 60 * 1000; // a shift

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me-dev-only-secret");
}

export async function encrypt(userId: string, expires: Date) {
  return new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expires).sign(key());
}

export async function decrypt(token: string | undefined): Promise<{ uid: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.uid === "string" ? { uid: payload.uid } : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + TTL_MS);
  (await cookies()).set(COOKIE, await encrypt(userId, expires), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user, re-checked against the user store on every request, or null. */
export const getSession = cache(async (): Promise<DemoUser | null> => {
  const p = await decrypt((await cookies()).get(COOKIE)?.value);
  return p ? findUser(p.uid) : null;
});
