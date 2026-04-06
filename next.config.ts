import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /** Tree-shake icon and animation barrels so each route pulls only used modules (smaller JS, faster parse). */
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Avoid webpack filesystem pack cache in dev (`.next/cache/webpack/.../*.pack.gz`).
   * On Windows, those files are often missing or locked (AV, manual `.next` deletes while dev runs),
   * which causes ENOENT / PackFileCacheStrategy unhandled rejections. Slightly slower rebuilds, stable dev.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

const sentryBuildOptions = {
  org: "resume-ai",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
} as const;

const config = withSentryConfig(nextConfig, sentryBuildOptions);

/**
 * Sentry adds `ioredis` to serverExternalPackages for tracing. BullMQ imports
 * `ioredis/built/utils`, which Node cannot resolve when ioredis is externalized
 * under Turbopack — bundle ioredis instead (Sentry Redis auto-instrumentation may be reduced).
 */
if (Array.isArray(config.serverExternalPackages)) {
  config.serverExternalPackages = config.serverExternalPackages.filter(
    (pkg) => pkg !== "ioredis"
  );
}

export default config;
