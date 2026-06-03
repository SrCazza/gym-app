// Ecuador timezone helpers (America/Guayaquil, UTC-5, no DST).
const TZ = "America/Guayaquil";

export function formatDate(d: Date | string, lang: "es" | "en" = "es"): string {
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00-05:00` : d) : d;
  return new Intl.DateTimeFormat(lang === "es" ? "es-EC" : "en-US", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatTime(d: Date | string, lang: "es" | "en" = "es"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(lang === "es" ? "es-EC" : "en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(d: Date | string, lang: "es" | "en" = "es"): string {
  return `${formatDate(d, lang)} · ${formatTime(d, lang)}`;
}

// Today's date in Guayaquil as YYYY-MM-DD
export function todayInEcuador(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Current HH:MM in Ecuador
export function nowHmInEcuador(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

const DIA_TO_INDEX: Record<string, number> = {
  Domingo: 0, Lunes: 1, Martes: 2,
  Miercoles: 3, Miércoles: 3,
  Jueves: 4, Viernes: 5,
  Sabado: 6, Sábado: 6,
};

const INDEX_TO_DIA = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

export const WEEKDAYS_ES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"] as const;

// Returns next YYYY-MM-DD (in Ecuador) on or after today that matches `dia`.
export function nextDateForDia(dia: string): string {
  const target = DIA_TO_INDEX[dia];
  if (target === undefined) return todayInEcuador();
  const today = todayInEcuador();
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const todayDow = base.getUTCDay();
  const diff = (target - todayDow + 7) % 7;
  base.setUTCDate(base.getUTCDate() + diff);
  return base.toISOString().slice(0, 10);
}

export function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + n);
  return base.toISOString().slice(0, 10);
}

// Returns Spanish weekday name for a YYYY-MM-DD (treated as Ecuador date).
export function diaForYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return INDEX_TO_DIA[base.getUTCDay()];
}

export function isWeekend(ymd: string): boolean {
  const dia = diaForYmd(ymd);
  return dia === "Sabado" || dia === "Domingo";
}

export function formatYmd(ymd: string, lang: "es" | "en" = "es"): string {
  return formatDate(ymd, lang);
}

// Parse "8h00" / "08h00" / "8:00" -> "08:00" for display.
export function formatHoraText(h: string | null | undefined): string {
  if (!h) return "—";
  const m = h.match(/^(\d{1,2})[h:](\d{2})$/);
  if (!m) return h;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

// Compare HH:MM-ish strings ("08h00" or "08:00").
export function hmCompare(a: string, b: string): number {
  return formatHoraText(a).localeCompare(formatHoraText(b));
}

// Monday of the ISO week containing `ymd` (Ecuador).
export function startOfWeekMonday(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = base.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // back to Mon
  base.setUTCDate(base.getUTCDate() - diff);
  return base.toISOString().slice(0, 10);
}

// Normalize Ecuador WhatsApp number to international format (no plus sign).
// 0963092245 -> 593963092245 ; 593963092245 unchanged ; 963092245 -> 593963092245
export function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return digits;
  if (digits.startsWith("593")) return digits;
  if (digits.startsWith("0")) return "593" + digits.slice(1);
  return "593" + digits;
}
