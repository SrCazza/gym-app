import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ScreenHeader, EmptyState } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  addDaysYmd,
  diaForYmd,
  formatHoraText,
  formatYmd,
  hmCompare,
  isWeekend,
  nowHmInEcuador,
  todayInEcuador,
} from "@/lib/time";

export const Route = createFileRoute("/app/clases")({
  component: ClasesPage,
});

type Horario = {
  id: number;
  dia: string;
  hora_inicio: string;
  hora_final: string;
  clase: string;
  cupo_maximo: number | null;
  activo: boolean;
};

type ReservaMini = {
  id: number;
  fecha: string;
  hora_inicio: string;
  clase: string;
  cliente_id: number;
  estado: string;
};

const CLASES = ["Calistenia", "Drill", "K45", "Acondicionamiento"] as const;

function ClasesPage() {
  const { t, lang } = useI18n();
  const { cliente } = useAuth();
  const qc = useQueryClient();
  const today = todayInEcuador();

  const [when, setWhen] = useState<"hoy" | "manana">("hoy");
  const [clase, setClase] = useState<(typeof CLASES)[number] | null>(null);

  const fecha = when === "hoy" ? today : addDaysYmd(today, 1);
  const dia = diaForYmd(fecha);
  const weekend = isWeekend(fecha);

  const { data: horarios, isLoading } = useQuery({
    queryKey: ["horarios", dia, clase],
    queryFn: async () => {
      if (weekend || !clase) return [] as Horario[];
      const { data, error } = await supabase
        .from("horarios_clases")
        .select("*")
        .eq("activo", true)
        .eq("dia", dia)
        .eq("clase", clase);
      if (error) throw error;
      const list = (data ?? []) as Horario[];
      list.sort((a, b) => hmCompare(a.hora_inicio, b.hora_inicio));
      return list;
    },
    enabled: !weekend && !!clase,
  });

  const { data: dayReservas } = useQuery({
    queryKey: ["reservasDia", fecha, clase],
    queryFn: async () => {
      if (weekend || !clase) return [] as ReservaMini[];
      const { data, error } = await supabase
        .from("reservas")
        .select("id, fecha, hora_inicio, clase, cliente_id, estado")
        .eq("estado", "reservado")
        .eq("fecha", fecha)
        .eq("clase", clase);
      if (error) throw error;
      return (data ?? []) as ReservaMini[];
    },
    enabled: !weekend && !!clase,
  });

  const reservar = useMutation({
    mutationFn: async (h: Horario) => {
      if (!cliente?.id) throw new Error("Sin perfil");
      const { error } = await supabase.from("reservas").insert({
        cliente_id: cliente.id,
        fecha,
        hora_inicio: h.hora_inicio,
        clase: h.clase,
        estado: "reservado",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("bookingCreated"));
      qc.invalidateQueries({ queryKey: ["reservasDia"] });
      qc.invalidateQueries({ queryKey: ["reservas"] });
      qc.invalidateQueries({ queryKey: ["nextBooking"] });
      qc.invalidateQueries({ queryKey: ["achievementsReservas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nowHm = nowHmInEcuador();

  return (
    <div>
      <ScreenHeader title={t("schedule")} />
      <div className="space-y-4 p-4">
        {/* Hoy / Mañana */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1">
          {(["hoy", "manana"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWhen(w)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                when === w ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w === "hoy" ? t("today") : t("tomorrow")}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{formatYmd(fecha, lang)}</p>

        {weekend ? (
          <EmptyState icon={<CalendarX2 className="h-6 w-6" />} title={t("noWeekendClasses")} />
        ) : (
          <>
            {/* Class type buttons */}
            <div className="grid grid-cols-2 gap-2">
              {CLASES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClase(c)}
                  className={`rounded-2xl border p-3 text-sm font-medium transition-colors ${
                    clase === c
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {!clase ? (
              <p className="pt-4 text-center text-sm text-muted-foreground">{t("chooseClass")}</p>
            ) : isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : !horarios || horarios.length === 0 ? (
              <EmptyState icon={<CalendarX2 className="h-6 w-6" />} title={t("noSlots")} />
            ) : (
              <ul className="space-y-3">
                {horarios.map((h) => {
                  const occupants = (dayReservas ?? []).filter(
                    (r) => r.hora_inicio === h.hora_inicio,
                  );
                  const reserved = !!cliente?.id && occupants.some((r) => r.cliente_id === cliente.id);
                  const total = occupants.length;
                  const cap = h.cupo_maximo ?? 0;
                  const left = Math.max(0, cap - total);
                  const isPast = when === "hoy" && hmCompare(h.hora_inicio, nowHm) <= 0;
                  const isFull = cap > 0 && left <= 0 && !reserved;
                  const disabled = isPast || isFull || reserved || reservar.isPending;
                  const label = reserved
                    ? t("alreadyBooked")
                    : isPast
                      ? t("finished")
                      : isFull
                        ? t("full")
                        : t("book");
                  return (
                    <li key={h.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{h.clase}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatHoraText(h.hora_inicio)} – {formatHoraText(h.hora_final)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {isFull ? t("full") : `${left}/${cap || "—"} ${t("spotsLeft")}`}
                          </p>
                        </div>
                        <Button size="sm" disabled={disabled} onClick={() => reservar.mutate(h)}>
                          {label}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
