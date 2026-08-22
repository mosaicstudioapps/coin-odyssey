// src/services/crashReporting.ts
/**
 * Crash + error reporting wrapper around Sentry.
 *
 * Design goals:
 *  - Single, narrow surface the rest of the app talks to (never import `@sentry/react-native`
 *    directly elsewhere) so the backend can be swapped without touching call sites.
 *  - Graceful no-op when no DSN is configured. Local dev, CI, and PR builds without the
 *    Sentry secret run exactly as before — nothing is sent, nothing throws.
 *  - Never let telemetry crash the app: every Sentry call is guarded.
 *
 * Configuration (all optional — absence of a DSN disables reporting):
 *   EXPO_PUBLIC_SENTRY_DSN   — project DSN; reporting is off unless this is set
 *   EXPO_PUBLIC_ENVIRONMENT  — 'production' | 'development' | ... (defaults from __DEV__)
 *   EXPO_PUBLIC_RELEASE      — optional release/version string for source-map matching
 *
 * Source maps are uploaded at EAS build time by the @sentry/react-native config plugin
 * (see app.json + docs); this module only handles the runtime SDK.
 */
import * as Sentry from '@sentry/react-native';

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

interface Breadcrumb {
  type?: string;
  category?: string;
  message?: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENVIRONMENT =
  process.env.EXPO_PUBLIC_ENVIRONMENT ?? (__DEV__ ? 'development' : 'production');
const RELEASE = process.env.EXPO_PUBLIC_RELEASE || undefined;

let enabled = false;

/**
 * Losing the network is not a defect. The app plans for it — writes queue and
 * replay on reconnect, reads surface a retry state — so an offline user firing
 * off `TypeError: Network request failed` is the offline handling doing its job.
 *
 * Reporting those at error level costs twice: it burns a finite monthly event
 * budget on non-events, and it buries genuine crashes under thousands of copies
 * of the same benign failure. So we drop them at the door.
 *
 * Deliberately narrow. Only transport-level "could not reach the server" errors
 * belong here; anything that reached a server and came back wrong is a real
 * signal and must still be reported.
 */
const EXPECTED_OFFLINE_FAILURES: readonly RegExp[] = [
  /network request failed/i,
  /failed to send a request to the edge function/i,
  /FunctionsFetchError/,
  /AuthRetryableFetchError/,
];

/** Exported for testing — an over-broad filter here would silently hide real crashes. */
export function isExpectedOfflineFailure(event: {
  exception?: { values?: { type?: string; value?: string }[] };
  message?: unknown;
}): boolean {
  const values = event.exception?.values ?? [];
  for (const v of values) {
    const haystack = `${v.type ?? ''} ${v.value ?? ''}`;
    if (EXPECTED_OFFLINE_FAILURES.some((re) => re.test(haystack))) return true;
  }
  // Logger.error with a non-Error payload arrives as a message, not an exception.
  if (values.length === 0 && typeof event.message === 'string') {
    const message: string = event.message;
    return EXPECTED_OFFLINE_FAILURES.some((re) => re.test(message));
  }
  return false;
}

/**
 * Initialize Sentry. Call once, as early as possible in the entry file.
 * Safe to call when no DSN is set — it simply leaves reporting disabled.
 */
export function initCrashReporting(): void {
  if (!DSN) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info(
        '[CrashReporting] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled.'
      );
    }
    return;
  }

  try {
    Sentry.init({
      dsn: DSN,
      environment: ENVIRONMENT,
      release: RELEASE,
      // Don't ship dev-client noise to the dashboard. Flip EXPO_PUBLIC_ENVIRONMENT
      // to something non-'development' if you need to smoke-test reporting locally.
      enabled: ENVIRONMENT !== 'development',
      debug: false,
      // v1.0 budgets crash/error reporting only — no performance tracing yet.
      tracesSampleRate: 0,
      // No automatic PII. We attach only the Supabase user id, explicitly (setUser).
      sendDefaultPii: false,
      attachStacktrace: true,
      maxBreadcrumbs: 80,
      // Expected offline noise never reaches the dashboard. Breadcrumbs are
      // unaffected, so if a real crash follows a network blip the context is
      // still there in the trail.
      beforeSend(event) {
        return isExpectedOfflineFailure(event) ? null : event;
      },
    });
    enabled = true;
  } catch (err) {
    // Telemetry must never take the app down.
    // eslint-disable-next-line no-console
    console.warn('[CrashReporting] init failed', err);
  }
}

export function isCrashReportingEnabled(): boolean {
  return enabled;
}

/** Report a thrown error (or anything error-like) with optional structured context. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* swallow */
  }
}

/** Report a non-exception message at a given severity. */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'error',
  context?: Record<string, unknown>
): void {
  if (!enabled) return;
  try {
    Sentry.captureMessage(message, context ? { level, extra: context } : { level });
  } catch {
    /* swallow */
  }
}

/** Leave a trail of context that rides along with the next captured event. */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  if (!enabled) return;
  try {
    Sentry.addBreadcrumb(breadcrumb);
  } catch {
    /* swallow */
  }
}

/** Associate subsequent events with a user (id only). Pass null to clear on sign-out. */
export function setUser(id: string | null): void {
  if (!enabled) return;
  try {
    Sentry.setUser(id ? { id } : null);
  } catch {
    /* swallow */
  }
}

/**
 * Wrap the root component for native error capture + touch/navigation context.
 * Always safe to call — when reporting is disabled it returns the component unchanged.
 */
export const wrap = Sentry.wrap;
