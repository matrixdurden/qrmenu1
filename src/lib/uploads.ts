import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(process.cwd(), "public", "uploads");

type ImageExtension = "jpg" | "png" | "webp" | "gif" | "avif";
type StorageConfig = { endpoint: string; bucket: string; region: string; accessKey: string; secretKey: string; publicUrl: string };

const CONTENT_TYPES: Record<ImageExtension, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

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
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
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

function storageConfig(): StorageConfig | null {
  const values = {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT?.replace(/\/$/, ""),
    bucket: process.env.OBJECT_STORAGE_BUCKET,
    region: process.env.OBJECT_STORAGE_REGION || "auto",
    accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
    secretKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, ""),
  };
  const configured = Object.values(values).some(Boolean);
  if (!configured) return null;
  if (!values.endpoint || !values.bucket || !values.accessKey || !values.secretKey || !values.publicUrl) {
    throw new Error("Object storage ayarları eksik. Endpoint, bucket, access key, secret key ve public URL birlikte verilmelidir.");
  }
  return values as StorageConfig;
}

function sha256(data: string | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: string | Buffer, data: string) {
  return createHmac("sha256", key).update(data).digest();
}

function awsDate(now: Date) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodePath(value: string) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

async function signedStorageRequest(config: StorageConfig, method: "GET" | "PUT" | "DELETE", key: string, options?: { body?: Buffer; contentType?: string; query?: Record<string, string> }) {
  const now = new Date();
  const amzDate = awsDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payload = options?.body ?? Buffer.alloc(0);
  const payloadHash = sha256(payload);
  const encodedBucket = encodeURIComponent(config.bucket);
  const encodedKey = encodePath(key);
  const basePath = `/${encodedBucket}${encodedKey ? `/${encodedKey}` : ""}`;
  const url = new URL(`${config.endpoint}${basePath}`);
  const queryEntries = Object.entries(options?.query ?? {}).sort(([a], [b]) => a.localeCompare(b));
  for (const [name, value] of queryEntries) url.searchParams.set(name, value);
  const canonicalQuery = queryEntries.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("&");
  const host = url.host;
  const contentType = options?.contentType;
  const headerRows = [
    ...(contentType ? [["content-type", contentType]] : []),
    ["host", host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ] as Array<[string, string]>;
  const canonicalHeaders = headerRows.map(([name, value]) => `${name}:${value.trim()}\n`).join("");
  const signedHeaders = headerRows.map(([name]) => name).join(";");
  const canonicalRequest = [method, basePath, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const dateKey = hmac(`AWS4${config.secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
    body: method === "PUT" ? payload : undefined,
  });
}

async function saveObject(config: StorageConfig, key: string, buffer: Buffer, contentType: string) {
  const response = await signedStorageRequest(config, "PUT", key, { body: buffer, contentType });
  if (!response.ok) throw new Error(`Object storage upload başarısız (${response.status}).`);
  return `${config.publicUrl}/${encodePath(key)}`;
}

function remoteObjectKey(config: StorageConfig, imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith(`${config.publicUrl}/`)) return null;
  const value = imageUrl.slice(config.publicUrl.length + 1);
  try {
    return value.split("/").map((part) => decodeURIComponent(part)).join("/");
  } catch {
    return null;
  }
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
  const filename = `${safePrefix}-${randomUUID()}.${extension}`;
  const key = `${safeSiteId}/${filename}`;
  const remote = storageConfig();
  if (remote) return saveObject(remote, key, buffer, CONTENT_TYPES[extension]);

  const directory = path.join(UPLOAD_ROOT, safeSiteId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer, { flag: "wx" });
  return `/uploads/${key}`;
}

export async function deleteLocalUpload(imageUrl: string | null | undefined) {
  const remote = storageConfig();
  if (remote) {
    const key = remoteObjectKey(remote, imageUrl);
    if (key) {
      const response = await signedStorageRequest(remote, "DELETE", key);
      if (!response.ok && response.status !== 404) throw new Error(`Object storage silme başarısız (${response.status}).`);
      return;
    }
  }
  const filePath = localUploadPath(imageUrl);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function xmlDecode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function deleteRemoteSiteUploads(config: StorageConfig, siteId: string) {
  let token = "";
  for (let page = 0; page < 20; page++) {
    const query: Record<string, string> = { "list-type": "2", prefix: `${siteId}/`, "max-keys": "1000" };
    if (token) query["continuation-token"] = token;
    const response = await signedStorageRequest(config, "GET", "", { query });
    if (!response.ok) throw new Error(`Object storage listeleme başarısız (${response.status}).`);
    const xml = await response.text();
    const keys = [...xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((match) => xmlDecode(match[1]));
    for (let index = 0; index < keys.length; index += 20) {
      await Promise.all(keys.slice(index, index + 20).map(async (key) => {
        const result = await signedStorageRequest(config, "DELETE", key);
        if (!result.ok && result.status !== 404) throw new Error(`Object storage silme başarısız (${result.status}).`);
      }));
    }
    const next = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
    if (!next) break;
    token = xmlDecode(next);
  }
}

export async function deleteSiteUploads(siteId: string) {
  const safeSiteId = safeSiteSegment(siteId);
  const remote = storageConfig();
  if (remote) {
    await deleteRemoteSiteUploads(remote, safeSiteId);
    return;
  }
  const directory = path.resolve(UPLOAD_ROOT, safeSiteId);
  if (!directory.startsWith(`${UPLOAD_ROOT}${path.sep}`)) throw new Error("Geçersiz upload dizini.");
  await rm(directory, { recursive: true, force: true });
}
