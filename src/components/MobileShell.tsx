import type { ReactNode } from "react";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col border-x border-border bg-background shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3.5 backdrop-blur">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      {right}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-full bg-primary/10 p-4 text-primary">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-[260px] text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
