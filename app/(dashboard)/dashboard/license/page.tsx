import { auth } from "@/auth";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { HiOutlineDocumentText } from "react-icons/hi2";

export default async function LicensePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const buyerName = process.env.BUYER_NAME ?? "";
  const buyerVat = process.env.BUYER_VAT ?? "";
  const buyerSerial = process.env.BUYER_SERIAL ?? "";
  const buyerActivationDate = process.env.BUYER_ACTIVATION_DATE ?? "";
  const sellerName = process.env.SELLER_NAME ?? "";
  const sellerVat = process.env.SELLER_VAT ?? "";

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.licenseTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.licenseDescription}
        </p>
      </div>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineDocumentText className="h-6 w-6 text-[var(--primary)]" aria-hidden />
              <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                {el.licenseBuyer}
              </h2>
            </div>
            <dl className="space-y-3" style={{ fontSize: "var(--text-body2)" }}>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]">Όνομα / Name</dt>
                <dd className="mt-1 text-[var(--foreground)]">{buyerName || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]">{el.licenseVat}</dt>
                <dd className="mt-1 text-[var(--foreground)]">{buyerVat || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]">{el.licenseSerial}</dt>
                <dd className="mt-1 font-mono text-[var(--foreground)]">{buyerSerial || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]">{el.licenseActivationDate}</dt>
                <dd className="mt-1 text-[var(--foreground)]">{buyerActivationDate || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineDocumentText className="h-6 w-6 text-[var(--primary)]" aria-hidden />
              <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                {el.licenseSeller}
              </h2>
            </div>
            <dl className="space-y-3" style={{ fontSize: "var(--text-body2)" }}>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]">Όνομα / Name</dt>
                <dd className="mt-1 text-[var(--foreground)]">{sellerName || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--muted-foreground)]">{el.licenseVat}</dt>
                <dd className="mt-1 text-[var(--foreground)]">{sellerVat || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
