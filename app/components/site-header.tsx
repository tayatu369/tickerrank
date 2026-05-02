import Link from "next/link";
import { HomeAuthNav } from "./home-auth-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-white/5 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2 outline-none ring-[#3B82F6] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo */}
          <img
            src="/icon.svg"
            alt="TickerRank"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-lg"
          />
          <span className="truncate text-sm font-bold tracking-tight text-slate-50 sm:text-lg">
            TickerRank
          </span>
        </Link>
        <HomeAuthNav />
      </div>
    </header>
  );
}
