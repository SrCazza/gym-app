import { startOfWeekMonday, addDaysYmd } from "./time";

export type ReservaForAch = { fecha: string; estado: string };

export type Achievement = {
  id: string;
  tier: "easy" | "medium" | "hard";
  name: string;
  description: string;
  earned: boolean;
  earnedOn?: string | null;
};

function isoWeekKey(ymd: string): string {
  return startOfWeekMonday(ymd);
}
function monthKey(ymd: string): string {
  return ymd.slice(0, 7);
}

export function computeAchievements(reservas: ReservaForAch[], lang: "es" | "en"): Achievement[] {
  const active = reservas
    .filter((r) => r.estado === "reservado")
    .map((r) => r.fecha)
    .sort();
  const total = active.length;
  const uniqueDays = new Set(active);
  const firstDate = active[0];

  // by week
  const byWeek = new Map<string, Set<string>>();
  for (const d of active) {
    const k = isoWeekKey(d);
    if (!byWeek.has(k)) byWeek.set(k, new Set());
    byWeek.get(k)!.add(d);
  }
  const maxWeekCount = Math.max(0, ...Array.from(byWeek.values()).map((s) => s.size));

  // full week (Mon-Fri 5 distinct weekday dates in same week)
  let hasFullWeek = false;
  const fullWeekCandidates: string[] = [];
  for (const [start, days] of byWeek) {
    const mf: string[] = [];
    for (let i = 0; i < 5; i++) mf.push(addDaysYmd(start, i));
    if (mf.every((d) => days.has(d))) {
      hasFullWeek = true;
      fullWeekCandidates.push(mf[4]);
    }
  }
  const fullWeekDate: string | null = fullWeekCandidates.length
    ? fullWeekCandidates.sort()[0]
    : null;

  // by month: at least 3 weeks with >=3 reservas
  const monthsWithConstancy = new Set<string>();
  const monthWeeks = new Map<string, Map<string, number>>();
  for (const [wkStart, days] of byWeek) {
    const month = monthKey(wkStart);
    if (!monthWeeks.has(month)) monthWeeks.set(month, new Map());
    monthWeeks.get(month)!.set(wkStart, days.size);
  }
  for (const [month, weeks] of monthWeeks) {
    let cnt = 0;
    for (const c of weeks.values()) if (c >= 3) cnt++;
    if (cnt >= 3) monthsWithConstancy.add(month);
  }

  const dict = lang === "es"
    ? {
        primera: { n: "Primera clase", d: "Reservaste tu primera clase" },
        semanaActiva: { n: "Semana activa", d: "3+ reservas en una semana" },
        racha5: { n: "Racha de 5 días", d: "5 días distintos con reserva" },
        diez: { n: "10 clases", d: "Llegaste a 10 reservas" },
        semanaCompleta: { n: "Semana completa", d: "Lunes a viernes en una semana" },
        mes: { n: "Mes constante", d: "3 semanas del mes con 3+ reservas" },
        cincuenta: { n: "50 clases", d: "Llegaste a 50 reservas" },
        leyenda: { n: "Leyenda del gym", d: "Llegaste a 100 reservas" },
      }
    : {
        primera: { n: "First class", d: "You booked your first class" },
        semanaActiva: { n: "Active week", d: "3+ bookings in a single week" },
        racha5: { n: "5-day streak", d: "5 different days with a booking" },
        diez: { n: "10 classes", d: "Reached 10 bookings" },
        semanaCompleta: { n: "Full week", d: "Monday to Friday in one week" },
        mes: { n: "Steady month", d: "3 weeks in a month with 3+ bookings each" },
        cincuenta: { n: "50 classes", d: "Reached 50 bookings" },
        leyenda: { n: "Gym legend", d: "Reached 100 bookings" },
      };

  const fifth = active[4] ?? null;
  const tenth = active[9] ?? null;
  const fiftieth = active[49] ?? null;
  const hundredth = active[99] ?? null;

  // earliest week start with >=3 reservas
  const activeWeekStarts: string[] = [];
  for (const [start, days] of byWeek) {
    if (days.size >= 3) activeWeekStarts.push(start);
  }
  const activeWeekDate: string | null = activeWeekStarts.length
    ? activeWeekStarts.sort()[0]
    : null;

  const monthsArr = Array.from(monthsWithConstancy).sort();
  const mesDate = monthsArr[0] ? monthsArr[0] + "-01" : null;

  return [
    { id: "primera", tier: "easy", name: dict.primera.n, description: dict.primera.d, earned: total >= 1, earnedOn: firstDate ?? null },
    { id: "semanaActiva", tier: "easy", name: dict.semanaActiva.n, description: dict.semanaActiva.d, earned: maxWeekCount >= 3, earnedOn: activeWeekDate },
    { id: "racha5", tier: "easy", name: dict.racha5.n, description: dict.racha5.d, earned: uniqueDays.size >= 5, earnedOn: fifth },
    { id: "diez", tier: "medium", name: dict.diez.n, description: dict.diez.d, earned: total >= 10, earnedOn: tenth },
    { id: "semanaCompleta", tier: "medium", name: dict.semanaCompleta.n, description: dict.semanaCompleta.d, earned: hasFullWeek, earnedOn: fullWeekDate },
    { id: "mes", tier: "medium", name: dict.mes.n, description: dict.mes.d, earned: monthsWithConstancy.size >= 1, earnedOn: mesDate },
    { id: "cincuenta", tier: "hard", name: dict.cincuenta.n, description: dict.cincuenta.d, earned: total >= 50, earnedOn: fiftieth },
    { id: "leyenda", tier: "hard", name: dict.leyenda.n, description: dict.leyenda.d, earned: total >= 100, earnedOn: hundredth },
  ];
}
