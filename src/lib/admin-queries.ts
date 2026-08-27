import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, sites } from "@/db/schema";

export async function getAdminSiteBasics(siteId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) return null;
  const siteCategories = await db.select().from(categories).where(eq(categories.siteId, siteId)).orderBy(asc(categories.sortOrder), asc(categories.name));
  return { site, categories: siteCategories };
}
