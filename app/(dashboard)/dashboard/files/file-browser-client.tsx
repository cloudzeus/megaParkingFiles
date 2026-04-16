"use client";

import { el } from "@/lib/i18n";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineFolder, HiOutlineChevronRight, HiOutlineSquares2X2, HiOutlineViewColumns, HiOutlineBars3 } from "react-icons/hi2";
import { FileBrowserSidebar } from "./file-browser-sidebar";
import { FileBrowserDetailsPane, type FileItem, type FolderItem } from "./file-browser-details-pane";
import { FileBrowserToolbar } from "./file-browser-toolbar";
import { FileBrowserContextMenu, type ContextMenuItem } from "./file-browser-context-menu";
import { getFileIcon, HiOutlineFolder as FolderIcon } from "./file-type-icon";
import { ShareFileButton } from "./share-file-dialog";
import { DeleteFileButton } from "./delete-file-button";
import { DeleteFolderButton } from "./delete-folder-button";
import { FolderPermissionsDialog } from "./folder-permissions-dialog";
import { MoveToFolderDialog } from "./move-to-folder-dialog";
import { AssignPolicyDialog } from "./assign-policy-dialog";
import { UploadProgressModal, type UploadProgressState } from "./upload-progress-modal";
import { uploadFileWithProgress } from "@/lib/upload-with-progress";

const VIEW_STORAGE_KEY = "filesharex-view-mode";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const malwareLabel: Record<string, string> = {
  PENDING: el.malwarePending,
  CLEAN: el.malwareClean,
  INFECTED: el.malwareInfected,
  FAILED: el.malwarePending,
};

const gdprLabel: Record<string, string> = {
  UNKNOWN: el.gdprUnknown,
  NO_PII_DETECTED: el.gdprNoPii,
  POSSIBLE_PII: el.gdprPossiblePii,
  CONFIRMED_PII: el.gdprConfirmedPii,
};

type FolderNode = { id: number; name: string; path: string; isDepartmentRoot: boolean; children: FolderNode[] };

function InlineRenameForm({
  fileId,
  fileName,
  onSuccess,
  onCancel,
}: {
  fileId: number;
  fileName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(fileName);
  const [pending, setPending] = useState(false);
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    const newName = ext && !name.toLowerCase().endsWith(ext.toLowerCase()) ? `${name}${ext}` : name;
    if (newName === fileName) {
      onCancel();
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Σφάλμα");
        return;
      }
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  const FileIcon = getFileIcon(fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : null, null);
  return (
    <form onSubmit={handleSubmit} className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <FileIcon className="h-4 w-4 shrink-0 text-[var(--foreground)]/80" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-36 rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2 py-0.5 text-[var(--foreground)]"
        style={{ fontSize: "var(--text-caption)" }}
        autoFocus
      />
      <button type="submit" disabled={pending} className="rounded-md bg-[var(--primary)] px-2 py-0.5 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50" style={{ fontSize: "var(--text-caption)" }}>OK</button>
      <button type="button" onClick={onCancel} className="rounded-md px-2 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-caption)" }}>{el.cancel}</button>
    </form>
  );
}

