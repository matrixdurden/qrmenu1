import "server-only";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { adminSessions, adminSiteAccess, adminUsers } from "@/db/schema";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "qrmenu_session";
const SESSION_DAYS = 30;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, saltHex, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hasAdminUsers() {
  const [row] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return Boolean(row);
}

export async function getCurrentAdmin() {
  const store = await cookies();
  const rawToken = store.get(COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const [session] = await db
    .select({ userId: adminSessions.userId })
    .from(adminSessions)
    .where(and(eq(adminSessions.tokenHash, tokenHash(rawToken)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  if (!session) return null;

  const [user] = await db
    .select({ id: adminUsers.id, email: adminUsers.email, role: adminUsers.role })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.userId))
    .limit(1);
  return user ?? null;
}

export async function requireAdmin() {
  if (!(await hasAdminUsers())) redirect("/admin/setup");
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  return user;
}

export async function requireOwner() {
  const user = await requireAdmin();
  if (user.role !== "owner") redirect("/admin?error=forbidden");
  return user;
}

export async function canAccessSite(user: NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>, siteId: string) {
  if (user.role === "owner") return true;
  const [access] = await db
    .select({ id: adminSiteAccess.id })
    .from(adminSiteAccess)
    .where(and(eq(adminSiteAccess.userId, user.id), eq(adminSiteAccess.siteId, siteId)))
    .limit(1);
  return Boolean(access);
}

export async function requireSiteAdmin(siteId: string) {
  const user = await requireAdmin();
  if (!(await canAccessSite(user, siteId))) redirect("/admin?error=forbidden");
  return user;
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(adminSessions).values({ userId, tokenHash: tokenHash(token), expiresAt });

  const store = await cookies();
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secureCookie = configuredUrl ? configuredUrl.startsWith("https://") : process.env.NODE_ENV === "production";
  const isCodespaces = Boolean(process.env.CODESPACE_NAME) || Boolean(configuredUrl?.includes(".app.github.dev"));
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isCodespaces ? "lax" : "strict",
    secure: secureCookie,
    path: "/",
    expires: expiresAt,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash(token)));
  store.delete(COOKIE_NAME);
}
