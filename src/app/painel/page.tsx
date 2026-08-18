"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Card = {
  id: string;
  title: string;
  viewCount: number;
  theme: { name: string; color: string };
  lastAccessedAt: string;
};

type PainelData = {
  user: {
    name: string;
    email: string;
    createdAt: string;
    streakCount: number;
    lastStudyDate: string | null;
  } | null;
  stats: { totalAulas: number; totalAssistidas: number; percentual: number };
  themes: {
    id: string;
    name: string;
    color: string;
    total: number;
    completed: number;
    percentual: number;
    concluido: boolean;
  }[];
  continueWatching: Card | null;
  recent: Card[];
  favorites: Card[];
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PainelPage() {
  const router = useRouter();
  const [data, setData] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editSending, setEditSending] = useState(false);
  const [editMsg, setEditMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchPainel = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/painel");
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(json.error ?? "Erro ao carregar o painel.");
      }
      setData(json);
      setName(json.user?.name ?? "");
      setEmail(json.user?.email ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = setTimeout(fetchPainel, 200);
    return () => clearTimeout(t);
  }, [fetchPainel]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditSending(true);
    setEditMsg(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao salvar.");
      }
      setEditMsg({ ok: true, text: "Perfil atualizado com sucesso." });
    } catch (err) {
      setEditMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Erro ao salvar.",
      });
    } finally {
      setEditSending(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4">
        <div className="h-64 w-full max-w-md animate-pulse rounded-3xl bg-white/40" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4">
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  const maxCompleted = Math.max(1, ...data.themes.map((t) => t.total));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="animate-fade-up mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow">
            Meu painel
          </h1>
          <p className="text-xs font-medium text-blue-100/80">
            Acompanhe seu progresso, continuidade e aulas favoritas.
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="animate-fade-up mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 [animation-delay:100ms]">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
          <p className="text-3xl font-extrabold text-white">
            {data.stats.totalAssistidas}/{data.stats.totalAulas}
          </p>
          <p className="mt-1 text-xs font-medium text-blue-100/80">Aulas concluídas</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
          <p className="text-3xl font-extrabold text-white">{data.stats.percentual}%</p>
          <p className="mt-1 text-xs font-medium text-blue-100/80">Concluído no total</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
          <p className="text-3xl font-extrabold text-white">🔥 {data.user!.streakCount}</p>
          <p className="mt-1 text-xs font-medium text-blue-100/80">dias de estudo seguidos</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
          <p className="text-3xl font-extrabold text-white">{data.favorites.length}</p>
          <p className="mt-1 text-xs font-medium text-blue-100/80">Aulas favoritas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Continuar assistindo */}
        {data.continueWatching && (
          <section className="animate-fade-up rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:150ms] lg:col-span-2">
            <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
              Continuar assistindo
            </h2>
            <Link
              href={`/aula/${data.continueWatching.id}`}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(120deg, ${data.continueWatching.theme.color}cc, ${data.continueWatching.theme.color} 60%, ${data.continueWatching.theme.color}aa)`,
              }}
            >
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white drop-shadow">
                  {data.continueWatching.title}
                </p>
                <p className="mt-0.5 text-xs font-medium text-white/80">
                  {data.continueWatching.theme.name} · último acesso em{" "}
                  {formatDate(data.continueWatching.lastAccessedAt)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow">
                Assistir agora
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
          </section>
        )}

        {/* Progresso por tema */}
        <section className="animate-fade-up rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:200ms] lg:col-span-2">
          <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
            Progresso por assunto
          </h2>
          {data.themes.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Nenhuma aula cadastrada ainda.
            </p>
          ) : (
            <ul className="mt-5 space-y-5">
              {data.themes.map((t) => (
                <li key={t.id}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                      {t.concluido && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Tema concluído ✓
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {t.completed}/{t.total} · {t.percentual}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(t.completed / maxCompleted) * 100}%`, backgroundColor: t.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Histórico recente */}
        <section className="animate-fade-up rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:250ms]">
          <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
            Histórico recente
          </h2>
          {data.recent.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Você ainda não assistiu nenhuma aula. Bora começar?
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {data.recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/aula/${item.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition group"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-800 group-hover:text-blue-700">
                        {item.title}
                      </span>
                      <span className="text-xs text-gray-500">{item.theme.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(item.lastAccessedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Favoritos */}
        <section className="animate-fade-up rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:300ms]">
          <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
            Aulas favoritas
          </h2>
          {data.favorites.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Nenhuma aula favoritada ainda. Toque no coração ao assistir uma aula.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {data.favorites.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/aula/${item.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition group"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-800 group-hover:text-blue-700">
                        {item.title}
                      </span>
                      <span className="text-xs text-gray-500">{item.theme.name}</span>
                    </span>
                    <svg
                      className="h-4 w-4 shrink-0 text-rose-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="none"
                    >
                      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Perfil */}
      <section className="animate-fade-up mt-6 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:350ms]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">Meu perfil</h2>
          <Link
            href="/trocar-senha"
            className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Trocar senha
          </Link>
        </div>
        <form onSubmit={saveProfile} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>
          {editMsg && (
            <p
              className={`rounded-xl px-3 py-2.5 text-sm sm:col-span-2 ${
                editMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {editMsg.text}
            </p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={editSending}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editSending ? "Salvando…" : "Salvar perfil"}
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-gray-400">
          Membro desde {new Date(data.user!.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </section>
    </main>
  );
}