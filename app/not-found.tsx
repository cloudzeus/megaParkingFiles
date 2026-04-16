import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Η σελίδα δεν βρέθηκε
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Το περιεχόμενο που ζητήσατε δεν υπάρχει ή έχει μετακινηθεί.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Αρχική σελίδα
      </Link>
    </div>
  );
}
