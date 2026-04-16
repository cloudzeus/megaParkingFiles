import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM ?? "FileShareX <onboarding@resend.dev>";

function getResend(): Resend | null {
  if (!RESEND_API_KEY?.trim()) return null;
  return new Resend(RESEND_API_KEY);
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Στέλνει OTP για κοινοποίηση αρχείου (ελληνικό περιεχόμενο).
 * shareUrl: πλήρης σύνδεσμος για λήψη (π.χ. https://example.com/share/123).
 */
export async function sendOtpForShare(
  to: string,
  otp: string,
  fileName: string,
  shareUrl?: string
): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured" };

  const subject = "Κωδικός πρόσβασης για κοινοποιημένο αρχείο – FileShareX";
  const linkBlock = shareUrl
    ? `<p><strong>Σύνδεσμος λήψης:</strong> <a href="${escapeHtml(shareUrl)}" style="color: #2563eb;">${escapeHtml(shareUrl)}</a></p><p>Ανοίξτε τον σύνδεσμο και εισάγετε τον κωδικό παρακάτω για να κατεβάσετε το αρχείο.</p>`
    : "";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
  <p>Γεια σας,</p>
  <p>Σας έχει κοινοποιηθεί ένα αρχείο μέσω FileShareX.</p>
  <p><strong>Αρχείο:</strong> ${escapeHtml(fileName)}</p>
  ${linkBlock}
  <p><strong>Κωδικός πρόσβασης (OTP):</strong> <code style="background:#f0f0f0; padding: 4px 8px; border-radius: 4px;">${escapeHtml(otp)}</code></p>
  <p>Μην τον κοινοποιήσετε σε τρίτους.</p>
  <p style="color:#666; font-size: 0.9em;">— FileShareX</p>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Γενική αποστολή email (θεματική, ειδοποιήσεις, κ.λπ.).
 */
export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured" };

  const toList = Array.isArray(options.to) ? options.to : [options.to];
  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: toList,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Επιλογική: σύνδεσμος επαναφοράς κωδικού (για μελλοντική χρήση).
 */
export async function sendPasswordResetLink(
  to: string,
  resetUrl: string,
  expiresInMinutes: number = 60
): Promise<SendResult> {
  const subject = "Επαναφορά κωδικού – FileShareX";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
  <p>Γεια σας,</p>
  <p>Ζητήσατε επαναφορά κωδικού για το FileShareX.</p>
  <p><a href="${escapeHtml(resetUrl)}" style="color: #2563eb;">Επαναφορά κωδικού</a></p>
  <p>Ο σύνδεσμος ισχύει για ${expiresInMinutes} λεπτά.</p>
  <p>Αν δεν ζητήσατε εσείς αυτή την ενέργεια, αγνοήστε αυτό το email.</p>
  <p style="color:#666; font-size: 0.9em;">— FileShareX</p>
</body>
</html>
  `.trim();
  return sendMail({ to, subject, html });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
