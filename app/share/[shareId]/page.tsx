import { el } from "@/lib/i18n";
import { SharePageClient } from "./share-page-client";

type Props = { params: Promise<{ shareId: string }> };

export default async function SharePage({ params }: Props) {
  const { shareId } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {el.sharePageTitle}
        </h1>
        <SharePageClient shareId={shareId} />
      </div>
    </div>
  );
}
