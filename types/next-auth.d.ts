import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      companyId: number;
      departmentId: number | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    companyId: number;
    departmentId: number | null;
  }
}
