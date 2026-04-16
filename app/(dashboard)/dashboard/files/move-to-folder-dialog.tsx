"use client";

import { el } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { HiOutlineFolder, HiOutlineFolderOpen } from "react-icons/hi2";

type FolderNode = {
  id: number;
  name: string;
  path: string;
  isDepartmentRoot: boolean;
  children: FolderNode[];
};

type Props = {
  fileId: number;
  fileName: string;
  /** Folder id where the file currently lives (disabled in tree) */
  fileFolderId: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

function FolderOption({
  node,
  level,
  currentFolderId,
  fileFolderId,
  onSelect,
}: {
  node: FolderNode;
  level: number;
  currentFolderId: number | null;
  fileFolderId: number | null;
  onSelect: (id: number) => void;
}) {
  const isCurrent = node.id === currentFolderId;
  const isFileFolder = node.id === fileFolderId;
  const disabled = isFileFolder;
  const hasChildren = node.children.length > 0;
  return (
    <div style={{ paddingLeft: level * 16 }} className="py-0.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onSelect(node.id)}
        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition ${
          disabled
            ? "cursor-not-allowed text-[var(--muted-foreground)]"
            : "text-[var(--foreground)] hover:bg-[var(--muted)]"
        } ${isCurrent ? "bg-[var(--primary)]/15 text-[var(--primary)] [&_svg]:text-[var(--primary)]" : ""}`}
        style={{ fontSize: "var(--text-body2)" }}
      >
        {hasChildren ? (
          <HiOutlineFolderOpen className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <HiOutlineFolder className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {node.name}
        {isFileFolder && " (τρέχων φάκελος)"}
      </button>
      {node.children.map((child) => (
        <FolderOption
          key={child.id}
          node={child}
          level={level + 1}
          currentFolderId={currentFolderId}
          fileFolderId={fileFolderId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function MoveToFolderDialog({
  fileId,
  fileName,
  fileFolderId,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedFolderId(null);
    fetch("/api/folders/tree")
      .then((r) => r.json())
      .then((data) => data.tree && setTree(data.tree))
      .catch(() => setTree([]));
  }, [open]);

  async function handleMove() {
    if (selectedFolderId == null) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: selectedFolderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--outline)] px-4 py-3">
          <h2 id="move-dialog-title" className="font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {el.moveFileToFolder}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            style={{ fontSize: "var(--text-body2)" }}
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <p className="mb-4 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            {fileName} → Επιλέξτε φάκελο προορισμού
          </p>
          {error && (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-red-500 dark:text-red-400" style={{ fontSize: "var(--text-body2)" }} role="alert">
              {error}
            </p>
          )}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-2">
            <p className="mb-2 font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Επιλέξτε φάκελο:</p>
            {tree.map((node) => (
              <FolderOption
                key={node.id}
                node={node}
                level={0}
                currentFolderId={selectedFolderId}
                fileFolderId={fileFolderId}
                onSelect={setSelectedFolderId}
              />
            ))}
          </div>
          <p className="mt-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
            {selectedFolderId != null
              ? `Επιλέχθηκε φάκελος #${selectedFolderId}`
              : "Επιλέξτε φάκελο από τη λίστα."}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--outline)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
            style={{ fontSize: "var(--text-body2)" }}
          >
            {el.cancel}
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={loading || selectedFolderId === null || selectedFolderId === fileFolderId}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: "var(--text-body2)" }}
          >
            {loading ? "…" : el.move}
          </button>
        </div>
      </div>
    </div>
  );
}
