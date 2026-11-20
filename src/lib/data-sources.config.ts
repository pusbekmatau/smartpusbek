import "server-only";

/**
 * Backend source registry for the 17 data modules.
 * SERVER-ONLY: these identifiers are never serialised to the browser.
 *
 * `documentId` / `tabId` are taken from the original source URLs:
 *   https://docs.google.com/spreadsheets/d/<documentId>/edit?gid=<tabId>
 */
export interface DataSourceConfig {
  documentId: string;
  tabId: number;
}

export const DATA_SOURCES: Readonly<Record<string, DataSourceConfig>> = {
  // Monitoring
  "monitoring-2025": { documentId: "1KtuqQzsME8pzQZtMwb09c5FXsRrvmmfHYRrnFNSjcdw", tabId: 1023878405 },
  "monitoring-2026": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 1217200417 },
  // Master Data & Penerimaan
  "master-dalang": { documentId: "1uS69sn_7zFOBMp64jMD3gVVmtTCRmGZVn0FQmf13XYU", tabId: 0 },
  "master-ip-penerimaan": { documentId: "1asYL_offGbW4Pb6h6byLA4omK2D18sOqhz12Is9t1TQ", tabId: 1979618444 },
  "rekapan-mitra": { documentId: "1x2yp7HccYocWhfu5eU7kte_BIBYfoj5kMYASjb93qaQ", tabId: 1222716579 },
  "master-bspm": { documentId: "1PSWtsmdsXL0tn07PBtQRh-FHVUsxsFnBGHc0qSR_bl4", tabId: 79411227 },
  "data-warranty": { documentId: "12fcQ8xRy1V21o0LyvsSHK2HvfUAMDhez", tabId: 302098301 },
  "data-fms": { documentId: "1c91_DiGkMgaAXY0JnK8fAGE7aVHQmIVn", tabId: 558017458 },
  "data-sub-transit": { documentId: "1nkH307o3RVJnHoOZb44dM4MAKpT1cQ_wL-DcdqNVdkc", tabId: 0 },
  // SIMMAT
  "simmat-2021": { documentId: "1gk7JnJZd-k93YNYNfuOh-lu4ziLhIs8j", tabId: 1034752783 },
  "simmat-2022": { documentId: "1X0uHiCHK1UZzhvyxuiXaXJZObmlVJGvd", tabId: 1950703423 },
  "simmat-2023": { documentId: "1DUIKofLsxzpP7XqkpgOgiVhuqtxJVZra", tabId: 2139274514 },
  "simmat-2024": { documentId: "1c3LJb9YGTUbwCgLArLdu7chIJyPJQAL8", tabId: 2139274514 },
  "simmat-2025": { documentId: "19SbYSUOTOnVWUROjY6RaW-C5tLZ5fyKh", tabId: 2139274514 },
  "simmat-2026": { documentId: "1twf6c7uhliO1D2gHDPzNOHTIZiCe5Eo4", tabId: 2139274514 },
  // Integrasi Setriksa
  "data-setriksa": { documentId: "1EyhPolS3uT11v_UhZg9_A9snSq4WEmMhgmizbqddL-U", tabId: 1033088967 },
  "ip-bspm-setlurmat": { documentId: "1LdOGYm6nNvZ_M31HFhlvc86n0trMDE6K-BUDXXw-M-g", tabId: 898512136 },
};

export function getDataSource(slug: string): DataSourceConfig | undefined {
  return DATA_SOURCES[slug];
}
