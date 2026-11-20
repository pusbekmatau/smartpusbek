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
  /** Kode sumber pada konektor Apps Script (mode "script"); lihat APPS_SCRIPT_URL di .env.example. */
  script?: string;
}

export const DATA_SOURCES: Readonly<Record<string, DataSourceConfig>> = {
  // Monitoring
  "monitoring-2025": { documentId: "1KtuqQzsME8pzQZtMwb09c5FXsRrvmmfHYRrnFNSjcdw", tabId: 1023878405, script: "MON_2025" },
  "monitoring-2026": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 1217200417, script: "MON_2026" },
  // Monitoring 2026 — tab lain pada workbook yang sama
  "monitoring-2026-dashboard": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 1567735890, script: "MON_2026" },
  "monitoring-2026-kontrol-takah": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 1213873211, script: "MON_2026" },
  "monitoring-2026-progress-buka-takah": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 2008522192, script: "MON_2026" },
  "monitoring-2026-ip-salur": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 682766291, script: "MON_2026" },
  "monitoring-2026-bspm-salur": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 337755818, script: "MON_2026" },
  "monitoring-2026-ip-p3k": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 1251734049, script: "MON_2026" },
  "monitoring-2026-bspm-rpc": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 310933967, script: "MON_2026" },
  "monitoring-2026-bspm-gpp": { documentId: "17hhs_95St19RgG4mqXxIwi6fDdFTf98B", tabId: 1486941389, script: "MON_2026" },
  // Master Data & Penerimaan
  "master-dalang": { documentId: "1uS69sn_7zFOBMp64jMD3gVVmtTCRmGZVn0FQmf13XYU", tabId: 0, script: "DALANG" },
  "master-ip-penerimaan": { documentId: "1asYL_offGbW4Pb6h6byLA4omK2D18sOqhz12Is9t1TQ", tabId: 1979618444, script: "MASTER_IP" },
  "rekapan-mitra": { documentId: "1x2yp7HccYocWhfu5eU7kte_BIBYfoj5kMYASjb93qaQ", tabId: 1222716579, script: "REKAP_MITRA" },
  "master-bspm": { documentId: "1PSWtsmdsXL0tn07PBtQRh-FHVUsxsFnBGHc0qSR_bl4", tabId: 79411227, script: "BSPM" },
  "data-warranty": { documentId: "12fcQ8xRy1V21o0LyvsSHK2HvfUAMDhez", tabId: 302098301, script: "WARRANTY" },
  "data-fms": { documentId: "1c91_DiGkMgaAXY0JnK8fAGE7aVHQmIVn", tabId: 558017458, script: "FMS" },
  "data-sub-transit": { documentId: "1nkH307o3RVJnHoOZb44dM4MAKpT1cQ_wL-DcdqNVdkc", tabId: 0, script: "SUB_TRANSIT" },
  // SIMMAT
  "simmat-2021": { documentId: "1gk7JnJZd-k93YNYNfuOh-lu4ziLhIs8j", tabId: 1034752783, script: "SIMMAT_2021" },
  "simmat-2022": { documentId: "1X0uHiCHK1UZzhvyxuiXaXJZObmlVJGvd", tabId: 1950703423, script: "SIMMAT_2022" },
  "simmat-2023": { documentId: "1DUIKofLsxzpP7XqkpgOgiVhuqtxJVZra", tabId: 2139274514, script: "SIMMAT_2023" },
  "simmat-2024": { documentId: "1c3LJb9YGTUbwCgLArLdu7chIJyPJQAL8", tabId: 2139274514, script: "SIMMAT_2024" },
  "simmat-2025": { documentId: "19SbYSUOTOnVWUROjY6RaW-C5tLZ5fyKh", tabId: 2139274514, script: "SIMMAT_2025" },
  "simmat-2026": { documentId: "1twf6c7uhliO1D2gHDPzNOHTIZiCe5Eo4", tabId: 2139274514, script: "SIMMAT_2026" },
  // Integrasi Setriksa
  "data-setriksa": { documentId: "1EyhPolS3uT11v_UhZg9_A9snSq4WEmMhgmizbqddL-U", tabId: 1033088967, script: "SETRIKSA" },
  "ip-bspm-setlurmat": { documentId: "1LdOGYm6nNvZ_M31HFhlvc86n0trMDE6K-BUDXXw-M-g", tabId: 898512136, script: "IP_BSPM_MAJU" },
};

export function getDataSource(slug: string): DataSourceConfig | undefined {
  return DATA_SOURCES[slug];
}
