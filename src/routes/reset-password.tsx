import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Recuperar contraseña · KLANBARZ" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) {
      setRecovery(true);
    }
  }, []);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("OK");
    window.location.href = "/app";
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background px-6 py-12">
      <h1 className="text-xl font-semibold">{recovery ? t("updatePassword") : t("forgotPassword")}</h1>
      {recovery ? (
        <form onSubmit={updatePassword} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np">{t("newPassword")}</Label>
            <PasswordInput id="np" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {t("updatePassword")}
          </Button>
        </form>
      ) : sent ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("verifyEmailBody")}
        </p>
      ) : (
        <form onSubmit={sendLink} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e">{t("email")}</Label>
            <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {t("sendResetLink")}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 text-center text-sm text-muted-foreground">
        ← {t("login")}
      </Link>
    </div>
  );
}
