"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useTransition, useState, useCallback, useEffect } from "react";
import { HiOutlineClock } from "react-icons/hi2";

type ShareRow = {
  id: number;
  fileId: number;
  fileName: string;
  expiresAt: string | null;
  remainingDownloads: number | null;
  maxDownloads: number | null;
  createdAt: string;
  downloadCount: number;
  lastDownloadedAt: string | null;
};

type Props = { shares: ShareRow[] };

type AccessRow = {
  id: number;
  accessedAt: string;
  download: boolean;
  success: boolean;
  reason: string;
  ipAddress: string | null;
  userAgent: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MySharesTable({ shares }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyShareId, setHistoryShareId] = useState<number | null>(null);
  const [historyFileName, setHistoryFileName] = useState<string>("");
  const [accesses, setAccesses] = useState<AccessRow[]>([]);
  const [accessesLoading, setAccessesLoading] = useState(false);

  const loadAccesses = useCallback((shareId: number) => {
    setAccessesLoading(true);
    fetch(`/api/shares/${shareId}/accesses`)
      .then((r) => r.json())
      .then((data) => {
        setAccesses(data.accesses ?? []);
      })
      .catch(() => setAccesses([]))
      .finally(() => setAccessesLoading(false));
  }, []);

  useEffect(() => {
    if (historyShareId != null) loadAccesses(historyShareId);
  }, [historyShareId, loadAccesses]);

  async function revokeShare(id: number) {
    if (!confirm(el.revokeShareConfirm)) return;
    setError(null);
    setRevokingId(id);
    try {
      const res = await fetch(`/api/shares/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRevoked: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <>
      {error && (
        <div className="border-b border-[var(--outline)] bg-red-500/10 px-4 py-2 text-red-400 md:px-6" style={{ fontSize: "var(--text-body2)" }} role="alert">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
          <thead>
            <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.mySharesFile}</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.mySharesExpires}</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.mySharesRemaining}</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.mySharesDownloaded}</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.mySharesLastDownload}</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.mySharesCreated}</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6" />
            </tr>
          </thead>
          <tbody>
            {shares.map((s) => (
              <tr key={s.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{s.fileName}</td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{formatDate(s.expiresAt)}</td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                  {s.remainingDownloads != null
                    ? `${s.remainingDownloads}${s.maxDownloads != null ? ` / ${s.maxDownloads}` : ""}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{s.downloadCount}</td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                  {s.lastDownloadedAt ? formatDate(s.lastDownloadedAt) : el.shareNotDownloadedYet}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{formatDate(s.createdAt)}</td>
                <td className="px-4 py-3 md:px-6 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryShareId(s.id);
                      setHistoryFileName(s.fileName);
                    }}
                    className="inline-flex items-center gap-1.5 rounded px-2 py-1 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] [&_svg]:text-current"
                    style={{ fontSize: "var(--text-caption)" }}
                  >
                    <HiOutlineClock className="h-4 w-4 shrink-0" aria-hidden />
                    {el.shareAccessHistory}
                  </button>
                  <button
                    type="button"
                    onClick={() => revokeShare(s.id)}
                    disabled={revokingId === s.id || isPending}
                    className="rounded px-2 py-1 font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {revokingId === s.id ? "…" : el.revokeShare}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historyShareId != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-history-title"
        >
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--outline)] px-4 py-3">
              <h2 id="share-history-title" className="font-semibold text-[var(--foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                {el.shareAccessHistory} – {historyFileName}
              </h2>
              <button
                type="button"
                onClick={() => { setHistoryShareId(null); setHistoryFileName(""); }}
                className="rounded px-2 py-1 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
              >
                {el.cancel}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {accessesLoading ? (
                <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>Φόρτωση…</p>
              ) : accesses.length === 0 ? (
                <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>{el.shareNotDownloadedYet}</p>
              ) : (
                <table className="w-full text-left" style={{ fontSize: "var(--text-caption)" }}>
                  <thead>
                    <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                      <th className="px-3 py-2 font-medium text-[var(--foreground)]">{el.shareAccessAt}</th>
                      <th className="px-3 py-2 font-medium text-[var(--foreground)]">{el.shareAccessDownload}</th>
                      <th className="px-3 py-2 font-medium text-[var(--foreground)]">{el.shareAccessSuccess}</th>
                      <th className="px-3 py-2 font-medium text-[var(--foreground)]">{el.shareAccessIp}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accesses.map((a) => (
                      <tr key={a.id} className="border-b border-[var(--outline)]/70">
                        <td className="px-3 py-2 text-[var(--muted-foreground)]">{formatDate(a.accessedAt)}</td>
                        <td className="px-3 py-2">{a.download ? "Ναι" : "—"}</td>
                        <td className="px-3 py-2">{a.success ? "Ναι" : "Όχι"}</td>
                        <td className="px-3 py-2 text-[var(--muted-foreground)]">{a.ipAddress ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
