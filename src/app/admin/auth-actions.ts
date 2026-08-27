"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { clearAdminSession, createAdminSession, hasAdminUsers, hashPassword, verifyPassword } from "@/lib/auth";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(10).max(200),
});

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function setupAdmin(formData: FormData) {
  if (await hasAdminUsers()) redirect("/admin/login");
  const parsed = credentials.safeParse({ email: value(formData, "email").toLowerCase(), password: value(formData, "password") });
  const confirm = value(formData, "confirmPassword");
  if (!parsed.success || confirm !== parsed.data.password) redirect("/admin/setup?error=invalid");

  const [user] = await db.insert(adminUsers).values({
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
  }).returning({ id: adminUsers.id });
  await createAdminSession(user.id);
  redirect("/admin");
}

export async function loginAdmin(formData: FormData) {
  if (!(await hasAdminUsers())) redirect("/admin/setup");
  const parsed = credentials.safeParse({ email: value(formData, "email").toLowerCase(), password: value(formData, "password") });
  if (!parsed.success) redirect("/admin/login?error=invalid");

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, parsed.data.email)).limit(1);
  if (!user) redirect("/admin/login?error=invalid");
  if (user.lockedUntil && user.lockedUntil > new Date()) redirect("/admin/login?error=locked");

  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    const nextAttempts = user.failedLoginAttempts + 1;
    const shouldLock = nextAttempts >= 5;
    await db.update(adminUsers).set({
      failedLoginAttempts: shouldLock ? 0 : nextAttempts,
      lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
      updatedAt: new Date(),
    }).where(eq(adminUsers.id, user.id));
    redirect(shouldLock ? "/admin/login?error=locked" : "/admin/login?error=invalid");
  }

  await db.update(adminUsers).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(adminUsers.id, user.id));
  await createAdminSession(user.id);
  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin/login");
}
