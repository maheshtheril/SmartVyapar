"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Unexpected Application Error</h2>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Ziona POS encountered an unexpected issue. Our engineering team has been automatically alerted via Sentry crash telemetry.
          </p>
          {error?.message && (
            <div className="text-left bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 text-xs font-mono text-rose-400 max-h-32 overflow-auto">
              <span className="font-bold text-rose-300 block text-[10px] uppercase tracking-wider mb-0.5">Details:</span>
              {error.message}
            </div>
          )}
          {error?.digest && (
            <p className="text-xs font-mono text-slate-500 mb-6 bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800/80 inline-block">
              Error Digest: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/";
                }
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition border border-slate-700"
            >
              Return Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
