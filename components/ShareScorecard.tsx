"use client";

import { useCallback, useState } from "react";
import {
  EmailShareButton,
  EmailIcon,
  FacebookShareButton,
  FacebookIcon,
  LinkedinShareButton,
  LinkedinIcon,
  RedditShareButton,
  RedditIcon,
  TelegramShareButton,
  TelegramIcon,
  WhatsappShareButton,
  WhatsappIcon,
  TwitterShareButton,
  XIcon,
} from "react-share";

const OG_BASE = "https://tickerrank.com/og/rating";

const ICON_SIZE = 44;

export type ShareScorecardProps = {
  symbol: string;
  rating: string;
};

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

function LinkCopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function ShareScorecard({ symbol, rating }: ShareScorecardProps) {
  const sym = normalizeSymbol(symbol);
  const shareUrl = `${OG_BASE}/${encodeURIComponent(sym)}`;
  const shareTitle = `TickerRank: ${sym} rated ${rating.trim()}`;

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  const btnWrap =
    "relative flex min-h-[52px] items-center justify-center md:min-h-0";

  return (
    <div
      className="rounded-2xl border border-[#3B82F6]/25 bg-[#0B1120] p-4 shadow-lg shadow-black/30 sm:p-5"
    >
      <div className="flex flex-col gap-1 border-b border-white/10 pb-3">
        <h3 className="text-sm font-semibold text-white">
          Share scorecard
        </h3>
        <p className="text-xs text-white/70">
          <span className="font-mono font-semibold text-[#93C5FD]">{sym}</span>
          <span className="text-white/40"> · </span>
          <span className="text-white/90">Grade {rating.trim()}</span>
        </p>
      </div>

      <div
        className="mt-4 grid grid-cols-3 justify-items-center gap-x-2 gap-y-4 md:flex md:flex-row md:flex-wrap md:justify-center md:gap-x-3 md:gap-y-3"
        role="group"
        aria-label="Share on social or copy link"
      >
        <div className={btnWrap}>
          <TwitterShareButton
            url={shareUrl}
            title={shareTitle}
            resetButtonStyle={false}
            aria-label="Share on X (Twitter)"
            htmlTitle="Share on X"
            className="flex cursor-pointer rounded-full border border-white/10 bg-white/5 p-0 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
            style={{ lineHeight: 0 }}
          >
            <XIcon size={ICON_SIZE} round />
          </TwitterShareButton>
        </div>

        <div className={btnWrap}>
          <FacebookShareButton
            url={shareUrl}
            hashtag="#TickerRank"
            resetButtonStyle={false}
            aria-label="Share on Facebook"
            htmlTitle="Share on Facebook"
            className="flex cursor-pointer rounded-full border border-white/10 bg-white/5 p-0 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
            style={{ lineHeight: 0 }}
          >
            <FacebookIcon size={ICON_SIZE} round />
          </FacebookShareButton>
        </div>

        <div className={btnWrap}>
          <LinkedinShareButton
            url={shareUrl}
            title={shareTitle}
            summary={`See how ${sym} rates on TickerRank.`}
            source="tickerrank.com"
            resetButtonStyle={false}
            aria-label="Share on LinkedIn"
            htmlTitle="Share on LinkedIn"
            className="flex cursor-pointer rounded-full border border-white/10 bg-white/5 p-0 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
            style={{ lineHeight: 0 }}
          >
            <LinkedinIcon size={ICON_SIZE} round />
          </LinkedinShareButton>
        </div>

        <div className={btnWrap}>
          <RedditShareButton
            url={shareUrl}
            title={shareTitle}
            resetButtonStyle={false}
            aria-label="Share on Reddit"
            htmlTitle="Share on Reddit"
            className="flex cursor-pointer rounded-full border border-white/10 bg-white/5 p-0 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
            style={{ lineHeight: 0 }}
          >
            <RedditIcon size={ICON_SIZE} round />
          </RedditShareButton>
        </div>

        <div className={btnWrap}>
          <WhatsappShareButton
            url={shareUrl}
            title={shareTitle}
            resetButtonStyle={false}
            aria-label="Share on WhatsApp"
            htmlTitle="Share on WhatsApp"
            className="flex cursor-pointer rounded-full border border-white/10 bg-white/5 p-0 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
            style={{ lineHeight: 0 }}
          >
            <WhatsappIcon size={ICON_SIZE} round />
          </WhatsappShareButton>
        </div>

        <div className={btnWrap}>
          <TelegramShareButton
            url={shareUrl}
            title={shareTitle}
            resetButtonStyle={false}
            aria-label="Share on Telegram"
            htmlTitle="Share on Telegram"
            className="flex cursor-pointer rounded-full border border-white/10 bg-white/5 p-0 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
            style={{ lineHeight: 0 }}
          >
            <TelegramIcon size={ICON_SIZE} round />
          </TelegramShareButton>
        </div>

        <div className={btnWrap}>
          <EmailShareButton
            url={shareUrl}
            subject={`${sym} stock rating — TickerRank`}
            body={`${shareTitle}\n`}
            resetButtonStyle={false}
            aria-label="Share by email"
            htmlTitle="Share by email"
            className="flex cursor-pointer rounded-full border border-white/10 bg-white/5 p-0 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
            style={{ lineHeight: 0 }}
          >
            <EmailIcon size={ICON_SIZE} round />
          </EmailShareButton>
        </div>

        <div className={btnWrap}>
          <div className="relative flex flex-col items-center gap-1 md:flex-row">
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label="Copy link to scorecard image"
              title="Copy scorecard image URL"
              className="flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/15 text-white transition hover:bg-[#3B82F6]/25 md:h-10 md:w-auto md:gap-2 md:rounded-xl md:px-3 md:py-2"
            >
              <LinkCopyIcon className="shrink-0 text-[#93C5FD]" />
              <span className="hidden text-xs font-semibold text-[#93C5FD] md:inline">
                Copy link
              </span>
            </button>
            {copied ? (
              <span
                role="status"
                className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#0B1120] shadow-md ring-1 ring-black/10"
              >
                Copied!
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
