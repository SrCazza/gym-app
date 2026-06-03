import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarCheck, Dumbbell, User, CalendarDays } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items: Array<{ to: string; icon: typeof Home; label: TKey }> = [
  { to: "/app", icon: Home, label: "home" },
  { to: "/app/clases", icon: CalendarDays, label: "classes" },
  { to: "/app/reservas", icon: CalendarCheck, label: "bookings" },
  { to: "/app/rutina", icon: Dumbbell, label: "routine" },
  { to: "/app/perfil", icon: User, label: "profile" },
];

export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto grid max-w-[430px] grid-cols-5">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="leading-none">{t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
