"use client";

import { el } from "@/lib/i18n";
import { useMemo } from "react";
import { getFileIcon, HiOutlineFolder } from "./file-type-icon";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const malwareLabels: Record<string, string> = {
  PENDING: el.malwarePending,
  CLEAN: el.malwareClean,
  INFECTED: el.malwareInfected,
  FAILED: el.malwarePending,
};

const gdprLabels: Record<string, string> = {
  UNKNOWN: el.gdprUnknown,
  NO_PII_DETECTED: el.gdprNoPii,
  POSSIBLE_PII: el.gdprPossiblePii,
  CONFIRMED_PII: el.gdprConfirmedPii,
};

export type FileItem = {
  id: number;
  name: string;
  extension?: string | null;
  sizeBytes: number;
  mimeType?: string | null;
  malwareStatus: string;
  gdprRiskLevel: string;
  uploadedAt: string;
  createdBy?: string | null;
};

export type FolderItem = {
  id: number;
  name: string;
  path: string;
  isDepartmentRoot: boolean;
  containsPersonalData?: boolean;
  createdAt: string;
  createdBy?: string | null;
};

type Props = {
  selectedFiles: FileItem[];
  selectedFolders: FolderItem[];
  onClearSelection?: () => void;
};

export function FileBrowserDetailsPane({
  selectedFiles,
  selectedFolders,
  onClearSelection,
}: Props) {
  const total = selectedFiles.length + selectedFolders.length;
  const singleFile = total === 1 && selectedFiles.length === 1 ? selectedFiles[0] : null;
  const singleFolder = total === 1 && selectedFolders.length === 1 ? selectedFolders[0] : null;
  const fileExt = singleFile?.extension ?? null;
  const fileMime = singleFile?.mimeType ?? null;
  /* eslint-disable react-hooks/static-components -- FileIcon from getFileIcon(ext,mime) factory; memoized to avoid recreating each render */
  const FileIcon = useMemo(
    () => (singleFile ? getFileIcon(fileExt, fileMime) : HiOutlineFolder),
    [fileExt, fileMime, singleFile]
  );

  if (total === 0) {
    return (
      <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--outline)] bg-[var(--surface)]">
        <div className="border-b border-[var(--outline)] px-3 py-2">
          <h3 className="font-semibold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
            {el.noDetails}
          </h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]/80 [&_svg]:text-[var(--primary)]/80">
            <HiOutlineFolder className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
            {el.noDetails}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--outline)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--outline)] px-3 py-2">
        <h3 className="min-w-0 truncate font-semibold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
          {total === 1 ? (singleFile ? singleFile.name : singleFolder?.name) : `${total} επιλεγμένα`}
        </h3>
        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="shrink-0 rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
            style={{ fontSize: "var(--text-caption)" }}
          >
            Καθαρισμός
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3" style={{ fontSize: "var(--text-caption)" }}>
        {singleFile && (
          <>
            <div className="mb-3 flex items-center justify-center rounded-lg border border-[var(--outline)] bg-[var(--card)] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] [&_svg]:text-[var(--primary)]">
                <FileIcon className="h-5 w-5" aria-hidden />
              </div>
            </div>
            {/* eslint-enable react-hooks/static-components */}
            <dl className="space-y-2">
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                  {el.type}
                </dt>
                <dd className="text-[var(--foreground)]">
                  {el.file}
                  {singleFile.extension ? ` (${singleFile.extension})` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                  {el.size}
                </dt>
                <dd className="text-[var(--foreground)]">{formatBytes(singleFile.sizeBytes)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                  {el.modified}
                </dt>
                <dd className="text-[var(--foreground)]">{new Date(singleFile.uploadedAt).toLocaleDateString("el-GR")}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                  {el.statusSecurity}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    {malwareLabels[singleFile.malwareStatus] ?? singleFile.malwareStatus}
                  </span>
                  <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    {gdprLabels[singleFile.gdprRiskLevel] ?? singleFile.gdprRiskLevel}
                  </span>
                </dd>
              </div>
              {singleFile.createdBy && (
                <div>
                  <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    Δημιουργός
                  </dt>
                  <dd className="text-[var(--foreground)]">{singleFile.createdBy}</dd>
                </div>
              )}
            </dl>
          </>
        )}
        {singleFolder && (
          <>
            <div className="mb-3 flex items-center justify-center rounded-lg border border-[var(--outline)] bg-[var(--card)] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] [&_svg]:text-[var(--primary)]">
                <HiOutlineFolder className="h-5 w-5" aria-hidden />
              </div>
            </div>
            <dl className="space-y-2">
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                  {el.type}
                </dt>
                <dd className="text-[var(--foreground)]">{el.folder}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                  Διαδρομή
                </dt>
                <dd className="break-all text-[var(--foreground)]">{singleFolder.path}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                  {el.modified}
                </dt>
                <dd className="text-[var(--foreground)]">{new Date(singleFolder.createdAt).toLocaleDateString("el-GR")}</dd>
              </div>
              {singleFolder.createdBy && (
                <div>
                  <dt className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    Δημιουργός
                  </dt>
                  <dd className="text-[var(--foreground)]">{singleFolder.createdBy}</dd>
                </div>
              )}
            </dl>
          </>
        )}
        {total > 1 && (
          <p className="text-[var(--muted-foreground)]">
            {selectedFiles.length} αρχεία, {selectedFolders.length} φάκελοι
          </p>
        )}
      </div>
    </aside>
  );
}
