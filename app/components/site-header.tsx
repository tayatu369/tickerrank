import Link from "next/link";
import { HomeAuthNav } from "./home-auth-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-white/5 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6] text-sm font-bold text-white"
            aria-hidden
          >
            TR
          </span>
          <span>TickerRank</span>
        </Link>
        <HomeAuthNav />
      </div>
    </header>
  );
}
