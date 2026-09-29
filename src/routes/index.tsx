import { createFileRoute } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
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

type Row = { id: string; criador: string; arroba: string; famoso: string; data: string | null; created_at: string; status: string; link: string | null };
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
  const [all, setAll] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("homenagens").select("id,criador,arroba,famoso,data,created_at,status,link").order("created_at", { ascending: false });
    setAll((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sorted = useMemo(
    () => [...all].sort((a, b) => (a.status === b.status ? 0 : a.status === "em_producao" ? -1 : 1)),
    [all],
  );

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    const words = n.split(/\s+/);
    return sorted.filter((r) => {
      const hay = norm(r.famoso);
      return words.every((w) => hay.includes(w));
    });
  }, [q, sorted]);

  const list = q.trim() ? results : sorted;

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
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Digite o nome do famoso…"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring" />
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
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          {r.link ? (
                            <a href={r.link} target="_blank" rel="noreferrer" aria-label="Instagram do criador"
                              className="text-foreground transition-colors hover:text-primary">
                              <Instagram size={18} />
                            </a>
                          ) : (
                            <Instagram size={18} className="text-muted-foreground/40" />
                          )}
                          <span className="text-xs text-muted-foreground">{fmtDate(r.data)}</span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.status === "em_producao" ? "bg-accent text-accent-foreground" : "bg-primary/15 text-primary"}`}>
                          {r.status === "em_producao" ? "🎬 Em produção" : "✅ Postado"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm">{r.criador} <span className="text-muted-foreground">{r.arroba}</span></p>
                  </div>
                ))}
            </div>
          </section>
        ) : (
          <AddSection onSaved={load} all={all} />
        )}
      </div>
    </main>
  );
}

function AddSection({ onSaved, all }: { onSaved: () => void; all: Row[] }) {
  const [f, setF] = useState({ criador: "", arroba: "", famoso: "", link: "" });
  const [status, setStatus] = useState<"postado" | "em_producao">("postado");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (rows: (NewRow & { data: string | null })[]) => {
    setBusy(true);
    const toInsert: typeof rows = [];
    let updated = 0;
    for (const r of rows) {
      const ex = all.find((a) => norm(a.criador) === norm(r.criador) && norm(a.famoso) === norm(r.famoso));
      if (ex) {
        const patch: { status: string; data: string; arroba?: string; link?: string } = { status: r.status, data: r.data ?? todayISO() };
        if (r.arroba) patch.arroba = r.arroba;
        if (r.link) patch.link = r.link;
        const { error } = await supabase.from("homenagens").update(patch).eq("id", ex.id);
        if (error) { setBusy(false); setMsg("Erro ao salvar: " + error.message); return false; }
        updated++;
      } else toInsert.push(r);
    }
    if (toInsert.length) {
      const { error } = await supabase.from("homenagens").insert(toInsert);
      if (error) { setBusy(false); setMsg("Erro ao salvar: " + error.message); return false; }
    }
    setBusy(false);
    setMsg(`${toInsert.length} novo(s), ${updated} atualizado(s)!`);
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
          link: f.link.trim() || null,
          data: todayISO(),
        }));
        const ok = await save(rows);
        if (ok) setF({ criador: "", arroba: "", famoso: "", link: "" });
      }}>
        <input className={inputCls} placeholder="Nome do criador *" value={f.criador} onChange={(e) => setF({ ...f, criador: e.target.value })} />
        <input className={inputCls} placeholder="@ do criador" value={f.arroba} onChange={(e) => setF({ ...f, arroba: e.target.value })} />
        <input className={inputCls} placeholder="Link do Instagram (opcional)" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
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
