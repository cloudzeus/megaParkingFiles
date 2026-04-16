"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  fileId: number;
  fileName: string;
  onSuccess?: () => void;
  /** Controlled: when set, dialog open state is controlled by parent */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ShareFileButton({ fileId, fileName, onSuccess, open: controlledOpen, onOpenChange }: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? ((v: boolean) => { setInternalOpen(v); });
  const [recipientEmail, setRecipientEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ otp: string; otpSentTo: string | null; shareId: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim() || undefined,
          expiresInHours: Math.min(Math.max(expiresInHours, 1), 720),
          maxDownloads: maxDownloads.trim() ? Math.max(0, parseInt(maxDownloads, 10)) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setResult({ otp: data.otp ?? "", otpSentTo: data.otpSentTo ?? null, shareId: data.shareId ?? 0 });
      router.refresh();
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  function closeDialog() {
    setOpen(false);
    setError(null);
    setResult(null);
    setRecipientEmail("");
    setExpiresInHours(24);
    setMaxDownloads("");
  }

  function copyOtp() {
    if (result?.otp && typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(result.otp);
    }
  }

  function copyShareLink() {
    if (result?.shareId && typeof navigator?.clipboard?.writeText === "function") {
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${result.shareId}`;
      navigator.clipboard.writeText(url);
    }
  }

  return (
    <>
      {controlledOpen === undefined && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded px-2 py-1 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          style={{ fontSize: "var(--text-caption)" }}
        >
          {el.shareFile}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-xl">
            <div className="border-b border-[var(--outline)] px-4 py-3">
              <h2 id="share-dialog-title" className="font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                {el.shareDialogTitle}
              </h2>
              <p className="mt-1 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>{fileName}</p>
            </div>

            {!result ? (
              <form onSubmit={handleSubmit} className="space-y-4 p-4">
                <div>
                  <label htmlFor="share-email" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    {el.shareRecipientEmail}
                  </label>
                  <input
                    id="share-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="email@παράδειγμα.gr"
                    className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    style={{ fontSize: "var(--text-body2)" }}
                  />
                </div>
                <div>
                  <label htmlFor="share-expires" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    {el.shareExpiresHours}
                  </label>
                  <input
                    id="share-expires"
                    type="number"
                    min={1}
                    max={720}
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(Number(e.target.value) || 24)}
                    className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                    style={{ fontSize: "var(--text-body2)" }}
                  />
                </div>
                <div>
                  <label htmlFor="share-max-dl" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    {el.shareMaxDownloads}
                  </label>
                  <input
                    id="share-max-dl"
                    type="number"
                    min={0}
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    style={{ fontSize: "var(--text-body2)" }}
                  />
                </div>
                {error && <p className="text-red-500" style={{ fontSize: "var(--text-body2)" }}>{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg px-4 py-2 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
                    style={{ fontSize: "var(--text-body2)" }}
                  >
                    {el.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
                    style={{ fontSize: "var(--text-body2)" }}
                  >
                    {loading ? el.shareCreating : el.shareCreate}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 p-4">
                <p className="text-emerald-500 dark:text-emerald-400" style={{ fontSize: "var(--text-body2)" }}>{el.shareSuccess}</p>
                {result.otpSentTo && (
                  <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>{el.shareOtpSent}</p>
                )}
                {result.shareId > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                      {el.shareLinkLabel}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 break-all rounded bg-[var(--muted)] px-2 py-2 text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                        {typeof window !== "undefined" ? `${window.location.origin}/share/${result.shareId}` : `/share/${result.shareId}`}
                      </code>
                      <button
                        type="button"
                        onClick={copyShareLink}
                        className="shrink-0 rounded bg-[var(--primary)] px-3 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90"
                        style={{ fontSize: "var(--text-caption)" }}
                      >
                        Αντιγραφή
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-1 font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                    {el.shareOtpLabel}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-[var(--muted)] px-2 py-2 font-mono text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
                      {result.otp}
                    </code>
                    <button
                      type="button"
                      onClick={copyOtp}
                      className="rounded bg-[var(--primary)] px-3 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90"
                      style={{ fontSize: "var(--text-caption)" }}
                    >
                      {el.shareOtpCopy}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90"
                    style={{ fontSize: "var(--text-body2)" }}
                  >
                    {el.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
