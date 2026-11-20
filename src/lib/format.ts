const WIB = "Asia/Jakarta";

const numberFmt = new Intl.NumberFormat("id-ID");
const compactFmt = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: WIB,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const clockFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: WIB,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const dayFmt = new Intl.DateTimeFormat("id-ID", { timeZone: WIB, weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function formatNumber(value: number): string {
  return numberFmt.format(Math.round(value * 100) / 100);
}

export function formatCompact(value: number): string {
  return Math.abs(value) >= 10_000 ? compactFmt.format(value) : numberFmt.format(Math.round(value * 100) / 100);
}

export function formatDateTimeWIB(iso: string | Date): string {
  return `${dateTimeFmt.format(typeof iso === "string" ? new Date(iso) : iso).replace(/\./g, ":")} WIB`;
}

export function formatClockWIB(date: Date): string {
  return clockFmt.format(date).replace(/\./g, ":");
}

export function formatDayWIB(date: Date): string {
  return dayFmt.format(date);
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`;
}
