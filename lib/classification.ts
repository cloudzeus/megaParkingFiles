import { prisma } from "@/lib/prisma";
import { classifyDocument } from "@/lib/deepseek";
import type { GdprRiskLevel } from "@prisma/client";

const GDPR_MAP: Record<string, GdprRiskLevel> = {
  UNKNOWN: "UNKNOWN",
  NO_PII_DETECTED: "NO_PII_DETECTED",
  POSSIBLE_PII: "POSSIBLE_PII",
  CONFIRMED_PII: "CONFIRMED_PII",
};

/**
 * Run AI classification for a file: create/update FileClassificationJob, categories, tags, gdprRiskLevel.
 * Called after upload (and optionally after malware clean). Stub text extraction (no content sent).
 */
export async function runClassification(fileId: number): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { id: true, companyId: true, name: true, mimeType: true },
  });
  if (!file) return;

  const jobRecord = await prisma.fileClassificationJob.create({
    data: { fileId, status: "PENDING" },
  });

  const result = await classifyDocument({
    fileName: file.name,
    mimeType: file.mimeType,
    textSnippet: "",
  });

  await prisma.fileClassificationJob.update({
    where: { id: jobRecord.id },
    data: {
      status: result ? "DONE" : "FAILED",
      deepseekResponsePayload: result ? (result as object) : undefined,
    },
  });

  if (!result) return;

  const gdprRisk = result.gdprRisk && GDPR_MAP[result.gdprRisk] ? GDPR_MAP[result.gdprRisk] : undefined;
  if (gdprRisk) {
    await prisma.file.update({
      where: { id: fileId },
      data: { gdprRiskLevel: gdprRisk, classificationStatus: "DONE" },
    });
  } else {
    await prisma.file.update({
      where: { id: fileId },
      data: { classificationStatus: "DONE" },
    });
  }

  if (result.category) {
    let category = await prisma.fileCategory.findFirst({
      where: { companyId: file.companyId, name: result.category },
    });
    if (!category) {
      category = await prisma.fileCategory.create({
        data: { companyId: file.companyId, name: result.category },
      });
    }
    await prisma.file.update({
      where: { id: fileId },
      data: {
        categories: { connect: [{ id: category.id }] },
      },
    }).catch(() => {});
  }

  if (result.tags?.length) {
    for (const tag of result.tags.slice(0, 10)) {
      await prisma.fileTag.create({
        data: {
          fileId,
          key: tag.key.slice(0, 64),
          value: tag.value.slice(0, 256),
          source: "deepseek",
        },
      }).catch(() => {});
    }
  }
}
