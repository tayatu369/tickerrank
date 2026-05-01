import Link from "next/link";
import { HomeAuthNav } from "./components/home-auth-nav";

const features = [
  {
    icon: "⚡",
    title: "Instant Rating",
    body: "Type a ticker and get a letter-grade snapshot in seconds—no spreadsheets, no noise.",
  },
  {
    icon: "🎯",
    title: "Clear Signal",
    body: "A+ through F, plain English. Know where a name sits at a glance.",
  },
  {
    icon: "📊",
    title: "Data-Driven",
    body: "Ratings grounded in market and fundamentals—not hype or hot takes.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
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

      <main className="flex flex-1 flex-col px-4 pb-16 pt-12 sm:px-6 sm:pt-16 md:pt-20">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            TickerRank
          </h1>
          <p className="mt-3 text-lg font-medium text-[#3B82F6] sm:text-xl md:text-2xl">
            AI-Powered Stock Rating System
          </p>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
            Get an instant rating (A+ to F) on any US stock. Simple, clear,
            data-driven.
          </p>

          <form
            action="/rating"
            method="get"
            className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
          >
            <label className="sr-only" htmlFor="symbol">
              Stock ticker symbol
            </label>
            <input
              id="symbol"
              name="symbol"
              type="text"
              required
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Enter ticker, e.g. AAPL"
              className="min-h-12 w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-[#3B82F6] transition-[box-shadow,border-color] focus:border-[#3B82F6]/50 focus:ring-2"
            />
            <button
              type="submit"
              className="min-h-12 shrink-0 rounded-xl bg-[#3B82F6] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#3B82F6]/25 transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6] sm:w-auto"
            >
              Rate It
            </button>
          </form>
        </div>

        <section
          aria-labelledby="features-heading"
          className="mx-auto mt-20 w-full max-w-5xl sm:mt-24"
        >
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {features.map((item) => (
              <li key={item.title}>
                <article className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left sm:p-6">
                  <span className="text-2xl" aria-hidden>
                    {item.icon}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {item.body}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mt-auto border-t border-white/5 px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-5xl text-center text-xs text-slate-500">
          Not financial advice. NFA.
        </p>
      </footer>
    </div>
  );
}
