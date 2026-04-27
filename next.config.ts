import type { NextConfig } from "next";

// App Router: `i18n` in next.config is unsupported (build error). Locales: tr, en; default: tr.
// See `SUPPORTED_LOCALES` and `DEFAULT_LOCALE` in src/lib/i18n/dictionaries.ts.

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["172.20.10.3", "172.16.11.212", "127.0.0.1", "localhost"],
};

export default nextConfig;
