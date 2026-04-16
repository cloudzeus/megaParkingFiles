/**
 * Bunny CDN Storage API: upload, delete, and signed download URLs.
 * Uses BUNNY_STORAGE_ZONE, BUNNY_ACCESS_KEY, BUNNY_STORAGE_API_HOST, BUNNY_CDN_HOSTNAME.
 * For signed URLs (pull zone) set BUNNY_SIGNING_KEY in .env (Token Authentication key).
 */
import { createHash } from "crypto";

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE ?? "";
const ACCESS_KEY = process.env.BUNNY_ACCESS_KEY ?? "";
const STORAGE_HOST = process.env.BUNNY_STORAGE_API_HOST ?? "storage.bunnycdn.com";
const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME ?? "";
const SIGNING_KEY = process.env.BUNNY_SIGNING_KEY ?? "";

const STORAGE_BASE = `https://${STORAGE_HOST}/${STORAGE_ZONE}`;

export type BunnyUploadResult = { ok: true; path: string } | { ok: false; error: string };
export type BunnyDeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Upload file bytes to Bunny Storage. pathInStorage = relative path including filename (e.g. "company1/folder1/abc.pdf").
 */
export async function uploadFile(
  pathInStorage: string,
  body: ArrayBuffer | Buffer | Blob,
  contentType?: string
): Promise<BunnyUploadResult> {
  if (!STORAGE_ZONE || !ACCESS_KEY) {
    return { ok: false, error: "BUNNY_STORAGE_ZONE or BUNNY_ACCESS_KEY not set" };
  }
  const lastSlash = pathInStorage.lastIndexOf("/");
  const path = lastSlash >= 0 ? pathInStorage.slice(0, lastSlash) : "";
  const fileName = lastSlash >= 0 ? pathInStorage.slice(lastSlash + 1) : pathInStorage;
  const url = path
    ? `${STORAGE_BASE}/${path}/${encodeURIComponent(fileName)}`
    : `${STORAGE_BASE}/${encodeURIComponent(fileName)}`;

  const buffer = body instanceof ArrayBuffer ? Buffer.from(body) : body instanceof Blob ? await new Response(body).arrayBuffer().then(Buffer.from) : body;
  const bodyInit: BodyInit = new Uint8Array(buffer);

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        AccessKey: ACCESS_KEY,
        "Content-Type": contentType ?? "application/octet-stream",
        "Content-Length": String(buffer.length),
      },
      body: bodyInit,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `${res.status}: ${text}` };
    }
    return { ok: true, path: pathInStorage };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Download file content from Bunny Storage. Returns buffer or null on failure.
 */
export async function getFile(pathInStorage: string): Promise<Buffer | null> {
  if (!STORAGE_ZONE || !ACCESS_KEY) return null;
  const encodedPath = pathInStorage
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  const url = `${STORAGE_BASE}/${encodedPath}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { AccessKey: ACCESS_KEY },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/**
 * Stream file content from Bunny Storage. Returns a ReadableStream or null on failure.
 * Use this for large files to avoid buffering the entire file in memory.
 */
export async function getFileStream(pathInStorage: string): Promise<ReadableStream<Uint8Array> | null> {
  if (!STORAGE_ZONE || !ACCESS_KEY) return null;
  const encodedPath = pathInStorage
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  const url = `${STORAGE_BASE}/${encodedPath}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { AccessKey: ACCESS_KEY },
    });
    if (!res.ok || !res.body) return null;
    return res.body;
  } catch {
    return null;
  }
}

/**
 * Delete file from Bunny Storage by its storage path.
 */
export async function deleteFile(pathInStorage: string): Promise<BunnyDeleteResult> {
  if (!STORAGE_ZONE || !ACCESS_KEY) {
    return { ok: false, error: "BUNNY_STORAGE_ZONE or BUNNY_ACCESS_KEY not set" };
  }
  const encodedPath = pathInStorage
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  const url = `${STORAGE_BASE}/${encodedPath}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { AccessKey: ACCESS_KEY },
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      return { ok: false, error: `${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Build signed download URL for Pull Zone (Token Authentication).
 * Requires BUNNY_CDN_HOSTNAME and BUNNY_SIGNING_KEY. Expires in seconds.
 */
export function getSignedDownloadUrl(
  pathInStorage: string,
  expiresInSeconds: number = 3600
): string | null {
  if (!CDN_HOSTNAME) return null;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const pathForToken = pathInStorage.startsWith("/") ? pathInStorage : `/${pathInStorage}`;
  const toSign = `${SIGNING_KEY}${pathForToken}${expires}`;

  if (!SIGNING_KEY) {
    return `https://${CDN_HOSTNAME}/${pathInStorage}`;
  }
  const token = createHash("sha256").update(toSign).digest("base64url");
  const separator = pathInStorage.includes("?") ? "&" : "?";
  return `https://${CDN_HOSTNAME}/${pathInStorage}${separator}token=${token}&expires=${expires}`;
}
