"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

type Props = { fileId: number; fileName: string; onSuccess?: () => void };

export function RenameFileButton({ fileId, fileName, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fileName);
  const [error, setError] = useState<string | null>(null);

  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = value.trim();
    if (!name) return;
    const newName = ext && !name.toLowerCase().endsWith(ext.toLowerCase()) ? `${name}${ext}` : name;
    if (newName === fileName) {
      setEditing(false);
      return;
    }
    const res = await fetch(`/api/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Σφάλμα");
      return;
    }
    setEditing(false);
    setValue(newName);
    startTransition(() => router.refresh());
    onSuccess?.();
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="inline-flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 rounded border border-zinc-300 px-2 py-0.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          autoFocus
        />
        <button type="submit" disabled={isPending} className="rounded px-2 py-0.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
          OK
        </button>
        <button type="button" onClick={() => { setEditing(false); setValue(fileName); setError(null); }} className="rounded px-2 py-0.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
          {el.cancel}
        </button>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={isPending}
      className="rounded px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
    >
      {el.renameFile}
    </button>
  );
}
