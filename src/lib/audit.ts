import "server-only";

import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema";

export async function auditAdmin(input: {
  userId?: string | null;
  siteId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(adminAuditLogs).values({
    userId: input.userId ?? null,
    siteId: input.siteId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}
