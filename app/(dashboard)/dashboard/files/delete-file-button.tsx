"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

type Props = { fileId: number; fileName: string; onSuccess?: () => void };

export function DeleteFileButton({ fileId, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(el.deleteFileConfirm)) return;
    setError(null);
    const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Σφάλμα");
      return;
    }
    startTransition(() => router.refresh());
    onSuccess?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded px-2 py-1 font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
        style={{ fontSize: "var(--text-caption)" }}
      >
        {isPending ? "…" : el.deleteFile}
      </button>
      {error && (
        <span className="ml-1 text-red-500" style={{ fontSize: "var(--text-caption)" }} role="alert">
          {error}
        </span>
      )}
    </>
  );
}
