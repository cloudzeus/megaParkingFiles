import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canReadFolder, canReadFile } from "@/lib/rbac";
import { getFileStream } from "@/lib/bunny";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import type { Folder, File } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = Number((await params).folderId);
  if (Number.isNaN(folderId)) {
    return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
  }

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
  });
  if (!folder || folder.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  if (!canReadFolder(user, folder as Folder)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const files = await prisma.file.findMany({
    where: {
      folderId,
      companyId: session.user.companyId,
      deletionStatus: "ACTIVE",
      malwareStatus: { not: "INFECTED" },
    },
    select: {
      id: true,
      name: true,
      bunnyStoragePath: true,
      companyId: true,
      departmentId: true,
      createdByUserId: true,
      folderId: true,
    },
  });

  const allowed = files.filter((f) => canReadFile(user, f as File));
  if (allowed.length === 0) {
    return NextResponse.json(
      { error: "No files to download or access denied" },
      { status: 404 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 6 } });
  const pass = new PassThrough();
  archive.pipe(pass);

  (async () => {
    try {
      for (const f of allowed) {
        const stream = await getFileStream(f.bunnyStoragePath);
        if (stream) {
          archive.append(Readable.fromWeb(stream as import("stream/web").ReadableStream), { name: f.name });
        }
      }
      await archive.finalize();
    } catch {
      archive.destroy?.();
    }
  })();

  const webStream = Readable.toWeb(pass) as ReadableStream<Uint8Array>;
  const safeName = folder.name.replace(/[^\p{L}\p{N}\s_-]/gu, "_").trim() || "folder";
  const filename = `${safeName}.zip`;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
