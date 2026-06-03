import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { BottomNav } from "@/components/BottomNav";
import { MobileShell } from "@/components/MobileShell";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, cliente, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login", replace: true });
    else if (!cliente) navigate({ to: "/onboarding", replace: true });
  }, [session, cliente, loading, navigate]);

  if (loading || !session || !cliente) {
    return (
      <MobileShell>
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <span className="sr-only">{t("loading")}</span>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </MobileShell>
  );
}
