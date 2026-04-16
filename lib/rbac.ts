import type { UserRole } from "@prisma/client";
import type { File, Folder } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: UserRole;
  companyId: number;
  departmentId: number | null;
};

/**
 * SUPER_ADMIN: global admin for the SaaS.
 * COMPANY_ADMIN: manages company settings, departments, users, policies.
 * DEPARTMENT_MANAGER: manages files and shares within their department.
 * EMPLOYEE: limited to their own files and department rules.
 * AUDITOR: read-only access to logs, limited file access.
 * DPO: can view all GDPR logs, manage policies, approve/reject risky operations.
 */

export function canManagePolicies(user: SessionUser): boolean {
  return user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "DPO";
}

export function canViewAudit(user: SessionUser, scope: "company" | "department" | "all"): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "DPO" || user.role === "AUDITOR" || user.role === "COMPANY_ADMIN") return scope !== "all";
  if (user.role === "DEPARTMENT_MANAGER") return scope === "department" || scope === "company";
  return scope === "department";
}

export function canReadFile(user: SessionUser, file: File): boolean {
  if (user.companyId !== file.companyId) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "COMPANY_ADMIN" || user.role === "DPO" || user.role === "AUDITOR") return true;
  if (user.role === "DEPARTMENT_MANAGER" && file.departmentId === user.departmentId) return true;
  if (user.role === "EMPLOYEE" && (file.createdByUserId === user.id || file.departmentId === user.departmentId)) return true;
  return false;
}

export function canWriteFile(user: SessionUser, file: File): boolean {
  if (!canReadFile(user, file)) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN") return true;
  if (user.role === "DEPARTMENT_MANAGER" && file.departmentId === user.departmentId) return true;
  if (user.role === "EMPLOYEE" && file.createdByUserId === user.id) return true;
  return false;
}

export function canShareFile(user: SessionUser, file: File): boolean {
  if (!canReadFile(user, file)) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "DPO") return true;
  if (user.role === "DEPARTMENT_MANAGER" && file.departmentId === user.departmentId) return true;
  if (user.role === "EMPLOYEE" && file.createdByUserId === user.id) return true;
  return false;
}

export function canReadFolder(user: SessionUser, folder: Folder): boolean {
  if (user.companyId !== folder.companyId) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "COMPANY_ADMIN" || user.role === "DPO" || user.role === "AUDITOR") return true;
  if (user.role === "DEPARTMENT_MANAGER" && folder.departmentId === user.departmentId) return true;
  if (user.role === "EMPLOYEE" && (folder.createdByUserId === user.id || folder.departmentId === user.departmentId)) return true;
  return false;
}

export function canWriteFolder(user: SessionUser, folder: Folder): boolean {
  if (!canReadFolder(user, folder)) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN") return true;
  if (user.role === "DEPARTMENT_MANAGER" && folder.departmentId === user.departmentId) return true;
  if (user.role === "EMPLOYEE" && folder.createdByUserId === user.id) return true;
  return false;
}
