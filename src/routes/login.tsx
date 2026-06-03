import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/external";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Iniciar sesión · GymCuenca" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/app", replace: true });
  }, [session, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/app", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background px-6 py-10">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
        >
          <Globe className="h-3.5 w-3.5" />
          {lang.toUpperCase()}
        </button>
      </div>
      <div className="mt-10 flex items-center gap-3">
        <div className="rounded-2xl bg-primary p-2.5 text-primary-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("appName")}</h1>
          <p className="text-sm text-muted-foreground">{t("login")}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("loading") : t("login")}
        </Button>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm">
        <Link to="/reset-password" className="text-muted-foreground hover:text-foreground">
          {t("forgotPassword")}
        </Link>
        <div className="text-muted-foreground">
          {t("noAccount")}{" "}
          <Link to="/signup" className="font-medium text-primary">
            {t("signup")}
          </Link>
        </div>
      </div>
    </div>
  );
}