export function FileBrowserClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get("folderId");
  const currentFolderId = folderIdParam === "" || folderIdParam === "root" || folderIdParam === null
    ? null
    : (Number(folderIdParam) || null);

  const [tree, setTree] = useState<FolderNode[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid" | "compact">("list");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file?: FileItem; folder?: FolderItem } | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<number | null>(null);
  const [lastClickedIndex, setLastClickedIndex] = useState<{ type: "file" | "folder"; id: number } | null>(null);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const [permissionsDialogFolder, setPermissionsDialogFolder] = useState<{ folderId: number; folderName: string } | null>(null);
  const [moveDialogFile, setMoveDialogFile] = useState<{ fileId: number; fileName: string; fileFolderId: number } | null>(null);
  const [shareDialogFileId, setShareDialogFileId] = useState<number | null>(null);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [assignPolicyTarget, setAssignPolicyTarget] = useState<{ type: "file" | "folder"; id: number; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    open: false,
    currentFileName: "",
    currentIndex: 0,
    total: 0,
    progressPercent: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "grid" || stored === "compact" || stored === "list") setViewMode(stored);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw !== viewMode) localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const loadTree = useCallback(() => {
    fetch("/api/folders/tree")
      .then((r) => r.json())
      .then((data) => data.tree && setTree(data.tree))
      .catch(() => {});
  }, []);

  const loadContents = useCallback(() => {
    setLoading(true);
    const url = currentFolderId == null ? "/api/folders" : `/api/folders?folderId=${currentFolderId}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setFolders(data.folders ?? []);
        setFiles(data.files ?? []);
      })
      .catch(() => { setFolders([]); setFiles([]); })
      .finally(() => setLoading(false));
  }, [currentFolderId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const refresh = useCallback(() => {
    loadTree();
    loadContents();
    router.refresh();
  }, [loadTree, loadContents, router]);

  const uploadFiles = useCallback(
    async (files: File[], folderId: number) => {
      if (!files.length || folderId == null) return;
      setFeedback({});
      setUploadProgress({
        open: true,
        currentFileName: files[0]?.name ?? "",
        currentIndex: 0,
        total: files.length,
        progressPercent: 0,
      });
      let lastError: string | undefined;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((p) => ({ ...p, currentFileName: file.name, currentIndex: i, progressPercent: 0 }));
        const result = await uploadFileWithProgress(file, folderId, (loaded, total) => {
          setUploadProgress((p) => ({
            ...p,
            currentFileName: file.name,
            currentIndex: i,
            progressPercent: total > 0 ? Math.round((loaded / total) * 100) : 0,
          }));
        });
        if (!result.ok) {
          lastError = result.error;
          setUploadProgress((p) => ({ ...p, error: result.error, done: true }));
          break;
        }
      }
      setUploadProgress((p) => ({
        ...p,
        progressPercent: 100,
        currentIndex: files.length,
        done: true,
        error: lastError,
      }));
      if (!lastError) {
        setFeedback({ success: el.fileUploadedSuccess });
        refresh();
      }
    },
    [refresh]
  );

  const closeUploadModal = useCallback(() => {
    setUploadProgress((p) => ({ ...p, open: false }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFileIds(new Set(files.map((f) => f.id)));
    setSelectedFolderIds(new Set(folders.map((f) => f.id)));
  }, [files, folders]);

  const toggleFile = useCallback((id: number, addRange: boolean) => {
    if (addRange && lastClickedIndex?.type === "file") {
      const list = files.map((f) => f.id);
      const idx = list.indexOf(id);
      const lastIdx = list.indexOf(lastClickedIndex.id);
      if (idx !== -1 && lastIdx !== -1) {
        const [a, b] = idx < lastIdx ? [idx, lastIdx] : [lastIdx, idx];
        const range = list.slice(a, b + 1);
        setSelectedFileIds((prev) => new Set([...prev, ...range]));
        setSelectedFolderIds((prev) => new Set(prev));
        return;
      }
    }
    if (addRange) {
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setSelectedFolderIds((prev) => new Set(prev));
    } else {
      setSelectedFileIds(new Set([id]));
      setSelectedFolderIds(new Set());
    }
    setLastClickedIndex({ type: "file", id });
  }, [files, lastClickedIndex]);

  const toggleFolder = useCallback((id: number, addRange: boolean) => {
    if (addRange && lastClickedIndex?.type === "folder") {
      const list = folders.map((f) => f.id);
      const idx = list.indexOf(id);
      const lastIdx = list.indexOf(lastClickedIndex.id);
      if (idx !== -1 && lastIdx !== -1) {
        const [a, b] = idx < lastIdx ? [idx, lastIdx] : [lastIdx, idx];
        const range = list.slice(a, b + 1);
        setSelectedFolderIds((prev) => new Set([...prev, ...range]));
        setSelectedFileIds((prev) => new Set(prev));
        return;
      }
    }
    if (addRange) {
      setSelectedFolderIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setSelectedFileIds((prev) => new Set(prev));
    } else {
      setSelectedFolderIds(new Set([id]));
      setSelectedFileIds(new Set());
    }
    setLastClickedIndex({ type: "folder", id });
  }, [folders, lastClickedIndex]);

  const handleMoveFile = useCallback(async (fileId: number, targetFolderId: number) => {
    setFeedback({});
    const res = await fetch(`/api/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: targetFolderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFeedback({ error: data.error ?? "Σφάλμα" });
      return;
    }
    setFeedback({ success: "Μετακίνηση ολοκληρώθηκε." });
    refresh();
  }, [refresh]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "F2" && selectedFileIds.size === 1) {
      e.preventDefault();
      setEditingFileId([...selectedFileIds][0]);
      setContextMenu(null);
      return;
    }
    if (e.key === "Delete" && (selectedFileIds.size > 0 || selectedFolderIds.size > 0)) {
      e.preventDefault();
      if (selectedFileIds.size > 0) {
        const id = [...selectedFileIds][0];
        if (confirm(el.deleteFileConfirm)) {
          fetch(`/api/files/${id}`, { method: "DELETE" }).then(() => refresh());
        }
        return;
      }
      if (selectedFolderIds.size > 0) {
        const id = [...selectedFolderIds][0];
        const folder = folders.find((f) => f.id === id);
        if (folder && confirm(el.deleteFolderConfirm)) {
          fetch(`/api/folders/${id}`, { method: "DELETE" }).then(() => refresh());
        }
        return;
      }
    }
    if (e.key === "Escape") {
      clearSelection();
      setContextMenu(null);
      setEditingFileId(null);
    }
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      selectAll();
    }
  }, [selectedFileIds, selectedFolderIds, folders, clearSelection, selectAll, refresh]);

  const selectedFiles = useMemo(() => files.filter((f) => selectedFileIds.has(f.id)), [files, selectedFileIds]);
  const selectedFolders = useMemo(() => folders.filter((f) => selectedFolderIds.has(f.id)), [folders, selectedFolderIds]);

  /** Path from root to folder (array of { id, name }) for breadcrumb. */
  function pathToFolderBreadcrumb(nodes: FolderNode[], targetId: number, acc: { id: number; name: string }[] = []): { id: number; name: string }[] | null {
    for (const n of nodes) {
      if (n.id === targetId) return [...acc, { id: n.id, name: n.name }];
      const found = pathToFolderBreadcrumb(n.children, targetId, [...acc, { id: n.id, name: n.name }]);
      if (found) return found;
    }
    return null;
  }
  const breadcrumbPath = currentFolderId != null ? pathToFolderBreadcrumb(tree, currentFolderId) ?? [] : [];

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu) return [];
    if (contextMenu.file) {
      const file = contextMenu.file;
      const isMarkedPii = file.gdprRiskLevel === "CONFIRMED_PII";
      const deleteFile = () => {
        if (!confirm(el.deleteFileConfirm)) return;
        fetch(`/api/files/${file.id}`, { method: "DELETE" })
          .then(async (r) => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok) alert(data.error ?? el.deleteBlockedPersonalData);
            else refresh();
            setContextMenu(null);
          });
      };
      return [
        { id: "open", label: el.open, onClick: () => window.open(`/api/files/${file.id}/download`, "_blank") },
        { id: "download", label: el.download, onClick: () => window.open(`/api/files/${file.id}/download`, "_blank") },
        { id: "rename", label: el.renameFile, onClick: () => { setEditingFileId(file.id); setContextMenu(null); } },
        { id: "move", label: el.move, onClick: () => { setMoveDialogFile({ fileId: file.id, fileName: file.name, fileFolderId: currentFolderId ?? 0 }); setContextMenu(null); } },
        { id: "share", label: el.shareFile, onClick: () => { setShareDialogFileId(file.id); setContextMenu(null); } },
        { id: "assignPolicy", label: el.assignGdprPolicy, onClick: () => { setAssignPolicyTarget({ type: "file", id: file.id, name: file.name }); setContextMenu(null); } },
        ...(isMarkedPii
          ? [{ id: "personalDataUnmark", label: el.personalDataUnmark, onClick: () => fetch(`/api/files/${file.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gdprRiskLevel: "NO_PII_DETECTED" }) }).then(() => { refresh(); setContextMenu(null); }) }]
          : [{ id: "personalDataMark", label: el.personalDataMark, onClick: () => fetch(`/api/files/${file.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gdprRiskLevel: "CONFIRMED_PII" }) }).then(() => { refresh(); setContextMenu(null); }) }]),
        { id: "delete", label: el.deleteFile, onClick: deleteFile },
      ];
    }
    if (contextMenu.folder) {
      const folder = contextMenu.folder;
      const folderHasPii = folder.containsPersonalData === true;
      const deleteFolder = () => {
        if (!confirm(el.deleteFolderConfirm)) return;
        fetch(`/api/folders/${folder.id}`, { method: "DELETE" })
          .then(async (r) => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok) alert(data.error ?? el.deleteBlockedPersonalData);
            else refresh();
            setContextMenu(null);
          });
      };
      return [
        { id: "open", label: el.open, onClick: () => router.push(`/dashboard/files?folderId=${folder.id}`) },
        { id: "permissions", label: el.permissions, onClick: () => { setPermissionsDialogFolder({ folderId: folder.id, folderName: folder.name }); setContextMenu(null); } },
        { id: "assignPolicy", label: el.assignGdprPolicy, onClick: () => { setAssignPolicyTarget({ type: "folder", id: folder.id, name: folder.name }); setContextMenu(null); } },
        ...(folderHasPii
          ? [{ id: "personalDataUnmarkFolder", label: el.personalDataUnmarkFolder, onClick: () => fetch(`/api/folders/${folder.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ containsPersonalData: false }) }).then(() => { refresh(); setContextMenu(null); }) }]
          : [
              { id: "personalDataMarkFolder", label: el.personalDataMarkFolder, onClick: () => fetch(`/api/folders/${folder.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ containsPersonalData: true }) }).then(() => { refresh(); setContextMenu(null); }) },
              { id: "personalDataApplyToFiles", label: el.personalDataApplyToFiles, onClick: () => fetch(`/api/folders/${folder.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ containsPersonalData: true, applyToFiles: true }) }).then(() => { refresh(); setContextMenu(null); }) },
            ]),
        { id: "delete", label: el.deleteFolder, onClick: deleteFolder },
      ];
    }
    return [];
  }, [contextMenu, currentFolderId, refresh, router]);

  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="flex min-h-0 flex-1 gap-0" onKeyDown={handleKeyDown} tabIndex={0}>
      <FileBrowserSidebar
        currentFolderId={currentFolderId}
        onMoveFileToFolder={handleMoveFile}
        isDropTarget={dropTargetFolderId}
        onDropTargetChange={setDropTargetFolderId}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex flex-wrap items-center gap-1 border-b border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5" aria-label="Διαδρομή" style={{ fontSize: "var(--text-caption)" }}>
          <Link href="/dashboard/files" className="font-medium text-[var(--foreground)] transition hover:text-[var(--primary)]">
            {el.fileBrowserRoot}
          </Link>
          {breadcrumbPath.map((segment, i) => (
            <span key={segment.id} className="flex items-center gap-1">
              <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
              {i < breadcrumbPath.length - 1 ? (
                <Link href={`/dashboard/files?folderId=${segment.id}`} className="font-medium text-[var(--foreground)] transition hover:text-[var(--primary)] truncate max-w-[12rem]">
                  {segment.name}
                </Link>
              ) : (
                <span className="font-medium text-[var(--foreground)] truncate max-w-[16rem]" title={segment.name}>
                  {segment.name}
                </span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--outline)] bg-[var(--card)] px-3 py-2">
          <FileBrowserToolbar
            folderId={currentFolderId}
            onRefresh={refresh}
            onUploadRequest={
              currentFolderId != null
                ? (files) => uploadFiles(files, currentFolderId)
                : undefined
            }
          />
          <div className="ml-auto flex items-center gap-0.5 rounded-md border border-[var(--outline)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded p-1 transition ${viewMode === "list" ? "bg-[var(--primary)]/15 text-[var(--primary)] [&_svg]:text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] [&_svg]:text-current"}`}
              title={el.viewList}
            >
              <HiOutlineViewColumns className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-1 transition ${viewMode === "grid" ? "bg-[var(--primary)]/15 text-[var(--primary)] [&_svg]:text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] [&_svg]:text-current"}`}
              title={el.viewGrid}
            >
              <HiOutlineSquares2X2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`rounded p-1 transition ${viewMode === "compact" ? "bg-[var(--primary)]/15 text-[var(--primary)] [&_svg]:text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] [&_svg]:text-current"}`}
              title={el.viewCompact}
            >
              <HiOutlineBars3 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {currentFolderId !== null && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2 py-1.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)] [&_svg]:text-[var(--foreground)]/80" style={{ fontSize: "var(--text-caption)" }}>
              <HiOutlineFolder className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {el.uploadFolder}
              <input
                type="file"
                className="hidden"
                multiple
                // @ts-expect-error - webkitdirectory is a non-standard DOM attribute for folder upload
                webkitdirectory=""
                onChange={async (e) => {
                  const fileList = e.target.files;
                  if (!fileList?.length || currentFolderId == null) return;
                  await uploadFiles(Array.from(fileList), currentFolderId);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {feedback.error && <div className="border-b border-[var(--outline)] bg-red-500/10 px-3 py-1.5 text-red-500 dark:text-red-400" style={{ fontSize: "var(--text-caption)" }} role="alert">{feedback.error}</div>}
        {feedback.success && <div className="border-b border-[var(--outline)] bg-emerald-500/10 px-3 py-1.5 text-emerald-600 dark:text-emerald-400" style={{ fontSize: "var(--text-caption)" }} role="status">{feedback.success}</div>}

        <div
          className="flex min-h-0 flex-1 overflow-auto bg-[var(--background)]"
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files") && currentFolderId != null) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
          onDrop={async (e) => {
            if (currentFolderId == null) return;
            const fileList = e.dataTransfer.files;
            if (!fileList?.length) return;
            e.preventDefault();
            await uploadFiles(Array.from(fileList), currentFolderId);
          }}
        >
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--outline)] border-t-[var(--primary)]" aria-hidden />
              Φόρτωση…
            </div>
          ) : isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--primary)]/80 [&_svg]:text-[var(--primary)]/80">
                <FolderIcon className="h-7 w-7" aria-hidden />
              </div>
              <p className="font-semibold text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                {currentFolderId === null ? el.emptyRootHint : el.emptyFolder}
              </p>
              <p className="max-w-sm text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {currentFolderId === null ? el.emptyRootHint : el.emptyFolderCta}
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left" style={{ fontSize: "var(--text-caption)" }}>
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-[var(--outline)] bg-[var(--muted)]/50">
                    <th className="w-8 px-2 py-1"><input type="checkbox" checked={folders.length + files.length > 0 && selectedFileIds.size + selectedFolderIds.size === folders.length + files.length} onChange={(e) => e.target.checked ? selectAll() : clearSelection()} aria-label={el.selectAll} className="rounded border-[var(--outline)]" /></th>
                    <th className="px-2 py-1 font-medium text-[var(--foreground)] md:px-3">{el.name}</th>
                    <th className="px-2 py-1 font-medium text-[var(--foreground)] md:px-3">{el.type}</th>
                    <th className="px-2 py-1 font-medium text-[var(--foreground)] md:px-3">{el.size}</th>
                    <th className="px-2 py-1 font-medium text-[var(--foreground)] md:px-3">{el.modified}</th>
                    <th className="px-2 py-1 font-medium text-[var(--foreground)] md:px-3">{el.statusSecurity}</th>
                    <th className="px-2 py-1 font-medium text-[var(--foreground)] md:px-3">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((f) => (
                    <tr
                      key={f.id}
                      className={`border-b border-[var(--outline)]/70 transition hover:bg-[var(--muted)]/30 ${selectedFolderIds.has(f.id) ? "bg-[var(--primary)]/10" : ""}`}
                      onClick={(e) => toggleFolder(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, folder: f }); }}
                    >
                      <td className="w-8 px-2 py-1" onClick={(ev) => ev.stopPropagation()}><input type="checkbox" checked={selectedFolderIds.has(f.id)} onChange={() => toggleFolder(f.id, true)} className="rounded border-[var(--outline)]" /></td>
                      <td className="px-2 py-1 md:px-3">
                        <Link href={`/dashboard/files?folderId=${f.id}`} className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] transition hover:text-[var(--primary)] [&_svg]:text-[var(--primary)]/90" onClick={(e) => e.stopPropagation()}>
                          <HiOutlineFolder className="h-4 w-4 shrink-0" aria-hidden />
                          {f.name}
                        </Link>
                      </td>
                      <td className="px-2 py-1 text-[var(--muted-foreground)] md:px-3">{el.folder}</td>
                      <td className="px-2 py-1 text-[var(--muted-foreground)] md:px-3">—</td>
                      <td className="px-2 py-1 text-[var(--muted-foreground)] md:px-3">{new Date(f.createdAt).toLocaleDateString("el-GR")}</td>
                      <td className="px-2 py-1 text-[var(--muted-foreground)] md:px-3">—</td>
                      <td className="px-2 py-1 md:px-3 flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setPermissionsDialogFolder({ folderId: f.id, folderName: f.name })} className="rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-caption)" }}>{el.permissions}</button>
                        <DeleteFolderButton folderId={f.id} folderName={f.name} onSuccess={refresh} />
                      </td>
                    </tr>
                  ))}
                  {files.map((f) => {
                    const FileIcon = getFileIcon(f.extension, f.mimeType);
                    return (
                      <tr
                        key={f.id}
                        className={`border-b border-[var(--outline)]/70 transition hover:bg-[var(--muted)]/30 ${selectedFileIds.has(f.id) ? "bg-[var(--primary)]/10" : ""}`}
                        onClick={(e) => toggleFile(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }); }}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("application/filesharex-file-id", String(f.id)); e.dataTransfer.effectAllowed = "move"; }}
                      >
                        <td className="w-8 px-2 py-1" onClick={(ev) => ev.stopPropagation()}><input type="checkbox" checked={selectedFileIds.has(f.id)} onChange={() => toggleFile(f.id, true)} className="rounded border-[var(--outline)]" /></td>
                        <td className="px-2 py-1 md:px-3">
                          {editingFileId === f.id ? (
                            <InlineRenameForm fileId={f.id} fileName={f.name} onSuccess={() => { refresh(); setEditingFileId(null); }} onCancel={() => setEditingFileId(null)} />
                          ) : (
                            <Link href={`/api/files/${f.id}/download`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] transition hover:text-[var(--primary)] [&_svg]:text-[var(--foreground)]/80" onClick={(e) => e.stopPropagation()}>
                              <FileIcon className="h-4 w-4 shrink-0" aria-hidden />
                              {f.name}
                            </Link>
                          )}
                        </td>
                        <td className="px-2 py-1 text-[var(--muted-foreground)] md:px-3">{el.file}{f.extension ? ` (${f.extension})` : ""}</td>
                        <td className="px-2 py-1 text-[var(--muted-foreground)] md:px-3">{formatBytes(f.sizeBytes)}</td>
                        <td className="px-2 py-1 text-[var(--muted-foreground)] md:px-3">{new Date(f.uploadedAt).toLocaleDateString("el-GR")}</td>
                        <td className="px-2 py-1 md:px-3 flex flex-wrap gap-0.5">
                          <span className="rounded bg-[var(--muted)] px-1 py-0.5 text-[var(--foreground)]">{malwareLabel[f.malwareStatus] ?? f.malwareStatus}</span>
                          <span className="rounded bg-[var(--muted)] px-1 py-0.5 text-[var(--foreground)]">{gdprLabel[f.gdprRiskLevel] ?? f.gdprRiskLevel}</span>
                        </td>
                        <td className="px-2 py-1 md:px-3 flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => setEditingFileId(f.id)} className="rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-caption)" }}>{el.renameFile}</button>
                          <button type="button" onClick={() => setMoveDialogFile({ fileId: f.id, fileName: f.name, fileFolderId: currentFolderId ?? 0 })} className="rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-caption)" }}>{el.move}</button>
                          <ShareFileButton fileId={f.id} fileName={f.name} onSuccess={refresh} />
                          <DeleteFileButton fileId={f.id} fileName={f.name} onSuccess={refresh} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className={`flex flex-col items-center rounded-lg border border-[var(--outline)] bg-[var(--card)] p-2 transition hover:border-[var(--primary)]/30 ${selectedFolderIds.has(f.id) ? "ring-2 ring-[var(--primary)] bg-[var(--primary)]/10" : ""}`}
                  onClick={(e) => toggleFolder(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, folder: f }); }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] [&_svg]:text-[var(--primary)]">
                    <HiOutlineFolder className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="mt-1 w-full truncate text-center font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>{f.name}</span>
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/dashboard/files?folderId=${f.id}`} className="rounded px-1.5 py-0.5 font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/10" style={{ fontSize: "var(--text-caption)" }}>{el.open}</Link>
                    <button type="button" onClick={() => setPermissionsDialogFolder({ folderId: f.id, folderName: f.name })} className="rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-caption)" }}>{el.permissions}</button>
                  </div>
                </div>
              ))}
              {files.map((f) => {
                const FileIcon = getFileIcon(f.extension, f.mimeType);
                return (
                  <div
                    key={f.id}
                    className={`flex flex-col items-center rounded-lg border border-[var(--outline)] bg-[var(--card)] p-2 transition hover:border-[var(--primary)]/30 ${selectedFileIds.has(f.id) ? "ring-2 ring-[var(--primary)] bg-[var(--primary)]/10" : ""}`}
                    onClick={(e) => toggleFile(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }); }}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("application/filesharex-file-id", String(f.id)); e.dataTransfer.effectAllowed = "move"; }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] [&_svg]:text-[var(--primary)]">
                      <FileIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <span className="mt-1 w-full truncate text-center font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>{f.name}</span>
                    <span className="mt-0.5 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{formatBytes(f.sizeBytes)}</span>
                    <div className="mt-1 flex flex-wrap justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <a href={`/api/files/${f.id}/download`} target="_blank" rel="noopener noreferrer" className="rounded px-1.5 py-0.5 font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/10" style={{ fontSize: "var(--text-caption)" }}>{el.download}</a>
                      <button type="button" onClick={() => setMoveDialogFile({ fileId: f.id, fileName: f.name, fileFolderId: currentFolderId ?? 0 })} className="rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-caption)" }}>{el.move}</button>
                      <ShareFileButton fileId={f.id} fileName={f.name} onSuccess={refresh} />
                      <DeleteFileButton fileId={f.id} fileName={f.name} onSuccess={refresh} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--outline)]/70">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-2 px-3 py-1 transition hover:bg-[var(--muted)]/30 ${selectedFolderIds.has(f.id) ? "bg-[var(--primary)]/10" : ""}`}
                  onClick={(e) => toggleFolder(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, folder: f }); }}
                >
                  <input type="checkbox" checked={selectedFolderIds.has(f.id)} onChange={() => toggleFolder(f.id, true)} onClick={(e) => e.stopPropagation()} className="rounded border-[var(--outline)]" />
                  <HiOutlineFolder className="h-4 w-4 shrink-0 text-[var(--primary)]/90" aria-hidden />
                  <Link href={`/dashboard/files?folderId=${f.id}`} className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)] hover:text-[var(--primary)]" onClick={(e) => e.stopPropagation()} style={{ fontSize: "var(--text-caption)" }}>{f.name}</Link>
                  <span className="text-[var(--muted-foreground)] shrink-0" style={{ fontSize: "var(--text-caption)" }}>{el.folder}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setPermissionsDialogFolder({ folderId: f.id, folderName: f.name }); }} className="rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] shrink-0" style={{ fontSize: "var(--text-caption)" }}>{el.permissions}</button>
                  <DeleteFolderButton folderId={f.id} folderName={f.name} onSuccess={refresh} />
                </div>
              ))}
              {files.map((f) => {
                const FileIcon = getFileIcon(f.extension, f.mimeType);
                return (
                  <div
                    key={f.id}
                    className={`flex items-center gap-2 px-3 py-1 transition hover:bg-[var(--muted)]/30 ${selectedFileIds.has(f.id) ? "bg-[var(--primary)]/10" : ""}`}
                    onClick={(e) => toggleFile(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }); }}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("application/filesharex-file-id", String(f.id)); e.dataTransfer.effectAllowed = "move"; }}
                  >
                    <input type="checkbox" checked={selectedFileIds.has(f.id)} onChange={() => toggleFile(f.id, true)} onClick={(e) => e.stopPropagation()} className="rounded border-[var(--outline)]" />
                    <FileIcon className="h-4 w-4 shrink-0 text-[var(--foreground)]/80" aria-hidden />
                    <a href={`/api/files/${f.id}/download`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)] hover:text-[var(--primary)]" onClick={(e) => e.stopPropagation()} style={{ fontSize: "var(--text-caption)" }}>{f.name}</a>
                    <span className="text-[var(--muted-foreground)] shrink-0" style={{ fontSize: "var(--text-caption)" }}>{formatBytes(f.sizeBytes)}</span>
                    <button type="button" onClick={() => setMoveDialogFile({ fileId: f.id, fileName: f.name, fileFolderId: currentFolderId ?? 0 })} className="rounded px-1.5 py-0.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] shrink-0" style={{ fontSize: "var(--text-caption)" }}>{el.move}</button>
                    <ShareFileButton fileId={f.id} fileName={f.name} onSuccess={refresh} />
                    <DeleteFileButton fileId={f.id} fileName={f.name} onSuccess={refresh} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FileBrowserDetailsPane
        selectedFiles={selectedFiles}
        selectedFolders={selectedFolders}
        onClearSelection={clearSelection}
      />

      {contextMenu && contextMenuItems.length > 0 && (
        <FileBrowserContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {permissionsDialogFolder && (
        <FolderPermissionsDialog
          folderId={permissionsDialogFolder.folderId}
          folderName={permissionsDialogFolder.folderName}
          open
          onClose={() => setPermissionsDialogFolder(null)}
          onSuccess={refresh}
        />
      )}

      {moveDialogFile && (
        <MoveToFolderDialog
          fileId={moveDialogFile.fileId}
          fileName={moveDialogFile.fileName}
          fileFolderId={moveDialogFile.fileFolderId}
          open
          onClose={() => setMoveDialogFile(null)}
          onSuccess={refresh}
        />
      )}

      {assignPolicyTarget && (
        <AssignPolicyDialog
          targetType={assignPolicyTarget.type}
          targetId={assignPolicyTarget.id}
          targetName={assignPolicyTarget.name}
          open
          onClose={() => setAssignPolicyTarget(null)}
          onSuccess={refresh}
        />
      )}

      {shareDialogFileId != null && (() => {
        const file = files.find((f) => f.id === shareDialogFileId);
        if (!file) return null;
        return (
          <ShareFileButton
            fileId={file.id}
            fileName={file.name}
            open
            onOpenChange={(open) => !open && setShareDialogFileId(null)}
            onSuccess={() => { refresh(); setShareDialogFileId(null); }}
          />
        );
      })()}

      <UploadProgressModal state={uploadProgress} onClose={closeUploadModal} />
    </div>
  );
}
