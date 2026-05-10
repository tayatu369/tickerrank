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

export type RatingLabel = "Bullish" | "Bearish" | "Neutral";

export type StockRatingVideoProps = {
  stock: string;
  rating: string;
  label: RatingLabel;
  score: number;
  reason1: string;
  reason2: string;
  screenshotUrl: string;
  audioUrl: string;
};

const NAVY = "#0B1120";
const ACCENT = "#3B82F6";

/**
 * Main storyline length (excluding bookend branding). Matches prior 900-frame @ 30fps video.
 */
const MAIN_DURATION_FRAMES = 900;

/** 2-second bookends (@ current composition fps via hooks where needed). */
const BRANDING_SECONDS = 2;

const INTRO_FRAMES = 45; /* relative to MAIN timeline — 0–1.5s */
const LOADING_END = 90; /* relative to MAIN — ~3s mark */
const REASON_END = 750; /* relative to MAIN */

/** Vertical scroll through reasons: ~10s at composition fps (smooth ease). */
const REASON_SCROLL_SECONDS = 10;

const REASON_TEXT_SHADOW =
  "0 1px 2px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85), 0 4px 28px rgba(0,0,0,0.7), 0 0 1px rgba(0,0,0,1)";

/** Map absolute composition frame → main story frame (frozen while opening/outro overlays). */
function useMainTimelineFrame() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const open = Math.round(BRANDING_SECONDS * fps);
  const close = Math.round(BRANDING_SECONDS * fps);
  const closingStart = durationInFrames - close;
  if (frame < open) return 0;
  if (frame >= closingStart) return MAIN_DURATION_FRAMES - 1;

  const inner = frame - open;
  return Math.min(inner, MAIN_DURATION_FRAMES - 1);
}

function ParticleField({ phaseFrame }: { phaseFrame: number }) {
  /** Deterministic sparkle grid — no external RNG. */
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
  const dur = Math.round(BRANDING_SECONDS * fps);

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
  const dur = Math.round(BRANDING_SECONDS * fps);

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

function IntroOverlay({
  stock,
  rating,
  label,
  score,
  opacity,
}: Pick<StockRatingVideoProps, "stock" | "rating" | "label" | "score"> & {
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
        zIndex: 12,
      }}
    >
      <div style={{ textAlign: "center", padding: 48 }}>
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
            fontFamily:
              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: 48,
            fontWeight: 700,
            color: "#F8FAFC",
            lineHeight: 1.2,
            marginBottom: 28,
          }}
        >
          {stock} is rated {rating}
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
}: {
  stock: string;
  opacity: number;
}) {
  const frame = useMainTimelineFrame();
  const rel = Math.max(0, frame - INTRO_FRAMES);
  const progress = interpolate(rel, [0, LOADING_END - INTRO_FRAMES], [0, 100], {
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
}: Pick<StockRatingVideoProps, "reason1" | "reason2"> & { opacity: number }) {
  const frame = useMainTimelineFrame();
  const { height, fps } = useVideoConfig();
  const scrollSpan = Math.max(1, Math.round(REASON_SCROLL_SECONDS * fps));
  /** Inclusive span: frames LOADING_END .. LOADING_END+scrollSpan-1 == scrollSpan frames (~10s @ 30fps). */
  const scrollEndFrame = LOADING_END + scrollSpan - 1;
  const t = interpolate(frame, [LOADING_END, scrollEndFrame], [0, 1], {
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

/** Thin timeline synced to full composition duration — anchors pacing for viewers. */
function VideoProgressIndicator() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const denom = Math.max(1, durationInFrames - 1);
  const progress = interpolate(frame, [0, denom], [0, 1], {
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

export function StockRatingVideo({
  stock,
  rating,
  label,
  score,
  reason1,
  reason2,
  screenshotUrl,
  audioUrl,
}: StockRatingVideoProps) {
  const frame = useMainTimelineFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const brandingFrames = Math.round(BRANDING_SECONDS * fps);
  const closingStart = durationInFrames - brandingFrames;

  const shotOpacity = interpolate(frame, [40, 88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const introOpacity = interpolate(frame, [43, 60], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const loadingOpacity = interpolate(
    frame,
    [INTRO_FRAMES - 1, INTRO_FRAMES + 2, LOADING_END - 10, LOADING_END],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const reasonsOpacity = interpolate(
    frame,
    [LOADING_END - 2, LOADING_END + 8, REASON_END - 10, REASON_END],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const ctaOpacity = interpolate(frame, [REASON_END - 6, REASON_END + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <ScreenshotBackdrop screenshotUrl={screenshotUrl} opacity={shotOpacity} />

      <IntroOverlay
        stock={stock}
        rating={rating}
        label={label}
        score={score}
        opacity={introOpacity}
      />

      <LoadingSegment stock={stock} opacity={loadingOpacity} />

      <ScrollingReasons
        reason1={reason1}
        reason2={reason2}
        opacity={reasonsOpacity}
      />

      <CtaFrame opacity={ctaOpacity} />

      <Sequence durationInFrames={brandingFrames} layout="none">
        <BrandOpening stock={stock} />
      </Sequence>

      <Sequence from={closingStart} durationInFrames={brandingFrames} layout="none">
        <BrandClosing />
      </Sequence>

      <VideoProgressIndicator />

      <NfaWatermark />

      {audioUrl ? (
        <Sequence
          durationInFrames={MAIN_DURATION_FRAMES}
          from={brandingFrames}
          layout="none"
        >
          <Audio src={audioUrl} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
}
