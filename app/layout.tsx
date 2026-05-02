import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppClerkProvider } from "./components/app-clerk-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tickerrank.com"),
  title: "TickerRank — AI-Powered Stock Rating System",
  description:
    "Get an instant rating (A+ to F) on any US stock. Simple, clear, data-driven.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

/** Server-side read; inlined into the client bundle for NEXT_PUBLIC_* at build time. */
const clerkPublishableKey = (
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""
).trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-[#0B1120] text-slate-100"
        suppressHydrationWarning
      >
        {/* Ensure the production instance in Clerk Dashboard has the domain tickerrank.com added under Production → Domains, otherwise Clerk UI will not render. */}
        <AppClerkProvider publishableKey={clerkPublishableKey}>
          {children}
        </AppClerkProvider>
      </body>
    </html>
  );
}
