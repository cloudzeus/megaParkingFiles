import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

const PREFIX = "fsk_";
const SECRET_BYTES = 32;

/**
 * Hash the raw API key for storage and lookup (SHA-256).
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Generate a new API key. Returns { rawKey, prefix }.
 * Raw key must be shown once to the user; only hash and prefix are stored.
 */
export function generateApiKey(): { rawKey: string; prefix: string } {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const rawKey = `${PREFIX}${secret}`;
  const prefix = rawKey.slice(0, PREFIX.length + 8);
  return { rawKey, prefix };
}

/**
 * Extract API key from request: Authorization: Bearer <key> or X-API-Key: <key>.
 */
export function getApiKeyFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const xKey = req.headers.get("x-api-key");
  if (xKey) return xKey.trim();
  return null;
}

export type ApiKeyContext = {
  apiKeyId: number;
  userId: string;
  companyId: number;
  departmentId: number | null;
  role: UserRole;
  isDepartmentScoped: boolean;
};

/**
 * Validate API key and return RBAC context. Updates lastUsedAt.
 * Returns null if invalid or expired.
 */
export async function validateApiKey(rawKey: string): Promise<ApiKeyContext | null> {
  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true, department: true },
  });
  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  if (apiKey.companyId !== apiKey.user.companyId) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  const isDepartmentScoped = apiKey.departmentId != null;
  const departmentId = apiKey.departmentId ?? apiKey.user.departmentId;
  const role: UserRole = isDepartmentScoped ? "DEPARTMENT_MANAGER" : apiKey.user.role;

  return {
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    companyId: apiKey.companyId,
    departmentId,
    role,
    isDepartmentScoped,
  };
}

/**
 * Convert ApiKeyContext to SessionUser for RBAC helpers.
 */
export function apiKeyContextToSessionUser(ctx: ApiKeyContext): SessionUser {
  return {
    id: ctx.userId,
    role: ctx.role,
    companyId: ctx.companyId,
    departmentId: ctx.departmentId,
  };
}
