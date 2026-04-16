"use client";

import { el } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";

type Props = { currentEventType: string | null; basePath?: string };

export function ReportsAuditFilter({ currentEventType, basePath = "/dashboard/reports/audit" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("eventType", value);
    else next.delete("eventType");
    const q = next.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">Φίλτρο:</span>
      <select
        value={currentEventType ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      >
        <option value="">{el.reportsAllEvents}</option>
        <option value="FILE_UPLOAD">{el.eventFileUpload}</option>
        <option value="FILE_DOWNLOAD">{el.eventFileDownload}</option>
        <option value="FILE_DELETE">{el.eventFileDelete}</option>
        <option value="FILE_SHARE_CREATE">{el.eventFileShareCreate}</option>
        <option value="FILE_SHARE_ACCESS">{el.eventFileShareAccess}</option>
        <option value="USER_LOGIN">{el.eventUserLogin}</option>
        <option value="USER_LOGOUT">{el.eventUserLogout}</option>
      </select>
    </div>
  );
}
