import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Action bodies are capped at 1MB by default, but the resume
    // dropzone accepts PDFs up to 5MB. The extra megabyte is headroom for the
    // multipart boundaries and part headers the raw body also carries — the
    // 5MB promise itself is enforced in `uploadResume`.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // PostHog ingestion sends trailing-slash requests that Next would otherwise redirect.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
