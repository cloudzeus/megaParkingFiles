"use client";

import { el } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { HiOutlineCircleStack, HiOutlinePlay, HiOutlineStop } from "react-icons/hi2";

type DbBackupRow = {
  id: number;
  filename: string;
  bunnyStoragePath: string;
  sizeBytes: number;
  status: string;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function statusLabel(s: string): string {
  if (s === "RUNNING") return el.dbBackupStatusRunning;
  if (s === "COMPLETED") return el.dbBackupStatusCompleted;
  if (s === "FAILED") return el.dbBackupStatusFailed;
  return s;
}

export function DbBackupsClient() {
  const [backups, setBackups] = useState<DbBackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [progressModalId, setProgressModalId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db-backups");
      if (!res.ok) return;
      const data = await res.json();
      setBackups(data.backups ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadSilent() {
    const res = await fetch("/api/admin/db-backups");
    if (!res.ok) return;
    const data = await res.json();
    setBackups(data.backups ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const hasRunning = backups.some((b) => b.status === "RUNNING");
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => loadSilent(), 3000);
    return () => clearInterval(interval);
  }, [hasRunning]);

  const progressBackup = progressModalId != null ? backups.find((b) => b.id === progressModalId) : null;
  useEffect(() => {
    if (progressModalId != null && progressBackup?.status === "RUNNING") {
      const t = setInterval(() => loadSilent(), 2000);
      return () => clearInterval(t);
    }
  }, [progressModalId, progressBackup?.status]);

  async function handleTrigger() {
    setTriggering(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/admin/db-backup", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setSuccessMessage(data.message ?? "Backup started.");
      if (data.id != null) setProgressModalId(data.id);
      await load();
    } finally {
      setTriggering(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm(el.dbBackupStopConfirm)) return;
    setCancellingId(id);
    try {
      const res = await fetch("/api/admin/db-backup/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Σφάλμα");
      await load();
      if (progressModalId === id) setProgressModalId(null);
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
        …
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
          {el.dbBackupsCronHint}
        </p>
        <button
          type="button"
          onClick={handleTrigger}
          disabled={triggering}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
          style={{ fontSize: "var(--text-body2)" }}
        >
          <HiOutlinePlay className="h-5 w-5 shrink-0" aria-hidden />
          {triggering ? el.dbBackupsTriggering : el.dbBackupsTrigger}
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-red-600 dark:text-red-400" style={{ fontSize: "var(--text-body2)" }}>
          {error}
        </p>
      )}
      {successMessage && (
        <p className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-2 text-green-700 dark:text-green-400" style={{ fontSize: "var(--text-body2)" }}>
          {successMessage}
        </p>
      )}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        {backups.length === 0 ? (
          <div className="p-8 text-center">
            <HiOutlineCircleStack className="mx-auto h-10 w-10 text-[var(--primary)]/80" aria-hidden />
            <p className="mt-3 font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
              {el.dbBackupsEmpty}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
              <thead>
                <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.dbBackupStartedAt}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.dbBackupCompletedAt}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.dbBackupSize}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.dbBackupPath}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Status</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.dbBackupError}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 w-24">{el.dbBackupStop}</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--outline)] hover:bg-[var(--muted)]/30">
                    <td className="px-4 py-3 text-[var(--foreground)] md:px-6">
                      {new Date(b.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {b.completedAt ? new Date(b.completedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {formatBytes(b.sizeBytes)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-[var(--muted-foreground)] md:px-6" title={b.bunnyStoragePath}>
                      {b.bunnyStoragePath}
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-sm ${
                          b.status === "COMPLETED"
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : b.status === "FAILED"
                              ? "bg-red-500/20 text-red-700 dark:text-red-400"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {statusLabel(b.status)}
                      </span>
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-[var(--muted-foreground)] md:px-6" title={b.errorMessage ?? ""}>
                      {b.errorMessage ?? "—"}
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      {b.status === "RUNNING" && (
                        <button
                          type="button"
                          onClick={() => handleCancel(b.id)}
                          disabled={cancellingId === b.id}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                          style={{ fontSize: "var(--text-caption)" }}
                          title={el.dbBackupStop}
                        >
                          <HiOutlineStop className="h-4 w-4 shrink-0" aria-hidden />
                          {el.dbBackupStop}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {progressModalId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="backup-progress-title">
          <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6 shadow-xl">
            <h2 id="backup-progress-title" className="mb-4 font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
              {el.dbBackupProgressTitle}
            </h2>
            {progressBackup == null ? (
              <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>Φόρτωση…</p>
            ) : progressBackup.status === "RUNNING" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" aria-hidden />
                  <span className="text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>{el.dbBackupProgressRunning}</span>
                </div>
                <p className="text-[var(--muted-foreground)] truncate" style={{ fontSize: "var(--text-caption)" }} title={progressBackup.bunnyStoragePath}>{progressBackup.bunnyStoragePath}</p>
                <div className="flex justify-end">
                  <button type="button" onClick={() => handleCancel(progressBackup.id)} disabled={cancellingId === progressBackup.id} className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 font-medium text-red-600 transition hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400" style={{ fontSize: "var(--text-body2)" }}>
                    <HiOutlineStop className="h-5 w-5 shrink-0" aria-hidden />
                    {el.dbBackupStop}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className={progressBackup.status === "COMPLETED" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} style={{ fontSize: "var(--text-body2)" }}>
                  {progressBackup.status === "COMPLETED" ? el.dbBackupProgressCompleted : el.dbBackupProgressFailed}
                  {progressBackup.status === "COMPLETED" && ` ${formatBytes(progressBackup.sizeBytes)}`}
                  {progressBackup.status === "FAILED" && progressBackup.errorMessage ? ` — ${progressBackup.errorMessage}` : ""}
                </p>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setProgressModalId(null)} className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90" style={{ fontSize: "var(--text-body2)" }}>{el.dbBackupProgressClose}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
