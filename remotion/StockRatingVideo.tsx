import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CSSProperties } from "react";

export type RatingLabel = "Bullish" | "Bearish" | "Neutral";

export type HookMood =
  | "shock"
  | "surprise"
  | "contrarian"
  | "caution"
  | "highlight";

export type HookStyle = "bigText" | "question" | "statistic";

export type HookTemplate = {
  hookText: string;
  mood: HookMood;
  textColor: string;
  introDuration: number;
  style: HookStyle;
};

/** 10 scripted hook variants for short-form videos. */
export const HOOK_TEMPLATES: HookTemplate[] = [
  {
    hookText: "Tesla TSLA just got rated F by AI… this is insane!",
    mood: "shock",
    textColor: "#EF4444",
    introDuration: 90,
    style: "bigText",
  },
  {
    hookText: "Nvidia NVDA gets a C-! 99% of investors are missing this.",
    mood: "surprise",
    textColor: "#EAB308",
    introDuration: 90,
    style: "statistic",
  },
  {
    hookText: "Apple AAPL rated B+ – you won’t believe why.",
    mood: "surprise",
    textColor: "#FDE047",
    introDuration: 90,
    style: "question",
  },
  {
    hookText: "Top trending stock AMZN got a D! Shocking for many investors.",
    mood: "caution",
    textColor: "#FBBF24",
    introDuration: 90,
    style: "bigText",
  },
  {
    hookText: "MSFT receives a B rating – surprising twist!",
    mood: "surprise",
    textColor: "#FACC15",
    introDuration: 90,
    style: "bigText",
  },
  {
    hookText: "Everyone is bullish on META, AI says C+ – watch this.",
    mood: "contrarian",
    textColor: "#FB923C",
    introDuration: 105,
    style: "bigText",
  },
  {
    hookText: "SPY ETF scored A- by AI – here’s why it matters.",
    mood: "highlight",
    textColor: "#93C5FD",
    introDuration: 90,
    style: "statistic",
  },
  {
    hookText: "NIO gets a F rating – shocking for EV enthusiasts!",
    mood: "shock",
    textColor: "#F87171",
    introDuration: 90,
    style: "bigText",
  },
  {
    hookText: "QQQ just got a B rating – surprising trend revealed.",
    mood: "surprise",
    textColor: "#FDE047",
    introDuration: 90,
    style: "bigText",
  },
  {
    hookText: "NFLX F rating – streaming giant not what it seems.",
    mood: "contrarian",
    textColor: "#F472B6",
    introDuration: 105,
    style: "question",
  },
];

export type StockRatingVideoProps = {
  stock: string;
  rating: string;
  label: RatingLabel;
  score: number;
  reason1: string;
  reason2: string;
  screenshotUrl: string;
  audioUrl: string;
  /** Picks hook copy & mood (0–9). */
  templateIndex?: number;
};

const NAVY = "#0B1120";
const ACCENT = "#3B82F6";

/** Seconds of main story (between open/close branding). */
export function getMainStorySecondsForTemplate(templateIndex: number): number {
  const ti = ((templateIndex % 10) + 10) % 10;
  if (ti === 0 || ti === 5) return 35;
  if (ti % 2 === 1) return 25;
  return 30;
}

export function getMainStoryFramesForTemplate(
  templateIndex: number,
  fps: number,
): number {
  return Math.round(getMainStorySecondsForTemplate(templateIndex) * fps);
}

/** Bookend length on each end (seconds). */
export const BRANDING_SECONDS_BOOKEND = 2;

export function getBrandingFramesTotal(fps: number): number {
  return Math.round(BRANDING_SECONDS_BOOKEND * fps) * 2;
}

export function getTotalCompositionFrames(
  templateIndex: number,
  fps: number,
): number {
  return getMainStoryFramesForTemplate(templateIndex, fps) + getBrandingFramesTotal(fps);
}

const REASON_SCROLL_SECONDS = 10;

