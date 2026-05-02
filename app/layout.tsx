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
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: "/icon.svg",
    apple: [{ url: "/icon.svg", sizes: "180x180" }],
  },
};

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
        <AppClerkProvider>{children}</AppClerkProvider>
      </body>
    </html>
  );
}
