"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchJson(url: string, payload?: unknown) {
  const response = await fetch(url, { method: payload ? "POST" : "GET", headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const e = new Error(data?.error || "REQUEST_FAILED") as Error & { code?: string }; e.code = data?.error || "REQUEST_FAILED"; throw e; }
  return data;
}

export default function VotingPage() {
  const params = useParams();
  const token = String(params?.token || "");
  const [session, setSession] = useState<any>(null);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setLoading(false); setError("Brak tokenu"); return; }
    fetchJson("/api/voting/session", { token }).then((data) => { setSession(data); setResolutions(data.resolutions || []); }).catch((e) => setError(e instanceof Error ? e.message : "REQUEST_FAILED")).finally(() => setLoading(false));
  }, [token]);

  const completed = useMemo(() => resolutions.filter((r) => r.vote).length, [resolutions]);
  const allCompleted = completed === resolutions.length && resolutions.length > 0;

  function updateVote(id: string, vote: string) { setResolutions((current) => current.map((r) => r.id === id ? { ...r, vote } : r)); }
  async function saveDraft() { setSaving(true); await fetchJson("/api/voting/draft", { token, resolutions: resolutions.map((r) => ({ resolutionId: r.id, vote: r.vote })) }); setSaving(false); }
  async function submitVotes() { if (!allCompleted) return setError("Uzupełnij wszystkie głosy"); setSubmitting(true); await fetchJson("/api/voting/submit", { token, resolutions: resolutions.map((r) => ({ resolutionId: r.id, vote: r.vote })) }); setSubmitting(false); setSubmitted(true); }
  async function download(url: string, name: string) { const r = await fetch(url); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); }

  if (loading) return <div style={{ padding: 24 }}><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!session) return <div style={{ padding: 24 }}>{error || "Nie znaleziono sesji"}</div>;

  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl space-y-6"><Card className="rounded-3xl border border-slate-200"><CardHeader><CardTitle>{session.title}</CardTitle></CardHeader><CardContent><div>{session.organization}</div><div className="text-sm text-slate-500">{session.voter.fullName} • {session.voter.email}</div></CardContent></Card>{error ? <div className="text-sm text-rose-700">{error}</div> : null}{resolutions.map((r) => <Card key={r.id} className="rounded-3xl border border-slate-200"><CardHeader><CardTitle>{r.number} — {r.subject}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-slate-600">{r.description}</p><div className="flex flex-wrap gap-2">{[{v:"for",l:"Za"},{v:"against",l:"Przeciw"},{v:"abstain",l:"Wstrzymuję się"}].map((opt) => <Button key={opt.v} variant={r.vote === opt.v ? "default" : "outline"} onClick={() => updateVote(r.id, opt.v)} className="rounded-2xl">{opt.l}</Button>)}</div></CardContent></Card>)}<Card className="rounded-3xl border border-slate-200"><CardContent className="flex flex-wrap gap-3 pt-6"><Button onClick={saveDraft} variant="outline" className="rounded-2xl">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Zapisz roboczo</Button><Button onClick={submitVotes} className="rounded-2xl">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Wyślij głosy</Button><Button onClick={() => download(`/api/voting/receipt?token=${encodeURIComponent(token)}`, `potwierdzenie-${session.id}.pdf`)} variant="outline" className="rounded-2xl" disabled={!submitted}><Download className="mr-2 h-4 w-4" />Potwierdzenie PDF</Button><Button onClick={() => download(`/api/voting/protocol?token=${encodeURIComponent(token)}`, `protokol-${session.id}.pdf`)} variant="outline" className="rounded-2xl" disabled={!submitted}><Download className="mr-2 h-4 w-4" />Protokół PDF</Button></CardContent></Card></div></div>;
}
