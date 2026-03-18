"use client";
import { useEffect, useMemo, useState } from "react";
import { Bell, Download, Loader2, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchWithJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const e = new Error(data?.error || "REQUEST_FAILED") as Error & { code?: string }; e.code = data?.error || "REQUEST_FAILED"; throw e; }
  return data;
}

function mapStatus(status: string) { return status === "ACTIVE" ? "Aktywne" : status === "SUBMITTED" || status === "EXPIRED" || status === "REVOKED" ? "Zakończone" : status; }
function formatDate(v?: string) { if (!v) return "—"; return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)); }

export default function VotingAdminPanel() {
  const [admin, setAdmin] = useState<any>(null);
  const [votings, setVotings] = useState<any[]>([]);
  const [voters, setVoters] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchWithJson("/api/admin/auth/me");
        if (!me?.authenticated) { window.location.href = "/admin/login"; return; }
        setAdmin(me.admin);
        const data = await fetchWithJson("/api/admin/votings");
        setVotings(data.votings || []);
        if (data.votings?.[0]?.id) setSelectedId(data.votings[0].id);
      } catch (e) {
        window.location.href = "/admin/login";
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    fetchWithJson(`/api/admin/votings/${selectedId}`).then((data) => setVoters(data.voters || [])).catch((e) => setError(e instanceof Error ? e.message : "REQUEST_FAILED")).finally(() => setDetailLoading(false));
  }, [selectedId]);

  const filtered = useMemo(() => votings.filter((v) => `${v.title} ${v.organization} ${v.id}`.toLowerCase().includes(query.toLowerCase())), [votings, query]);
  const selected = votings.find((v) => v.id === selectedId) || null;

  async function logout() { await fetchWithJson("/api/admin/auth/logout", { method: "POST" }); window.location.href = "/admin/login"; }
  async function remind() { if (!selected) return; await fetchWithJson(`/api/admin/votings/${selected.id}/remind`, { method: "POST" }); }
  async function closeVoting() { if (!selected) return; await fetchWithJson(`/api/admin/votings/${selected.id}/close`, { method: "POST" }); }
  async function exportProtocol() { if (!selected) return; const r = await fetch(`/api/admin/votings/${selected.id}/protocol`); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `protokol-${selected.id}.pdf`; a.click(); URL.revokeObjectURL(u); }

  if (loading) return <div style={{ padding: 24 }}><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-7xl space-y-6"><Card className="rounded-3xl border border-slate-200"><CardHeader><CardTitle>Panel administratora</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-4"><div><div>{admin?.fullName}</div><div className="text-sm text-slate-500">{admin?.email} • {admin?.organization?.name || "Brak organizacji"}</div></div><Button onClick={logout} variant="outline" className="rounded-2xl"><LogOut className="mr-2 h-4 w-4" />Wyloguj</Button></CardContent></Card>{error ? <div className="text-sm text-rose-700">{error}</div> : null}<div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><Card className="rounded-3xl border border-slate-200"><CardHeader><CardTitle>Głosowania</CardTitle></CardHeader><CardContent><div className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 rounded-2xl" placeholder="Szukaj" /></div><div className="space-y-3">{filtered.map((v) => <button key={v.id} onClick={() => setSelectedId(v.id)} className={`w-full rounded-2xl border p-4 text-left ${selectedId === v.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}><div className="font-semibold">{v.title}</div><div className="text-sm opacity-80">{v.organization}</div><div className="text-sm opacity-80">{mapStatus(v.status)} • {formatDate(v.deadline)}</div></button>)}</div></CardContent></Card><Card className="rounded-3xl border border-slate-200"><CardHeader><CardTitle>Szczegóły</CardTitle></CardHeader><CardContent className="space-y-3">{selected ? <><div className="font-semibold">{selected.title}</div><div className="text-sm text-slate-500">{selected.organization}</div><div className="flex flex-col gap-2"><Button variant="outline" onClick={remind} className="rounded-2xl"><Bell className="mr-2 h-4 w-4" />Wyślij przypomnienie</Button><Button variant="outline" onClick={exportProtocol} className="rounded-2xl"><Download className="mr-2 h-4 w-4" />Eksportuj protokół</Button><Button variant="outline" onClick={closeVoting} className="rounded-2xl">Zamknij głosowanie</Button></div><div className="pt-4"><div className="font-medium mb-2">Głosujący</div>{detailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <div className="space-y-2">{voters.map((v) => <div key={v.email} className="rounded-xl border border-slate-200 p-3"><div className="font-medium">{v.name}</div><div className="text-sm text-slate-500">{v.email}</div><div className="text-sm text-slate-500">{v.status} • {v.shares}</div></div>)}</div>}</div></> : <div>Brak wybranego głosowania</div>}</CardContent></Card></div></div></div>;
}
