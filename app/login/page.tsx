import { auth } from "@/auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { el } from "@/lib/i18n";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  if (session?.user) redirect("/dashboard");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-5 flex justify-center">
          <Image
            src="/logoFileShareX.png"
            alt={el.appName}
            width={240}
            height={80}
            className="h-auto w-full max-w-[240px] object-contain"
            priority
          />
        </div>
        <h2 className="mb-1 font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
          {el.loginTitle}
        </h2>
        <p className="mb-4 text-[var(--foreground)]/60" style={{ fontSize: "var(--text-body2)" }}>
          {el.loginSubtitle}
        </p>
        <LoginForm />
      </div>
      <p className="mt-5 max-w-sm text-center text-[var(--foreground)]/50" style={{ fontSize: "var(--text-caption)" }}>
        Χρησιμοποιήστε το email και τον κωδικό που σας παρέχει η εταιρεία σας.
      </p>
    </div>
  );
}
