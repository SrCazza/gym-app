import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Receipt, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ScreenHeader, EmptyState } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/comprobantes")({
  component: ComprobantesPage,
});

type Comprobante = {
  id: number;
  url_imagen: string | null;
  estado: string | null;
  created_at: string | null;
};

function statusVariant(s?: string | null): "default" | "secondary" | "destructive" | "outline" {
  const v = (s ?? "").toLowerCase();
  if (v.includes("aprob")) return "default";
  if (v.includes("rech")) return "destructive";
  return "secondary";
}

function ComprobantesPage() {
  const { t } = useI18n();
  const { cliente } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["comprobantes", cliente?.id],
    queryFn: async () => {
      if (!cliente?.id) return [] as Comprobante[];
      const { data, error } = await supabase
        .from("comprobantes")
        .select("id, url_imagen, estado, created_at")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Comprobante[];
    },
    enabled: !!cliente?.id,
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Sin archivo");
      console.log("[comprobantes] start upload", { name: file.name, size: file.size, type: file.type });

      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error("[comprobantes] auth.getUser error", authErr);
        throw new Error(`[auth] ${authErr.message}`);
      }
      const uid = auth.user?.id;
      if (!uid) throw new Error("[auth] Sin sesión");
      console.log("[comprobantes] uid", uid);

      const { data: cli, error: cliErr } = await supabase
        .from("clientes")
        .select("id")
        .eq("user_id", uid)
        .single();
      if (cliErr || !cli) {
        console.error("[comprobantes] clientes lookup error", cliErr);
        throw new Error(`[clientes] ${cliErr?.message ?? "Sin perfil"}`);
      }
      const clienteId = cli.id as number;
      console.log("[comprobantes] clienteId", clienteId);

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${clienteId}/${Date.now()}_${safeName}`;
      console.log("[comprobantes] storage path", path);

      const up = await supabase.storage.from("comprobantes").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (up.error) {
        console.error("[comprobantes] storage upload error", up.error);
        throw new Error(`[storage] ${up.error.message}`);
      }
      console.log("[comprobantes] storage uploaded", up.data);

      const { data: pub } = supabase.storage.from("comprobantes").getPublicUrl(up.data.path);
      console.log("[comprobantes] public url", pub.publicUrl);

      const { error: insErr, data: insData } = await supabase
        .from("comprobantes")
        .insert({
          cliente_id: clienteId,
          url_imagen: pub.publicUrl,
          estado: "pendiente",
        })
        .select();
      if (insErr) {
        console.error("[comprobantes] db insert error", insErr);
        throw new Error(
          `[db insert] ${insErr.message}${insErr.details ? ` — ${insErr.details}` : ""}${insErr.hint ? ` (${insErr.hint})` : ""}`,
        );
      }
      console.log("[comprobantes] inserted", insData);
    },

    onSuccess: () => {
      toast.success(t("receiptSent"));
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["comprobantes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <ScreenHeader title={t("receipts")} />
      <div className="space-y-6 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar.mutate();
          }}
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <p className="text-sm font-medium">{t("sendReceipt")}</p>
          <div className="space-y-1.5">
            <Label htmlFor="file">{t("selectFile")}</Label>
            <Input
              id="file"
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!file || enviar.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {t("sendReceipt")}
          </Button>
        </form>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title={t("noReceipts")} />
        ) : (
          <ul className="space-y-2">
            {data.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0">
                  {c.url_imagen ? (
                    <a href={c.url_imagen} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary">
                      {t("receipts")}
                    </a>
                  ) : (
                    <p className="text-sm font-medium">—</p>
                  )}
                  <p className="text-xs text-muted-foreground">{c.created_at?.slice(0, 10)}</p>
                </div>
                <Badge variant={statusVariant(c.estado)}>{c.estado ?? t("pending")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
