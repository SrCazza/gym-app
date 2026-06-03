import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Globe, Receipt, Ruler } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ScreenHeader } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { t, lang, setLang } = useI18n();
  const { cliente, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  const fullName = [cliente?.nombres, cliente?.apellidos].filter(Boolean).join(" ");

  return (
    <div>
      <ScreenHeader title={t("profile")} />
      <div className="space-y-5 p-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-lg font-semibold">{fullName || "—"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <dl className="mt-4 space-y-1 text-sm">
            <Row label={t("cedula")} value={cliente?.cedula ?? "—"} />
            <Row label={t("whatsapp")} value={cliente?.whatsapp ?? "—"} />
            <Row label={t("address")} value={cliente?.direccion ?? "—"} />
            <Row label={t("plan")} value={cliente?.plan ?? "—"} />
            <Row label={t("level")} value={cliente?.nivel ?? "—"} />
            <Row label={t("membershipStatus")} value={cliente?.estado ?? "—"} />
            <Row label={t("paymentStatus")} value={cliente?.pago ?? "—"} />
            <Row label={t("nextDue")} value={cliente?.fecha_vencimiento_pago ?? "—"} />
          </dl>
        </div>

        <div className="space-y-2">
          <Link to="/app/comprobantes" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
            <Receipt className="h-5 w-5 text-primary" />
            <span className="text-sm">{t("receipts")}</span>
          </Link>
          <Link to="/app/medidas" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
            <Ruler className="h-5 w-5 text-primary" />
            <span className="text-sm">{t("measurements")}</span>
          </Link>
          <button
            type="button"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/40"
          >
            <span className="flex items-center gap-3 text-sm">
              <Globe className="h-5 w-5 text-primary" />
              {t("language")}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{lang.toUpperCase()}</span>
          </button>
        </div>

        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
