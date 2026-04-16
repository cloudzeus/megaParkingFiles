"use client";

import { el } from "@/lib/i18n";
import { HiOutlineXMark } from "react-icons/hi2";

export type UploadProgressState = {
  open: boolean;
  currentFileName: string;
  currentIndex: number;
  total: number;
  progressPercent: number;
  error?: string;
  done?: boolean;
};

type Props = {
  state: UploadProgressState;
  onClose: () => void;
};

export function UploadProgressModal({ state, onClose }: Props) {
  if (!state.open) return null;

  const isDone = state.done ?? (state.total > 0 && state.currentIndex >= state.total);
  const hasError = !!state.error;
  const displayProgress = hasError ? 0 : (isDone ? 100 : state.progressPercent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-progress-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 id="upload-progress-title" className="font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {el.uploadProgressTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label={el.uploadProgressClose}
          >
            <HiOutlineXMark className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {state.total > 1 && (
          <p className="mt-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
            {el.uploadProgressFile} {state.currentIndex + 1} {el.uploadProgressOf} {state.total}
          </p>
        )}

        <p className="mt-1 truncate font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }} title={state.currentFileName}>
          {state.currentFileName || "—"}
        </p>

        {hasError && (
          <p className="mt-2 text-red-500 dark:text-red-400" style={{ fontSize: "var(--text-caption)" }} role="alert">
            {state.error}
          </p>
        )}

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-200 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, displayProgress))}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
            {isDone && !hasError ? el.uploadProgressComplete : `${Math.round(displayProgress)}%`}
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90"
            style={{ fontSize: "var(--text-body2)" }}
          >
            {el.uploadProgressClose}
          </button>
        </div>
      </div>
    </div>
  );
}
