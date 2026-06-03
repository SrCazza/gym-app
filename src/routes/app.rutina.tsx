import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Dumbbell, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ScreenHeader, EmptyState } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WEEKDAYS_ES } from "@/lib/time";

export const Route = createFileRoute("/app/rutina")({
  component: RutinaPage,
});

type Rutina = {
  id: number;
  cliente_id: number;
  semana: number;
  dia: string;
  clase: string;
  completado: boolean;
  created_at: string | null;
};

const CLASES = ["Calistenia", "Drill", "K45", "Acondicionamiento"] as const;
const WEEKS = [1, 2, 3, 4] as const;
const DIA_ORDER = WEEKDAYS_ES as readonly string[];

function RutinaPage() {
  const { t } = useI18n();
  const { cliente } = useAuth();
  const qc = useQueryClient();
  const [semana, setSemana] = useState<number>(1);
  const [newDia, setNewDia] = useState<string>("");
  const [newClase, setNewClase] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["rutinas", cliente?.id],
    queryFn: async () => {
      if (!cliente?.id) return [] as Rutina[];
      const { data, error } = await supabase
        .from("rutinas")
        .select("*")
        .eq("cliente_id", cliente.id);
      if (error) throw error;
      return (data ?? []) as Rutina[];
    },
    enabled: !!cliente?.id,
  });

  const weekItems = useMemo(() => {
    const list = (data ?? []).filter((r) => r.semana === semana);
    list.sort((a, b) => DIA_ORDER.indexOf(a.dia) - DIA_ORDER.indexOf(b.dia));
    return list;
  }, [data, semana]);

  const usedDias = new Set(weekItems.map((r) => r.dia));
  const availableDias = DIA_ORDER.filter((d) => !usedDias.has(d));
  const completed = weekItems.filter((r) => r.completado).length;
  const total = weekItems.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const canAdd = total < 5 && availableDias.length > 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rutinas"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      if (!cliente?.id || !newDia || !newClase) throw new Error("Datos incompletos");
      const { error } = await supabase.from("rutinas").insert({
        cliente_id: cliente.id,
        semana,
        dia: newDia,
        clase: newClase,
        completado: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("routineUpdated"));
      setNewDia("");
      setNewClase("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (r: Rutina) => {
      const { error } = await supabase
        .from("rutinas")
        .update({ completado: !r.completado })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("routineUpdated"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("rutinas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("routineUpdated"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearWeek = useMutation({
    mutationFn: async () => {
      if (!cliente?.id) return;
      const { error } = await supabase
        .from("rutinas")
        .delete()
        .eq("cliente_id", cliente.id)
        .eq("semana", semana);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("routineUpdated"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <ScreenHeader title={t("myRoutine")} />
      <div className="space-y-5 p-4">
        {/* Week tabs */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card p-1">
          {WEEKS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSemana(w)}
              className={`rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
                semana === w ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t("week")} {w}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("week")} {semana}</span>
            <span>
              {completed}/{total} {t("dayProgress")}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Add day form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="grid grid-cols-2 gap-2">
            <Select value={newDia} onValueChange={setNewDia} disabled={!canAdd}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectDay")} />
              </SelectTrigger>
              <SelectContent>
                {availableDias.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newClase} onValueChange={setNewClase} disabled={!canAdd}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectClass")} />
              </SelectTrigger>
              <SelectContent>
                {CLASES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!canAdd || !newDia || !newClase || add.isPending}
          >
            {canAdd ? t("addDay") : t("weekMaxed")}
          </Button>
        </form>

        {/* Day list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : weekItems.length === 0 ? (
          <EmptyState icon={<Dumbbell className="h-6 w-6" />} title={t("noRoutine")} />
        ) : (
          <>
            <ul className="space-y-2">
              {weekItems.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4"
                >
                  <button
                    type="button"
                    onClick={() => toggle.mutate(r)}
                    disabled={toggle.isPending}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    {r.completado ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{r.dia}</p>
                      <p className="text-xs text-muted-foreground">{r.clase}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(r.id)}
                    disabled={remove.isPending}
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                    aria-label="delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => clearWeek.mutate()}
              disabled={clearWeek.isPending}
            >
              {t("clearWeek")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
