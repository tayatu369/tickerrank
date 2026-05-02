import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:justify-start"
          aria-label="Legal"
        >
          <Link
            href="/privacy"
            className="text-slate-400 transition-colors hover:text-[#3B82F6]"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-slate-400 transition-colors hover:text-[#3B82F6]"
          >
            Terms of Service
          </Link>
        </nav>
        <p className="max-w-md text-center text-xs text-slate-500 sm:text-right">
          Not financial advice. NFA.
        </p>
      </div>
    </footer>
  );
}
