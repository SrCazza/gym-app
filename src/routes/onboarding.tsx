import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { normalizeWhatsapp } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Completa tu perfil · GymCuenca" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t } = useI18n();
  const { user, cliente, loading, refreshCliente } = useAuth();
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cedula, setCedula] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (cliente) navigate({ to: "/app", replace: true });
  }, [user, cliente, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const normalizedWa = normalizeWhatsapp(whatsapp);

// Buscar si ya existe un cliente con este número
const { data: existing } = await supabase
  .from("clientes")
  .select("id")
  .eq("whatsapp", normalizedWa)
  .is("user_id", null)
  .maybeSingle();

let error;
if (existing) {
  // Ya existe (registrado por el bot) → solo vincular
  ({ error } = await supabase
    .from("clientes")
    .update({
      user_id: user.id,
      nombres,
      apellidos,
      cedula,
      direccion: direccion || null,
    })
    .eq("id", existing.id));
} else {
  // No existe → crear nuevo
  ({ error } = await supabase.from("clientes").insert({
    user_id: user.id,
    nombres,
    apellidos,
    cedula,
    whatsapp: normalizedWa,
    direccion: direccion || null,
    estado: "Activo",
    fecha_afiliacion: new Date().toISOString().slice(0, 10),
  }));
}
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("profileUpdated"));
    await refreshCliente();
    navigate({ to: "/app", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("completeProfile")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("welcome")} {user?.email}
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nombres">{t("firstName")}</Label>
          <Input id="nombres" required value={nombres} onChange={(e) => setNombres(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apellidos">{t("lastName")}</Label>
          <Input id="apellidos" required value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c">{t("cedula")}</Label>
          <Input id="c" required value={cedula} onChange={(e) => setCedula(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w">{t("whatsapp")}</Label>
          <Input id="w" type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d">{t("address")}</Label>
          <Input id="d" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("loading") : t("save")}
        </Button>
      </form>
    </div>
  );
}
