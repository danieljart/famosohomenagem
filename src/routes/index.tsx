import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Famosos Homenageados — Consulta rápida" },
      { name: "description", content: "Veja se um famoso já foi homenageado por algum criador e cadastre novos registros." },
      { property: "og:title", content: "Famosos Homenageados" },
      { property: "og:description", content: "Busca rápida de famosos já homenageados por criadores de conteúdo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Row = { id: string; criador: string; arroba: string; famoso: string; data: string | null; created_at: string };
type NewRow = Omit<Row, "id" | "created_at">;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function parseDate(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${(m[2] ?? "").padStart(2, "0")}-${(m[3] ?? "").padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y3 = m[3] ?? "";
    const y = y3.length === 2 ? "20" + y3 : y3;
    return `${y}-${(m[2] ?? "").padStart(2, "0")}-${(m[1] ?? "").padStart(2, "0")}`;
  }
  return null;
}

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

function parseBulk(text: string): { rows: NewRow[]; bad: string[] } {
  const rows: NewRow[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : line.includes("|") ? "|" : ",";
    const p: string[] = line.split(sep).map((x) => x.trim());
    const g = (i: number) => p[i] ?? "";
    if (p.length < 3) { bad.push(line); continue; }
    let criador = "", arroba = "", famoso = "", data: string | null = null;
    if (p.length >= 4) {
      criador = g(0); arroba = g(1); famoso = g(2);
      data = parseDate(g(3));
    } else {
      // 3 colunas: criador, @, famoso  OU  criador, famoso, data
      if (parseDate(g(2))) { criador = g(0); famoso = g(1); data = parseDate(g(2)); }
      else { criador = g(0); arroba = g(1); famoso = g(2); }
    }
    if (!criador || !famoso) { bad.push(line); continue; }
    rows.push({ criador, arroba: cleanAt(arroba), famoso, data });
  }
  return { rows, bad };
}

function Index() {
  const [tab, setTab] = useState<"buscar" | "adicionar">("buscar");
  const [all, setAll] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("homenagens").select("id,criador,arroba,famoso,data,created_at").order("created_at", { ascending: false });
    setAll((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    const words = n.split(/\s+/);
    return all.filter((r) => {
      const hay = norm(r.famoso);
      return words.every((w) => hay.includes(w));
    });
  }, [q, all]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Famosos homenageados</h1>
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
                : !q.trim() ? <p className="text-sm text-muted-foreground">Comece a digitar para buscar.</p>
                : results.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-center">
                    <p className="text-lg font-semibold text-primary">Ainda não foi feito ✅</p>
                    <p className="text-sm text-muted-foreground">"{q}" está livre.</p>
                  </div>
                ) : results.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{r.famoso}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(r.data)}</span>
                    </div>
                    <p className="text-sm">{r.criador} <span className="text-muted-foreground">{r.arroba}</span></p>
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
  const [f, setF] = useState({ criador: "", arroba: "", famoso: "", data: "" });
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => parseBulk(bulk), [bulk]);

  const insert = async (rows: NewRow[]) => {
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
    <section className="mt-4 space-y-6">
      {msg && <p className="rounded-lg bg-muted p-3 text-sm">{msg}</p>}

      <form className="space-y-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!f.criador.trim() || !f.famoso.trim()) return;
        const ok = await insert([{ criador: f.criador.trim(), arroba: cleanAt(f.arroba), famoso: f.famoso.trim(), data: f.data || null }]);
        if (ok) setF({ criador: "", arroba: "", famoso: "", data: "" });
      }}>
        <h2 className="font-semibold">Registro único</h2>
        <input className={inputCls} placeholder="Nome do criador *" value={f.criador} onChange={(e) => setF({ ...f, criador: e.target.value })} />
        <input className={inputCls} placeholder="@ do criador" value={f.arroba} onChange={(e) => setF({ ...f, arroba: e.target.value })} />
        <input className={inputCls} placeholder="Famoso homenageado *" value={f.famoso} onChange={(e) => setF({ ...f, famoso: e.target.value })} />
        <input className={inputCls} type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
        <button disabled={busy} className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">Salvar</button>
      </form>

      <div className="space-y-2">
        <h2 className="font-semibold">Importar em massa</h2>
        <p className="text-xs text-muted-foreground">
          Uma linha por registro, na ordem: <b>criador, @, famoso, data</b>. Separe por TAB (colado da planilha), ponto e vírgula, | ou vírgula. Data em dd/mm/aaaa.
        </p>
        <textarea className={inputCls + " h-40 font-mono text-sm"} value={bulk} onChange={(e) => setBulk(e.target.value)}
          placeholder={"João Silva; @joaosilva; Faustão/Bisteca; 12/03/2025\nMaria; @maria; Xuxa; 01/02/2025"} />
        {bulk.trim() && (
          <div className="text-sm">
            <p>{preview.rows.length} válido(s){preview.bad.length > 0 && `, ${preview.bad.length} ignorado(s)`}</p>
            <div className="mt-2 max-h-60 overflow-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted"><tr><th className="p-1.5 text-left">Criador</th><th className="p-1.5 text-left">@</th><th className="p-1.5 text-left">Famoso</th><th className="p-1.5 text-left">Data</th></tr></thead>
                <tbody>{preview.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border"><td className="p-1.5">{r.criador}</td><td className="p-1.5">{r.arroba}</td><td className="p-1.5">{r.famoso}</td><td className="p-1.5">{fmtDate(r.data)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        <button disabled={busy || preview.rows.length === 0}
          onClick={async () => { if (await insert(preview.rows)) setBulk(""); }}
          className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">
          Importar {preview.rows.length || ""} registro(s)
        </button>
      </div>
    </section>
  );
}
