import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ScreenHeader, EmptyState } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatYmd,
  formatHoraText,
  todayInEcuador,
  nowHmInEcuador,
  diaForYmd,
} from "@/lib/time";

export const Route = createFileRoute("/app/reservas")({
  component: ReservasPage,
});

type Reserva = {
  id: number;
  fecha: string;
  hora_inicio: string;
  clase: string;
  estado: string;
};

type Horario = {
  dia: string;
  clase: string;
  hora_inicio: string;
  hora_final: string;
};

// Convert "HH:MM" or "HHhMM" to minutes since midnight.
function hmToMin(h: string): number {
  const m = h.match(/^(\d{1,2})[h:](\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function ReservasPage() {
  const { t, lang } = useI18n();
  const { cliente } = useAuth();
  const qc = useQueryClient();
  const today = todayInEcuador();
  const nowMin = hmToMin(nowHmInEcuador());

  const { data: reservas, isLoading } = useQuery({
    queryKey: ["reservas", cliente?.id],
    queryFn: async () => {
      if (!cliente?.id) return [] as Reserva[];
      const { data, error } = await supabase
        .from("reservas")
        .select("id, fecha, hora_inicio, clase, estado")
        .eq("cliente_id", cliente.id)
        .order("fecha", { ascending: false })
        .order("hora_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Reserva[];
    },
    enabled: !!cliente?.id,
  });

  const { data: horarios } = useQuery({
    queryKey: ["horariosAll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horarios_clases")
        .select("dia, clase, hora_inicio, hora_final");
      if (error) throw error;
      return (data ?? []) as Horario[];
    },
  });

  const horarioMap = new Map<string, string>();
  for (const h of horarios ?? []) {
    horarioMap.set(`${h.dia}|${h.clase}|${formatHoraText(h.hora_inicio)}`, formatHoraText(h.hora_final));
  }

  const cancelar = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("reservas").update({ estado: "cancelado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("bookingCancelled"));
      qc.invalidateQueries({ queryKey: ["reservas"] });
      qc.invalidateQueries({ queryKey: ["upcomingReservas"] });
      qc.invalidateQueries({ queryKey: ["nextBooking"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  type Enriched = Reserva & { horaFinal: string; isPast: boolean; minsToStart: number };

  const enriched: Enriched[] = (reservas ?? []).map((r) => {
    const dia = diaForYmd(r.fecha);
    const horaInicioFmt = formatHoraText(r.hora_inicio);
    const horaFinal = horarioMap.get(`${dia}|${r.clase}|${horaInicioFmt}`) ?? horaInicioFmt;
    let isPast: boolean;
    let minsToStart = Number.POSITIVE_INFINITY;
    if (r.fecha < today) isPast = true;
    else if (r.fecha > today) {
      isPast = false;
      // approx: more than 45 min away (different day)
      minsToStart = 24 * 60;
    } else {
      isPast = hmToMin(horaFinal) <= nowMin;
      minsToStart = hmToMin(horaInicioFmt) - nowMin;
    }
    return { ...r, horaFinal, isPast, minsToStart };
  });

  const upcoming = enriched.filter((r) => !r.isPast && r.estado === "reservado");
  const past = enriched.filter((r) => r.isPast || r.estado === "cancelado");

  return (
    <div>
      <ScreenHeader title={t("myBookings")} />
      <div className="space-y-6 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <Section title={t("upcoming")}>
              {upcoming.length === 0 ? (
                <EmptyState icon={<CalendarX2 className="h-6 w-6" />} title={t("noBookings")} />
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{r.clase}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatYmd(r.fecha, lang)} · {formatHoraText(r.hora_inicio)} - {r.horaFinal}
                          </p>
                        </div>
                        {r.minsToStart > 45 ? (
                          <Button size="sm" variant="outline" onClick={() => cancelar.mutate(r.id)} disabled={cancelar.isPending}>
                            {t("cancelBooking")}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {past.length > 0 ? (
              <Section title="Historial">
                <ul className="space-y-2 opacity-60">
                  {past.slice(0, 30).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-card/30 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-muted-foreground">{r.clase}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatYmd(r.fecha, lang)} · {formatHoraText(r.hora_inicio)} - {r.horaFinal}
                        </p>
                      </div>
                      {r.estado === "cancelado" ? (
                        <Badge variant="outline">{r.estado}</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
