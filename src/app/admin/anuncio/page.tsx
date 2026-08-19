"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminAnuncioPage() {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) =>
        r
          .json()
          .then((data) => {
            if (!r.ok) {
              if (r.status === 401 || r.status === 403) router.push("/login");
              setError(data.error ?? "Erro ao carregar o aviso.");
            } else {
              setAnnouncement(data.announcement ?? "");
              setOriginal(data.announcement ?? "");
            }
          }),
      )
      .catch(() => setError("Erro ao carregar o aviso."))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao salvar o aviso.");
      }
      setAnnouncement(data.announcement);
      setOriginal(data.announcement);
      setMsg({ ok: true, text: "Aviso salvo com sucesso." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Erro ao salvar o aviso.",
      });
    } finally {
      setSending(false);
    }
  }

  function clearForm() {
    setAnnouncement("");
    setMsg(null);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
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
            Aviso para todos
          </h1>
          <p className="text-xs font-medium text-blue-100/80">
            Publica um aviso que aparece no topo da home para todos os usuários.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-white/40" />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="animate-fade-up space-y-4 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:100ms] sm:p-8"
        >
          <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Exemplo: “⚠️ Manutenção agendada nesta sexta-feira às 18h. A plataforma pode ficar
            indisponível por alguns minutos.” Deixe em branco para remover o aviso.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Mensagem do aviso{" "}
              <span className="font-normal text-gray-400">
                ({announcement.length}/240)
              </span>
            </label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              maxLength={240}
              rows={4}
              placeholder="Escreva o aviso…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {original && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Aviso atualmente publicado: “{original}”
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
          )}
          {msg && (
            <p
              className={`rounded-xl px-3 py-2.5 text-sm ${
                msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {msg.text}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={clearForm}
              disabled={sending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Salvando…" : "Publicar aviso"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}