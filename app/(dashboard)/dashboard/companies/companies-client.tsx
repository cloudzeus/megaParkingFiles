"use client";

import { el } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HiOutlineBuildingOffice2, HiOutlineTrash, HiOutlinePlus } from "react-icons/hi2";

type CompanyListItem = {
  id: number;
  name: string;
  slug: string;
  isDefault: boolean;
  country: string | null;
  address: string | null;
  afm: string | null;
  activity: string | null;
  bunnyStorageZoneName: string | null;
  defaultDataRetentionPolicyId: number | null;
  _count: { users: number; departments: number; files: number; folders: number };
};

type CompanyUser = { id: string; name: string | null; email: string | null };

type CompanyDetail = CompanyListItem & {
  bunnyStorageAccessKey: string | null;
  defaultRetentionPolicy: { id: number; name: string; durationDays: number } | null;
  dpoUserId: string | null;
  securityOfficerUserId: string | null;
  dpo: CompanyUser | null;
  securityOfficer: CompanyUser | null;
};

export function CompaniesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(idFromUrl ? Number(idFromUrl) : null);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const n = idFromUrl ? Number(idFromUrl) : null;
    if (n && !Number.isNaN(n)) setSelectedId(n);
  }, [idFromUrl]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/companies");
        if (!res.ok) return;
        const data = await res.json();
        setCompanies(data.companies ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      setCompanyUsers([]);
      return;
    }
    setDetailLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/companies/${selectedId}`).then((res) => (res.ok ? res.json() : Promise.reject(new Error("Not found")))),
      fetch(`/api/companies/${selectedId}/users`).then((res) => (res.ok ? res.json() : { users: [] })),
    ])
      .then(([detailData, usersData]) => {
        setDetail(detailData.company);
        setCompanyUsers(usersData.users ?? []);
      })
      .catch(() => {
        setDetail(null);
        setCompanyUsers([]);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  async function handleSave(e: React.FormEvent) {
    if (!detail) return;
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value?.trim();
    const slug = (form.querySelector('[name="slug"]') as HTMLInputElement)?.value?.trim();
    const country = (form.querySelector('[name="country"]') as HTMLInputElement)?.value?.trim() || null;
    const address = (form.querySelector('[name="address"]') as HTMLInputElement)?.value?.trim() || null;
    const afm = (form.querySelector('[name="afm"]') as HTMLInputElement)?.value?.trim() || null;
    const activity = (form.querySelector('[name="activity"]') as HTMLInputElement)?.value?.trim() || null;
    const bunnyStorageZoneName = (form.querySelector('[name="bunnyStorageZoneName"]') as HTMLInputElement)?.value?.trim() || null;
    const isDefault = (form.querySelector('[name="isDefault"]') as HTMLInputElement)?.checked ?? false;
    const dpoUserId = (form.querySelector('[name="dpoUserId"]') as HTMLSelectElement)?.value || null;
    const securityOfficerUserId = (form.querySelector('[name="securityOfficerUserId"]') as HTMLSelectElement)?.value || null;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          country,
          address,
          afm,
          activity,
          bunnyStorageZoneName,
          isDefault,
          dpoUserId: dpoUserId === "" ? null : dpoUserId,
          securityOfficerUserId: securityOfficerUserId === "" ? null : securityOfficerUserId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setDetail(data.company);
      setCompanies((prev) => prev.map((c) => {
        if (c.id === data.company.id) return { ...c, ...data.company };
        if (data.company.isDefault) return { ...c, isDefault: false };
        return c;
      }));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    const hasData = detail._count.users + detail._count.departments + detail._count.files + detail._count.folders > 0;
    const message = hasData ? el.deleteCompanyCascadeConfirm : el.deleteCompanyConfirm;
    if (!confirm(message)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${detail.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setCompanies((prev) => prev.filter((c) => c.id !== detail.id));
      setSelectedId(null);
      setDetail(null);
      router.replace("/dashboard/companies");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value?.trim();
    const slug = (form.querySelector('[name="slug"]') as HTMLInputElement)?.value?.trim();
    const country = (form.querySelector('[name="country"]') as HTMLInputElement)?.value?.trim() || null;
    const address = (form.querySelector('[name="address"]') as HTMLInputElement)?.value?.trim() || null;
    const afm = (form.querySelector('[name="afm"]') as HTMLInputElement)?.value?.trim() || null;
    const activity = (form.querySelector('[name="activity"]') as HTMLInputElement)?.value?.trim() || null;
    const bunnyStorageZoneName = (form.querySelector('[name="bunnyStorageZoneName"]') as HTMLInputElement)?.value?.trim() || null;
    const isDefault = (form.querySelector('[name="isDefault"]') as HTMLInputElement)?.checked ?? false;
    if (!name || !slug) {
      setError("Το όνομα και το slug είναι υποχρεωτικά.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, country, address, afm, activity, bunnyStorageZoneName, isDefault }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setCompanies((prev) => {
        const updated = isDefault ? prev.map((c) => ({ ...c, isDefault: false })) : [...prev];
        return [...updated.filter((c) => c.id !== data.company.id), data.company].sort((a, b) => a.name.localeCompare(b.name));
      });
      setCreating(false);
      setSelectedId(data.company.id);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
        …
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center">
        <HiOutlineBuildingOffice2 className="mx-auto h-10 w-10 text-[var(--primary)]/80" aria-hidden />
        <p className="mt-3 font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
          {el.noCompanies}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,400px]">
      {/* List – shadcn DataTable style */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="flex items-center justify-end border-b border-[var(--outline)] px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => { setCreating(true); setSelectedId(null); setDetail(null); setError(null); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90"
            style={{ fontSize: "var(--text-body2)" }}
          >
            <HiOutlinePlus className="h-4 w-4" aria-hidden />
            {el.newCompany}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
            <thead>
              <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.companyName}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.companySlug}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.companyDefaultCompany}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.companyCountry}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.roleUsersCount}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.adminDepartments}</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setCreating(false); setError(null); }}
                  className={`cursor-pointer border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30 ${selectedId === c.id ? "bg-[var(--primary)]/10" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{c.slug}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{c.isDefault ? "Ναι" : "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{c.country ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{c._count.users}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{c._count.departments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail panel – Material / shadcn card */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        {creating ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
              {el.newCompany}
            </h2>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyName} *
              </label>
              <input name="name" type="text" required className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }} />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companySlug} *
              </label>
              <input name="slug" type="text" required className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }} />
            </div>
            <div className="flex items-center gap-2">
              <input id="isDefaultNew" name="isDefault" type="checkbox" className="h-4 w-4 rounded border-[var(--outline)] text-[var(--primary)]" />
              <label htmlFor="isDefaultNew" className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyDefaultCompany}
              </label>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{el.companyCountry}</label>
              <input name="country" type="text" className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }} />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{el.companyAddress}</label>
              <input name="address" type="text" className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }} />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{el.companyAfm}</label>
              <input name="afm" type="text" placeholder="ΑΦΜ" className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }} />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{el.companyActivity}</label>
              <input name="activity" type="text" placeholder="Δραστηριότητα" className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }} />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{el.companyStorageZone}</label>
              <input name="bunnyStorageZoneName" type="text" placeholder="—" className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }} />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setCreating(false); setError(null); }} className="rounded-lg px-4 py-2 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-body2)" }}>
                {el.cancel}
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50" style={{ fontSize: "var(--text-body2)" }}>
                {saving ? "…" : el.createCompany}
              </button>
            </div>
          </form>
        ) : selectedId == null ? (
          <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Επιλέξτε εταιρεία για λεπτομέρειες.
          </p>
        ) : detailLoading ? (
          <p className="text-[var(--muted-foreground)]">…</p>
        ) : detail ? (
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
              {el.companyDetails}
            </h2>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyName}
              </label>
              <input
                name="name"
                type="text"
                defaultValue={detail.name}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companySlug}
              </label>
              <input
                name="slug"
                type="text"
                defaultValue={detail.slug}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isDefault"
                name="isDefault"
                type="checkbox"
                defaultChecked={detail.isDefault}
                className="h-4 w-4 rounded border-[var(--outline)] text-[var(--primary)]"
              />
              <label htmlFor="isDefault" className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyDefaultCompany}
              </label>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyCountry}
              </label>
              <input
                name="country"
                type="text"
                defaultValue={detail.country ?? ""}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyAddress}
              </label>
              <input
                name="address"
                type="text"
                defaultValue={detail.address ?? ""}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyAfm}
              </label>
              <input
                name="afm"
                type="text"
                defaultValue={detail.afm ?? ""}
                placeholder="ΑΦΜ"
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyActivity}
              </label>
              <input
                name="activity"
                type="text"
                defaultValue={detail.activity ?? ""}
                placeholder="Δραστηριότητα"
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyStorageZone}
              </label>
              <input
                name="bunnyStorageZoneName"
                type="text"
                defaultValue={detail.bunnyStorageZoneName ?? ""}
                placeholder="—"
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.dpoLabel}
              </label>
              <select
                name="dpoUserId"
                defaultValue={detail.dpoUserId ?? ""}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              >
                <option value="">—</option>
                {companyUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email || u.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.securityOfficerLabel}
              </label>
              <select
                name="securityOfficerUserId"
                defaultValue={detail.securityOfficerUserId ?? ""}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              >
                <option value="">—</option>
                {companyUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email || u.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2" style={{ fontSize: "var(--text-caption)" }}>
              <span className="text-[var(--muted-foreground)]">Users:</span> {detail._count.users}
              <span className="ml-3 text-[var(--muted-foreground)]">Departments:</span> {detail._count.departments}
              <span className="ml-3 text-[var(--muted-foreground)]">Files:</span> {detail._count.files}
              <span className="ml-3 text-[var(--muted-foreground)]">Folders:</span> {detail._count.folders}
            </div>
            {detail.defaultRetentionPolicy && (
              <div className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companyDefaultPolicy}: {detail.defaultRetentionPolicy.name} ({detail.defaultRetentionPolicy.durationDays} days)
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50 disabled:hover:bg-transparent [&_svg]:text-red-500"
                style={{ fontSize: "var(--text-body2)" }}
                title={el.deleteCompany}
              >
                <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
                {el.deleteCompany}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-lg px-4 py-2 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
                  style={{ fontSize: "var(--text-body2)" }}
                >
                  {el.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
                  style={{ fontSize: "var(--text-body2)" }}
                >
                  {saving ? "…" : el.save}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-[var(--muted-foreground)]">Δεν βρέθηκε εταιρεία.</p>
        )}
      </section>
    </div>
  );
}
