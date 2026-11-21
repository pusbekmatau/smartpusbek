/**
 * Build-time configuration for the static (GitHub Pages) deployment.
 * Both values are injected by the GitHub Actions workflow (see .github/workflows/pages.yml).
 */

/** Sub-path the site is served from, e.g. "/smartpusbek". Empty for a custom domain or a user site. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** URL of the deployed Google Apps Script Web App that acts as the backend. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Prefixes a root-relative path with the site's base path (needed for raw <img>/location use). */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
