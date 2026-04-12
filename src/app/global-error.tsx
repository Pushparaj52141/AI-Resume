'use client';

/**
 * Root-level error UI for the App Router. Must be a Client Component and must
 * render its own <html> / <body> (it replaces the root layout when active).
 * Without this file, some Next.js + Turbopack builds can throw:
 * "Could not find ... global-error.js#default in the React Client Manifest"
 */
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-600 mb-6">
            An unexpected error occurred. You can try again or return to the home page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
