import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { clearLocalSupabaseTokens, GESTOR_NAME, loadSession, signOut, type Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";
import { fetchVisibleLeads } from "@/lib/leads.functions";
import { LoginScreen } from "@/components/LoginScreen";
import { LeadsTab } from "@/components/LeadsTab";
import { NewLeadTab } from "@/components/NewLeadTab";
import { RoteiroTab } from "@/components/RoteiroTab";
import { PainelTab } from "@/components/PainelTab";
import { AdminTab } from "@/components/AdminTab";
import { GestorDashboardTab } from "@/components/GestorDashboardTab";
import { LogOut, Users, Plus, MessageSquare, BarChart3, Shield, Trophy } from "lucide-react";
import { useAutoProgression } from "@/lib/autoProgression";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GNS Leads — CRM WhatsApp | Grupo Nascimento e Souza" },
      { name: "description", content: "CRM de leads via WhatsApp para o Grupo Nascimento e Souza, especialista em defesa de busca e apreensão de veículos pesados." },
    ],
  }),
  component: App,
  ssr: false,
});

type Tab = "leads" | "new" | "roteiro" | "painel" | "admin";

function App() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<Tab>("leads");
  const loadVisibleLeads = useServerFn(fetchVisibleLeads);

  useEffect(() => {
    let cancelled = false;
    const safeLoad = async () => {
      try {
        const s = await loadSession();
        if (!cancelled) {
          setSessionState(s);
          setReady(true);
        }
      } catch (err) {
        console.warn("loadSession falhou, limpando sessão local:", err);
        // Limpeza segura de tokens supabase corrompidos no localStorage (sem apagar dados do CRM)
        try {
          clearLocalSupabaseTokens();
          await signOut().catch(() => {});
        } catch { /* noop */ }
        if (!cancelled) {
          setSessionState(null);
          setReady(true);
        }
      }
    };
    safeLoad();
    // Fallback: se algo travar a promise, libera a UI em 2s para mostrar o login
    const watchdog = setTimeout(() => { if (!cancelled) setReady(true); }, 2000);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSessionState(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setTimeout(() => {
          loadSession()
            .then((s) => { if (!cancelled) setSessionState(s); })
            .catch((err) => console.warn("loadSession (auth event) falhou:", err));
        }, 0);
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const load = async () => {
      const data = await loadVisibleLeads();
      if (!cancelled) setLeads(data as Lead[]);
    };
    load();

    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (payload) => {
        setLeads((cur) => {
          if (payload.eventType === "INSERT") {
            const n = payload.new as Lead;
            if (cur.find((x) => x.id === n.id)) return cur;
            return [n, ...cur];
          }
          if (payload.eventType === "UPDATE") {
            const n = payload.new as Lead;
            return cur.map((x) => (x.id === n.id ? n : x));
          }
          if (payload.eventType === "DELETE") {
            const o = payload.old as Lead;
            return cur.filter((x) => x.id !== o.id);
          }
          return cur;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session, loadVisibleLeads]);

  useEffect(() => {
    // reset filter handled inside LeadsTab via key
  }, [tab]);

  useAutoProgression(leads, session);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Carregando…
    </div>
  );

  if (!session) return <LoginScreen onLogin={setSessionState} />;

  const logout = async () => {
    await signOut();
    setSessionState(null);
    setLeads([]);
  };


  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">GNS Leads</div>
            <div className="text-sm font-semibold truncate">{session.name}</div>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="px-4 py-5">
        {tab === "leads" && <LeadsTab key="leads" leads={leads} session={session} />}
        {tab === "new" && <NewLeadTab session={session} />}
        {tab === "roteiro" && <RoteiroTab />}
        {tab === "painel" && <PainelTab leads={leads} session={session} />}
        {tab === "admin" && session.isManager && <AdminTab leads={leads} session={session} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border">
        <div className={`max-w-2xl mx-auto grid ${session.isLegal ? "grid-cols-1" : session.isManager ? "grid-cols-5" : "grid-cols-4"}`}>
          <TabBtn active={tab === "leads"} onClick={() => setTab("leads")} icon={<Users className="w-5 h-5" />} label={session.isLegal ? "Contratos fechados" : "Leads"} />
          {!session.isLegal && <>
            <TabBtn active={tab === "new"} onClick={() => setTab("new")} icon={<Plus className="w-5 h-5" />} label="Nova" />
            <TabBtn active={tab === "roteiro"} onClick={() => setTab("roteiro")} icon={<MessageSquare className="w-5 h-5" />} label="Roteiro" />
            <TabBtn active={tab === "painel"} onClick={() => setTab("painel")} icon={<BarChart3 className="w-5 h-5" />} label="Painel" />
          </>}
          {session.isManager && (
            <TabBtn active={tab === "admin"} onClick={() => setTab("admin")} icon={<Shield className="w-5 h-5" />} label="Admin" />
          )}
        </div>
      </nav>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
