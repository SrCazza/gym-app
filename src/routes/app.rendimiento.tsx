import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n, type TKey } from "@/lib/i18n";
import { ScreenHeader, EmptyState } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatDate } from "@/lib/time";

export const Route = createFileRoute("/app/rendimiento")({
  component: RendimientoPage,
});

type Rendimiento = {
  id: number;
  cliente_id: number;
  ejercicio: string;
  nivel_dificultad: string;
  repeticiones_max: number;
  peso_max_kg: number | null;
  notas: string | null;
  fecha_prueba: string;
  created_at: string;
  updated_at: string | null;
  updated_by_email: string | null;
};

const TZ = "America/Guayaquil";
const TABS = ["byExercise", "performanceHistory"] as const;
type TabKey = (typeof TABS)[number];

const chartConfig = {
  repeticiones_max: { label: "Reps", color: "var(--chart-1)" },
  peso_max_kg: { label: "kg", color: "var(--chart-4)" },
} satisfies ChartConfig;

function fmtTick(v: string, lang: "es" | "en") {
  return new Intl.DateTimeFormat(lang === "es" ? "es-EC" : "en-US", {
    day: "2-digit",
    month: "short",
    timeZone: TZ,
  }).format(new Date(`${v}T12:00:00-05:00`));
}

function fmtLong(v: string, lang: "es" | "en") {
  return new Intl.DateTimeFormat(lang === "es" ? "es-EC" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(`${v}T12:00:00-05:00`));
}

function nivelClass(nivel: string) {
  if (nivel === "Principiante") return "bg-green-500/20 text-green-400";
  if (nivel === "Intermedio") return "bg-yellow-500/20 text-yellow-400";
  if (nivel === "Avanzado") return "bg-orange-500/20 text-orange-400";
  if (nivel === "Élite") return "bg-red-500/20 text-red-400";
  return "bg-muted text-muted-foreground";
}

function RendimientoPage() {
  const { t, lang } = useI18n();
  const { cliente } = useAuth();
  const [tab, setTab] = useState<TabKey>("byExercise");
  const [selectedEjercicio, setSelectedEjercicio] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rendimiento", cliente?.id],
    queryFn: async () => {
      if (!cliente?.id) return [] as Rendimiento[];
      const { data, error } = await supabase
        .from("rendimiento")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("fecha_prueba", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Rendimiento[];
    },
    enabled: !!cliente?.id,
  });

  const exercises = useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.ejercicio))).sort(),
    [data],
  );

  const effectiveEjercicio = selectedEjercicio || exercises[0] || "";

  const exerciseData = useMemo(
    () => (data ?? []).filter((r) => r.ejercicio === effectiveEjercicio),
    [data, effectiveEjercicio],
  );

  const hasWeight = exerciseData.some((r) => r.peso_max_kg != null);

  const best =
    exerciseData.length > 0
      ? exerciseData.reduce((b, r) =>
          r.repeticiones_max > b.repeticiones_max ? r : b,
        )
      : null;

  const last = exerciseData.at(-1) ?? null;
  const prev =
    exerciseData.length >= 2
      ? exerciseData[exerciseData.length - 2]
      : null;

  const historyData = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) =>
        b.fecha_prueba.localeCompare(a.fecha_prueba),
      ),
    [data],
  );

  if (isLoading) {
    return (
      <div>
        <ScreenHeader title={t("performance")} />
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div>
        <ScreenHeader title={t("performance")} />
        <div className="p-4">
          <EmptyState
            icon={<TrendingUp className="h-6 w-6" />}
            title={t("noPerformance")}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader title={t("performance")} />
      <div className="space-y-5 p-4">
        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
          {TABS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-xl px-2 py-2 text-sm font-medium transition-all duration-200 ${
                tab === k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(k as TKey)}
            </button>
          ))}
        </div>

        {/* Tab: Por ejercicio */}
        {tab === "byExercise" && (
          <div className="space-y-4">
            <Select
              value={effectiveEjercicio}
              onValueChange={setSelectedEjercicio}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectExercise")} />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {exerciseData.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-6 w-6" />}
                title={t("noPerformance")}
              />
            ) : (
              <>
                {/* Chart */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <LineChart
                      data={exerciseData}
                      margin={{ top: 4, right: hasWeight ? 8 : 4, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="fecha_prueba"
                        tickFormatter={(v) => fmtTick(String(v), lang)}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      {hasWeight && (
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={32}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.75rem",
                          fontSize: 12,
                        }}
                        labelFormatter={(v) => fmtTick(String(v), lang)}
                      />
                      <Line
                        yAxisId="left"
                        dataKey="repeticiones_max"
                        name={t("reps")}
                        stroke="var(--color-repeticiones_max)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "var(--color-repeticiones_max)" }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                      {hasWeight && (
                        <Line
                          yAxisId="right"
                          dataKey="peso_max_kg"
                          name={t("weightLabel")}
                          stroke="var(--color-peso_max_kg)"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "var(--color-peso_max_kg)" }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      )}
                    </LineChart>
                  </ChartContainer>
                  {exerciseData.length === 1 && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {t("moreRecordsNeeded")}
                    </p>
                  )}
                </div>

                {/* Indicators */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t("bestRecord")}</p>
                    {best && (
                      <p className="mt-1 text-sm font-semibold leading-tight">
                        {best.repeticiones_max}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}{t("reps")}
                        </span>
                        {best.peso_max_kg != null && (
                          <>
                            <br />
                            <span className="text-xs font-normal">
                              {best.peso_max_kg} kg
                            </span>
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t("lastTest")}</p>
                    {last && (
                      <p className="mt-1 text-sm font-semibold leading-tight">
                        {formatDate(last.fecha_prueba, lang)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t("trend")}</p>
                    <div className="mt-1 flex justify-center">
                      {exerciseData.length < 2 ? (
                        <span className="text-xs text-muted-foreground">
                          {t("noComparison")}
                        </span>
                      ) : last && prev && last.repeticiones_max > prev.repeticiones_max ? (
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                          {t("progressing")}
                        </span>
                      ) : last && prev && last.repeticiones_max === prev.repeticiones_max ? (
                        <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                          {t("stable")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          {t("dropped")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Historial */}
        {tab === "performanceHistory" && (
          <div>
            {historyData.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-6 w-6" />}
                title={t("noPerformance")}
              />
            ) : (
              <ul className="space-y-2">
                {historyData.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{r.ejercicio}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${nivelClass(r.nivel_dificultad)}`}
                      >
                        {r.nivel_dificultad}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtLong(r.fecha_prueba, lang)}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>
                        {t("reps")}:{" "}
                        <span className="font-medium text-foreground">
                          {r.repeticiones_max}
                        </span>
                      </span>
                      <span>
                        {t("weightLabel")}:{" "}
                        <span className="font-medium text-foreground">
                          {r.peso_max_kg != null ? `${r.peso_max_kg} kg` : "—"}
                        </span>
                      </span>
                    </div>
                    {r.notas && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("notes")}: {r.notas}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
