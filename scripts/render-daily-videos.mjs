/**
 * Render daily StockRating MP4s: KV ratings → Puppeteer screenshots → Remotion render.
 * Run from repo root: node scripts/render-daily-videos.mjs
 *
 * Requires .env.local KV config (same as scripts/generate-voiceover.mjs),
 * prerecorded audio at scripts/output/audio/{SYMBOL}.mp3 per symbol,
 * snapshots from tickerrank.com (then localhost dev, then a placeholder HTML),
 * and inlined **data URLs** for PNG + MP3 in Remotion (no file:// URLs).
 *
 * Chrome/Chromium: set **`CHROME_PATH`** in `.env.local` to your Chrome
 * executable (recommended). Screenshots fall back to `PUPPETEER_EXECUTABLE_PATH` or OS defaults.
 *
 * Remotion: `@remotion/bundler` writes the webpack bundle to a **temp directory** under the OS tmp
 * folder; that **absolute path** must be passed as `serveUrl` to `selectComposition` / `renderMedia`
 * (filesystem path only — never `http://localhost:3000` or another app URL).
 * **`REMOTION_RENDERER_PORT`** (default **3099**) avoids clashing with Next.js dev on port **3000**.
 */

import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Mobile Chrome UA to improve real-page captures. */
const MOBILE_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

const NETWORK_IDLE_NAV = Object.freeze({
  waitUntil: "networkidle2",
  timeout: 90_000,
});

const POPULAR_STOCKS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"];

