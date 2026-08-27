import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(process.cwd(), "public", "uploads");

type ImageExtension = "jpg" | "png" | "webp" | "gif" | "avif";

function hasBytes(buffer: Buffer, offset: number, bytes: number[]) {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function detectImageExtension(buffer: Buffer): ImageExtension | null {
  if (buffer.length >= 3 && hasBytes(buffer, 0, [0xff, 0xd8, 0xff])) return "jpg";
  if (buffer.length >= 8 && hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";

  if (buffer.length >= 6) {
    const gifHeader = buffer.subarray(0, 6).toString("ascii");
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") return "gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) return "webp";

  if (buffer.length >= 16 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brands = buffer.subarray(8, Math.min(buffer.length, 48)).toString("ascii");
    if (brands.includes("avif") || brands.includes("avis")) return "avif";
  }

  return null;
}

function safeSiteSegment(siteId: string) {
  const safe = siteId.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safe) throw new Error("Geçersiz site kimliği.");
  return safe;
}

function localUploadPath(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/uploads/")) return null;
  const relative = imageUrl.replace(/^\/+/, "");
  const resolved = path.resolve(process.cwd(), "public", relative);
  if (!resolved.startsWith(`${UPLOAD_ROOT}${path.sep}`)) return null;
  return resolved;
}

export async function saveImageUpload(siteId: string, entry: FormDataEntryValue | null, prefix: string) {
  if (!(entry instanceof File) || entry.size === 0) return null;
  if (entry.size > MAX_IMAGE_BYTES) throw new Error("Görsel en fazla 6 MB olabilir.");

  const buffer = Buffer.from(await entry.arrayBuffer());
  const extension = detectImageExtension(buffer);
  if (!extension) throw new Error("Dosya içeriği geçerli bir JPG, PNG, WebP, GIF veya AVIF görsel değil.");

  const safeSiteId = safeSiteSegment(siteId);
  const safePrefix = prefix.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32) || "image";
  const directory = path.join(UPLOAD_ROOT, safeSiteId);
  await mkdir(directory, { recursive: true });
  const filename = `${safePrefix}-${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), buffer, { flag: "wx" });
  return `/uploads/${safeSiteId}/${filename}`;
}

export async function deleteLocalUpload(imageUrl: string | null | undefined) {
  const filePath = localUploadPath(imageUrl);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function deleteSiteUploads(siteId: string) {
  const directory = path.resolve(UPLOAD_ROOT, safeSiteSegment(siteId));
  if (!directory.startsWith(`${UPLOAD_ROOT}${path.sep}`)) throw new Error("Geçersiz upload dizini.");
  await rm(directory, { recursive: true, force: true });
}
