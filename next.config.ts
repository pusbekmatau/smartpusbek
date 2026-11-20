import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages. `NEXT_PUBLIC_BASE_PATH` (e.g. "/smartpusbek") and
 * `NEXT_PUBLIC_API_URL` (the Apps Script Web App) are provided by the Pages workflow.
 * Security response headers cannot be set on GitHub Pages; the backend enforces access.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