const REASON_TEXT_SHADOW =
  "0 1px 2px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85), 0 4px 28px rgba(0,0,0,0.7), 0 0 1px rgba(0,0,0,1)";

type MainTimeline = {
  hookEnd: number;
  badgeEnd: number;
  loadingEnd: number;
  reasonEnd: number;
  reasonScrollFrames: number;
};

function buildMainTimeline(
  mainDurationFrames: number,
  hookFrames: number,
  fps: number,
): MainTimeline {
  const badgeDur = Math.min(78, Math.max(48, Math.round(mainDurationFrames * 0.09)));
  const loadDur = Math.min(52, Math.max(36, Math.round(mainDurationFrames * 0.06)));
  const ctaReserve = Math.min(156, Math.max(96, Math.round(mainDurationFrames * 0.17)));

  let h = Math.min(hookFrames, Math.floor(mainDurationFrames * 0.22));
  h = Math.max(60, h);

  let hookEnd = h;
  let badgeEnd = hookEnd + badgeDur;
  let loadingEnd = badgeEnd + loadDur;
  const reasonEnd = Math.max(loadingEnd + fps * 4, mainDurationFrames - ctaReserve);

  let reasonScrollFrames = Math.max(
    Math.round(REASON_SCROLL_SECONDS * fps),
    reasonEnd - loadingEnd,
  );
  if (loadingEnd + reasonScrollFrames > reasonEnd) {
    reasonScrollFrames = Math.max(fps * 3, reasonEnd - loadingEnd);
  }
  if (loadingEnd >= reasonEnd - 8) {
    const shrink = loadingEnd - (reasonEnd - 8 - loadDur);
    if (shrink > 0) {
      loadingEnd = badgeEnd + Math.max(24, loadDur - shrink);
    }
    if (loadingEnd >= reasonEnd - 8) {
      hookEnd = Math.max(48, hookEnd - (loadingEnd - (reasonEnd - 8)));
      badgeEnd = hookEnd + badgeDur;
      loadingEnd = badgeEnd + Math.max(24, loadDur);
    }
  }

  return {
    hookEnd,
    badgeEnd,
    loadingEnd,
    reasonEnd,
    reasonScrollFrames,
  };
}

/** Map absolute composition frame → main story frame (frozen on bookends). */
function useMainTimelineFrame(mainDurationFrames: number): number {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const open = Math.round(BRANDING_SECONDS_BOOKEND * fps);
  const close = Math.round(BRANDING_SECONDS_BOOKEND * fps);
  const closingStart = durationInFrames - close;
  if (frame < open) return 0;
  if (frame >= closingStart) return mainDurationFrames - 1;

  const inner = frame - open;
  return Math.min(inner, mainDurationFrames - 1);
}

function ParticleField({ phaseFrame }: { phaseFrame: number }) {
  const dots = [
    ...Array.from({ length: 56 }, (_, i) => {
      const gx = ((i * 47) % 11) / 11;
      const gy = ((i * 73) % 17) / 17;
      const jitterX = ((((i * 13) % 21) / 21) - 0.5) * 0.035;
      const jitterY = ((((i * 29) % 19) / 19) - 0.5) * 0.038;
      return {
        id: `p-${i}`,
        cx: gx * 100 + jitterX,
        cy: gy * 100 + jitterY + (i % 5) * 0.015,
        r: (i % 3) / 10 + 0.85,
      };
    }),
  ];

  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.55,
        pointerEvents: "none",
      }}
    >
      {dots.map((d, idx) => {
        const blink = interpolate(
          Math.sin(d.cx * 3.14 + phaseFrame / 22 + idx * 0.15),
          [-1, 1],
          [0.12, 0.55],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        return (
          <circle
            key={d.id}
            cx={`${d.cx}%`}
            cy={`${d.cy}%`}
            r={d.r}
            fill="rgba(186,230,253,1)"
            style={{ opacity: blink }}
          />
        );
      })}
    </svg>
  );
}

