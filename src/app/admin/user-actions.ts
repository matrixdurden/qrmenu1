"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { adminSessions, adminSiteAccess, adminUsers, sites } from "@/db/schema";
import { auditAdmin } from "@/lib/audit";
import { hashPassword, requireOwner } from "@/lib/auth";

const userSchema = z.object({ email: z.string().trim().toLowerCase().email().max(160), password: z.string().min(10).max(200) });
const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

async function validSiteIds(formData: FormData) {
  const ids = [...new Set(formData.getAll("siteIds").map(String).filter(Boolean))];
  if (!ids.length) return [];
  return db.select({ id: sites.id }).from(sites).where(inArray(sites.id, ids));
}

export async function createManager(formData: FormData) {
  const owner = await requireOwner();
  const parsed = userSchema.safeParse({ email: text(formData.get("email")).toLowerCase(), password: text(formData.get("password")) });
  if (!parsed.success) throw new Error("E-posta veya parola geçersiz.");
  const access = await validSiteIds(formData);
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, parsed.data.email)).limit(1);
  if (existing) throw new Error("Bu e-posta zaten kayıtlı.");
  const user = await db.transaction(async (tx) => {
    const [created] = await tx.insert(adminUsers).values({ email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), role: "manager" }).returning({ id: adminUsers.id });
    if (access.length) await tx.insert(adminSiteAccess).values(access.map((site) => ({ userId: created.id, siteId: site.id })));
    return created;
  });
  await auditAdmin({ userId: owner.id, action: "admin.create", entityType: "admin", entityId: user.id, metadata: { email: parsed.data.email, siteCount: access.length } });
  revalidatePath("/admin/users");
}

export async function updateManager(formData: FormData) {
  const owner = await requireOwner();
  const userId = text(formData.get("userId"));
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId)).limit(1);
  if (!user || user.role === "owner") throw new Error("Yönetici bulunamadı veya değiştirilemez.");
  const access = await validSiteIds(formData);
  const password = text(formData.get("password"));
  await db.transaction(async (tx) => {
    if (password) {
      if (password.length < 10 || password.length > 200) throw new Error("Parola en az 10 karakter olmalı.");
      await tx.update(adminUsers).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(adminUsers.id, userId));
      await tx.delete(adminSessions).where(eq(adminSessions.userId, userId));
    }
    await tx.delete(adminSiteAccess).where(eq(adminSiteAccess.userId, userId));
    if (access.length) await tx.insert(adminSiteAccess).values(access.map((site) => ({ userId, siteId: site.id })));
  });
  await auditAdmin({ userId: owner.id, action: "admin.update", entityType: "admin", entityId: userId, metadata: { siteCount: access.length, passwordChanged: Boolean(password) } });
  revalidatePath("/admin/users");
}

export async function deleteManager(formData: FormData) {
  const owner = await requireOwner();
  const userId = text(formData.get("userId"));
  if (userId === owner.id) throw new Error("Kendi hesabınızı silemezsiniz.");
  const [user] = await db.select({ id: adminUsers.id, role: adminUsers.role, email: adminUsers.email }).from(adminUsers).where(eq(adminUsers.id, userId)).limit(1);
  if (!user || user.role === "owner") throw new Error("Owner hesabı silinemez.");
  await db.delete(adminUsers).where(and(eq(adminUsers.id, userId), eq(adminUsers.role, "manager")));
  await auditAdmin({ userId: owner.id, action: "admin.delete", entityType: "admin", entityId: userId, metadata: { email: user.email } });
  revalidatePath("/admin/users");
}
