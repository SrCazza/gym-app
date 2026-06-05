import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Dumbbell,
  Receipt,
  Ruler,
  BadgeCheck,
  AlertCircle,
  Trophy,
  Flame,
  Star,
  Award,
  Medal,
  Crown,
  Sparkles,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ScreenHeader } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatYmd,
  formatHoraText,
  todayInEcuador,
  nowHmInEcuador,
  startOfWeekMonday,
  addDaysYmd,
} from "@/lib/time";

function hmToMin(h: string): number {
  const m = h.match(/^(\d{1,2})[h:](\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
import { computeAchievements, type Achievement } from "@/lib/achievements";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

type ReservaRow = { fecha: string; estado: string };

const ACH_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  primera: Star,
  semanaActiva: Flame,
  racha5: Target,
  diez: Medal,
  semanaCompleta: Award,
  mes: Sparkles,
  cincuenta: Trophy,
  leyenda: Crown,
};

function Dashboard() {
  const { t, lang } = useI18n();
  const { cliente } = useAuth();
  const today = todayInEcuador();

  const { data: nextBooking, isLoading: nbLoading } = useQuery({
    queryKey: ["nextBooking", cliente?.id, today],
    queryFn: async () => {
      if (!cliente?.id) return null;
      const { data, error } = await supabase
        .from("reservas")
        .select("id, fecha, hora_inicio, clase")
        .eq("cliente_id", cliente.id)
        .eq("estado", "reservado")
        .gte("fecha", today)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true })
        .limit(20);
      if (error) throw error;
      const nowMin = hmToMin(nowHmInEcuador());
      const future = (data ?? []).find((r) => {
        if (r.fecha > today) return true;
        if (r.fecha < today) return false;
        return hmToMin(formatHoraText(r.hora_inicio)) > nowMin;
      });
      return (future ?? null) as { id: number; fecha: string; hora_inicio: string; clase: string } | null;
    },
    enabled: !!cliente?.id,
  });

  const { data: allReservas } = useQuery({
    queryKey: ["achievementsReservas", cliente?.id],
    queryFn: async () => {
      if (!cliente?.id) return [] as ReservaRow[];
      const { data, error } = await supabase
        .from("reservas")
        .select("fecha, estado")
        .eq("cliente_id", cliente.id);
      if (error) throw error;
      return (data ?? []) as ReservaRow[];
    },
    enabled: !!cliente?.id,
  });

  const membershipActive = cliente?.estado === "Activo";
  const fullName = [cliente?.nombres, cliente?.apellidos].filter(Boolean).join(" ");
  const firstName = cliente?.nombres?.split(" ")[0] ?? "";

  // Weekly streak (Mon-Sun) for current week
  const weekStart = startOfWeekMonday(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysYmd(weekStart, i));
  const reservedSet = new Set(
    (allReservas ?? []).filter((r) => r.estado === "reservado").map((r) => r.fecha),
  );
  const reservedThisWeek = weekDays.filter((d) => reservedSet.has(d)).length;
  const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];

  const achievements = computeAchievements(allReservas ?? [], lang);

  return (
    <div>
      <ScreenHeader title={t("appName")} />
      <div className="space-y-5 p-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t("hello")}</p>
          <h2 className="text-3xl font-bold tracking-tight">{firstName || fullName || "—"}</h2>
          {cliente?.plan && (
            <p className="text-xs font-medium uppercase tracking-widest text-primary/80">
              {cliente.plan}
            </p>
          )}
        </div>

        {/* Membership */}
        <div className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
          membershipActive
            ? "border-primary/30 bg-primary/5"
            : "border-destructive/30 bg-destructive/5"
        }`}>
          <div className={`rounded-full p-2 ${membershipActive ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
            {membershipActive ? <BadgeCheck className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("membershipStatus")}</p>
            <p className="truncate text-sm font-medium">
              {cliente?.estado ?? "—"}
              {cliente?.plan ? ` · ${cliente.plan}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("paymentStatus")}: {cliente?.pago ?? "—"}
              {cliente?.fecha_vencimiento_pago ? ` · ${cliente.fecha_vencimiento_pago}` : ""}
            </p>
          </div>
        </div>

        {/* Next booking */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("nextBooking")}</p>
          {nbLoading ? (
            <Skeleton className="mt-2 h-6 w-2/3" />
          ) : nextBooking ? (
            <div className="mt-2">
              <p className="text-base font-medium">{nextBooking.clase}</p>
              <p className="text-sm text-muted-foreground">
                {formatYmd(nextBooking.fecha, lang)} · {formatHoraText(nextBooking.hora_inicio)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("noNextBooking")}</p>
          )}
        </div>

        {/* Weekly streak */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">{t("weeklyStreak")}</p>
          <div className="flex justify-between gap-1">
            {weekDays.map((d, i) => {
              const active = reservedSet.has(d);
              const isToday = d === today;
              return (
                <div
                  key={d}
                  className={`flex h-9 flex-1 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  } ${isToday ? "ring-2 ring-primary/60" : ""}`}
                >
                  {dayLabels[i]}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {reservedThisWeek} / {weekDays.length} {t("dayProgress")}
          </p>
        </div>

        {/* Achievements */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("achievements")}</p>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((a) => (
              <AchievementCard key={a.id} a={a} lang={lang} t={t} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("quickActions")}</p>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction to="/app/clases" icon={<CalendarCheck className="h-5 w-5" />} label={t("bookClass")} />
            <QuickAction to="/app/comprobantes" icon={<Receipt className="h-5 w-5" />} label={t("uploadReceipt")} />
            <QuickAction to="/app/rutina" icon={<Dumbbell className="h-5 w-5" />} label={t("viewRoutine")} />
            <QuickAction to="/app/medidas" icon={<Ruler className="h-5 w-5" />} label={t("logMeasurement")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AchievementCard({
  a,
  lang,
  t,
}: {
  a: Achievement;
  lang: "es" | "en";
  t: (k: "locked" | "unlockedOn") => string;
}) {
  const Icon = ACH_ICON[a.id] ?? Trophy;
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-3 transition-colors ${
        a.earned
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-card opacity-60"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          a.earned ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-sm font-medium ${a.earned ? "text-foreground" : "text-muted-foreground"}`}>
          {a.name}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">{a.description}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {a.earned ? `${t("unlockedOn")}${a.earnedOn ? ` · ${formatYmd(a.earnedOn, lang)}` : ""}` : t("locked")}
        </p>
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="rounded-full bg-primary/15 p-2 text-primary transition-colors group-hover:bg-primary/25">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
