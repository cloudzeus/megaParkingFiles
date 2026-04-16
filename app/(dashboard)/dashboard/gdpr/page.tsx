import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GdprErasureButton } from "./erasure-button";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

export default async function GdprPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) redirect("/dashboard");

  const [policies, piiCounts, erasureCount] = await Promise.all([
    prisma.retentionPolicy.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, durationDays: true, autoDelete: true },
    }),
    prisma.file.groupBy({
      by: ["gdprRiskLevel"],
      where: { companyId, deletionStatus: "ACTIVE" },
      _count: { id: true },
    }),
    prisma.erasureProof.count({
      where: { companyId },
    }),
  ]);

  const piiMap = Object.fromEntries(piiCounts.map((r) => [r.gdprRiskLevel, r._count.id]));

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.gdprTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Χρησιμοποιήστε αυτή την τεκμηρίωση για να κατανοήσετε πώς η εφαρμογή διαχειρίζεται τα δεδομένα και τη συμμόρφωση με το GDPR.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-4 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          {el.gdprDataSummary}
        </h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-[var(--muted)]/50 p-4">
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              {el.gdprPiiRiskSummary}
            </p>
            <ul className="mt-2 space-y-1 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              <li>{el.gdprUnknown}: {piiMap.UNKNOWN ?? 0}</li>
              <li>{el.gdprNoPii}: {piiMap.NO_PII_DETECTED ?? 0}</li>
              <li>{el.gdprPossiblePii}: {piiMap.POSSIBLE_PII ?? 0}</li>
              <li>{el.gdprConfirmedPii}: {piiMap.CONFIRMED_PII ?? 0}</li>
            </ul>
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 p-4">
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              {el.gdprErasureProofs}
            </p>
            <p className="mt-2 font-semibold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
              {erasureCount}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              {el.gdprRetentionPolicies}
            </h3>
            <Link
              href="/dashboard/policies"
              className="font-medium text-[var(--primary)] transition hover:underline"
              style={{ fontSize: "var(--text-body2)" }}
            >
              {el.policiesTitle} →
            </Link>
          </div>
          {policies.length === 0 ? (
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>{el.gdprNoPolicies}</p>
          ) : (
            <ul className="space-y-2" style={{ fontSize: "var(--text-body2)" }}>
              {policies.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded border border-[var(--outline)] px-3 py-2">
                  <span className="font-medium text-[var(--foreground)]">{p.name}</span>
                  {p.durationDays != null && (
                    <span className="text-[var(--muted-foreground)]">{el.gdprPolicyDuration}: {p.durationDays}</span>
                  )}
                  {p.autoDelete && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-600 dark:text-amber-400" style={{ fontSize: "var(--text-caption)" }}>
                      {el.gdprPolicyAutoDelete}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <GdprErasureButton />
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          1. Εισαγωγή και σκοπός
        </h2>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Η παρούσα τεκμηρίωση περιγράφει πώς η εφαρμογή FileShareX διαχειρίζεται προσωπικά δεδομένα
          και πληροφορίες που σχετίζονται με αρχεία, τμήματα, χρήστες και λειτουργίες του συστήματος,
          σε συμμόρφωση με το Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR) και τις εθνικές
          διατάξεις προστασίας δεδομένων.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          2. Αρχεία (Files)
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          <li>
            <strong>Μεταδεδομένα αρχείων:</strong> Για κάθε αρχείο αποθηκεύονται όνομα, μέγεθος,
            τύπος MIME, ημερομηνία μεταφόρτωσης, δημιουργός και σύνδεση με τμήμα/εταιρεία. Δεν
            αποθηκεύονται περιεχόμενα προσωπικού χαρακτήρα εκτός αν περιέχονται στο ίδιο το αρχείο.
          </li>
          <li>
            <strong>Επίπεδο κινδύνου PII:</strong> Κάθε αρχείο ταξινομείται ως UNKNOWN, NO_PII_DETECTED,
            POSSIBLE_PII ή CONFIRMED_PII. Αρχεία με πιθανά ή επιβεβαιωμένα PII περιορίζουν την
            εξωτερική κοινοποίηση και απαιτούν έγκριση DPO/Διαχειριστή όπου ισχύει.
          </li>
          <li>
            <strong>Πολιτικές διατήρησης:</strong> Τα αρχεία μπορούν να συνδεθούν με πολιτικές
            διατήρησης (διάρκεια, αυτόματη διαγραφή, νομική κατοχή). Η διαγραφή γίνεται σύμφωνα με
            αυτές τις πολιτικές και καταγράφεται ως απόδειξη διαγραφής (Erasure Proof).
          </li>
          <li>
            <strong>Απόδειξη διαγραφής:</strong> Κατά τη διαγραφή αρχείου από το χώρο αποθήκευσης
            καταγράφονται ημερομηνία, μέθοδος, hash πριν τη διαγραφή και απόκριση API, για
            επαληθευσιμότητα.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          3. Τμήματα και δικαιώματα πρόσβασης
        </h2>
        <p className="mb-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Τα τμήματα (departments) ομαδοποιούν χρήστες και φακέλους ανά εταιρεία. Για κάθε φάκελο
          ορίζονται δικαιώματα ανά θέμα (τμήμα, ρόλο ή χρήστη): ανάγνωση, εγγραφή, κοινοποίηση,
          διαχείριση. Η πρόσβαση σε αρχεία και φακέλους ελέγχεται server-side πριν από κάθε λειτουργία.
        </p>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Οι ρόλοι (Υπερ-Διαχειριστής, Διαχειριστής Εταιρείας, Διαχειριστής Τμήματος, Υπάλληλος,
          Ελεγκτής, Υπεύθυνος Προστασίας Δεδομένων) καθορίζουν τι μπορεί να δει ή να τροποποιήσει
          ο κάθε χρήστης, σε συμμόρφωση με την αρχή ελαχιστοποίησης δεδομένων.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          4. Κοινοποίηση αρχείων (Sharing)
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          <li>
            <strong>Εσωτερικοί σύνδεσμοι:</strong> Κοινοποίηση εντός της εταιρείας/πλατφόρμας με
            έλεγχο πρόσβασης βάσει ρόλων και δικαιωμάτων.
          </li>
          <li>
            <strong>Εξωτερική κοινοποίηση με OTP:</strong> Για εξωτερική κοινοποίηση απαιτείται
            OTP· πριν την ολοκλήρωση εκτελείται έλεγχος GDPR/PII. Αν το αρχείο έχει κίνδυνο PII,
            η κοινοποίηση μπλοκάρεται από προεπιλογή, με δυνατότητα παράκαμψης μέσω έγκρισης DPO/Διαχειριστή.
          </li>
          <li>
            Κάθε πρόσβαση σε κοινοποιημένο αρχείο καταγράφεται (FileShareAccess) με επιτυχία/αποτυχία,
            λόγο και προαιρετικά IP/user agent.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          5. Αναφορές και αρχεία καταγραφής (Audit)
        </h2>
        <p className="mb-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Όλες οι σημαντικές ενέργειες καταγράφονται στο κεντρικό αρχείο καταγραφής (AuditLog):
          μεταφόρτωση/λήψη/διαγραφή/μετακίνηση/μετονομασία αρχείων, δημιουργία/πρόσβαση/ανάκληση
          κοινοποιήσεων, δημιουργία/ενημέρωση/ανάθεση πολιτικών, εντοπισμός PII, μπλοκάρισμα
          κοινοποίησης, ολοκλήρωση διαγραφής, σάρωση malware, σύνδεση/αποσύνδεση χρήστη, αλλαγή ρόλου.
        </p>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Για κάθε εγγραφή αποθηκεύονται: εταιρεία, χρήστης δράστη (αν υπάρχει), τύπος γεγονότος,
          τύπος στόχου, αναγνωριστικό στόχου, IP, user agent, μεταδεδομένα (JSON), ημερομηνία.
          Οι αναφορές και οι εξαγωγές (π.χ. CSV) χρησιμοποιούνται για συμμόρφωση και ελεγκτικό
          ίχνος.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          6. Χρήστες και λογαριασμοί
        </h2>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Τα δεδομένα χρήστη (email, όνομα, εταιρεία, τμήμα, ρόλος, κατάσταση) χρησιμοποιούνται για
          έλεγχο ταυτότητας και διαχείριση δικαιωμάτων. Οι κωδικοί αποθηκεύονται ως hash. Οι
          συνεδρίες διαχειρίζονται μέσω Auth.js (JWT/session). Οι αλλαγές ρόλων και οι σχετικές
          ενέργειες καταγράφονται στο αρχείο καταγραφής.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          7. Ταξινόμηση και ετικέτες (AI / DeepSeek)
        </h2>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Η ταξινόμηση αρχείων (κατηγορία, ευαισθησία, ετικέτες, κίνδυνος GDPR) μπορεί να
          υποστηρίζεται από AI (DeepSeek). Τα αποτελέσματα αποθηκεύονται ως μεταδεδομένα και
          ετικέτες· δεν αποστέλλονται περιεχόμενα προσωπικού χαρακτήρα προς τρίτους πέρα από την
          υπηρεσία ταξινόμησης σύμφωνα με τις ρυθμίσεις της πλατφόρμας.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          8. Δικαιώματα των υποκειμένων των δεδομένων
        </h2>
        <p className="mb-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Σε συμμόρφωση με το GDPR, τα υποκείμενα των δεδομένων έχουν δικαιώματα πρόσβασης,
          διόρθωσης, διαγραφής, περιορισμού επεξεργασίας, φορητότητας δεδομένων και εναντίωσης.
          Ο Υπεύθυνος Προστασίας Δεδομένων (DPO) και οι Διαχειριστές Εταιρείας μπορούν να
          διαχειριστούν αιτήματα και πολιτικές. Οι διαγραφές που πραγματοποιούνται μέσω της
          εφαρμογής συνοδεύονται από απόδειξη διαγραφής όπου εφαρμόζεται.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          9. Ενημερώσεις
        </h2>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Η τεκμηρίωση αυτή μπορεί να ενημερώνεται για να αντικατοπτρίζει αλλαγές στη λειτουργία
          της εφαρμογής ή στη νομοθεσία. Σημαντικές αλλαγές θα κοινοποιούνται μέσω της πλατφόρμας
          ή του Υπεύθυνου Προστασίας Δεδομένων της οργάνωσής σας.
        </p>
      </section>
    </div>
  );
}
