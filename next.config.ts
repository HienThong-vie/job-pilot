import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads pdf.js, which resolves its worker by file path at runtime.
  // Bundled, that path points into .next/ where the worker was never emitted
  // and every parse fails with "Setting up fake worker failed". Left external,
  // the package is required from node_modules and finds its own worker.
  serverExternalPackages: ["pdf-parse"],
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
