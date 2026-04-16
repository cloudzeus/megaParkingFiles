import { prisma } from "@/lib/prisma";
import type { EventType, TargetType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  companyId: number;
  actorUserId?: string | null;
  eventType: EventType;
  targetType: TargetType;
  targetId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function createAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      companyId: input.companyId,
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}
