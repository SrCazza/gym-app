import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/external";

export type Cliente = {
  id: number;
  user_id: string;
  nombres?: string | null;
  apellidos?: string | null;
  cedula?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  fecha_afiliacion?: string | null;
  ultima_reserva?: string | null;
  plan?: "Principiante" | "Familiar" | "Strong" | null;
  nivel?: "Principiante" | "Intermedio" | "Avanzado" | null;
  estado?: "Activo" | "Inactivo" | null;
  pago?: "Al dia" | "Proximo a vencer" | "Vencido" | null;
  fecha_vencimiento_pago?: string | null;
  credito?: boolean | null;
  created_at?: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  cliente: Cliente | null;
  loading: boolean;
  refreshCliente: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCliente = async (uid: string) => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      console.error("[clientes] load error", error);
      setCliente(null);
      return;
    }
    setCliente((data as Cliente | null) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => void loadCliente(s.user.id), 0);
      } else {
        setCliente(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadCliente(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      cliente,
      loading,
      refreshCliente: async () => {
        if (session?.user) await loadCliente(session.user.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, cliente, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
