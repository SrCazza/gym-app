import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Dumbbell, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/external";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Crear cuenta · GymCuenca" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // If email confirmation is required, no session yet.
    if (!data.session) {
      setSent(true);
      return;
    }
    navigate({ to: "/onboarding", replace: true });
  };

  if (sent) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center bg-background px-6 text-center">
        <div className="rounded-full bg-primary/10 p-4 text-primary">
          <MailCheck className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{t("verifyEmailTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("verifyEmailBody")}</p>
        <Link to="/login" className="mt-6 text-sm font-medium text-primary">
          {t("login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background px-6 py-10">
      <div className="mt-6 flex items-center gap-3">
        <div className="rounded-2xl bg-primary p-2.5 text-primary-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("appName")}</h1>
          <p className="text-sm text-muted-foreground">{t("signup")}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <PasswordInput id="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("loading") : t("signup")}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link to="/login" className="font-medium text-primary">
          {t("login")}
        </Link>
      </div>
    </div>
  );
}
