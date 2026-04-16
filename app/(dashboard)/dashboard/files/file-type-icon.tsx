"use client";

import {
  HiOutlineDocument,
  HiOutlineDocumentText,
  HiOutlinePhoto,
  HiOutlineTableCells,
  HiOutlineArchiveBox,
  HiOutlineFolder,
  HiOutlineFolderOpen,
} from "react-icons/hi2";

type FileIconComponent = typeof HiOutlineDocument;

/**
 * Returns the best icon for a file based on extension or mime type.
 * Used for list/grid views and details pane (shadcn/Material style).
 */
export function getFileIcon(extension?: string | null, mimeType?: string | null): FileIconComponent {
  const ext = (extension ?? "").toLowerCase();
  const mime = (mimeType ?? "").toLowerCase();

  if (mime.startsWith("image/") || /^(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(ext)) return HiOutlinePhoto;
  if (mime.includes("spreadsheet") || mime.includes("excel") || /^(xls|xlsx|csv|ods)$/.test(ext)) return HiOutlineTableCells;
  if (mime.includes("pdf") || ext === "pdf") return HiOutlineDocumentText;
  if (mime.startsWith("text/") || /^(txt|md|rtf|doc|docx|odt)$/.test(ext)) return HiOutlineDocumentText;
  if (mime.includes("zip") || mime.includes("archive") || /^(zip|rar|7z|tar|gz)$/.test(ext)) return HiOutlineArchiveBox;

  return HiOutlineDocument;
}

export { HiOutlineFolder, HiOutlineFolderOpen };
