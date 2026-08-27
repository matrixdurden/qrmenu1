import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function saveImageUpload(siteId: string, entry: FormDataEntryValue | null, prefix: string) {
  if (!(entry instanceof File) || entry.size === 0) return null;
  if (entry.size > MAX_IMAGE_BYTES) throw new Error("Görsel en fazla 6 MB olabilir.");
  const extension = EXTENSIONS[entry.type];
  if (!extension) throw new Error("Desteklenmeyen görsel formatı. JPG, PNG, WebP, GIF veya AVIF kullanın.");

  const safeSiteId = siteId.replace(/[^a-zA-Z0-9-]/g, "");
  const safePrefix = prefix.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32) || "image";
  const directory = path.join(process.cwd(), "public", "uploads", safeSiteId);
  await mkdir(directory, { recursive: true });
  const filename = `${safePrefix}-${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), Buffer.from(await entry.arrayBuffer()), { flag: "wx" });
  return `/uploads/${safeSiteId}/${filename}`;
}
