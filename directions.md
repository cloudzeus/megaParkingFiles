<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# can you generate an .md file with all information you generate to add it to my cursor project folder

Here’s a single Markdown document combining everything into one spec file you can drop into your Cursor project, e.g. `docs/filesharex-spec.md`.[^1][^2][^3]

***

# FileShareX – Secure Enterprise File Sharing \& Governance Platform

Build an enterprise‑grade file share management web application, similar to Synology Drive/File Station but browser‑based, integrated with **Bunny CDN** for external delivery, and designed for **strict GDPR and security compliance**.[^4][^5][^6][^7]

The app must support robust RBAC, department‑based access, malware scanning, AI‑assisted classification, OTP‑protected sharing, and full auditability of all file operations.

***

## 1. Tech Stack \& Global Rules

### 1.1 Core stack

- Framework: **Next.js 16+ App Router**, TypeScript, server components by default.
- UI: **shadcn/ui** on top of **Tailwind CSS 4.1**.[^8]
- Auth: **Auth.js** (NextAuth) with Prisma adapter for MySQL.[^9][^10][^11]
- DB: **MySQL** with **Prisma ORM**.[^12][^13]
- Storage/CDN: **Bunny.net (Bunny CDN) Storage API** for file objects, signed download URLs, and deletion.[^6][^14][^15]
- Malware detection: Server‑side scanning service (pluggable; start with a local scanner interface to be swapped with a real engine).
- AI classification: **DeepSeek API** for document categorization, sensitivity labeling, and PII/GDPR hints.[^16]
- Deployment target: Linux server or container, single region initially.


### 1.2 Architecture rules

- Prefer **server components** everywhere; use client components only where interactivity is required (right‑click menus, drag \& drop, uploads, etc.).[^17]
- Use a clean **feature‑based folder structure**:
    - `app/(dashboard)/files/...`
    - `app/(dashboard)/departments/...`
    - `app/(dashboard)/reports/...`
    - `app/api/...` for route handlers.
    - `lib/` for shared logic (auth, bunny, malware, gdpr, deepseek, audit).
    - `components/` for reusable UI elements (file browser, context menu, upload queue, etc.).
- Implement strict **RBAC** based on:
    - Company
    - Department
    - Role (Admin, Dept Manager, Employee, Auditor, DPO).
- Every action that reads, writes, shares, deletes, or changes permissions on files **must be audited** in a central audit log table for GDPR and security requirements.[^18][^4]


### 1.3 Coding \& UX rules

- Use shadcn/ui primitives for layout (Sidebar, Menus, Dialogs, DropdownMenu, ContextMenu, Tabs, DataTable, Toasts).
- Keep styling in Tailwind utility classes; minimize custom CSS.[^8]
- Always validate server‑side; never trust client‑only checks for GDPR or malware.
- Use optimistic UI only when it does not risk GDPR/malware violations. For sensitive actions (delete, share, change policy) wait for server confirmation.
- Provide clear error states and toasts for all operations.

***

## 2. Core Product Concept

The app is a **secure enterprise file management and sharing platform** for companies:

- Internal users manage company documents (per department, per project, etc.), similar to Synology NAS shares but within a modern web UI.[^5][^7][^4]
- Files are stored in Bunny Storage and delivered via Bunny CDN for external shares, using signed URLs and API‑driven deletes.[^14][^6]
- The system enforces **GDPR‑aware sharing**, with PII detection, prevention of risky shares, logging of every attempt, and erasure/preservation policies.[^19][^20]
- Users can right‑click on files/folders and use drag \& drop operations, similar to Windows Explorer or Synology File Station.[^7][^21][^22]

***

## 3. Multi‑Tenant Company \& User Model

### 3.1 Entities

Implement at least these entities in Prisma (see schema in section 4):

- `Company`
- `Department`
- `User` (+ Auth.js models `Account`, `Session`, `VerificationToken`)
- `Folder`
- `File`
- `FileVersion`
- `FolderPermission`
- `RetentionPolicy`
- `FileRetention`
- `ErasureProof`
- `FileCategory`
- `FileTag`
- `FileClassificationJob`
- `FileShare`
- `FileShareAccess`
- `AuditLog`


