import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Stock rating | TickerRank",
  description: "AI-powered letter grade and breakdown for US equities.",
};

export default function RatingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
          <div className="border-b border-white/5 px-4 py-4 sm:px-6">
            <div className="mx-auto h-8 max-w-5xl animate-pulse rounded-lg bg-white/10" />
          </div>
          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
            <div className="h-10 w-48 animate-pulse rounded-lg bg-white/10" />
            <div className="mt-8 h-32 animate-pulse rounded-2xl bg-white/10" />
          </main>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