/** Same rules as scripts/generate-voiceover.mjs / lib/kv-safe.ts `resolveRestUrlToken`. */
function trimEnv(name) {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

function resolveRestUrlToken() {
  const kvUrl = trimEnv("KV_REST_API_URL");
  const kvToken = trimEnv("KV_REST_API_TOKEN");
  if (kvUrl && kvToken) return { url: kvUrl, token: kvToken };

  const upUrl = trimEnv("UPSTASH_REDIS_REST_URL");
  const upToken = trimEnv("UPSTASH_REDIS_REST_TOKEN");
  if (upUrl && upToken) return { url: upUrl, token: upToken };

  const redisUrl = trimEnv("REDIS_URL");
  if (redisUrl.startsWith("https://")) {
    const token =
      trimEnv("KV_REST_API_TOKEN") ||
      trimEnv("UPSTASH_REDIS_REST_TOKEN") ||
      trimEnv("REDIS_TOKEN");
    if (token) return { url: redisUrl, token };
  }

  return null;
}

/** REST when URL+token exist; TCP when REDIS_URL is redis(s):// */
function resolveKvBackendConfig() {
  const rest = resolveRestUrlToken();
  if (rest) return { kind: "rest", ...rest };

  const redisUrl = trimEnv("REDIS_URL");
  if (/^rediss?:\/\//i.test(redisUrl)) {
    return { kind: "tcp", redisUrl };
  }

  return null;
}

function createTcpRatingStore(redisUrl) {
  let client = null;

  async function ensure() {
    if (client?.isOpen) return client;
    const { createClient } = await import("redis");
    const c = createClient({ url: redisUrl });
    await c.connect();
    client = c;
    return c;
  }

  function deserialize(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return {
    async get(key) {
      const c = await ensure();
      const raw = await c.get(key);
      if (raw == null) return null;
      return deserialize(raw);
    },
  };
}

async function createRatingStore() {
  const cfg = resolveKvBackendConfig();
  if (!cfg) return null;

  if (cfg.kind === "rest") {
    const { createClient } = await import("@vercel/kv");
    const kv = createClient({ url: cfg.url, token: cfg.token });
    return { get: (key) => kv.get(key) };
  }

  const tcp = createTcpRatingStore(cfg.redisUrl);
  return { get: (key) => tcp.get(key) };
}

function utcDateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Map KV text to Bullish | Bearish | Neutral. */
function normalizeLabel(conclusionOrLabel) {
  const s = String(conclusionOrLabel ?? "").trim().toLowerCase();
  if (!s) return "Neutral";
  if (s.includes("bull")) return "Bullish";
  if (s.includes("bear")) return "Bearish";
  return "Neutral";
}

/** Extract fields for StockRatingVideo; mirrors generate-voiceover payload helpers. */
function extractRatingPayload(cached) {
  if (!cached || typeof cached !== "object") return null;
  const rating = cached.rating != null ? String(cached.rating).trim() : "";
  if (!rating) return null;

  const conclusion =
    cached.conclusion != null ? String(cached.conclusion).trim() : "";
  const labelField =
    cached.label != null ? String(cached.label).trim() : "";
  const label = normalizeLabel(labelField || conclusion);

  const score =
    typeof cached.score === "number" && Number.isFinite(cached.score)
      ? cached.score
      : 0;

  const reasons = Array.isArray(cached.reasons) ? cached.reasons : [];
  const reason1 =
    cached.reason1 != null
      ? String(cached.reason1).trim()
      : reasons[0] != null
        ? String(reasons[0]).trim()
        : "";
  const reason2 =
    cached.reason2 != null
      ? String(cached.reason2).trim()
      : reasons[1] != null
        ? String(reasons[1]).trim()
        : "";

  return { rating, label, score, reason1, reason2 };
}

async function fileExists(p) {
  const fs = await import("node:fs/promises");
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromeExecutable() {
  const fromChromeEnv = trimEnv("CHROME_PATH");
  if (fromChromeEnv) {
    if (await fileExists(fromChromeEnv)) return fromChromeEnv;
    throw new Error(
      `CHROME_PATH is set but does not exist or cannot be accessed: ${fromChromeEnv}`,
    );
  }

  const fromLegacy = trimEnv("PUPPETEER_EXECUTABLE_PATH");
  if (fromLegacy && (await fileExists(fromLegacy))) return fromLegacy;

  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    );
  }
  for (const c of candidates) {
    if (await fileExists(c)) return c;
  }
  return null;
}

/** Resolved once per script run — shared by Puppeteer screenshots and Remotion. */
let cachedChromeExe;

/** Lazy resolve once per run (screenshots + Remotion share the same Chrome). */
async function ensureChromeExecutable() {
  if (cachedChromeExe !== undefined) return cachedChromeExe;
  const exe = await resolveChromeExecutable();
  if (!exe) {
    throw new Error(
      "No Chrome/Chromium found. Set CHROME_PATH (recommended), or PUPPETEER_EXECUTABLE_PATH, or install Chrome in the default OS location.",
    );
  }
  cachedChromeExe = exe;
  return cachedChromeExe;
}

async function launchScreenshotBrowser(chromeExe) {
  const puppeteer = await import("puppeteer-core");
  return puppeteer.default.launch({
    headless: true,
    executablePath: chromeExe,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

/** PNG CRC-32 used by chunk framing (IEEE poly 0xEDB88320). */
function pngCrc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngAppendChunk(out, typeAscii, payload) {
  const type = Buffer.from(typeAscii, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(payload.length);
  const crcPayload = Buffer.concat([type, payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(pngCrc32(crcPayload));
  out.push(len, crcPayload, crc);
}

/**
 * Writes a minimal valid 8‑bit RGB PNG (solid fill) — no Canvas dependency.
 * @param {number} width
 * @param {number} height
 * @param {[number, number, number]} rgb 0–255
 */
function encodeSolidRgbPng(width, height, rgb) {
  const [r, g, b] = rgb.map((x) => x & 255);
  const ihdrBody = Buffer.alloc(13);
  ihdrBody.writeUInt32BE(width, 0);
  ihdrBody.writeUInt32BE(height, 4);
  ihdrBody[8] = 8;
  ihdrBody[9] = 2;
  ihdrBody[10] = 0;
  ihdrBody[11] = 0;
  ihdrBody[12] = 0;

  const rowBytes = width * 3 + 1;
  const raw = Buffer.allocUnsafe(rowBytes * height);
  let rawOff = 0;
  for (let y = 0; y < height; y++) {
    raw[rawOff] = 0;
    rawOff += 1;
    for (let x = 0; x < width; x++) {
      raw[rawOff++] = r;
      raw[rawOff++] = g;
      raw[rawOff++] = b;
    }
  }
  const idatPayload = zlib.deflateSync(raw, { level: 6 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  /** @type {Buffer[]} */
  const parts = [sig];
  pngAppendChunk(parts, "IHDR", ihdrBody);
  pngAppendChunk(parts, "IDAT", idatPayload);
  pngAppendChunk(parts, "IEND", Buffer.alloc(0));
  return Buffer.concat(parts);
}

/** Fallback when Puppeteer placeholder screenshot fails (#0B1120 navy). */
const FALLBACK_NAVY_RGB = Object.freeze([0x0b, 0x11, 0x20]);

async function writeSolidNavyPng(outPath, width, height) {
  const png = encodeSolidRgbPng(width, height, [...FALLBACK_NAVY_RGB]);
  await writeFile(outPath, png);
}

async function captureRatingScreenshotWithFallback(browser, symbol, outPath) {
  const page = await browser.newPage();

  /** @param {'production'|'localhost'|'placeholder'} source */
  const logUsed = (source) => {
    const label =
      source === "production"
        ? "tickerrank.com (production)"
        : source === "localhost"
          ? `http://localhost:3000/rating?symbol=… (dev server)`
          : "inline placeholder HTML";
    console.log(`[${symbol}] Screenshot captured using: ${label}`);
  };

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  const placeholderMarkup = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=1080, initial-scale=1"/>
<title>Rating preview</title>
<style>
*{margin:0;box-sizing:border-box}
body{min-height:1920px;width:1080px;background:#0B1120;color:#F8FAFC;display:flex;
align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;text-align:center}
h1{font-size:140px;font-weight:800;line-height:1.1;letter-spacing:-0.04em;color:#60A5FA;margin-bottom:48px}
p{font-size:40px;line-height:1.45;color:#94A3B8;max-width:920px;padding:0 40px;margin:0 auto}
</style></head><body>
<div><h1>${escapeHtml(symbol)}</h1><p>Rating page could not be loaded.<br>TickerRank video placeholder screenshot.</div>
</body></html>`;

  /** Try data: URL navigate (stable execution context vs setContent in some setups). */
  const placeholderDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(placeholderMarkup)}`;

  try {
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setUserAgent(MOBILE_CHROME_UA);

    let productionRejected = "";
    try {
      const prodUrl = `https://tickerrank.com/rating?symbol=${encodeURIComponent(symbol)}`;
      const res = await page.goto(prodUrl, NETWORK_IDLE_NAV);
      const code = typeof res?.status === "function" ? res.status() : 0;
      if (!res || code === 404) {
        productionRejected = `production HTTP ${code || "?"}`;
      } else {
        await page.screenshot({ path: outPath, type: "png", fullPage: false });
        logUsed("production");
        return;
      }
    } catch (prodErr) {
      productionRejected =
        prodErr instanceof Error ? prodErr.message : String(prodErr);
    }
    console.warn(
      `[${symbol}] Production rating screenshot abandoned (${productionRejected}); trying localhost…`,
    );

    console.warn(
      `[${symbol}] For localhost screenshots run \`npm run dev\` in another terminal first (Next.js on port 3000).`,
    );

    let localRejected = "";
    try {
      const localUrl = `http://localhost:3000/rating?symbol=${encodeURIComponent(symbol)}`;
      const res = await page.goto(localUrl, NETWORK_IDLE_NAV);
      const code = typeof res?.status === "function" ? res.status() : 0;
      if (!res || code === 404) {
        localRejected = `localhost HTTP ${code || "?"}`;
      } else {
        await page.screenshot({ path: outPath, type: "png", fullPage: false });
        logUsed("localhost");
        return;
      }
    } catch (localErr) {
      localRejected =
        localErr instanceof Error ? localErr.message : String(localErr);
    }
    console.warn(
      `[${symbol}] Local dev rating screenshot abandoned (${localRejected}); using placeholder HTML…`,
    );

    let placeholderOk = false;
    try {
      await page.goto(placeholderDataUrl, {
        waitUntil: "load",
        timeout: NETWORK_IDLE_NAV.timeout,
      });
      await page.waitForSelector("body", { timeout: 5000 });
      await page
        .waitForNetworkIdle({ idleTime: 50, timeout: 2000 })
        .catch(() => {});
      await page.screenshot({ path: outPath, type: "png", fullPage: false });
      logUsed("placeholder");
      placeholderOk = true;
    } catch (phErr) {
      const phMsg = phErr instanceof Error ? phErr.message : String(phErr);
      console.warn(
        `[${symbol}] Placeholder page screenshot failed (${phMsg}); writing solid navy PNG fallback…`,
      );
    }

    if (!placeholderOk) {
      try {
        await writeSolidNavyPng(outPath, 1080, 1920);
        console.log(
          `[${symbol}] Screenshot captured using: solid navy PNG (last resort)`,
        );
      } catch (fallbackErr) {
        throw fallbackErr instanceof Error
          ? fallbackErr
          : new Error(String(fallbackErr));
      }
    }
  } finally {
    await page.close().catch(() => {});
  }
}

/** Inline assets for Remotion (no file://). */
function pngFileToDataUrl(absolutePathToPng) {
  const buf = readFileSync(absolutePathToPng);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function mp3FileToDataUrl(absolutePathToMp3) {
  const buf = readFileSync(absolutePathToMp3);
  return `data:audio/mp3;base64,${buf.toString("base64")}`;
}

async function main() {
  const { config } = await import("dotenv");
  const fs = await import("node:fs/promises");

  const repoRoot = path.resolve(__dirname, "..");
  config({ path: path.resolve(repoRoot, ".env.local") });

  /** @remotion/bundler resolves paths against process.cwd() */
  process.chdir(repoRoot);

  const cacheDate = utcDateKey();
  const outAudioDir = path.resolve(__dirname, "output", "audio");
  const outShotDir = path.resolve(__dirname, "output", "screenshots");
  const outVideoDir = path.resolve(__dirname, "output", "videos");
  await fs.mkdir(outShotDir, { recursive: true });
  await fs.mkdir(outVideoDir, { recursive: true });

  const store = await createRatingStore();
  if (!store) {
    console.error(
      "Missing KV config: set KV_REST_API_URL + KV_REST_API_TOKEN (or Upstash / TCP REDIS_URL).",
    );
    process.exitCode = 1;
    return;
  }

  const rendererPortParsed = Number.parseInt(
    trimEnv("REMOTION_RENDERER_PORT"),
    10,
  );
  const remotionRendererPort =
    Number.isFinite(rendererPortParsed) &&
    rendererPortParsed >= 1024 &&
    rendererPortParsed <= 65535
      ? rendererPortParsed
      : 3099;

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const bundleOutDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "tickerrank-remotion-"),
  );
  const entryPointAbs = path.join(repoRoot, "remotion", "index.tsx");
  console.log("Bundling Remotion project…");
  let remotionBundleDir;
  try {
    const rawBundlePath = await bundle({
      entryPoint: entryPointAbs,
      rootDir: repoRoot,
      outDir: bundleOutDir,
    });
    remotionBundleDir = path.resolve(rawBundlePath);
  } catch (err) {
    console.error("Remotion bundle failed:", err);
    process.exitCode = 1;
    return;
  }

  if (/^https?:\/\//i.test(remotionBundleDir)) {
    console.error(
      "Internal error: bundler returned a URL — expected a filesystem path:",
      remotionBundleDir,
    );
    process.exitCode = 1;
    return;
  }

  const bundleIndexHtml = path.join(remotionBundleDir, "index.html");
  if (!(await fileExists(bundleIndexHtml))) {
    console.error(
      "Remotion bundle is invalid — missing index.html at:",
      bundleIndexHtml,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "Remotion bundle directory (passed as serveUrl):",
    remotionBundleDir,
  );
  console.log(
    "Remotion preview server requested port:",
    String(remotionRendererPort),
    "(avoid Next.js on 3000)",
  );

  const remotionServeOptions = {
    /** Filesystem absolute path returned by `@remotion/bundler`; do not substitute a Next.js URL */
    serveUrl: remotionBundleDir,
    port: remotionRendererPort,
  };

  let rendered = 0;
  let failed = 0;
  let skipped = 0;
  let browser = null;

  try {
    for (const symbol of POPULAR_STOCKS) {
      const key = `rating:${symbol}:${cacheDate}`;
      let cached;
      try {
        cached = await store.get(key);
      } catch (err) {
        console.error(`[${symbol}] KV get failed (${key}):`, err);
        failed += 1;
        continue;
      }

      if (cached == null) {
        console.log(`[${symbol}] No cached rating for ${key}, skip`);
        skipped += 1;
        continue;
      }

      const payload = extractRatingPayload(cached);
      if (!payload) {
        console.log(`[${symbol}] No usable rating payload, skip`);
        skipped += 1;
        continue;
      }

      const audioPath = path.join(outAudioDir, `${symbol}.mp3`);
      if (!(await fileExists(audioPath))) {
        console.warn(
          `[${symbol}] Missing audio at ${audioPath} — run generate-voiceover or add file, skip`,
        );
        skipped += 1;
        continue;
      }

      const screenshotPath = path.join(outShotDir, `${symbol}.png`);
      const videoPath = path.join(outVideoDir, `${symbol}.mp4`);

      try {
        const chromeExe = await ensureChromeExecutable();
        if (!browser) {
          browser = await launchScreenshotBrowser(chromeExe);
        }
        console.log(`[${symbol}] Capturing screenshot…`);
        await captureRatingScreenshotWithFallback(browser, symbol, screenshotPath);
      } catch (err) {
        console.error(`[${symbol}] Screenshot failed (all fallbacks exhausted):`, err);
        failed += 1;
        continue;
      }

      let screenshotUrl;
      let audioUrl;
      try {
        screenshotUrl = pngFileToDataUrl(screenshotPath);
        audioUrl = mp3FileToDataUrl(audioPath);
      } catch (readErr) {
        console.error(
          `[${symbol}] Failed to read screenshot or audio for Data URLs:`,
          readErr,
        );
        failed += 1;
        continue;
      }

      const inputProps = {
        stock: symbol,
        rating: payload.rating,
        label: payload.label,
        score: payload.score,
        reason1: payload.reason1 || "—",
        reason2: payload.reason2 || "—",
        screenshotUrl,
        audioUrl,
      };

      try {
        const chromeExe = await ensureChromeExecutable();
        console.log(`[${symbol}] Selecting composition…`);
        const composition = await selectComposition({
          ...remotionServeOptions,
          id: "StockRatingVideo",
          inputProps,
          browserExecutable: chromeExe,
        });

        console.log(`[${symbol}] Rendering MP4 → ${videoPath}`);
        await renderMedia({
          ...remotionServeOptions,
          composition,
          inputProps,
          codec: "h264",
          outputLocation: videoPath,
          overwrite: true,
          browserExecutable: chromeExe,
          onProgress: ({ progress }) => {
            if (progress > 0 && progress < 1) {
              process.stdout.write(
                `\r[${symbol}] Encode ${Math.round(progress * 100)}%   `,
              );
            }
          },
        });
        process.stdout.write("\n");
        rendered += 1;
        console.log(`[${symbol}] Done.`);
      } catch (err) {
        console.error(`[${symbol}] Render failed:`, err);
        failed += 1;
      }
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore shutdown errors
      }
    }
  }

  console.log(
    `\nSummary — rendered: ${rendered}, failed: ${failed}, skipped: ${skipped}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
