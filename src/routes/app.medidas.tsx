import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ruler } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n, type TKey } from "@/lib/i18n";
import { ScreenHeader, EmptyState } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayInEcuador, formatDate } from "@/lib/time";

export const Route = createFileRoute("/app/medidas")({
  component: MedidasPage,
});

type Medida = {
  id: number;
  fecha: string;
  peso?: number | null;
  altura?: number | null;
  porcentaje_grasa?: number | null;
  pecho?: number | null;
  cintura?: number | null;
  cadera?: number | null;
};

const fields: Array<{ key: keyof Medida; label: TKey; step: string }> = [
  { key: "peso", label: "weight", step: "0.1" },
  { key: "altura", label: "height", step: "0.1" },
  { key: "porcentaje_grasa", label: "bodyFat", step: "0.1" },
  { key: "pecho", label: "chest", step: "0.1" },
  { key: "cintura", label: "waist", step: "0.1" },
  { key: "cadera", label: "hip", step: "0.1" },
];

function MedidasPage() {
  const { t, lang } = useI18n();
  const { cliente } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["medidas", cliente?.id],
    queryFn: async () => {
      if (!cliente?.id) return [] as Medida[];
      const { data, error } = await supabase
        .from("medidas")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Medida[];
    },
    enabled: !!cliente?.id,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      if (!cliente?.id) throw new Error("Sin perfil");
      const payload: Record<string, unknown> = {
        cliente_id: cliente.id,
        fecha: todayInEcuador(),
      };
      for (const f of fields) {
        const v = form[f.key as string];
        if (v !== undefined && v !== "") payload[f.key as string] = Number(v);
      }
      const { error } = await supabase.from("medidas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("measurementSaved"));
      setForm({});
      qc.invalidateQueries({ queryKey: ["medidas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <ScreenHeader title={t("measurements")} />
      <div className="space-y-6 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate();
          }}
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <p className="text-sm font-medium">{t("addMeasurement")}</p>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={String(f.key)} className="space-y-1.5">
                <Label htmlFor={String(f.key)} className="text-xs">{t(f.label)}</Label>
                <Input
                  id={String(f.key)}
                  type="number"
                  step={f.step}
                  inputMode="decimal"
                  value={form[f.key as string] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key as string]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={guardar.isPending}>
            {t("save")}
          </Button>
        </form>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Ruler className="h-6 w-6" />} title={t("noMeasurements")} />
        ) : (
          <ul className="space-y-2">
            {data.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-medium">{formatDate(m.fecha, lang)}</p>
                <div className="mt-1 grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {fields.map((f) => {
                    const v = m[f.key];
                    if (v == null) return null;
                    return (
                      <span key={String(f.key)}>
                        {t(f.label).split(" ")[0]}: <span className="text-foreground">{String(v)}</span>
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
