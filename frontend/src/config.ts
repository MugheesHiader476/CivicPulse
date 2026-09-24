/**
 * Runtime configuration.
 *
 * Values arrive through /config.js, which nginx renders from environment variables when the
 * container starts. Nothing here is baked in at build time, so one image serves every environment.
 * The API needs no entry at all: the browser always calls the relative path /api, and nginx (or the
 * Ingress) routes it to the backend. This object is public - it must never carry a secret.
 */
export interface RuntimeConfig {
  /** Label shown in the header, e.g. "production", "staging", "mock-api". */
  environment: string;
  /** Auto-refresh interval of the live dashboard, in seconds. */
  refreshSeconds: number;
  /** Public Clerk application identifier, supplied at runtime; never a secret key. */
  clerkPublishableKey: string;
}

declare global {
  interface Window {
    __CIVICPULSE_CONFIG__?: Record<string, unknown>;
  }
}

export const DEFAULT_CONFIG: RuntimeConfig = Object.freeze({
  environment: "unknown",
  refreshSeconds: 15,
  clerkPublishableKey: "",
});

const MIN_REFRESH_SECONDS = 5;
const MAX_REFRESH_SECONDS = 300;

export function readRuntimeConfig(source: unknown): RuntimeConfig {
  const raw = typeof source === "object" && source !== null ? (source as Record<string, unknown>) : {};

  const environment =
    typeof raw.environment === "string" && raw.environment.trim() !== ""
      ? raw.environment.trim().slice(0, 32)
      : DEFAULT_CONFIG.environment;

  // Accept numbers and numeric strings (nginx templates emit strings).
  const seconds = typeof raw.refreshSeconds === "string" || typeof raw.refreshSeconds === "number"
    ? Number(raw.refreshSeconds)
    : Number.NaN;
  const refreshSeconds = Number.isFinite(seconds)
    ? Math.min(MAX_REFRESH_SECONDS, Math.max(MIN_REFRESH_SECONDS, Math.round(seconds)))
    : DEFAULT_CONFIG.refreshSeconds;

  const key = raw.clerkPublishableKey;
  const clerkPublishableKey = typeof key === "string" && /^pk_(test|live)_[A-Za-z0-9_=-]+$/.test(key) ? key : "";

  return { environment, refreshSeconds, clerkPublishableKey };
}

export const runtimeConfig: RuntimeConfig = readRuntimeConfig(
  typeof window === "undefined" ? undefined : window.__CIVICPULSE_CONFIG__,
);