function BrandedBackdrop({ pulseFrame }: { pulseFrame: number }) {
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: NAVY }} />
      <AbsoluteFill style={{ opacity: 0.45, overflow: "hidden" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(180deg, rgba(30,58,138,0.18) 0%, transparent 40%, transparent 72%, rgba(15,23,42,0.45) 100%)," +
              "linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 48px 48px, 48px 48px",
          }}
        />
      </AbsoluteFill>
      <ParticleField phaseFrame={pulseFrame} />
    </>
  );
}

function BrandOpening({ stock }: { stock: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = Math.round(BRANDING_SECONDS_BOOKEND * fps);

  const shellOpacity = interpolate(frame, [dur - 16, dur - 3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [4, Math.min(26, dur - 8)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const scaleUpEnd = Math.min(32, dur - 14);
  const scaleSettleEnd = dur - 4;
  const titleScaleGrow = interpolate(frame, [4, scaleUpEnd], [0.9, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const titleScaleSettle = interpolate(
    frame,
    [scaleUpEnd, scaleSettleEnd],
    [1.04, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    },
  );
  const titleScaleCombined =
    frame < scaleUpEnd ? titleScaleGrow : titleScaleSettle;

  const subOpacity = interpolate(
    frame,
    [Math.max(22, Math.floor(dur * 0.38)), dur - 6],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    },
  );
  const subY = interpolate(
    frame,
    [Math.max(22, Math.floor(dur * 0.38)), dur - 8],
    [18, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  const fontFam =
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  return (
    <AbsoluteFill style={{ zIndex: 52, opacity: shellOpacity }}>
      <BrandedBackdrop pulseFrame={frame} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", padding: "0 56px", maxWidth: 980 }}>
          <div
            style={{
              opacity: titleOpacity,
              transform: `scale(${Math.min(Math.max(titleScaleCombined, 0.92), 1.08)})`,
              fontFamily: fontFam,
              fontWeight: 800,
              fontSize: 56,
              letterSpacing: "-0.025em",
              color: "#E2E8F0",
              textShadow:
                "0 2px 24px rgba(0,0,0,0.55), 0 0 1px rgba(248,250,252,0.25)",
              marginBottom: 28,
              willChange: "transform, opacity",
            }}
          >
            TickerRank AI
          </div>
          <div
            style={{
              opacity: subOpacity,
              transform: `translateY(${subY}px)`,
              fontFamily: fontFam,
              fontWeight: 700,
              fontSize: 64,
              color: ACCENT,
              letterSpacing: "-0.03em",
              textShadow:
                "0 0 40px rgba(59,130,246,0.45), 0 8px 32px rgba(0,0,0,0.4)",
              willChange: "transform, opacity",
            }}
          >
            {stock.trim()} Rating
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function BrandClosing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = Math.round(BRANDING_SECONDS_BOOKEND * fps);

  const fadeInBg = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const hostOpacity = interpolate(frame, [10, dur - 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hostScale = interpolate(frame, [10, 42], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const disclaimerOpacity = interpolate(frame, [28, dur - 4], [0, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fontFam =
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  return (
    <AbsoluteFill style={{ zIndex: 52 }}>
      <div style={{ opacity: fadeInBg, width: "100%", height: "100%" }}>
        <BrandedBackdrop pulseFrame={frame + dur * 3} />
      </div>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", padding: "0 56px" }}>
          <div
            style={{
              opacity: hostOpacity,
              transform: `scale(${hostScale})`,
              fontFamily: fontFam,
              fontWeight: 800,
              fontSize: 76,
              color: ACCENT,
              letterSpacing: "-0.035em",
              textShadow:
                "0 0 48px rgba(59,130,246,0.5), 0 18px 64px rgba(0,0,0,0.45)",
              minHeight: "1.35em",
            }}
          >
            tickerrank.com
          </div>
          <div
            style={{
              marginTop: 48,
              fontFamily: fontFam,
              fontSize: 30,
              fontWeight: 600,
              color: "#94A3B8",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              opacity: disclaimerOpacity,
            }}
          >
            NFA — Not Financial Advice
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function ratingBadgeTone(rating: string): string {
  const r = rating.trim().toUpperCase();
  if (r.startsWith("A")) return "#22C55E";
  if (r.startsWith("B") || r.startsWith("C")) return "#EAB308";
  return "#EF4444";
}

function labelBadgeStyle(label: RatingLabel): {
  bg: string;
  color: string;
  border: string;
} {
  switch (label) {
    case "Bullish":
      return {
        bg: "rgba(34, 197, 94, 0.2)",
        color: "#86EFAC",
        border: "1px solid rgba(34, 197, 94, 0.5)",
      };
    case "Bearish":
      return {
        bg: "rgba(239, 68, 68, 0.2)",
        color: "#FCA5A5",
        border: "1px solid rgba(239, 68, 68, 0.45)",
      };
    default:
      return {
        bg: "rgba(148, 163, 184, 0.18)",
        color: "#CBD5E1",
        border: "1px solid rgba(148, 163, 184, 0.4)",
      };
  }
}

function NfaWatermark() {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 56,
        zIndex: 30,
      }}
    >
      <div
        style={{
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.12)",
          textTransform: "uppercase",
        }}
      >
        NFA — Not Financial Advice
      </div>
    </AbsoluteFill>
  );
}

function HookPhaseOverlay({
  template,
  mainFrame,
  opacity,
}: {
  template: HookTemplate;
  mainFrame: number;
  opacity: number;
}) {
  const shake =
    template.mood === "shock"
      ? Math.sin(mainFrame * 0.92) * 10 + Math.cos(mainFrame * 0.71) * 4
      : 0;

  const popScale = interpolate(
    mainFrame,
    [0, 14],
    [0.88, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  let bg = NAVY;
  if (template.mood === "shock") bg = "#450a0a";
  if (template.mood === "caution") bg = "#422006";

  const fontFam =
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const baseFont =
    template.style === "bigText"
      ? 58
      : template.style === "statistic"
        ? 54
        : 52;
  const fontStyle: CSSProperties =
    template.style === "question" ? { fontStyle: "italic" } : {};

  const textBlock = (
    <div
      style={{
        textAlign: "center",
        padding: "0 48px",
        maxWidth: 1000,
        transform:
          template.mood === "shock"
            ? `translateX(${shake}px)`
            : `scale(${popScale})`,
        fontFamily: fontFam,
        fontWeight: 900,
        fontSize: baseFont,
        lineHeight: 1.28,
        color: template.textColor,
        letterSpacing: template.style === "statistic" ? "-0.02em" : "-0.025em",
        textShadow:
          template.mood === "shock"
            ? "0 4px 32px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,1)"
            : "0 2px 24px rgba(0,0,0,0.65)",
        ...fontStyle,
      }}
    >
      {template.hookText}
    </div>
  );

  if (template.mood === "contrarian") {
    return (
      <AbsoluteFill
        style={{
          opacity,
          backgroundColor: NAVY,
          zIndex: 26,
          display: "flex",
          flexDirection: "row",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRight: "3px solid rgba(59,130,246,0.35)",
            background: "linear-gradient(145deg,#14532d40,#0B1120)",
            padding: 32,
          }}
        >
          <span style={{ fontSize: 88, lineHeight: 1 }} aria-hidden>
            🐂
          </span>
          <span
            style={{
              marginTop: 16,
              fontFamily: fontFam,
              fontSize: 32,
              fontWeight: 800,
              color: "#86EFAC",
            }}
          >
            Crowd bullish
          </span>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(215deg,#3f0f1844,#0B1120)",
            padding: 32,
          }}
        >
          <span style={{ fontSize: 76, lineHeight: 1 }} aria-hidden>
            🤖📉
          </span>
          <div style={{ marginTop: 28, padding: "0 12px" }}>{textBlock}</div>
        </div>
      </AbsoluteFill>
    );
  }

  if (template.mood === "surprise") {
    return (
      <AbsoluteFill
        style={{ opacity, zIndex: 26, justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            transform: `scale(${popScale}) rotate(-0.8deg)`,
            borderRadius: 28,
            border: "6px solid #EAB308",
            backgroundColor: "#1e1b0a",
            boxShadow:
              "0 0 0 4px rgba(250,204,21,0.35), 0 32px 100px rgba(0,0,0,0.55)",
            padding: "52px 40px",
            maxWidth: 980,
          }}
        >
          {textBlock}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundColor: bg,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 26,
      }}
    >
      <BrandedBackdrop pulseFrame={mainFrame + 120} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          background:
            template.mood === "highlight"
              ? "radial-gradient(ellipse at center,rgba(59,130,246,0.2) 0%,transparent 55%)"
              : undefined,
          border:
            template.mood === "highlight"
              ? "3px solid rgba(59,130,246,0.45)"
              : undefined,
        }}
      >
        {textBlock}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function BadgeIntroOverlay({
  rating,
  label,
  score,
  opacity,
}: Pick<StockRatingVideoProps, "rating" | "label" | "score"> & {
  opacity: number;
}) {
  const badge = ratingBadgeTone(rating);
  const lb = labelBadgeStyle(label);

  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundColor: NAVY,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 14,
      }}
    >
      <div style={{ textAlign: "center", padding: 48, maxWidth: 1100 }}>
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: 32,
            background: `linear-gradient(145deg, ${badge}dd, ${badge}66)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 40px",
            boxShadow: `0 24px 80px ${badge}44`,
            border: `2px solid ${badge}`,
          }}
        >
          <span
            style={{
              fontFamily:
                'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              fontSize: 112,
              fontWeight: 900,
              color: "#0B1120",
            }}
          >
            {rating}
          </span>
        </div>
        <div
          style={{
            display: "inline-block",
            padding: "12px 28px",
            borderRadius: 999,
            fontFamily:
              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: 32,
            fontWeight: 700,
            ...lb,
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily:
              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: 26,
            fontWeight: 600,
            color: "#94A3B8",
          }}
        >
          Score {Math.round(score)}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ScreenshotBackdrop({
  screenshotUrl,
  opacity,
}: {
  screenshotUrl: string;
  opacity: number;
}) {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, zIndex: 1 }}>
      <Img
        src={screenshotUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity,
        }}
      />
    </AbsoluteFill>
  );
}

function LoadingSegment({
  stock,
  opacity,
  loadingStartFrame,
  loadingEndFrame,
  mainDurationFrames,
}: {
  stock: string;
  opacity: number;
  loadingStartFrame: number;
  loadingEndFrame: number;
  mainDurationFrames: number;
}) {
  const mainFrame = useMainTimelineFrame(mainDurationFrames);
  const rel = Math.max(0, mainFrame - loadingStartFrame);
  const span = Math.max(1, loadingEndFrame - loadingStartFrame);
  const progress = interpolate(rel, [0, span], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity,
        background:
          "linear-gradient(180deg, rgba(11,17,32,0.55) 0%, rgba(11,17,32,0.35) 100%)",
        zIndex: 14,
      }}
    >
      <div
        style={{
          width: "78%",
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            color: "#E2E8F0",
            fontSize: 36,
            fontWeight: 600,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          Fetching {stock} data...
        </div>
        <div
          style={{
            height: 12,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
            overflow: "hidden",
            border: `1px solid rgba(59, 130, 246, 0.35)`,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${ACCENT}, #60A5FA)`,
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ScrollingReasons({
  reason1,
  reason2,
  opacity,
  loadingEndFrame,
  reasonEndFrame,
  reasonScrollFrames,
  mainDurationFrames,
}: Pick<StockRatingVideoProps, "reason1" | "reason2"> & {
  opacity: number;
  loadingEndFrame: number;
  reasonEndFrame: number;
  reasonScrollFrames: number;
  mainDurationFrames: number;
}) {
  const mainFrame = useMainTimelineFrame(mainDurationFrames);
  const { height } = useVideoConfig();
  const scrollEndFrame = Math.min(
    loadingEndFrame + reasonScrollFrames - 1,
    Math.max(loadingEndFrame + 1, reasonEndFrame - 1),
  );
  const t = interpolate(mainFrame, [loadingEndFrame, scrollEndFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  const travel = height * 0.85;
  const translateY = interpolate(t, [0, 1], [height * 0.35, -travel]);

  const fadeMask =
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.08) 4%, rgba(0,0,0,0.92) 16%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.92) 84%, rgba(0,0,0,0.08) 96%, transparent 100%)";

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        background:
          "linear-gradient(180deg, rgba(11,17,32,0.15) 0%, rgba(11,17,32,0.65) 100%)",
        justifyContent: "flex-end",
        alignItems: "stretch",
        paddingBottom: 120,
        paddingLeft: 40,
        paddingRight: 40,
        paddingTop: height * 0.12,
        zIndex: 8,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          justifyContent: "center",
          WebkitMaskImage: fadeMask,
          maskImage: fadeMask,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            width: "100%",
            maxWidth: 980,
            transform: `translateY(${translateY}px)`,
            willChange: "transform",
            fontFamily:
              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: "#F8FAFC",
              lineHeight: 1.42,
              textShadow: REASON_TEXT_SHADOW,
              marginBottom: 40,
            }}
          >
            {reason1}
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 600,
              color: "#EEF2FF",
              lineHeight: 1.5,
              textShadow: REASON_TEXT_SHADOW,
            }}
          >
            {reason2}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function VideoProgressIndicator({
  mainDurationFrames,
}: {
  mainDurationFrames: number;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const open = Math.round(BRANDING_SECONDS_BOOKEND * fps);
  const close = Math.round(BRANDING_SECONDS_BOOKEND * fps);
  const closingStart = durationInFrames - close;
  const mainFrameRel = interpolate(
    frame,
    [open, closingStart - 1],
    [0, Math.max(0, mainDurationFrames - 1)],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const denom = Math.max(1, mainDurationFrames - 1);
  const progress = interpolate(mainFrameRel, [0, denom], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: "flex-start",
        alignItems: "stretch",
        zIndex: 53,
      }}
    >
      <div
        style={{
          height: 5,
          marginTop: 0,
          backgroundColor: "rgba(248,250,252,0.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${ACCENT} 0%, #60A5FA 55%, #93C5FD 100%)`,
            boxShadow: "0 0 14px rgba(59, 130, 246, 0.55)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function CtaFrame({ opacity }: { opacity: number }) {
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundColor: NAVY,
        justifyContent: "center",
        alignItems: "center",
        padding: 64,
        zIndex: 20,
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 920,
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#F8FAFC",
            lineHeight: 1.25,
            marginBottom: 32,
          }}
        >
          Check your stock rating at{" "}
          <span style={{ color: ACCENT }}>tickerrank.com</span>
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "#94A3B8",
          }}
        >
          Free 3/day
        </div>
      </div>
    </AbsoluteFill>
  );
}

function EngagementHint({
  opacity,
  reasonEndFrame,
  mainDurationFrames,
}: {
  opacity: number;
  reasonEndFrame: number;
  mainDurationFrames: number;
}) {
  const frame = useMainTimelineFrame(mainDurationFrames);
  const start = Math.max(0, reasonEndFrame - 120);
  const local = interpolate(
    frame,
    [start - 1, start + 24, reasonEndFrame - 8, reasonEndFrame],
    [0, 0.88, 0.88, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const fontFam =
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 180,
        zIndex: 18,
        opacity: opacity * local,
      }}
    >
      <div
        style={{
          fontFamily: fontFam,
          fontSize: 28,
          fontWeight: 600,
          color: "rgba(248,250,252,0.78)",
          textShadow:
            "0 2px 16px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.9)",
        }}
      >
        💬 Comment your thoughts
      </div>
    </AbsoluteFill>
  );
}

export function StockRatingVideo({
  stock,
  rating,
  label,
  score,
  reason1,
  reason2,
  screenshotUrl,
  audioUrl,
  templateIndex = 0,
}: StockRatingVideoProps) {
  const templateIdx = Math.min(9, Math.max(0, Math.floor(Number(templateIndex) || 0)));
  const template = HOOK_TEMPLATES[templateIdx]!;
  const { durationInFrames, fps } = useVideoConfig();

  const brandingFrames = Math.round(BRANDING_SECONDS_BOOKEND * fps);
  const closingStart = durationInFrames - brandingFrames;

  const mainDurationFrames =
    durationInFrames - brandingFrames * 2;
  const timeline = buildMainTimeline(
    mainDurationFrames,
    template.introDuration,
    fps,
  );

  const mf = useMainTimelineFrame(mainDurationFrames);

  const hookOpacity = interpolate(
    mf,
    [0, Math.max(0, timeline.hookEnd - 16), timeline.hookEnd],
    [1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const badgeOpacity = interpolate(
    mf,
    [
      Math.max(0, timeline.hookEnd - 10),
      timeline.hookEnd + 6,
      Math.max(timeline.badgeEnd - 14, timeline.hookEnd + 12),
      timeline.badgeEnd + 10,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const shotOpacity = interpolate(
    mf,
    [timeline.hookEnd + 12, timeline.badgeEnd + 48],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const loadingOpacity = interpolate(
    mf,
    [
      timeline.badgeEnd - 2,
      timeline.badgeEnd + 8,
      timeline.loadingEnd - 12,
      timeline.loadingEnd + 4,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const reasonsOpacity = interpolate(
    mf,
    [
      timeline.loadingEnd - 4,
      timeline.loadingEnd + 12,
      timeline.reasonEnd - 16,
      timeline.reasonEnd + 4,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const engagementOpacity = reasonsOpacity;

  const ctaOpacity = interpolate(
    mf,
    [timeline.reasonEnd - 8, timeline.reasonEnd + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <ScreenshotBackdrop screenshotUrl={screenshotUrl} opacity={shotOpacity} />

      <HookPhaseOverlay
        template={template}
        mainFrame={mf}
        opacity={hookOpacity}
      />

      <BadgeIntroOverlay
        rating={rating}
        label={label}
        score={score}
        opacity={badgeOpacity}
      />

      <LoadingSegment
        stock={stock}
        opacity={loadingOpacity}
        loadingStartFrame={timeline.badgeEnd}
        loadingEndFrame={timeline.loadingEnd}
        mainDurationFrames={mainDurationFrames}
      />

      <ScrollingReasons
        reason1={reason1}
        reason2={reason2}
        opacity={reasonsOpacity}
        loadingEndFrame={timeline.loadingEnd}
        reasonEndFrame={timeline.reasonEnd}
        reasonScrollFrames={timeline.reasonScrollFrames}
        mainDurationFrames={mainDurationFrames}
      />

      <EngagementHint
        opacity={engagementOpacity}
        reasonEndFrame={timeline.reasonEnd}
        mainDurationFrames={mainDurationFrames}
      />

      <CtaFrame opacity={ctaOpacity} />

      <Sequence durationInFrames={brandingFrames} layout="none">
        <BrandOpening stock={stock} />
      </Sequence>

      <Sequence from={closingStart} durationInFrames={brandingFrames} layout="none">
        <BrandClosing />
      </Sequence>

      <VideoProgressIndicator mainDurationFrames={mainDurationFrames} />

      <NfaWatermark />

      {audioUrl ? (
        <Sequence
          durationInFrames={mainDurationFrames}
          from={brandingFrames}
          layout="none"
        >
          <Audio src={audioUrl} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
}