### 3.2 Access control model

- A user belongs to exactly one company.
- Departments group users and have default permissions on department root folders.
- Role‑based permissions:
    - `SUPER_ADMIN`: global admin for the SaaS, manages companies and system settings.
    - `COMPANY_ADMIN`: manages company settings, departments, users, policies, global shares.
    - `DEPARTMENT_MANAGER`: manages files and shares within their department.
    - `EMPLOYEE`: limited to their own files and department rules.
    - `AUDITOR`: read‑only access to logs, limited file access.
    - `DPO`: can view all GDPR logs, manage policies, approve/reject risky operations.
- Implement policy‑based helpers:
    - `canReadFile(user, file)`
    - `canWriteFile(user, file)`
    - `canShareFile(user, file)`
    - `canManagePolicies(user)`
    - `canViewAudit(user, scope)`
- All file operations must flow through these helpers before hitting Bunny or DB.

***

## 4. Prisma Schema Skeleton

Use this Prisma schema as the starting point (file: `prisma/schema.prisma`).[^13][^23][^24][^12]

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Enums

enum UserRole {
  SUPER_ADMIN
  COMPANY_ADMIN
  DEPARTMENT_MANAGER
  EMPLOYEE
  AUDITOR
  DPO
}

enum MalwareStatus {
  PENDING
  CLEAN
  INFECTED
  FAILED
}

enum GdprRiskLevel {
  UNKNOWN
  NO_PII_DETECTED
  POSSIBLE_PII
  CONFIRMED_PII
}

enum ClassificationStatus {
  PENDING
  DONE
  FAILED
}

enum DeletionStatus {
  ACTIVE
  SOFT_DELETED
  PENDING_ERASURE
  ERASED
}

enum ShareType {
  INTERNAL_LINK
  EXTERNAL_OTP
}

enum ShareAccessReason {
  OK
  EXPIRED
  WRONG_OTP
  GDPR_BLOCKED
  MALWARE_BLOCKED
  OTHER
}

enum EventType {
  FILE_UPLOAD
  FILE_DOWNLOAD
  FILE_DELETE
  FILE_MOVE
  FILE_RENAME
  FILE_SHARE_CREATE
  FILE_SHARE_ACCESS
  FILE_SHARE_REVOKE
  POLICY_CREATE
  POLICY_UPDATE
  POLICY_ASSIGN
  GDPR_PII_DETECTED
  GDPR_SHARE_BLOCKED
  GDPR_ERASURE_COMPLETED
  MALWARE_SCAN_STARTED
  MALWARE_SCAN_RESULT
  USER_LOGIN
  USER_LOGOUT
  USER_ROLE_CHANGE
}

enum TargetType {
  FILE
  FOLDER
  USER
  DEPARTMENT
  COMPANY
  POLICY
  SHARE
  OTHER
}

enum FolderPermissionSubjectType {
  DEPARTMENT
  ROLE
  USER
}

// Core models

model Company {
  id                          Int                 @id @default(autoincrement())
  name                        String
  slug                        String              @unique
  country                     String?
  bunnyStorageZoneName        String?
  bunnyStorageAccessKey       String?
  defaultDataRetentionPolicyId Int?

  departments                 Department[]
  users                       User[]
  folders                     Folder[]
  files                       File[]
  retentionPolicies           RetentionPolicy[]
  erasureProofs               ErasureProof[]
  fileShares                  FileShare[]
  auditLogs                   AuditLog[]
  fileCategories              FileCategory[]

  createdAt                   DateTime            @default(now())
  updatedAt                   DateTime            @updatedAt

  defaultRetentionPolicy      RetentionPolicy?    @relation("CompanyDefaultPolicy", fields: [defaultDataRetentionPolicyId], references: [id])
}

