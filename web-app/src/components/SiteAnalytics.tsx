'use client';

// Vercel Web Analytics: cookie-free page views, so no consent banner. Sends
// only on Vercel deployments. Coin pages are reported by their pattern, not
// their ID, and query strings are dropped, so no collection data leaves.
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

function scrub(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  url.search = '';
  url.pathname = url.pathname.replace(/^\/collection\/(?!add$|import-export$)[^/]+/, '/collection/[id]');
  return { ...event, url: url.toString() };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={scrub} />;
}
