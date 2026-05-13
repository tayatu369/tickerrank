import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio | TickerRank",
  description:
    "Rate up to 10 US tickers and see an AI composite portfolio score and risk readout.",
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
