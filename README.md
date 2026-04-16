This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This project uses **pnpm** (not npm). Install pnpm if needed: `corepack enable pnpm`.

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Set `RESEND_API_KEY` in `.env` for OTP and transactional emails (Resend). Optionally set `RESEND_FROM` (e.g. `noreply@yourdomain.com`) when using a verified domain.

### Database & first login (deployment)

The app does **not** run database migrations or seeds automatically during build. To have users and data so you can log in:

1. **Option A – Release command (recommended)**  
   In your host (e.g. Railway), set the **Release Command** to:
   ```bash
   pnpm run release
   ```
   This runs `prisma db push` and `prisma db seed` before each deploy, so the schema is applied and seed users exist.

2. **Option B – One-time manual**  
   After the first deploy, with `DATABASE_URL` pointing at your production DB, run locally:
   ```bash
   pnpm run db:push
   pnpm run db:seed
   ```

Seed creates demo users you can use to log in:

- **Acme:** `admin@acme.com` / `admin123`
- **Admin:** `gkozyris@i4ria.com` / `1f1femsk`

Change or add users in `prisma/seed.ts` and re-run `pnpm run db:seed` as needed.

### Database backups (Super Admin)

Daily full dumps of all MySQL databases are supported: **mysqldump → gzip → Bunny CDN**, with records stored in the app.

- **Run once (CLI):** From project root (with `.env` containing `DATABASE_URL` and Bunny vars):
  ```bash
  pnpm run db:backup
  ```
  Requires `mysqldump` on `PATH` (e.g. MySQL client tools). Backups are stored under `db-backups/YYYY-MM/` in your Bunny storage zone.

- **Run from dashboard:** Log in as **Super Admin** → **Αντίγραφα ΒΔ** (DB Backups) → **Εκτέλεση αντιγράφου τώρα**.

- **Daily cron:** Run the script from a cron job (same machine that has `mysqldump` and network access to DB and Bunny), e.g.:
  ```bash
  0 3 * * * cd /path/to/app && pnpm run db:backup
  ```
  Or call the API with a secret (no browser session): set `BACKUP_CRON_SECRET` in `.env`, then:
  ```bash
  curl -X POST -H "X-Backup-Secret: $BACKUP_CRON_SECRET" "$NEXT_PUBLIC_SITE_URL/api/admin/db-backup"
  ```
  The API must be reachable (e.g. production URL); the script is better for cron when the job runs on the same server as the app.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel. [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# megaParkingFiles
