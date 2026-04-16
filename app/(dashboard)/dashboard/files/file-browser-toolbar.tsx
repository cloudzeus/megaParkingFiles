"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { HiOutlineFolderPlus, HiOutlineArrowUpTray, HiOutlineArchiveBox, HiOutlineDocumentArrowUp } from "react-icons/hi2";

type Props = { folderId: number | null; onRefresh?: () => void; onUploadRequest?: (files: File[]) => void };

export function FileBrowserToolbar({ folderId, onRefresh, onUploadRequest }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = () => {
    startTransition(() => router.refresh());
    onRefresh?.();
  };
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function clearFeedback() {
    setError(null);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    const name = newFolderName.trim();
    if (!name) return;
    const res = await fetch("/api/folders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentFolderId: folderId, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Σφάλμα");
      return;
    }
    setNewFolderName("");
    setShowNewFolder(false);
    setSuccess(el.folderCreatedSuccess);
    refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length || folderId === null) return;
    e.target.value = "";
    clearFeedback();
    setError(null);
    if (onUploadRequest) {
      onUploadRequest(Array.from(fileList));
      return;
    }
    const file = fileList[0];
    const form = new FormData();
    form.set("file", file);
    form.set("folderId", String(folderId));
    const res = await fetch("/api/files/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Σφάλμα μεταφόρτωσης");
      return;
    }
    setSuccess(el.fileUploadedSuccess);
    refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setShowNewFolder((v) => !v)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50 [&_svg]:text-[var(--on-primary)]"
        style={{ fontSize: "var(--text-caption)" }}
      >
        <HiOutlineFolderPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {el.newFolder}
      </button>
      {showNewFolder && (
        <form onSubmit={createFolder} className="flex items-center gap-1.5">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={el.name}
            className="rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2 py-1.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            style={{ fontSize: "var(--text-caption)" }}
            autoFocus
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[var(--primary)] px-2 py-1.5 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: "var(--text-caption)" }}
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewFolder(false);
              setNewFolderName("");
              setError(null);
            }}
            className="rounded-md px-2 py-1.5 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
            style={{ fontSize: "var(--text-caption)" }}
          >
            {el.cancel}
          </button>
        </form>
      )}
      {folderId !== null && (
        <>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50 [&_svg]:text-[var(--foreground)]/80" style={{ fontSize: "var(--text-caption)" }}>
            <HiOutlineArrowUpTray className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {el.uploadFile}
            <input type="file" className="hidden" onChange={upload} disabled={isPending} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50 [&_svg]:text-[var(--foreground)]/80" style={{ fontSize: "var(--text-caption)" }}>
            <HiOutlineDocumentArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {el.uploadFiles}
            <input type="file" className="hidden" multiple onChange={upload} disabled={isPending} />
          </label>
          <a
            href={`/api/folders/${folderId}/download-zip`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)] [&_svg]:text-[var(--foreground)]/80"
            style={{ fontSize: "var(--text-caption)" }}
            download
          >
            <HiOutlineArchiveBox className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {el.downloadAsZip}
          </a>
        </>
      )}
      {success && (
        <p className="rounded-md bg-emerald-500/10 px-2 py-1.5 text-emerald-600 dark:text-emerald-400" style={{ fontSize: "var(--text-caption)" }} role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-500/10 px-2 py-1.5 text-red-500 dark:text-red-400" style={{ fontSize: "var(--text-caption)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