model Department {
  id          Int       @id @default(autoincrement())
  companyId   Int
  name        String
  description String?

  company     Company   @relation(fields: [companyId], references: [id])
  users       User[]
  folders     Folder[]
  files       File[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model User {
  id             Int        @id @default(autoincrement())
  companyId      Int
  departmentId   Int?
  email          String     @unique
  name           String?
  hashedPassword String?
  role           UserRole   @default(EMPLOYEE)
  isActive       Boolean    @default(true)

  company        Company    @relation(fields: [companyId], references: [id])
  department     Department? @relation(fields: [departmentId], references: [id])

  createdFiles   File[]     @relation("FileCreatedBy")
  createdFolders Folder[]   @relation("FolderCreatedBy")
  createdShares  FileShare[] @relation("ShareCreatedBy")
  erasures       ErasureProof[] @relation("ErasureByUser")
  auditLogs      AuditLog[] @relation("AuditActor")

  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}

// Auth.js models (Prisma adapter)

model Account {
  id                 Int      @id @default(autoincrement())
  userId             Int
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           Int      @id @default(autoincrement())
  sessionToken String   @unique
  userId       Int
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@id([identifier, token])
}

// File system

model Folder {
  id               Int          @id @default(autoincrement())
  companyId        Int
  parentFolderId   Int?
  departmentId     Int?
  name             String
  path             String
  isDepartmentRoot Boolean      @default(false)
  createdByUserId  Int

  company          Company      @relation(fields: [companyId], references: [id])
  parentFolder     Folder?      @relation("FolderToSubfolders", fields: [parentFolderId], references: [id])
  subfolders       Folder[]     @relation("FolderToSubfolders")
  department       Department?  @relation(fields: [departmentId], references: [id])
  createdBy        User         @relation("FolderCreatedBy", fields: [createdByUserId], references: [id])

  files            File[]
  permissions      FolderPermission[]

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
}

model File {
  id                    Int                 @id @default(autoincrement())
  companyId             Int
  folderId              Int
  departmentId          Int?
  name                  String
  extension             String?
  sizeBytes             Int
  mimeType              String?
  bunnyStoragePath      String
  createdByUserId       Int
  uploadedAt            DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  malwareStatus         MalwareStatus      @default(PENDING)
  gdprRiskLevel         GdprRiskLevel      @default(UNKNOWN)
  classificationStatus  ClassificationStatus @default(PENDING)
  deletionStatus        DeletionStatus     @default(ACTIVE)
  deletionProofId       Int?

  company               Company            @relation(fields: [companyId], references: [id])
  folder                Folder             @relation(fields: [folderId], references: [id])
  department            Department?        @relation(fields: [departmentId], references: [id])
  createdBy             User               @relation("FileCreatedBy", fields: [createdByUserId], references: [id])
  deletionProof         ErasureProof?      @relation(fields: [deletionProofId], references: [id])

  versions              FileVersion[]
  retentions            FileRetention[]
  tags                  FileTag[]
  shares                FileShare[]
  categories            FileCategory[]     @relation("FileCategories")
  classificationJobs    FileClassificationJob[]
  shareAccessEvents     FileShareAccess[]
  erasureProofs         ErasureProof[]

  createdAt             DateTime           @default(now())
}

model FileVersion {
  id               Int      @id @default(autoincrement())
  fileId           Int
  versionNumber    Int
  bunnyStoragePath String
  hash             String?
  sizeBytes        Int
  createdAt        DateTime @default(now())

  file             File     @relation(fields: [fileId], references: [id])
}

model FolderPermission {
  id          Int                         @id @default(autoincrement())
  folderId    Int
  subjectType FolderPermissionSubjectType
  subjectId   Int
  canRead     Boolean                     @default(true)
  canWrite    Boolean                     @default(false)
  canShare    Boolean                     @default(false)
  canManage   Boolean                     @default(false)

  folder      Folder                      @relation(fields: [folderId], references: [id])
}

// Retention & erasure

model RetentionPolicy {
  id                Int        @id @default(autoincrement())
  companyId         Int
  name              String
  description       String?
  durationDays      Int?
  autoDelete        Boolean    @default(false)
  legalHoldAllowed  Boolean    @default(true)

  company           Company    @relation(fields: [companyId], references: [id])

  fileRetentions    FileRetention[]
  erasureProofs     ErasureProof[]

  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
}

model FileRetention {
  id             Int       @id @default(autoincrement())
  fileId         Int
  policyId       Int
  effectiveFrom  DateTime  @default(now())
  effectiveTo    DateTime?
  underLegalHold Boolean   @default(false)
  lastEvaluatedAt DateTime?

  file           File      @relation(fields: [fileId], references: [id])
  policy         RetentionPolicy @relation(fields: [policyId], references: [id])
}

model ErasureProof {
  id                   Int        @id @default(autoincrement())
  companyId            Int
  fileId               Int
  policyId             Int?
  erasedAt             DateTime
  erasedBySystemUserId Int?
  method               String
  bunnyDeleteResponse  Json?
  hashBeforeDelete     String?

  company              Company    @relation(fields: [companyId], references: [id])
  file                 File       @relation(fields: [fileId], references: [id])
  policy               RetentionPolicy? @relation(fields: [policyId], references: [id])
  erasedBy             User?      @relation("ErasureByUser", fields: [erasedBySystemUserId], references: [id])
}

// AI classification

model FileCategory {
  id          Int      @id @default(autoincrement())
  companyId   Int
  name        String
  description String?

  company     Company  @relation(fields: [companyId], references: [id])

  files       File[]   @relation("FileCategories")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model FileTag {
  id        Int     @id @default(autoincrement())
  fileId    Int
  key       String
  value     String
  source    String

  file      File    @relation(fields: [fileId], references: [id])
}

model FileClassificationJob {
  id                        Int       @id @default(autoincrement())
  fileId                    Int
  status                    ClassificationStatus @default(PENDING)
  deepseekRequestPayload    Json?
  deepseekResponsePayload   Json?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  file                      File      @relation(fields: [fileId], references: [id])
}

// Sharing & OTP

model FileShare {
  id                   Int        @id @default(autoincrement())
  companyId            Int
  fileId               Int
  createdByUserId      Int
  shareType            ShareType  @default(EXTERNAL_OTP)
  requireOtp           Boolean    @default(true)
  otpSaltedHash        String?
  otpLength            Int?
  createdAt            DateTime   @default(now())
  expiresAt            DateTime?
  maxDownloads         Int?
  remainingDownloads   Int?
  isRevoked            Boolean    @default(false)
  lastOtpSentAt        DateTime?

  company              Company    @relation(fields: [companyId], references: [id])
  file                 File       @relation(fields: [fileId], references: [id])
  createdBy            User       @relation("ShareCreatedBy", fields: [createdByUserId], references: [id])
  accesses             FileShareAccess[]

  @@index([fileId])
  @@index([companyId])
}

model FileShareAccess {
  id          Int                @id @default(autoincrement())
  shareId     Int
  accessedAt  DateTime           @default(now())
  ipAddress   String?
  userAgent   String?
  success     Boolean            @default(false)
  reason      ShareAccessReason  @default(OTHER)
  download    Boolean            @default(false)

  share       FileShare          @relation(fields: [shareId], references: [id])
}

// Audit logging

model AuditLog {
  id           Int         @id @default(autoincrement())
  companyId    Int
  actorUserId  Int?
  eventType    EventType
  targetType   TargetType
  targetId     Int?
  ipAddress    String?
  userAgent    String?
  metadata     Json?
  createdAt    DateTime    @default(now())

  company      Company     @relation(fields: [companyId], references: [id])
  actor        User?       @relation("AuditActor", fields: [actorUserId], references: [id])
}
```


***

## 5. GDPR \& PII Safeguards

### 5.1 PII detection and blocking

- Before finalizing any **external share**:
    - Run a GDPR/PII check using DeepSeek classification + local PII rules, then set `File.gdprRiskLevel`.
- If risk is `POSSIBLE_PII` or `CONFIRMED_PII`:
    - Block sharing by default, with an override workflow that requires DPO/Company Admin approval.
- Log every attempt to share PII files in `AuditLog` with:
    - `eventType` `GDPR_PII_DETECTED`, `GDPR_SHARE_BLOCKED`, or `FILE_SHARE_CREATE` as appropriate.


### 5.2 Preservation policies

- `RetentionPolicy` + `FileRetention`:
    - On upload, assign default company or department policy.
    - A scheduled worker evaluates records and marks due files as `PENDING_ERASURE`.
- Legal hold:
    - If `underLegalHold = true`, skip deletion even when due.


### 5.3 Proof of deletion

- `ErasureProof` records:
    - Erasure time, method, before‑delete hash, and Bunny delete API response as JSON.[^15][^6]
- When actually deleting:
    - Delete from Bunny Storage, create `ErasureProof`, set file `deletionStatus = ERASED`, and link via `deletionProofId`.

***

## 6. Malware Detection

- After upload:
    - Mark file `malwareStatus = PENDING`.
    - Call `lib/malware.ts` to scan:
        - On clean: set `CLEAN`, allow operations.
        - On infected: set `INFECTED`, block downloads/shares, optionally quarantine/delete and log incident.
- Define a simple scanner interface:
    - `scanFile(fileId: number): Promise<{ status: MalwareStatus; details?: string }>`.

***

## 7. AI Document Categorization (DeepSeek)

- Goals:
    - Assign categories (HR, Legal, Finance, etc.).
    - Assign sensitivity (Public, Internal, Confidential, Secret).
    - Refine GDPR risk.
    - Generate tags.
- Flow:
    - After upload \& malware clean:
        - Extract text from supported formats (design stub).
        - Call DeepSeek with prompt to output category, sensitivity, GDPR risk, and tags.
        - Store in `FileCategory`, `FileTag`, `FileClassificationJob`, and update `File.gdprRiskLevel`.

***

## 8. Sharing Model (OTP \& Audit)

- `FileShare` stores share configuration (internal/external, OTP requirement, limits).
- OTP flow:
    - Generate OTP, store salted hash only, show once to creator.
    - For each access:
        - Validate OTP.
        - Check malware, GDPR, retention/deletion.
        - Record `FileShareAccess` with success/failure reason.
- Any blocked access (GDPR or malware) must also create an `AuditLog` entry.

***

## 9. UI / UX Guidelines

### 9.1 Layout \& navigation

Design a **three‑pane file manager**:

- Left sidebar:
    - Company selector (for SUPER_ADMIN), department list, quick filters (Recent, Shared with me, At risk, Under legal hold).
- Main pane:
    - File/folder view with view switcher (List | Grid | Compact).
    - Breadcrumbs at top, clickable segments, optional breadcrumb context menu.
- Right details pane:
    - Metadata: owner, size, dates, department, path.
    - Security: malware status, GDPR risk, retention policy, legal hold.
    - AI: category, sensitivity, tags.
    - Actions: Open, Download, Share, View audit log.


### 9.2 File \& folder views

Implement three views:

- **List view**:
    - Columns: Name, Type, Size, Modified, Department, Category, Sensitivity, GDPR risk, Retention policy.
    - Multi‑select, sorting, column resizing/re‑ordering.
- **Grid view**:
    - Tiles with icons, names, and badges (PII risk, malware, legal hold).
    - Better for visual content.
- **Compact view**:
    - Dense list for power users (smaller rows, fewer columns).

Use shadcn/ui DataTable or similar components to build these views.

### 9.3 Right‑click / context menu

Use shadcn `ContextMenu` wrapped into reusable components like `FileContextMenu` and `FolderContextMenu`.[^22]

- Trigger:
    - Right‑click (desktop) or long‑press (mobile where feasible).
- Behavior:
    - Right‑click on unselected item first selects it, then opens menu.
    - Right‑click on already selected items: menu applies to the full selection.
- Menu actions (filter by type and RBAC):
    - Open / Preview
    - Download
    - Download as ZIP (single folder or multi‑selection)
    - Rename
    - Move to…
    - Copy / Cut / Paste
    - New Folder (when on empty area or folder background)
    - Create internal share link
    - Create external OTP share
    - View GDPR \& classification info
    - Change retention policy
    - Place / remove legal hold
    - View audit log for this item
    - Delete (respecting retention and legal hold)


### 9.4 Drag \& drop interactions

Follow drag \& drop best practices for clarity and feedback.[^21][^25][^26]

- Moving items:
    - Drag selected files/folders onto:
        - Another folder in main view.
        - A folder in the sidebar tree.
    - Show ghost preview (number of items) and highlight drop target.
    - If user lacks permission, show “not allowed” cursor and an error toast on drop.
- Uploading via drag \& drop:
    - Dropping on main view or folder in sidebar:
        - Highlight drop zone and show target path.
    - Accept `DataTransfer.files` and map to target folder.


### 9.5 Directory upload

Support **directory upload** using modern browser capabilities.[^27][^28][^29]

- Implement:
    - “Upload folder” button using `<input type="file" webkitdirectory>`.[^28][^30]
    - Dragging a folder from OS explorer into drop zone, using `webkitRelativePath` or File and Directory Entries API when available.[^27]
- Behavior:
    - Preserve directory hierarchy when persisting `Folder` + `File` records.
    - Show hierarchical upload progress:
        - Overall folder progress.
        - Optional per‑file status in an upload queue panel.
- Fallback:
    - If directory upload unsupported, show a note and fall back to multi‑file upload.


### 9.6 Download entire directory

Provide a “Download as ZIP” action:

- Available for:
    - A single folder.
    - Multi‑selection of files and folders.
- Server behavior:
    - Walk folder tree, stream ZIP archive preserving structure.
    - Return as file download.
- UI:
    - Show a modal or toast for progress if zipping is slow.
    - Enforce size limits; show errors if selection exceeds limits.


### 9.7 Selection \& keyboard shortcuts

Implement standard desktop file manager behavior:

- Selection:
    - Single click selects; double‑click opens.
    - Shift+click: range select.
    - Ctrl/Cmd+click: toggle multi‑select.
    - Click blank space: clear selection.
- Shortcuts:
    - Enter: open.
    - Delete/Backspace: delete (with confirm).
    - Ctrl/Cmd+C / V / X: copy / paste / cut.
    - Ctrl/Cmd+A: select all.
    - F2: rename.

Ensure visible focus states and a clear distinction between focused and selected rows/tiles.

### 9.8 Upload \& processing feedback

Show a persistent **upload queue panel**:

- Dock at bottom or right.
- For each item:
    - Name (and relative path for directory uploads).
    - Progress bar.
    - Status: Uploading, Malware scan, Classifying, Done, Failed.
- Global toasts:
    - On success: “X files uploaded. Malware scanning in progress.”
    - On error: specific reason (size limit, blocked type, malware, connectivity).

***

## 10. API Routes \& Server Logic (High‑Level)

Create Next.js App Router API endpoints such as:

- `POST /api/files/upload`
    - Multipart upload.
    - Stream to Bunny Storage.
    - Create `File` + `Folder` (for directories).
    - Enqueue malware + classification jobs.
    - Log `FILE_UPLOAD`.
- `GET /api/files/:id/download`
    - RBAC, malware, GDPR, retention checks.
    - Generate Bunny signed URL and proxy/redirect.
    - Log `FILE_DOWNLOAD`.
- `POST /api/files/:id/share`
    - Create internal/external share.
    - For external, run GDPR checks, possibly block and log.
- `POST /api/shares/:id/access`
    - Validate OTP.
    - Check security \& compliance.
    - Record `FileShareAccess`.
- `POST /api/files/:id/delete`
    - Check retention policy and legal hold.
    - If allowed immediate delete:
        - Delete from Bunny, create `ErasureProof`, set `deletionStatus = ERASED`.
    - Else mark `PENDING_ERASURE`.
- `POST /api/policies`
    - CRUD for retention policies (admin/DPO only).

Background jobs can be implemented via cron‑like triggers or a simple job queue:

- Malware scan worker.
- Classification worker.
- Retention evaluation and erasure worker.

***

## 11. Departments \& Permissions

- Each department has a root folder (e.g. `/Departments/HR`).
- `FolderPermission` defines ACL‑like behavior per folder and subject:
    - Subject type: department, role, or user.
    - Flags: `canRead`, `canWrite`, `canShare`, `canManage`.
- Company‑wide shared area and private area for user workspaces:
    - Shared: cross‑department folders with custom ACLs.
    - Private: personal workspace (still company‑owned) linked to user.

***

## 12. Audit Logging \& Reporting

- `AuditLog` records every important action with:
    - Company, actor, event type, target type, target id, IP, UA, metadata JSON, timestamp.
- Reports UI:
    - Filters by date, user, department, eventType, target.
    - Tables with export to CSV.
    - High‑level metrics:
        - Malware incidents over time.
        - GDPR‑blocked shares vs allowed.
        - Files under legal hold vs scheduled for erasure.

***

You can save this entire file as `docs/filesharex-spec.md` in your Cursor project and point Cursor to it as the main project instructions so it can scaffold the app, database, and UI components accordingly.[^2][^3][^31][^1]
<span style="display:none">[^32]</span>

<div align="center">⁂</div>

[^1]: https://forum.cursor.com/t/guide-how-to-handle-big-projects-with-cursor/70997

[^2]: https://forum.cursor.com/t/cursor-for-complex-projects/38911

[^3]: https://monday.com/blog/rnd/cursor-ai-integration/

[^4]: https://www.manageengine.com/products/active-directory-audit/synology-file-access-log.html

[^5]: https://manuals.plus/m/eead0f043d32896502822fd8de778995ef76e3a02f66f34d36632ed4deb3cf1c

[^6]: https://docs.bunny.net/reference/storage-api

[^7]: https://global.download.synology.com/download/Document/Software/DeveloperGuide/Package/FileStation/All/enu/Synology_File_Station_API_Guide.pdf

[^8]: programming.web_stack

[^9]: https://www.perplexity.ai/search/20f96c98-7e5f-44af-bae6-a3a69d1429bf

[^10]: https://authjs.dev/getting-started/adapters/prisma

[^11]: https://next-auth.js.org/v3/adapters/prisma

[^12]: https://github.com/prisma/prisma/issues/11330

[^13]: https://www.prisma.io/docs/orm/prisma-schema/data-model/models

[^14]: https://www.prisma.io/docs/orm/overview/databases/mysql

[^15]: https://www.npmjs.com/package/bunnycdn-storage

[^16]: https://github.com/cp6/BunnyCDN-API/blob/master/README.md

[^17]: https://www.perplexity.ai/search/b7e4234c-533b-41e4-bf5a-578019c81c09

[^18]: https://www.perplexity.ai/search/9108311a-e25a-4c33-91a6-3fd31ea81899

[^19]: https://download.manageengine.com/products/active-directory-audit/guide-to-configure-synology-diskstation-nas-in-adauditplus.pdf

[^20]: https://pii-tools.com/gdpr-compliance-in-3-easy-steps/

[^21]: https://www.cookieyes.com/blog/gdpr-scanning-software/

[^22]: https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/

[^23]: https://www.telerik.com/kendo-jquery-ui/documentation/controls/filemanager/context-menu

[^24]: https://devcodef1.com/news/1005196/enum-in-prisma-with-mysql-a-guide

[^25]: https://stackoverflow.com/questions/76256125/enum-in-prisma-with-mysql

[^26]: https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop

[^27]: https://www.linkedin.com/pulse/design-guide-drag-and-drop-ux-vitaly-friedman

[^28]: https://wicg.github.io/entries-api/

[^29]: https://www.smashingmagazine.com/2017/09/uploading-directories-with-webkitdirectory/

[^30]: https://www.telerik.com/kendo-jquery-ui/documentation/api/javascript/ui/upload/configuration/directory

[^31]: https://webkit.org/blog/8170/clipboard-api-improvements/

[^32]: https://www.reddit.com/r/ChatGPTCoding/comments/1guy4sz/cursor_ai_to_build_web_application_from_scratch/

