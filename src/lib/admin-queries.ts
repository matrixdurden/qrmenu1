import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businessHours, categories, siteSections, sites } from "@/db/schema";

async function siteById(siteId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  return site ?? null;
}

export async function getAdminSiteOnly(siteId: string) {
  return siteById(siteId);
}

export async function getAdminSiteBasics(siteId: string) {
  const site = await siteById(siteId);
  if (!site) return null;
  const siteCategories = await db.select().from(categories).where(eq(categories.siteId, siteId)).orderBy(asc(categories.sortOrder), asc(categories.name));
  return { site, categories: siteCategories };
}

export async function getAdminSiteHours(siteId: string) {
  const site = await siteById(siteId);
  if (!site) return null;
  const hours = await db.select().from(businessHours).where(eq(businessHours.siteId, siteId)).orderBy(asc(businessHours.dayOfWeek));
  return { site, hours };
}

export async function getAdminSiteSections(siteId: string) {
  const site = await siteById(siteId);
  if (!site) return null;
  const sections = await db.select().from(siteSections).where(eq(siteSections.siteId, siteId)).orderBy(asc(siteSections.sortOrder));
  return { site, sections };
}

export async function getAdminSiteCategories(siteId: string) {
  const site = await siteById(siteId);
  if (!site) return null;
  const siteCategories = await db.select().from(categories).where(eq(categories.siteId, siteId)).orderBy(asc(categories.sortOrder), asc(categories.name));
  return { site, categories: siteCategories };
}
