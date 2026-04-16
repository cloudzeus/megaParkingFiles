/**
 * Seed for FileShareX.
 * For new deployments: run `pnpm run release` (or `prisma db push && prisma db seed`).
 *
 * Deployment Super Admin (always created/updated):
 *   Email: gkozyris@i4ria.com
 *   Password: 1f1femsk
 *   Role: SUPER_ADMIN
 *
 * Default company admin:
 *   Email: admin@kolleris.gr
 *   Password: admin123
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(d: number, base?: Date): Date {
  const b = base ?? new Date();
  const d2 = new Date(b);
  d2.setDate(d2.getDate() - d);
  return d2;
}

function hoursAgo(h: number, base?: Date): Date {
  const b = base ?? new Date();
  return new Date(b.getTime() - h * 3600_000);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const now = new Date();

  // ══════════════════════════════════════════════════════════════════════
  // DEFAULT COMPANY: ΑΦΟΙ ΚΟΛΛΕΡΗΣ ΙΚΕ
  // ══════════════════════════════════════════════════════════════════════

  const company = await prisma.company.upsert({
    where: { slug: "kolleris_ike" },
    update: {
      name: "ΑΦΟΙ ΚΟΛΛΕΡΗΣ ΙΚΕ",
      country: "GR",
      address: "Κ. Μαυρομιχάλη 4, Θεσσαλονίκη 54621",
      afm: "801234567",
      activity: "Εμπόριο ηλεκτρονικών ειδών & τεχνολογίας",
      isDefault: true,
    },
    create: {
      name: "ΑΦΟΙ ΚΟΛΛΕΡΗΣ ΙΚΕ",
      slug: "kolleris_ike",
      country: "GR",
      address: "Κ. Μαυρομιχάλη 4, Θεσσαλονίκη 54621",
      afm: "801234567",
      activity: "Εμπόριο ηλεκτρονικών ειδών & τεχνολογίας",
      isDefault: true,
    },
  });

  // ── Departments ──────────────────────────────────────────────────────

  const deptData = [
    { name: "Διοίκηση", description: "Γενική διεύθυνση & στρατηγικός σχεδιασμός" },
    { name: "Λογιστήριο", description: "Οικονομική διαχείριση, φορολογικά & μισθοδοσία" },
    { name: "Πωλήσεις", description: "Τμήμα πωλήσεων & εξυπηρέτησης πελατών" },
    { name: "Προσωπικό", description: "Διαχείριση ανθρώπινου δυναμικού" },
    { name: "Αποθήκη", description: "Διαχείριση αποθεμάτων & logistics" },
    { name: "IT", description: "Πληροφορική & τεχνική υποστήριξη" },
    { name: "Νομικό", description: "Νομική υπηρεσία & συμμόρφωση" },
  ];

  const departments: Record<string, { id: number }> = {};
  for (const d of deptData) {
    const existing = await prisma.department.findFirst({
      where: { companyId: company.id, name: d.name },
    });
    departments[d.name] = existing ?? await prisma.department.create({
      data: { companyId: company.id, name: d.name, description: d.description },
    });
  }

  // Also keep "Γενικό" if it exists (backwards compat)
  const deptGeniko = await prisma.department.findFirst({
    where: { companyId: company.id, name: "Γενικό" },
  });
  if (deptGeniko) departments["Γενικό"] = deptGeniko;

  // ── Users ────────────────────────────────────────────────────────────

  const passwords = {
    admin: await hash("admin123", 10),
    user: await hash("user123", 10),
  };

  type UserSeed = {
    email: string; name: string; dept: string;
    role: "COMPANY_ADMIN" | "DEPARTMENT_MANAGER" | "EMPLOYEE" | "AUDITOR" | "DPO";
    password: string;
  };

  const usersData: UserSeed[] = [
    // Διοίκηση
    { email: "admin@kolleris.gr", name: "Νίκος Κολλέρης", dept: "Διοίκηση", role: "COMPANY_ADMIN", password: passwords.admin },
    { email: "m.kolleris@kolleris.gr", name: "Μάριος Κολλέρης", dept: "Διοίκηση", role: "COMPANY_ADMIN", password: passwords.admin },
    // Λογιστήριο
    { email: "e.papadopoulou@kolleris.gr", name: "Ελένη Παπαδοπούλου", dept: "Λογιστήριο", role: "DEPARTMENT_MANAGER", password: passwords.user },
    { email: "d.alexiou@kolleris.gr", name: "Δημήτρης Αλεξίου", dept: "Λογιστήριο", role: "EMPLOYEE", password: passwords.user },
    // Πωλήσεις
    { email: "g.nikolaidis@kolleris.gr", name: "Γιώργος Νικολαΐδης", dept: "Πωλήσεις", role: "DEPARTMENT_MANAGER", password: passwords.user },
    { email: "a.karagianni@kolleris.gr", name: "Αγγελική Καραγιάννη", dept: "Πωλήσεις", role: "EMPLOYEE", password: passwords.user },
    { email: "s.dimitriou@kolleris.gr", name: "Στέλιος Δημητρίου", dept: "Πωλήσεις", role: "EMPLOYEE", password: passwords.user },
    // Προσωπικό
    { email: "m.georgiou@kolleris.gr", name: "Μαρία Γεωργίου", dept: "Προσωπικό", role: "DEPARTMENT_MANAGER", password: passwords.user },
    { email: "k.antoniou@kolleris.gr", name: "Κατερίνα Αντωνίου", dept: "Προσωπικό", role: "EMPLOYEE", password: passwords.user },
    // Αποθήκη
    { email: "p.christodoulou@kolleris.gr", name: "Παναγιώτης Χριστοδούλου", dept: "Αποθήκη", role: "DEPARTMENT_MANAGER", password: passwords.user },
    { email: "v.makris@kolleris.gr", name: "Βασίλης Μακρής", dept: "Αποθήκη", role: "EMPLOYEE", password: passwords.user },
    // IT
    { email: "a.stavrou@kolleris.gr", name: "Αλέξανδρος Σταύρου", dept: "IT", role: "DEPARTMENT_MANAGER", password: passwords.user },
    { email: "i.panou@kolleris.gr", name: "Ιωάννης Πάνου", dept: "IT", role: "EMPLOYEE", password: passwords.user },
    // Νομικό
    { email: "th.vlachou@kolleris.gr", name: "Θεοδώρα Βλάχου", dept: "Νομικό", role: "DPO", password: passwords.user },
    { email: "n.lamprou@kolleris.gr", name: "Νικόλαος Λάμπρου", dept: "Νομικό", role: "AUDITOR", password: passwords.user },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of usersData) {
    const dept = departments[u.dept];
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        companyId: company.id,
        departmentId: dept?.id ?? null,
        role: u.role,
        hashedPassword: u.password,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        companyId: company.id,
        departmentId: dept?.id ?? null,
        role: u.role,
        hashedPassword: u.password,
        isActive: true,
      },
    });
    users[u.email] = user;
  }

  // Assign DPO & Security Officer
  await prisma.company.update({
    where: { id: company.id },
    data: {
      dpoUserId: users["th.vlachou@kolleris.gr"].id,
      securityOfficerUserId: users["a.stavrou@kolleris.gr"].id,
    },
  });

  // ── Retention Policies ───────────────────────────────────────────────

  const policiesData = [
    { name: "Φορολογικά παραστατικά (10 έτη)", description: "Τιμολόγια, αποδείξεις, δηλώσεις ΦΠΑ σύμφωνα με τον ΚΦΔ (Ν.4174/2013)", durationDays: 3652, autoDelete: false, legalHoldAllowed: true },
    { name: "Εργασιακά αρχεία (5 έτη)", description: "Συμβάσεις εργασίας, μισθοδοτικές καταστάσεις, βεβαιώσεις", durationDays: 1826, autoDelete: false, legalHoldAllowed: true },
    { name: "Εμπορική αλληλογραφία (3 έτη)", description: "Προσφορές, παραγγελίες, εμπορικά email", durationDays: 1095, autoDelete: true, legalHoldAllowed: true },
    { name: "Προσωπικά δεδομένα GDPR (2 έτη)", description: "Δεδομένα πελατών/προμηθευτών, φόρμες συγκατάθεσης – αυτόματη διαγραφή μετά τη λήξη", durationDays: 730, autoDelete: true, legalHoldAllowed: false },
    { name: "Εσωτερική τεκμηρίωση (7 έτη)", description: "Πρακτικά, εσωτερικά σημειώματα, αποφάσεις διοίκησης", durationDays: 2557, autoDelete: false, legalHoldAllowed: true },
    { name: "Αρχεία ασφαλείας (1 έτος)", description: "Logs, αναφορές ασφαλείας, malware scans", durationDays: 365, autoDelete: true, legalHoldAllowed: false },
  ];

  const policies: Record<string, { id: number }> = {};
  for (const p of policiesData) {
    const existing = await prisma.retentionPolicy.findFirst({
      where: { companyId: company.id, name: p.name },
    });
    policies[p.name] = existing ?? await prisma.retentionPolicy.create({
      data: { companyId: company.id, ...p },
    });
  }

  // Set default retention policy on company
  await prisma.company.update({
    where: { id: company.id },
    data: { defaultDataRetentionPolicyId: policies["Εσωτερική τεκμηρίωση (7 έτη)"].id },
  });

  // ── File Categories ──────────────────────────────────────────────────

  const categoriesData = [
    { name: "Τιμολόγια", description: "Τιμολόγια πώλησης & αγοράς" },
    { name: "Συμβάσεις", description: "Συμβάσεις εργασίας, συνεργασίας & προμήθειας" },
    { name: "Αναφορές", description: "Εσωτερικές αναφορές & εκθέσεις" },
    { name: "Τεκμηρίωση", description: "Εγχειρίδια, οδηγίες, τεχνικά φυλλάδια" },
    { name: "Προσωπικά δεδομένα", description: "Αρχεία που περιέχουν PII" },
    { name: "Νομικά", description: "Νομικά έγγραφα, πληρεξούσια, δικαστικές αποφάσεις" },
    { name: "Αλληλογραφία", description: "Εισερχόμενη & εξερχόμενη αλληλογραφία" },
    { name: "Logistics", description: "Δελτία αποστολής, CMR, packing lists" },
  ];

  const categories: Record<string, { id: number }> = {};
  for (const c of categoriesData) {
    const existing = await prisma.fileCategory.findFirst({
      where: { companyId: company.id, name: c.name },
    });
    categories[c.name] = existing ?? await prisma.fileCategory.create({
      data: { companyId: company.id, ...c },
    });
  }

  // ── Check if data already seeded ─────────────────────────────────────

  const existingSeedFiles = await prisma.file.count({
    where: { companyId: company.id, bunnyStoragePath: { startsWith: "kolleris/" } },
  });
  if (existingSeedFiles > 5) {
    console.log("  Data already populated for default company, skipping file/log seed.");
  } else {
    // Clean up partial seeds
    if (existingSeedFiles > 0) {
      const oldFileIds = await prisma.file.findMany({
        where: { companyId: company.id, bunnyStoragePath: { startsWith: "kolleris/" } },
        select: { id: true },
      });
      const ids = oldFileIds.map((f) => f.id);
      await prisma.fileTag.deleteMany({ where: { fileId: { in: ids } } });
      await prisma.fileRetention.deleteMany({ where: { fileId: { in: ids } } });
      await prisma.fileClassificationJob.deleteMany({ where: { fileId: { in: ids } } });
      await prisma.file.updateMany({ where: { id: { in: ids } }, data: { deletionProofId: null } });
      await prisma.erasureProof.deleteMany({ where: { companyId: company.id, fileId: { in: ids } } });
      await prisma.fileShareAccess.deleteMany({ where: { fileId: { in: ids } } });
      const shareIds = await prisma.fileShare.findMany({ where: { fileId: { in: ids } }, select: { id: true } });
      if (shareIds.length > 0) {
        await prisma.fileShareAccess.deleteMany({ where: { shareId: { in: shareIds.map((s) => s.id) } } });
      }
      await prisma.fileShare.deleteMany({ where: { fileId: { in: ids } } });
      await prisma.file.deleteMany({ where: { id: { in: ids } } });
    }
    // Clean up any previous seed audit logs (identified by metadata.seed flag)
    await prisma.$executeRaw`DELETE FROM AuditLog WHERE companyId = ${company.id} AND JSON_EXTRACT(metadata, '$.seed') = true`;

    // ── Folders ──────────────────────────────────────────────────────────

    const adminId = users["admin@kolleris.gr"].id;

    // Root folder
    let rootFolder = await prisma.folder.findFirst({
      where: { companyId: company.id, parentFolderId: null },
    });
    if (!rootFolder) {
      rootFolder = await prisma.folder.create({
        data: {
          companyId: company.id, parentFolderId: null,
          name: "Αρχεία", path: "/Αρχεία",
          isDepartmentRoot: false, createdByUserId: adminId,
        },
      });
    }

    // Department root folders
    const folderMap: Record<string, { id: number }> = { root: rootFolder };
    const deptFolders = [
      { name: "Διοίκηση", dept: "Διοίκηση" },
      { name: "Λογιστήριο", dept: "Λογιστήριο" },
      { name: "Πωλήσεις", dept: "Πωλήσεις" },
      { name: "Προσωπικό", dept: "Προσωπικό" },
      { name: "Αποθήκη", dept: "Αποθήκη" },
      { name: "IT", dept: "IT" },
      { name: "Νομικό", dept: "Νομικό" },
    ];

    for (const df of deptFolders) {
      let folder = await prisma.folder.findFirst({
        where: { companyId: company.id, parentFolderId: rootFolder.id, name: df.name },
      });
      if (!folder) {
        folder = await prisma.folder.create({
          data: {
            companyId: company.id, parentFolderId: rootFolder.id,
            departmentId: departments[df.dept]?.id ?? null,
            name: df.name, path: `/Αρχεία/${df.name}`,
            isDepartmentRoot: true, createdByUserId: adminId,
          },
        });
      }
      folderMap[df.name] = folder;
    }

    // Subfolders
    const subfoldersDef = [
      { parent: "Λογιστήριο", name: "Τιμολόγια 2025", dept: "Λογιστήριο" },
      { parent: "Λογιστήριο", name: "Τιμολόγια 2024", dept: "Λογιστήριο" },
      { parent: "Λογιστήριο", name: "ΦΠΑ", dept: "Λογιστήριο" },
      { parent: "Λογιστήριο", name: "Μισθοδοσία", dept: "Λογιστήριο" },
      { parent: "Πωλήσεις", name: "Προσφορές", dept: "Πωλήσεις" },
      { parent: "Πωλήσεις", name: "Παραγγελίες", dept: "Πωλήσεις" },
      { parent: "Πωλήσεις", name: "Πελατολόγιο", dept: "Πωλήσεις", personal: true },
      { parent: "Προσωπικό", name: "Φάκελοι εργαζομένων", dept: "Προσωπικό", personal: true },
      { parent: "Προσωπικό", name: "Αιτήσεις", dept: "Προσωπικό", personal: true },
      { parent: "Αποθήκη", name: "Δελτία αποστολής", dept: "Αποθήκη" },
      { parent: "Αποθήκη", name: "Απογραφή 2025", dept: "Αποθήκη" },
      { parent: "IT", name: "Τεκμηρίωση συστημάτων", dept: "IT" },
      { parent: "IT", name: "Αναφορές ασφαλείας", dept: "IT" },
      { parent: "Νομικό", name: "Συμβάσεις", dept: "Νομικό" },
      { parent: "Νομικό", name: "GDPR", dept: "Νομικό" },
      { parent: "Διοίκηση", name: "Πρακτικά", dept: "Διοίκηση" },
      { parent: "Διοίκηση", name: "Στρατηγικός σχεδιασμός", dept: "Διοίκηση" },
    ];

    for (const sf of subfoldersDef) {
      const parentId = folderMap[sf.parent]?.id;
      if (!parentId) continue;
      let folder = await prisma.folder.findFirst({
        where: { companyId: company.id, parentFolderId: parentId, name: sf.name },
      });
      if (!folder) {
        folder = await prisma.folder.create({
          data: {
            companyId: company.id, parentFolderId: parentId,
            departmentId: departments[sf.dept]?.id ?? null,
            name: sf.name, path: `/Αρχεία/${sf.parent}/${sf.name}`,
            isDepartmentRoot: false,
            containsPersonalData: sf.personal ?? false,
            createdByUserId: adminId,
          },
        });
      }
      folderMap[`${sf.parent}/${sf.name}`] = folder;
    }

    // ── Files ──────────────────────────────────────────────────────────

    type FileSeed = {
      folder: string; dept: string; name: string; ext: string;
      size: number; mime: string; creator: string;
      gdpr: "UNKNOWN" | "NO_PII_DETECTED" | "POSSIBLE_PII" | "CONFIRMED_PII";
      malware: "CLEAN" | "PENDING"; daysAgo: number;
      deletion?: "ACTIVE" | "SOFT_DELETED" | "ERASED";
      category?: string;
    };

    const filesDef: FileSeed[] = [
      // Λογιστήριο – Τιμολόγια 2025
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-001 ΠΛΑΙΣΙΟ ΑΕ.pdf", ext: "pdf", size: 184320, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 89, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-002 ΚΩΤΣΟΒΟΛΟΣ ΑΕ.pdf", ext: "pdf", size: 196608, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 82, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-003 PUBLIC ΑΕ.pdf", ext: "pdf", size: 172032, mime: "application/pdf", creator: "d.alexiou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 74, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-004 MEDIAMARKT.pdf", ext: "pdf", size: 210944, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 60, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-005 ΓΕΡΜΑΝΟΣ ΑΒΕΕ.pdf", ext: "pdf", size: 155648, mime: "application/pdf", creator: "d.alexiou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 45, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-006 COSMOTE ΑΕ.pdf", ext: "pdf", size: 188416, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 30, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-007 VODAFONE.pdf", ext: "pdf", size: 163840, mime: "application/pdf", creator: "d.alexiou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 18, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2025", dept: "Λογιστήριο", name: "ΤΙΜ-2025-008 WIND ΑΕ.pdf", ext: "pdf", size: 178176, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 5, category: "Τιμολόγια" },
      // Λογιστήριο – Τιμολόγια 2024
      { folder: "Λογιστήριο/Τιμολόγια 2024", dept: "Λογιστήριο", name: "ΤΙΜ-2024-041 ΠΛΑΙΣΙΟ ΑΕ.pdf", ext: "pdf", size: 192512, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 320, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/Τιμολόγια 2024", dept: "Λογιστήριο", name: "ΤΙΜ-2024-042 ΚΩΤΣΟΒΟΛΟΣ.pdf", ext: "pdf", size: 204800, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 290, category: "Τιμολόγια" },
      // Λογιστήριο – ΦΠΑ
      { folder: "Λογιστήριο/ΦΠΑ", dept: "Λογιστήριο", name: "Περιοδική ΦΠΑ Ιαν-Μαρ 2025.pdf", ext: "pdf", size: 245760, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 55, category: "Τιμολόγια" },
      { folder: "Λογιστήριο/ΦΠΑ", dept: "Λογιστήριο", name: "Εκκαθαριστική ΦΠΑ 2024.pdf", ext: "pdf", size: 312000, mime: "application/pdf", creator: "e.papadopoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 120, category: "Τιμολόγια" },
      // Λογιστήριο – Μισθοδοσία
      { folder: "Λογιστήριο/Μισθοδοσία", dept: "Λογιστήριο", name: "Μισθοδοσία Μάρτιος 2026.xlsx", ext: "xlsx", size: 89088, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "e.papadopoulou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 14, category: "Προσωπικά δεδομένα" },
      { folder: "Λογιστήριο/Μισθοδοσία", dept: "Λογιστήριο", name: "Μισθοδοσία Φεβρουάριος 2026.xlsx", ext: "xlsx", size: 87040, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "e.papadopoulou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 44, category: "Προσωπικά δεδομένα" },
      { folder: "Λογιστήριο/Μισθοδοσία", dept: "Λογιστήριο", name: "Μισθοδοσία Ιανουάριος 2026.xlsx", ext: "xlsx", size: 85504, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "e.papadopoulou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 75, category: "Προσωπικά δεδομένα" },

      // Πωλήσεις – Προσφορές
      { folder: "Πωλήσεις/Προσφορές", dept: "Πωλήσεις", name: "Προσφορά ΔΕΔΔΗΕ 2025-0312.pdf", ext: "pdf", size: 524288, mime: "application/pdf", creator: "g.nikolaidis@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 35, category: "Αλληλογραφία" },
      { folder: "Πωλήσεις/Προσφορές", dept: "Πωλήσεις", name: "Προσφορά ΟΤΕ 2025-0287.pdf", ext: "pdf", size: 491520, mime: "application/pdf", creator: "a.karagianni@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 42, category: "Αλληλογραφία" },
      { folder: "Πωλήσεις/Προσφορές", dept: "Πωλήσεις", name: "Προσφορά ΕΥΔΑΠ 2025-0298.pdf", ext: "pdf", size: 478208, mime: "application/pdf", creator: "s.dimitriou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 28, category: "Αλληλογραφία" },
      // Πωλήσεις – Παραγγελίες
      { folder: "Πωλήσεις/Παραγγελίες", dept: "Πωλήσεις", name: "ΠΑΡ-2025-1501 Κεντρική Αποθήκη.xlsx", ext: "xlsx", size: 67584, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "g.nikolaidis@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 22, category: "Logistics" },
      { folder: "Πωλήσεις/Παραγγελίες", dept: "Πωλήσεις", name: "ΠΑΡ-2025-1502 Υποκατάστημα Αθηνών.xlsx", ext: "xlsx", size: 71680, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "a.karagianni@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 15, category: "Logistics" },
      // Πωλήσεις – Πελατολόγιο
      { folder: "Πωλήσεις/Πελατολόγιο", dept: "Πωλήσεις", name: "Πελατολόγιο Q1 2026.xlsx", ext: "xlsx", size: 358400, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "g.nikolaidis@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 10, category: "Προσωπικά δεδομένα" },
      { folder: "Πωλήσεις/Πελατολόγιο", dept: "Πωλήσεις", name: "Πελατολόγιο 2025 (τελικό).xlsx", ext: "xlsx", size: 1048576, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "g.nikolaidis@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 95, category: "Προσωπικά δεδομένα" },

      // Προσωπικό
      { folder: "Προσωπικό/Φάκελοι εργαζομένων", dept: "Προσωπικό", name: "Σύμβαση - Αλεξίου Δημήτρης.pdf", ext: "pdf", size: 302080, mime: "application/pdf", creator: "m.georgiou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 180, category: "Συμβάσεις" },
      { folder: "Προσωπικό/Φάκελοι εργαζομένων", dept: "Προσωπικό", name: "Σύμβαση - Καραγιάννη Αγγελική.pdf", ext: "pdf", size: 294912, mime: "application/pdf", creator: "m.georgiou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 165, category: "Συμβάσεις" },
      { folder: "Προσωπικό/Φάκελοι εργαζομένων", dept: "Προσωπικό", name: "Σύμβαση - Δημητρίου Στέλιος.pdf", ext: "pdf", size: 287744, mime: "application/pdf", creator: "m.georgiou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 150, category: "Συμβάσεις" },
      { folder: "Προσωπικό/Φάκελοι εργαζομένων", dept: "Προσωπικό", name: "Βεβαίωση αποδοχών 2025 - Μακρής.pdf", ext: "pdf", size: 145408, mime: "application/pdf", creator: "m.georgiou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 62, category: "Προσωπικά δεδομένα" },
      { folder: "Προσωπικό/Αιτήσεις", dept: "Προσωπικό", name: "Αίτηση αδείας - Πάνου Ι. (03-2026).pdf", ext: "pdf", size: 81920, mime: "application/pdf", creator: "k.antoniou@kolleris.gr", gdpr: "POSSIBLE_PII", malware: "CLEAN", daysAgo: 8, category: "Προσωπικά δεδομένα" },
      { folder: "Προσωπικό/Αιτήσεις", dept: "Προσωπικό", name: "Αίτηση αδείας - Μακρής Β. (02-2026).pdf", ext: "pdf", size: 78848, mime: "application/pdf", creator: "k.antoniou@kolleris.gr", gdpr: "POSSIBLE_PII", malware: "CLEAN", daysAgo: 38, category: "Προσωπικά δεδομένα" },

      // Αποθήκη
      { folder: "Αποθήκη/Δελτία αποστολής", dept: "Αποθήκη", name: "ΔΑ-2025-0891 Αθήνα.pdf", ext: "pdf", size: 122880, mime: "application/pdf", creator: "p.christodoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 20, category: "Logistics" },
      { folder: "Αποθήκη/Δελτία αποστολής", dept: "Αποθήκη", name: "ΔΑ-2025-0892 Πάτρα.pdf", ext: "pdf", size: 118784, mime: "application/pdf", creator: "v.makris@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 18, category: "Logistics" },
      { folder: "Αποθήκη/Δελτία αποστολής", dept: "Αποθήκη", name: "ΔΑ-2025-0893 Ηράκλειο.pdf", ext: "pdf", size: 126976, mime: "application/pdf", creator: "p.christodoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 12, category: "Logistics" },
      { folder: "Αποθήκη/Απογραφή 2025", dept: "Αποθήκη", name: "Απογραφή αποθήκης 31-12-2025.xlsx", ext: "xlsx", size: 2097152, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "p.christodoulou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 105, category: "Αναφορές" },

      // IT
      { folder: "IT/Τεκμηρίωση συστημάτων", dept: "IT", name: "Αρχιτεκτονική δικτύου v3.2.pdf", ext: "pdf", size: 1572864, mime: "application/pdf", creator: "a.stavrou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 48, category: "Τεκμηρίωση" },
      { folder: "IT/Τεκμηρίωση συστημάτων", dept: "IT", name: "Οδηγίες backup & disaster recovery.docx", ext: "docx", size: 409600, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", creator: "a.stavrou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 92, category: "Τεκμηρίωση" },
      { folder: "IT/Τεκμηρίωση συστημάτων", dept: "IT", name: "Πολιτική κωδικών πρόσβασης.pdf", ext: "pdf", size: 204800, mime: "application/pdf", creator: "a.stavrou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 130, category: "Τεκμηρίωση" },
      { folder: "IT/Αναφορές ασφαλείας", dept: "IT", name: "Penetration test Q1 2026.pdf", ext: "pdf", size: 3145728, mime: "application/pdf", creator: "i.panou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 25, category: "Αναφορές" },
      { folder: "IT/Αναφορές ασφαλείας", dept: "IT", name: "Vulnerability scan Μάρτιος 2026.pdf", ext: "pdf", size: 1048576, mime: "application/pdf", creator: "i.panou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 16, category: "Αναφορές" },

      // Νομικό
      { folder: "Νομικό/Συμβάσεις", dept: "Νομικό", name: "Σύμβαση προμήθειας Samsung 2025.pdf", ext: "pdf", size: 819200, mime: "application/pdf", creator: "th.vlachou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 200, category: "Συμβάσεις" },
      { folder: "Νομικό/Συμβάσεις", dept: "Νομικό", name: "Σύμβαση προμήθειας Apple 2025.pdf", ext: "pdf", size: 942080, mime: "application/pdf", creator: "th.vlachou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 185, category: "Συμβάσεις" },
      { folder: "Νομικό/Συμβάσεις", dept: "Νομικό", name: "Σύμβαση μίσθωσης αποθήκης Σίνδος.pdf", ext: "pdf", size: 655360, mime: "application/pdf", creator: "th.vlachou@kolleris.gr", gdpr: "POSSIBLE_PII", malware: "CLEAN", daysAgo: 240, category: "Συμβάσεις" },
      { folder: "Νομικό/GDPR", dept: "Νομικό", name: "Πολιτική απορρήτου (τελευταία ενημέρωση).pdf", ext: "pdf", size: 368640, mime: "application/pdf", creator: "th.vlachou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 60, category: "Νομικά" },
      { folder: "Νομικό/GDPR", dept: "Νομικό", name: "Εκτίμηση αντικτύπου (DPIA) FileShareX.pdf", ext: "pdf", size: 512000, mime: "application/pdf", creator: "th.vlachou@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 45, category: "Νομικά" },
      { folder: "Νομικό/GDPR", dept: "Νομικό", name: "Μητρώο δραστηριοτήτων επεξεργασίας.xlsx", ext: "xlsx", size: 143360, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "th.vlachou@kolleris.gr", gdpr: "POSSIBLE_PII", malware: "CLEAN", daysAgo: 30, category: "Νομικά" },

      // Διοίκηση
      { folder: "Διοίκηση/Πρακτικά", dept: "Διοίκηση", name: "Πρακτικό ΔΣ 2026-03-10.pdf", ext: "pdf", size: 163840, mime: "application/pdf", creator: "admin@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 36, category: "Αναφορές" },
      { folder: "Διοίκηση/Πρακτικά", dept: "Διοίκηση", name: "Πρακτικό ΔΣ 2026-02-14.pdf", ext: "pdf", size: 155648, mime: "application/pdf", creator: "admin@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 60, category: "Αναφορές" },
      { folder: "Διοίκηση/Πρακτικά", dept: "Διοίκηση", name: "Πρακτικό ΔΣ 2026-01-15.pdf", ext: "pdf", size: 147456, mime: "application/pdf", creator: "admin@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 90, category: "Αναφορές" },
      { folder: "Διοίκηση/Στρατηγικός σχεδιασμός", dept: "Διοίκηση", name: "Business plan 2026-2028.pptx", ext: "pptx", size: 4194304, mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", creator: "m.kolleris@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 70, category: "Αναφορές" },
      { folder: "Διοίκηση/Στρατηγικός σχεδιασμός", dept: "Διοίκηση", name: "Ανάλυση αγοράς ηλεκτρονικών 2025.pdf", ext: "pdf", size: 2621440, mime: "application/pdf", creator: "m.kolleris@kolleris.gr", gdpr: "NO_PII_DETECTED", malware: "CLEAN", daysAgo: 110, category: "Αναφορές" },

      // Erased files (for deletion proofs)
      { folder: "Προσωπικό/Φάκελοι εργαζομένων", dept: "Προσωπικό", name: "Σύμβαση - Παπαδόπουλος Κ. (τερματισμός).pdf", ext: "pdf", size: 286720, mime: "application/pdf", creator: "m.georgiou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 210, deletion: "ERASED", category: "Συμβάσεις" },
      { folder: "Πωλήσεις/Πελατολόγιο", dept: "Πωλήσεις", name: "Πελατολόγιο 2023 (παρωχημένο).xlsx", ext: "xlsx", size: 921600, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "g.nikolaidis@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 400, deletion: "ERASED", category: "Προσωπικά δεδομένα" },
      { folder: "Λογιστήριο/Μισθοδοσία", dept: "Λογιστήριο", name: "Μισθοδοσία πρώην υπαλλήλων 2022.xlsx", ext: "xlsx", size: 102400, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", creator: "e.papadopoulou@kolleris.gr", gdpr: "CONFIRMED_PII", malware: "CLEAN", daysAgo: 450, deletion: "ERASED", category: "Προσωπικά δεδομένα" },
    ];

    const createdFiles: Array<{ id: number; def: FileSeed }> = [];

    for (const f of filesDef) {
      const folderId = folderMap[f.folder]?.id;
      if (!folderId) { console.warn(`  Folder not found: ${f.folder}`); continue; }
      const deptId = departments[f.dept]?.id ?? null;
      const creatorId = users[f.creator]?.id;
      if (!creatorId) { console.warn(`  User not found: ${f.creator}`); continue; }

      const storagePath = `kolleris/${f.folder.replace(/ /g, "_")}/${f.name.replace(/ /g, "_")}`;
      const file = await prisma.file.create({
        data: {
          companyId: company.id,
          folderId,
          departmentId: deptId,
          name: f.name,
          extension: f.ext,
          sizeBytes: f.size,
          mimeType: f.mime,
          bunnyStoragePath: storagePath,
          createdByUserId: creatorId,
          gdprRiskLevel: f.gdpr,
          malwareStatus: f.malware,
          classificationStatus: "DONE",
          deletionStatus: f.deletion ?? "ACTIVE",
          uploadedAt: daysAgo(f.daysAgo),
          createdAt: daysAgo(f.daysAgo),
        },
      });
      createdFiles.push({ id: file.id, def: f });

      // Add tags for classified files
      const tagData: Array<{ key: string; value: string; source: string }> = [];
      if (f.gdpr === "CONFIRMED_PII" || f.gdpr === "POSSIBLE_PII") {
        tagData.push({ key: "pii_type", value: f.gdpr === "CONFIRMED_PII" ? "ΑΦΜ, ΑΜΚΑ, ονοματεπώνυμο" : "πιθανά προσωπικά στοιχεία", source: "ai-classification" });
      }
      if (f.category) {
        tagData.push({ key: "category", value: f.category, source: "ai-classification" });
      }
      tagData.push({ key: "language", value: "el", source: "ai-classification" });

      if (tagData.length > 0) {
        await prisma.fileTag.createMany({
          data: tagData.map((t) => ({ fileId: file.id, ...t })),
        });
      }

      // Connect to category
      if (f.category && categories[f.category]) {
        await prisma.file.update({
          where: { id: file.id },
          data: { categories: { connect: { id: categories[f.category].id } } },
        });
      }
    }

    // ── File Retentions ────────────────────────────────────────────────

    for (const cf of createdFiles) {
      if (cf.def.deletion === "ERASED") continue;
      let policyName: string;
      if (cf.def.category === "Τιμολόγια") policyName = "Φορολογικά παραστατικά (10 έτη)";
      else if (cf.def.category === "Συμβάσεις") policyName = "Εργασιακά αρχεία (5 έτη)";
      else if (cf.def.category === "Προσωπικά δεδομένα") policyName = "Προσωπικά δεδομένα GDPR (2 έτη)";
      else if (cf.def.category === "Αλληλογραφία") policyName = "Εμπορική αλληλογραφία (3 έτη)";
      else if (cf.def.category === "Logistics") policyName = "Εμπορική αλληλογραφία (3 έτη)";
      else policyName = "Εσωτερική τεκμηρίωση (7 έτη)";

      const policy = policies[policyName];
      if (policy) {
        await prisma.fileRetention.create({
          data: {
            fileId: cf.id,
            policyId: policy.id,
            effectiveFrom: daysAgo(cf.def.daysAgo),
          },
        });
      }
    }

    // ── Erasure Proofs ─────────────────────────────────────────────────

    const erasedFiles = createdFiles.filter((f) => f.def.deletion === "ERASED");
    for (const ef of erasedFiles) {
      const erasedDaysAgo = ef.def.daysAgo - randomBetween(5, 30);
      const policyId = ef.def.category === "Προσωπικά δεδομένα"
        ? policies["Προσωπικά δεδομένα GDPR (2 έτη)"]?.id
        : ef.def.category === "Συμβάσεις"
          ? policies["Εργασιακά αρχεία (5 έτη)"]?.id
          : null;

      const ep = await prisma.erasureProof.create({
        data: {
          companyId: company.id,
          fileId: ef.id,
          policyId: policyId ?? null,
          erasedAt: daysAgo(erasedDaysAgo),
          erasedBySystemUserId: users["th.vlachou@kolleris.gr"].id,
          method: "bunny-cdn-delete",
          bunnyDeleteResponse: { HttpCode: 200, Message: "File deleted successfully" },
          hashBeforeDelete: `sha256:${Buffer.from(ef.def.name).toString("hex").slice(0, 64)}`,
        },
      });
      await prisma.file.update({ where: { id: ef.id }, data: { deletionProofId: ep.id } });
    }

    // ── Shared helpers ──────────────────────────────────────────────────

    const userEmails = Object.keys(users);
    const userIds = Object.values(users).map((u) => u.id);

    // ── File Shares ────────────────────────────────────────────────────

    const activeFiles = createdFiles.filter((f) => f.def.deletion !== "ERASED");
    const externalIPs = ["94.68.112.45", "85.73.201.12", "178.128.55.91", "62.103.44.78", "79.166.88.210", "5.54.123.67", "188.4.77.30", "91.140.2.15"];
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    ];

    // Internal shares — share files across departments
    for (let i = 0; i < activeFiles.length; i++) {
      if (i % 3 !== 0) continue; // share every 3rd file
      const sf = activeFiles[i];
      const share = await prisma.fileShare.create({
        data: {
          companyId: company.id,
          fileId: sf.id,
          createdByUserId: users[sf.def.creator].id,
          shareType: "INTERNAL_LINK",
          requireOtp: false,
          createdAt: daysAgo(sf.def.daysAgo - 1),
          expiresAt: daysAgo(-randomBetween(7, 60)),
        },
      });
      const accessCount = randomBetween(3, 8);
      const accessData = [];
      for (let j = 0; j < accessCount; j++) {
        const randomUser = userEmails[randomBetween(0, userEmails.length - 1)];
        accessData.push({
          shareId: share.id,
          fileId: sf.id,
          accessedAt: daysAgo(randomBetween(0, sf.def.daysAgo)),
          success: true,
          download: j % 2 === 0,
          reason: "OK" as const,
          ipAddress: `192.168.1.${randomBetween(10, 200)}`,
          userAgent: userAgents[randomBetween(0, userAgents.length - 1)],
        });
      }
      await prisma.fileShareAccess.createMany({ data: accessData });
    }

    // External OTP shares — invoices, shipping docs, contracts
    const externalShareCandidates = activeFiles.filter((f) =>
      f.def.name.includes("ΤΙΜ-") || f.def.name.includes("ΔΑ-") ||
      f.def.name.includes("Πολιτική απορρήτου") || f.def.name.includes("Προσφορά") ||
      f.def.name.includes("Σύμβαση προμήθειας") || f.def.name.includes("Απογραφή")
    );
    for (const sf of externalShareCandidates) {
      const share = await prisma.fileShare.create({
        data: {
          companyId: company.id,
          fileId: sf.id,
          createdByUserId: users[sf.def.creator].id,
          shareType: "EXTERNAL_OTP",
          requireOtp: true,
          otpLength: 6,
          createdAt: daysAgo(sf.def.daysAgo - randomBetween(1, 5)),
          expiresAt: daysAgo(-randomBetween(7, 30)),
          maxDownloads: randomBetween(3, 10),
          remainingDownloads: randomBetween(0, 5),
        },
      });
      // Multiple successful downloads
      const dlCount = randomBetween(2, 5);
      const accessData = [];
      for (let j = 0; j < dlCount; j++) {
        accessData.push({
          shareId: share.id, fileId: sf.id,
          accessedAt: daysAgo(randomBetween(0, sf.def.daysAgo)),
          success: true, download: true, reason: "OK" as const,
          ipAddress: externalIPs[randomBetween(0, externalIPs.length - 1)],
          userAgent: userAgents[randomBetween(0, userAgents.length - 1)],
        });
      }
      // Failed attempts (wrong OTP, expired)
      accessData.push({
        shareId: share.id, fileId: sf.id,
        accessedAt: daysAgo(randomBetween(0, sf.def.daysAgo)),
        success: false, download: false, reason: "WRONG_OTP" as const,
        ipAddress: externalIPs[randomBetween(0, externalIPs.length - 1)],
        userAgent: userAgents[randomBetween(0, userAgents.length - 1)],
      });
      await prisma.fileShareAccess.createMany({ data: accessData });
    }

    // GDPR-blocked share attempts for PII files
    const piiFiles = activeFiles.filter((f) => f.def.gdpr === "CONFIRMED_PII");
    for (const pf of piiFiles) {
      const blockedShare = await prisma.fileShare.create({
        data: {
          companyId: company.id,
          fileId: pf.id,
          createdByUserId: users[pf.def.creator].id,
          shareType: "EXTERNAL_OTP",
          requireOtp: true,
          otpLength: 6,
          isRevoked: true,
          createdAt: daysAgo(randomBetween(5, 30)),
          expiresAt: daysAgo(-7),
        },
      });
      await prisma.fileShareAccess.create({
        data: {
          shareId: blockedShare.id, fileId: pf.id,
          accessedAt: daysAgo(randomBetween(3, 25)), success: false, download: false, reason: "GDPR_BLOCKED",
          ipAddress: externalIPs[randomBetween(0, externalIPs.length - 1)],
        },
      });
    }

    // ── Audit Logs ─────────────────────────────────────────────────────

    const auditEntries: Array<{
      actorUserId: string; eventType: string; targetType: string;
      targetId: number | null; createdAt: Date; ipAddress?: string;
      metadata?: object;
    }> = [];

    // File uploads (one per file)
    for (const cf of createdFiles) {
      auditEntries.push({
        actorUserId: users[cf.def.creator].id,
        eventType: "FILE_UPLOAD",
        targetType: "FILE",
        targetId: cf.id,
        createdAt: daysAgo(cf.def.daysAgo),
        metadata: { seed: true, filename: cf.def.name },
      });
    }

    // File downloads — every user downloads files from their department + cross-department
    for (const userEmail of userEmails) {
      const userId = users[userEmail].id;
      // Each user downloads 5–15 files
      const dlCount = randomBetween(5, 15);
      for (let i = 0; i < dlCount; i++) {
        const randomFile = activeFiles[randomBetween(0, activeFiles.length - 1)];
        auditEntries.push({
          actorUserId: userId,
          eventType: "FILE_DOWNLOAD",
          targetType: "FILE",
          targetId: randomFile.id,
          createdAt: daysAgo(randomBetween(0, 90)),
          ipAddress: `192.168.1.${randomBetween(10, 200)}`,
          metadata: { seed: true },
        });
      }
    }

    // File deletions (erased files)
    for (const ef of erasedFiles) {
      auditEntries.push({
        actorUserId: users["th.vlachou@kolleris.gr"].id,
        eventType: "FILE_DELETE",
        targetType: "FILE",
        targetId: ef.id,
        createdAt: daysAgo(ef.def.daysAgo - 10),
        metadata: { seed: true, reason: "Λήξη περιόδου διατήρησης" },
      });
      auditEntries.push({
        actorUserId: users["th.vlachou@kolleris.gr"].id,
        eventType: "GDPR_ERASURE_COMPLETED",
        targetType: "FILE",
        targetId: ef.id,
        createdAt: daysAgo(ef.def.daysAgo - 10),
        metadata: { seed: true },
      });
    }

    // GDPR PII detected events
    const piiFilesForAudit = createdFiles.filter((f) => f.def.gdpr === "CONFIRMED_PII" || f.def.gdpr === "POSSIBLE_PII");
    for (const pf of piiFilesForAudit) {
      auditEntries.push({
        actorUserId: users["a.stavrou@kolleris.gr"].id,
        eventType: "GDPR_PII_DETECTED",
        targetType: "FILE",
        targetId: pf.id,
        createdAt: daysAgo(pf.def.daysAgo - 1),
        metadata: { seed: true, riskLevel: pf.def.gdpr },
      });
    }

    // GDPR share blocked events for all PII files
    for (const pf of piiFiles) {
      auditEntries.push({
        actorUserId: users[pf.def.creator].id,
        eventType: "GDPR_SHARE_BLOCKED",
        targetType: "FILE",
        targetId: pf.id,
        createdAt: daysAgo(randomBetween(5, 25)),
        metadata: { seed: true, reason: "Αρχείο με επιβεβαιωμένα προσωπικά δεδομένα" },
      });
    }

    // Share create/revoke events
    const allSharesForAudit = await prisma.fileShare.findMany({
      where: { companyId: company.id },
      select: { id: true, fileId: true, createdByUserId: true, createdAt: true, shareType: true, isRevoked: true },
    });
    for (const sh of allSharesForAudit) {
      auditEntries.push({
        actorUserId: sh.createdByUserId,
        eventType: "FILE_SHARE_CREATE",
        targetType: "SHARE",
        targetId: sh.id,
        createdAt: sh.createdAt,
        metadata: { seed: true, shareType: sh.shareType },
      });
      if (sh.isRevoked) {
        auditEntries.push({
          actorUserId: users["th.vlachou@kolleris.gr"].id,
          eventType: "FILE_SHARE_REVOKE",
          targetType: "SHARE",
          targetId: sh.id,
          createdAt: daysAgo(randomBetween(3, 20)),
          metadata: { seed: true, reason: "GDPR — αρχείο με προσωπικά δεδομένα" },
        });
      }
    }

    // Policy events
    for (const [pName, pol] of Object.entries(policies)) {
      auditEntries.push({
        actorUserId: users["th.vlachou@kolleris.gr"].id,
        eventType: "POLICY_CREATE",
        targetType: "POLICY",
        targetId: pol.id,
        createdAt: daysAgo(250),
        metadata: { seed: true, policyName: pName },
      });
    }

    // User logins — every user logs in regularly
    for (const userEmail of userEmails) {
      const userId = users[userEmail].id;
      // Each user logs in every 1-3 days over the past 90 days
      for (let day = 0; day < 90; day += randomBetween(1, 3)) {
        auditEntries.push({
          actorUserId: userId,
          eventType: "USER_LOGIN",
          targetType: "USER",
          targetId: null,
          createdAt: hoursAgo(day * 24 + randomBetween(7, 18)),
          ipAddress: `192.168.1.${randomBetween(10, 200)}`,
          metadata: { seed: true },
        });
        // Some users also log out
        if (randomBetween(0, 2) === 0) {
          auditEntries.push({
            actorUserId: userId,
            eventType: "USER_LOGOUT",
            targetType: "USER",
            targetId: null,
            createdAt: hoursAgo(day * 24 + randomBetween(16, 22)),
            metadata: { seed: true },
          });
        }
      }
    }

    // User role changes
    auditEntries.push({
      actorUserId: adminId,
      eventType: "USER_ROLE_CHANGE",
      targetType: "USER",
      targetId: null,
      createdAt: daysAgo(180),
      metadata: { seed: true, from: "EMPLOYEE", to: "DEPARTMENT_MANAGER", user: "g.nikolaidis@kolleris.gr" },
    });
    auditEntries.push({
      actorUserId: adminId,
      eventType: "USER_ROLE_CHANGE",
      targetType: "USER",
      targetId: null,
      createdAt: daysAgo(150),
      metadata: { seed: true, from: "EMPLOYEE", to: "DPO", user: "th.vlachou@kolleris.gr" },
    });

    // Folder creation events
    for (const [name, folder] of Object.entries(folderMap)) {
      if (name === "root") continue;
      auditEntries.push({
        actorUserId: adminId,
        eventType: "FOLDER_CREATE",
        targetType: "FOLDER",
        targetId: folder.id,
        createdAt: daysAgo(260),
        metadata: { seed: true, folderName: name },
      });
    }

    // File rename and move events
    for (let i = 0; i < 8; i++) {
      const randomFile = activeFiles[randomBetween(0, activeFiles.length - 1)];
      auditEntries.push({
        actorUserId: users[randomFile.def.creator].id,
        eventType: "FILE_RENAME",
        targetType: "FILE",
        targetId: randomFile.id,
        createdAt: daysAgo(randomBetween(5, 60)),
        metadata: { seed: true, oldName: `${randomFile.def.name} (παλιό)`, newName: randomFile.def.name },
      });
    }
    for (let i = 0; i < 5; i++) {
      const randomFile = activeFiles[randomBetween(0, activeFiles.length - 1)];
      auditEntries.push({
        actorUserId: users[randomFile.def.creator].id,
        eventType: "FILE_MOVE",
        targetType: "FILE",
        targetId: randomFile.id,
        createdAt: daysAgo(randomBetween(10, 80)),
        metadata: { seed: true },
      });
    }

    // Policy assignment events
    for (const cf of createdFiles.filter((f) => f.def.deletion !== "ERASED").slice(0, 20)) {
      auditEntries.push({
        actorUserId: users["th.vlachou@kolleris.gr"].id,
        eventType: "POLICY_ASSIGN",
        targetType: "FILE",
        targetId: cf.id,
        createdAt: daysAgo(cf.def.daysAgo - 1),
        metadata: { seed: true },
      });
    }

    // Malware scan events — scan ALL files
    for (const cf of createdFiles) {
      const scanDay = cf.def.daysAgo - 1;
      auditEntries.push({
        actorUserId: users["a.stavrou@kolleris.gr"].id,
        eventType: "MALWARE_SCAN_STARTED",
        targetType: "FILE",
        targetId: cf.id,
        createdAt: hoursAgo(scanDay * 24 + 1),
        metadata: { seed: true },
      });
      auditEntries.push({
        actorUserId: users["a.stavrou@kolleris.gr"].id,
        eventType: "MALWARE_SCAN_RESULT",
        targetType: "FILE",
        targetId: cf.id,
        createdAt: hoursAgo(scanDay * 24),
        metadata: { seed: true, result: "CLEAN", engine: "ClamAV" },
      });
    }

    // Share access events from audit perspective
    for (const sh of allSharesForAudit) {
      const accesses = await prisma.fileShareAccess.findMany({
        where: { shareId: sh.id },
        select: { accessedAt: true, success: true },
      });
      for (const acc of accesses) {
        auditEntries.push({
          actorUserId: sh.createdByUserId,
          eventType: "FILE_SHARE_ACCESS",
          targetType: "SHARE",
          targetId: sh.id,
          createdAt: acc.accessedAt,
          metadata: { seed: true, success: acc.success },
        });
      }
    }

    // Batch insert audit logs
    await prisma.auditLog.createMany({
      data: auditEntries.map((e) => ({
        companyId: company.id,
        actorUserId: e.actorUserId,
        eventType: e.eventType as any,
        targetType: e.targetType as any,
        targetId: e.targetId,
        createdAt: e.createdAt,
        ipAddress: e.ipAddress ?? null,
        metadata: (e.metadata ?? undefined) as any,
      })),
    });

    console.log(`  Created ${createdFiles.length} files, ${Object.keys(folderMap).length} folders, ${auditEntries.length} audit logs.`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // I4RIA: Non-default company (for sharing / Super Admin)
  // ══════════════════════════════════════════════════════════════════════

  const companyI4ria = await prisma.company.upsert({
    where: { slug: "i4ria" },
    update: { isDefault: false },
    create: {
      name: "I4ria",
      slug: "i4ria",
      country: "GR",
      isDefault: false,
    },
  });

  const superAdminPassword = await hash("1f1femsk", 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: "gkozyris@i4ria.com" },
    update: {
      hashedPassword: superAdminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
      name: "Γιώργος Κοζύρης",
      companyId: company.id,
      departmentId: departments["Διοίκηση"]?.id ?? null,
    },
    create: {
      email: "gkozyris@i4ria.com",
      name: "Γιώργος Κοζύρης",
      companyId: company.id,
      departmentId: departments["Διοίκηση"]?.id ?? null,
      role: "SUPER_ADMIN",
      hashedPassword: superAdminPassword,
      isActive: true,
    },
  });

  // Create a company admin for I4ria
  const i4riaAdminPassword = await hash("admin123", 10);
  const i4riaAdmin = await prisma.user.upsert({
    where: { email: "admin@i4ria.com" },
    update: {
      hashedPassword: i4riaAdminPassword,
      role: "COMPANY_ADMIN",
      isActive: true,
      name: "I4ria Admin",
      companyId: companyI4ria.id,
    },
    create: {
      email: "admin@i4ria.com",
      name: "I4ria Admin",
      companyId: companyI4ria.id,
      departmentId: null,
      role: "COMPANY_ADMIN",
      hashedPassword: i4riaAdminPassword,
      isActive: true,
    },
  });

  let rootFolderI4ria = await prisma.folder.findFirst({
    where: { companyId: companyI4ria.id, parentFolderId: null },
  });
  if (!rootFolderI4ria) {
    rootFolderI4ria = await prisma.folder.create({
      data: {
        companyId: companyI4ria.id, parentFolderId: null,
        name: "Αρχεία", path: "/Αρχεία",
        isDepartmentRoot: false, createdByUserId: i4riaAdmin.id,
      },
    });
  }

  console.log("Seed completed.");
  console.log("  Super Admin: gkozyris@i4ria.com / 1f1femsk");
  console.log("  Company Admin (Kolleris): admin@kolleris.gr / admin123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
