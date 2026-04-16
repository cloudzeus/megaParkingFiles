import { prisma } from "@/lib/prisma";

let cachedDefaultCompanyId: number | null | undefined = undefined;

/**
 * Returns the id of the single default company (DR file share / GDPR backup).
 * All main features (departments, users, files, reports) are scoped to this company.
 * Other companies exist only for sharing with external parties.
 */
export async function getDefaultCompanyId(): Promise<number | null> {
  if (cachedDefaultCompanyId !== undefined) return cachedDefaultCompanyId;
  const company = await prisma.company.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  cachedDefaultCompanyId = company?.id ?? null;
  return cachedDefaultCompanyId;
}

/**
 * Use for main features (departments, users, files, reports).
 * - SUPER_ADMIN: uses the default company (global scope).
 * - COMPANY_ADMIN: uses their own company.
 * - Other roles: uses their own company id only if it matches the default company.
 * Returns null if the user is not allowed to use main features.
 */
export async function getEffectiveCompanyIdForMainFeatures(session: {
  user: { role?: string; companyId?: number | null };
}): Promise<number | null> {
  if (session.user.role === "SUPER_ADMIN") {
    return (await getDefaultCompanyId()) ?? session.user.companyId ?? null;
  }
  if (session.user.role === "COMPANY_ADMIN") {
    return session.user.companyId ?? null;
  }
  const defaultId = await getDefaultCompanyId();
  if (!defaultId) return null;
  if (session.user.companyId === defaultId) return defaultId;
  return null;
}

/**
 * Call after updating which company is default (e.g. in companies API) so next getDefaultCompanyId() is fresh.
 */
export function clearDefaultCompanyCache(): void {
  cachedDefaultCompanyId = undefined;
}
