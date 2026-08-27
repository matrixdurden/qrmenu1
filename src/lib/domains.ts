import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { getMenuBySiteId } from "@/lib/queries";

export async function getMenuForHost(host: string) {
  const normalized = host.trim().toLowerCase().split(":")[0];
  if (!normalized) return null;
  const [site] = await db
    .select({ id: sites.id, isActive: sites.isActive })
    .from(sites)
    .where(eq(sites.customDomain, normalized))
    .limit(1);
  if (!site?.isActive) return null;
  return getMenuBySiteId(site.id);
}
