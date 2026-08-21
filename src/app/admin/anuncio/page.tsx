"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Announcement = {
  id: string;
  title: string | null;
  message: string;
  type: "AVISO" | "COMUNICADO" | "NOVIDADE";
  createdAt: string;
  readCount: number;
};

const typeLabels: Record<Announcement["type"], string> = {
  AVISO: "Aviso",
  COMUNICADO: "Comunicado",
  NOVIDADE: "Novidade",
};

const typeBadges: Record<Announcement["type"], string> = {
  AVISO: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
  COMUNICADO: "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300",
  NOVIDADE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAnuncioPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<Announcement["type"]>("AVISO");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) router.push("/login");
        throw new Error(data.error ?? "Erro ao carregar avisos.");
      }
      setAnnouncements(data.announcements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar avisos.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = setTimeout(fetchAnnouncements, 200);
    return () => clearTimeout(t);
  }, [fetchAnnouncements]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao publicar o aviso.");
      }
      setTitle("");
      setMessage("");
      setType("AVISO");
      setMsg({ ok: true, text: "Aviso publicado com sucesso." });
      fetchAnnouncements();
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Erro ao publicar o aviso.",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(a: Announcement) {
    if (!window.confirm(`Excluir o aviso "${a.title ?? a.message.slice(0, 40)}"?`)) return;
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Erro ao excluir o aviso.");
        return;
      }
      fetchAnnouncements();
    } catch {
      window.alert("Falha de rede ao excluir o aviso.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="animate-fade-up mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow">
            Avisos e notificações
          </h1>
          <p className="text-xs font-medium text-blue-100/80">
            Publica avisos que aparecem no sino de todos os usuários e no topo da home.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="animate-fade-up mb-6 space-y-4 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 dark:bg-slate-900 [animation-delay:100ms] sm:p-8"
      >
        <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
          Publicar novo aviso
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">
              Título{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Nova aula disponível"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Announcement["type"])}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            >
              <option value="AVISO">Aviso</option>
              <option value="COMUNICADO">Comunicado</option>
              <option value="NOVIDADE">Novidade (curso/aula nova)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">
            Mensagem{" "}
            <span className="font-normal text-gray-400">({message.length}/1200)</span>
          </label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1200}
            rows={4}
            placeholder="Escreva o texto do aviso…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">{error}</p>
        )}
        {msg && (
          <p
            className={`rounded-xl px-3 py-2.5 text-sm ${
              msg.ok
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
            }`}
          >
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {sending ? "Publicando…" : "Publicar aviso"}
        </button>
      </form>

      <div className="animate-fade-up [animation-delay:150ms]">
        <h2 className="text-sm font-bold tracking-wide text-white uppercase">
          Avisos publicados ({announcements.length})
        </h2>

        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/40" />
          ) : announcements.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/40 bg-white/60 p-8 text-center text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              Nenhum aviso publicado ainda.
            </p>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-blue-900/10 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${typeBadges[a.type]}`}
                    >
                      {typeLabels[a.type]}
                    </span>
                    {a.title && (
                      <span className="truncate text-sm font-bold text-gray-900 dark:text-slate-100">{a.title}</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-slate-300">{a.message}</p>
                  <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-slate-500">
                    {formatDate(a.createdAt)} · {a.readCount} leitura(s)
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a)}
                  className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                >
                  Excluir
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}