import { createFileRoute } from "@tanstack/react-router";
import { Instagram, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NEWS_KEY = "ruptura-news-v2";

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

// Partes do nome: principal + apelidos entre parênteses. Ex: "Bruno Cardoso (Sorriso Maroto)" -> ["bruno cardoso", "sorriso maroto"]
function nameKeys(s: string): string[] {
  const n = norm(s);
  const parts = [n.replace(/\([^)]*\)/g, " "), ...Array.from(n.matchAll(/\(([^)]*)\)/g), (m) => m[1])];
  return parts
    .map((p) => p.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 3);
}
const sameArtist = (a: string, b: string) => {
  const kb = nameKeys(b);
  return nameKeys(a).some((k) => kb.includes(k));
};

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
  const [tab, setTab] = useState<"buscar" | "trends" | "adicionar">("buscar");
  const [all, setAll] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showNews, setShowNews] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(NEWS_KEY)) setShowNews(true);
    } catch { /* ignore */ }
  }, []);

  const closeNews = () => {
    try { localStorage.setItem(NEWS_KEY, "1"); } catch { /* ignore */ }
    setShowNews(false);
  };

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

  // Quantas vezes o artista já apareceu até este registro (ordem cronológica)
  const mentions = useMemo(() => {
    const asc = [...all].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const m: Record<string, number> = {};
    asc.forEach((r, i) => {
      m[r.id] = 1 + asc.slice(0, i).filter((p) => sameArtist(p.famoso, r.famoso)).length;
    });
    return m;
  }, [all]);


  return (
    <main className="min-h-screen bg-background text-foreground">
      {showNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={closeNews}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">🎉 Novidades da nova versão</h2>
              <button onClick={closeNews} aria-label="Fechar" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>🔥 <span className="font-medium text-foreground">Aba de Trends</span> — ranking das trends mais votadas, com filtro por rede (Instagram, TikTok, X, Facebook, YouTube) e ordenação estilo Reddit: top da semana, top geral e novas.</li>
              <li>▲▼ <span className="font-medium text-foreground">Votos nas trends</span> — dê upvote ou downvote pra rankear o que tá bombando.</li>
              <li>🎬 <span className="font-medium text-foreground">Status com 1 clique</span> — clique na etiqueta do card pra trocar entre "Em produção" e "Postado".</li>
              <li>📸 <span className="font-medium text-foreground">Link do Instagram</span> — cadastre o link do criador e ele vira um ícone clicável no card.</li>
              <li>📅 <span className="font-medium text-foreground">Data automática</span> — a data é salva sozinha no dia do cadastro.</li>
            </ul>
            <button onClick={closeNews} className="mt-4 w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground">
              Entendi!
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Famosos homenageados pela Ruptura Global</h1>
        <p className="text-sm text-muted-foreground">{all.length} registros</p>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {(["buscar", "trends", "adicionar"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md py-2 text-sm font-medium ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              {t === "buscar" ? "Buscar" : t === "trends" ? "🔥 Trends" : "Adicionar"}
            </button>
          ))}
        </div>

        {tab === "trends" ? <TrendsSection /> : tab === "buscar" ? (
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
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">
                          {r.famoso}
                          {mentions[r.id] > 1 && (
                            <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 py-0.5 align-middle text-[11px] font-bold text-destructive">{mentions[r.id]}x</span>
                          )}
                        </p>
                        <p className="text-sm leading-snug">{r.criador} <span className="text-muted-foreground">{r.arroba}</span></p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {r.link ? (
                          <a href={r.link} target="_blank" rel="noreferrer" aria-label="Instagram do criador"
                            className="rounded-lg border border-border bg-muted p-1.5 text-foreground transition-colors hover:text-primary">
                            <Instagram size={18} />
                          </a>
                        ) : (
                          <span className="rounded-lg border border-border bg-muted p-1.5 text-muted-foreground/40">
                            <Instagram size={18} />
                          </span>
                        )}
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-xs text-muted-foreground">{fmtDate(r.data)}</span>
                          <button type="button" title="Clique para mudar o status"
                            onClick={async () => {
                              const next = r.status === "em_producao" ? "postado" : "em_producao";
                              setAll((p) => p.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
                              const { error } = await supabase.from("homenagens").update({ status: next }).eq("id", r.id);
                              if (error) load();
                            }}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${r.status === "em_producao" ? "bg-accent text-accent-foreground" : "bg-primary/15 text-primary"}`}>
                            {r.status === "em_producao" ? "🎬 Em produção" : "✅ Postado"}
                          </button>
                        </div>
                      </div>
                    </div>
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

  const [pending, setPending] = useState<{ rows: (NewRow & { data: string | null })[]; dups: { novo: string; existentes: Row[] }[] } | null>(null);

  const confirmPending = async () => {
    if (!pending) return;
    const ok = await save(pending.rows);
    setPending(null);
    if (ok) setF({ criador: "", arroba: "", famoso: "", link: "" });
  };

  return (
    <section className="mt-4 space-y-4">
      {msg && <p className="rounded-lg bg-muted p-3 text-sm">{msg}</p>}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setPending(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">⚠️ Artista já homenageado, adicionar mesmo assim?</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {pending.dups.map((d) => (
                <li key={d.novo}>
                  <span className="font-medium">{d.novo}</span>
                  <span className="text-muted-foreground"> — já feito {d.existentes.length}x: {d.existentes.map((e) => `${e.famoso} por ${e.criador}`).join("; ")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setPending(null)} className="rounded-lg border border-border py-2.5 font-medium">Cancelar</button>
              <button onClick={confirmPending} disabled={busy} className="rounded-lg bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-50">Adicionar</button>
            </div>
          </div>
        </div>
      )}

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
        const dups = rows
          .map((r) => ({
            novo: r.famoso,
            existentes: all.filter((a) => sameArtist(a.famoso, r.famoso)),
            same: all.some((a) => norm(a.criador) === norm(r.criador) && norm(a.famoso) === norm(r.famoso)),
          }))
          .filter((d) => d.existentes.length > 0 && !d.same);
        if (dups.length) { setPending({ rows, dups }); return; }
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

      <TrendForm inputCls={inputCls} />
    </section>
  );
}

const PLATS = [
  { v: "instagram", l: "Instagram" },
  { v: "tiktok", l: "TikTok" },
  { v: "x", l: "X" },
  { v: "facebook", l: "Facebook" },
  { v: "youtube", l: "YouTube" },
  { v: "outro", l: "Outro" },
] as const;
const platLabel = (v: string) => PLATS.find((p) => p.v === v)?.l ?? v;

type Trend = { id: string; nome: string; link: string | null; plataforma: string; upvotes: number; downvotes: number; created_at: string };

function TrendForm({ inputCls }: { inputCls: string }) {
  const [nome, setNome] = useState("");
  const [link, setLink] = useState("");
  const [plat, setPlat] = useState("instagram");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-2 rounded-lg border border-border bg-card p-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!nome.trim()) return;
      setBusy(true);
      const { error } = await supabase.from("trends").insert({ nome: nome.trim(), link: link.trim() || null, plataforma: plat });
      setBusy(false);
      if (error) setMsg("Erro: " + error.message);
      else { setMsg("Trend adicionada!"); setNome(""); setLink(""); }
    }}>
      <h2 className="font-semibold">🔥 Adicionar trend</h2>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <input className={inputCls} placeholder="Nome da trend *" value={nome} onChange={(e) => setNome(e.target.value)} />
      <input className={inputCls} placeholder="Link de referência" value={link} onChange={(e) => setLink(e.target.value)} />
      <div className="flex flex-wrap gap-1">
        {PLATS.map((p) => (
          <button key={p.v} type="button" onClick={() => setPlat(p.v)}
            className={`rounded-full border px-3 py-1 text-sm ${plat === p.v ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
            {p.l}
          </button>
        ))}
      </div>
      <button disabled={busy} className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">Salvar trend</button>
    </form>
  );
}

function TrendsSection() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"semana" | "top" | "novas">("semana");
  const [plat, setPlat] = useState("todas");
  const [votes, setVotes] = useState<Record<string, 1 | -1>>({});

  useEffect(() => {
    try { setVotes(JSON.parse(localStorage.getItem("trend-votes") || "{}")); } catch { /* ignore */ }
    supabase.from("trends").select("*").then(({ data }) => { setTrends((data as Trend[]) ?? []); setLoading(false); });
  }, []);

  const list = useMemo(() => {
    const weekAgo = Date.now() - 7 * 864e5;
    let l = trends.filter((t) => plat === "todas" || t.plataforma === plat);
    if (sort === "semana") l = l.filter((t) => new Date(t.created_at).getTime() >= weekAgo);
    const score = (t: Trend) => t.upvotes - t.downvotes;
    return [...l].sort((a, b) => sort === "novas" ? b.created_at.localeCompare(a.created_at) : score(b) - score(a)).slice(0, sort === "novas" ? 50 : 10);
  }, [trends, sort, plat]);

  const vote = async (t: Trend, dir: 1 | -1) => {
    const cur = votes[t.id];
    let du = 0, dd = 0;
    if (cur === dir) { if (dir === 1) du = -1; else dd = -1; }
    else {
      if (dir === 1) du = 1; else dd = 1;
      if (cur === 1) du = -1; if (cur === -1) dd = -1;
    }
    const nv = { ...votes };
    if (cur === dir) delete nv[t.id]; else nv[t.id] = dir;
    setVotes(nv);
    localStorage.setItem("trend-votes", JSON.stringify(nv));
    setTrends((p) => p.map((x) => x.id === t.id ? { ...x, upvotes: Math.max(0, x.upvotes + du), downvotes: Math.max(0, x.downvotes + dd) } : x));
    if (du) await supabase.rpc("vote_trend", { _id: t.id, _delta_up: du, _delta_down: 0 });
    if (dd) await supabase.rpc("vote_trend", { _id: t.id, _delta_up: 0, _delta_down: dd });
  };

  const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`;

  return (
    <section className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {([["semana", "⚡ Top semana"], ["top", "🏆 Top geral"], ["novas", "🕒 Novas"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setSort(v)} className={`rounded-md py-2 text-xs font-medium ${sort === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button className={chip(plat === "todas")} onClick={() => setPlat("todas")}>Todas</button>
        {PLATS.map((p) => <button key={p.v} className={chip(plat === p.v)} onClick={() => setPlat(p.v)}>{p.l}</button>)}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p>
        : list.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma trend aqui ainda. Adicione na aba "Adicionar".</p>
        : list.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex flex-col items-center">
              <button aria-label="Upvote" onClick={() => vote(t, 1)} className={`px-2 text-lg leading-none ${votes[t.id] === 1 ? "text-primary" : "text-muted-foreground"}`}>▲</button>
              <span className="text-sm font-bold">{t.upvotes - t.downvotes}</span>
              <button aria-label="Downvote" onClick={() => vote(t, -1)} className={`px-2 text-lg leading-none ${votes[t.id] === -1 ? "text-destructive" : "text-muted-foreground"}`}>▼</button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{sort !== "novas" && <span className="mr-1 text-primary">#{i + 1}</span>}{t.nome}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5">{platLabel(t.plataforma)}</span>
                <span>▲ {t.upvotes} · ▼ {t.downvotes}</span>
                {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="text-primary underline">ver referência</a>}
              </div>
            </div>
          </div>
        ))}
    </section>
  );
}
