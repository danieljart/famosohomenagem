import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Famosos homenageados pela Ruptura Global" },
      { name: "description", content: "Veja se um famoso já foi homenageado por algum criador e cadastre novos registros." },
      { property: "og:title", content: "Famosos homenageados pela Ruptura Global" },
      { property: "og:description", content: "Busca rápida de famosos já homenageados por criadores de conteúdo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Row = { id: string; criador: string; arroba: string; famoso: string; data: string | null; created_at: string; status: string };
type NewRow = Omit<Row, "id" | "created_at" | "data">;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function cleanAt(s: string) {
  const t = s.trim();
  if (!t) return "";
  return t.startsWith("@") ? t : "@" + t;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Index() {
  const [tab, setTab] = useState<"buscar" | "adicionar">("buscar");
  const [statusFilter, setStatusFilter] = useState<"postado" | "em_producao">("postado");
  const [all, setAll] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("homenagens").select("id,criador,arroba,famoso,data,created_at,status").order("created_at", { ascending: false });
    setAll((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const byStatus = useMemo(() => all.filter((r) => r.status === statusFilter), [all, statusFilter]);

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    const words = n.split(/\s+/);
    return all.filter((r) => {
      const hay = norm(r.famoso);
      return words.every((w) => hay.includes(w));
    });
  }, [q, all]);

  const list = q.trim() ? results : byStatus;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Famosos homenageados pela Ruptura Global</h1>
        <p className="text-sm text-muted-foreground">{all.length} registros</p>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["buscar", "adicionar"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md py-2 text-sm font-medium ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              {t === "buscar" ? "Buscar" : "Adicionar dados"}
            </button>
          ))}
        </div>

        {tab === "buscar" ? (
          <section className="mt-4">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button onClick={() => setStatusFilter("postado")}
                className={`rounded-md py-1.5 text-xs font-medium ${statusFilter === "postado" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                ✅ Já postado
              </button>
              <button onClick={() => setStatusFilter("em_producao")}
                className={`rounded-md py-1.5 text-xs font-medium ${statusFilter === "em_producao" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                🎬 Em produção
              </button>
            </div>

            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Digite o nome do famoso…"
              className="mt-3 w-full rounded-lg border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring" />
            <div className="mt-4 space-y-2">
              {loading ? <p className="text-sm text-muted-foreground">Carregando…</p>
                : q.trim() && list.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-center">
                    <p className="text-lg font-semibold text-primary">Ainda não foi feito ✅</p>
                    <p className="text-sm text-muted-foreground">"{q}" está livre.</p>
                  </div>
                ) : list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum registro aqui ainda.</p>
                ) : list.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{r.famoso}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(r.data)}</span>
                    </div>
                    <p className="text-sm">{r.criador} <span className="text-muted-foreground">{r.arroba}</span></p>
                    <p className="mt-1 text-xs">{r.status === "em_producao" ? "🎬 Em produção" : "✅ Já postado"}</p>
                  </div>
                ))}
            </div>
          </section>
        ) : (
          <AddSection onSaved={load} />
        )}
      </div>
    </main>
  );
}

function AddSection({ onSaved }: { onSaved: () => void }) {
  const [f, setF] = useState({ criador: "", arroba: "", famoso: "" });
  const [status, setStatus] = useState<"postado" | "em_producao">("postado");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const insert = async (rows: (NewRow & { data: string | null })[]) => {
    setBusy(true);
    const { error } = await supabase.from("homenagens").insert(rows);
    setBusy(false);
    if (error) { setMsg("Erro ao salvar: " + error.message); return false; }
    setMsg(`${rows.length} registro(s) salvo(s)!`);
    onSaved();
    return true;
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";

  return (
    <section className="mt-4 space-y-4">
      {msg && <p className="rounded-lg bg-muted p-3 text-sm">{msg}</p>}

      <form className="space-y-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!f.criador.trim() || !f.famoso.trim()) return;
        const famosos = f.famoso.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
        if (famosos.length === 0) return;
        const rows = famosos.map((famoso) => ({
          criador: f.criador.trim(),
          arroba: cleanAt(f.arroba),
          famoso,
          status,
          data: todayISO(),
        }));
        const ok = await insert(rows);
        if (ok) setF({ criador: "", arroba: "", famoso: "" });
      }}>
        <input className={inputCls} placeholder="Nome do criador *" value={f.criador} onChange={(e) => setF({ ...f, criador: e.target.value })} />
        <input className={inputCls} placeholder="@ do criador" value={f.arroba} onChange={(e) => setF({ ...f, arroba: e.target.value })} />
        <input className={inputCls} placeholder="Famoso homenageado * (separe por vírgula p/ vários)" value={f.famoso} onChange={(e) => setF({ ...f, famoso: e.target.value })} />
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button type="button" onClick={() => setStatus("postado")}
            className={`rounded-md py-2 text-sm font-medium ${status === "postado" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            ✅ Já postado
          </button>
          <button type="button" onClick={() => setStatus("em_producao")}
            className={`rounded-md py-2 text-sm font-medium ${status === "em_producao" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            🎬 Em produção
          </button>
        </div>
        <p className="text-xs text-muted-foreground">A data é salva automaticamente com o dia de hoje.</p>
        <button disabled={busy} className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">Salvar</button>
      </form>
    </section>
  );
}
