"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TopVideo = {
  id: string;
  title: string;
  viewCount: number;
  theme: { id: string; name: string; color: string };
};

type ThemeStat = {
  themeId: string;
  name: string;
  color: string;
  views: number;
  percent: number;
};

type StudentAccess = {
  id: string;
  name: string;
  email: string;
  lastAccessAt: string | null;
};

type TrendPoint = {
  key: string;
  label: string;
  count: number;
};

type Engagement = {
  id: string;
  name: string;
  email: string;
  streakCount: number;
  completed: number;
  favorites: number;
  totalProgress: number;
  percentual: number;
  lastAccessAt: string | null;
};

type Dashboard = {
  summary: {
    totalAulas: number;
    totalAlunos: number;
    totalViews: number;
    totalTemas: number;
  };
  topVideos: TopVideo[];
  viewsByTheme: ThemeStat[];
  lastAccess: StudentAccess[];
  trend: TrendPoint[];
  engagement: Engagement[];
  engagementTotal: number;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function donutBackground(items: ThemeStat[]) {
  const visible = items.filter((t) => t.views > 0);
  let acc = 0;
  const stops = visible.map((t, i) => {
    const from = acc;
    acc += t.percent;
    const to = i === visible.length - 1 ? 100 : acc;
    return `${t.color} ${from}% ${to}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? null))
      .catch(() => {});
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error(json.error ?? "Erro ao carregar o painel.");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = setTimeout(fetchDashboard, 200);
    return () => clearTimeout(t);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4">
        <div className="h-64 w-full max-w-md animate-pulse rounded-3xl bg-white/40 dark:bg-white/10" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4">
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  if (!data) return null;

  const summary = data.summary;
  const maxViews = Math.max(1, ...(data.topVideos ?? []).map((v) => v.viewCount));
  const donutBg = donutBackground(data.viewsByTheme);
  const hasViews = data.viewsByTheme.some((t) => t.views > 0);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="animate-fade-up mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
              Painel do administrador
            </h1>
            <p className="text-xs font-medium text-blue-100/80">
              Acompanhe o acesso aos treinamentos da plataforma.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {role === "MASTER" && (
            <>
              <Link
                href="/admin/aulas"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Aulas
              </Link>
              <Link
                href="/admin/temas"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Temas
              </Link>
              <Link
                href="/admin/anuncio"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Aviso
              </Link>
            </>
          )}
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Usuários
          </Link>
          {role === "MASTER" && (
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Enviar gravação
            </Link>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="animate-fade-up mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 [animation-delay:100ms]">
        {[
          { label: "Aulas", value: summary?.totalAulas ?? 0 },
          ...(role === "MASTER"
            ? [{ label: "Usuários", value: summary?.totalAlunos ?? 0 }]
            : []),
          { label: "Visualizações", value: summary?.totalViews ?? 0 },
          { label: "Temas", value: summary?.totalTemas ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur"
          >
            <p className="text-3xl font-extrabold text-white">{card.value}</p>
            <p className="mt-1 text-xs font-medium text-blue-100/80">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Exportar relatórios */}
      <div className="animate-fade-up mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur [animation-delay:50ms]">
        <span className="mr-1 text-sm font-semibold text-white">Exportar relatórios:</span>
        <a
          href="/api/admin/export?type=aulas"
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/25"
        >
          Aulas (CSV)
        </a>
        <a
          href="/api/admin/export?type=alunos"
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/25"
        >
          Usuários (CSV)
        </a>
        <a
          href="/api/admin/export?type=progresso"
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/25"
        >
          Progresso (CSV)
        </a>
      </div>

      {/* Evolução de acessos */}
      <section className="animate-fade-up mb-6 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 dark:bg-slate-900 [animation-delay:125ms]">
        <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase dark:text-slate-200">
          Acessos nos últimos 14 dias
        </h2>
        {data.trend.every((t) => t.count === 0) ? (
          <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            Sem acessos registrados nos últimos 14 dias.
          </p>
        ) : (
          <div className="mt-5 flex items-end gap-1 sm:gap-1.5">
            {(() => {
              const maxT = Math.max(1, ...data.trend.map((t) => t.count));
              return data.trend.map((point) => (
                <div key={point.key} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm transition group-hover:from-blue-700 group-hover:to-indigo-600"
                      style={{ height: `${Math.max(4, (point.count / maxT) * 100)}%` }}
                      title={`${point.label}: ${point.count} acesso(s)`}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-gray-400 sm:text-[10px] dark:text-slate-500">
                    {point.label}
                  </span>
                </div>
              ));
            })()}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vídeos mais acessados */}
        <section className="animate-fade-up rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 dark:bg-slate-900 [animation-delay:150ms]">
          <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase dark:text-slate-200">
            Vídeos mais acessados
          </h2>
          {!data?.topVideos.length ? (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              Nenhuma visualização registrada ainda.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {data.topVideos.map((video, i) => (
                <li key={video.id}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                        {i + 1}
                      </span>
                      <span className="truncate">{video.title}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-gray-500 dark:text-slate-400">
                      {video.viewCount} visualização{video.viewCount === 1 ? "" : "ões"}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      style={{ width: `${(video.viewCount / maxViews) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Percentual por assunto */}
        <section className="animate-fade-up rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 dark:bg-slate-900 [animation-delay:200ms]">
          <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase dark:text-slate-200">
            Treinamentos por assunto
          </h2>
          {!hasViews ? (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              Sem visualizações para calcular o percentual.
            </p>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="relative h-44 w-44 shrink-0">
                <div
                  className="h-full w-full rounded-full shadow-inner"
                  style={{ background: donutBg }}
                />
                <div className="absolute inset-5 flex items-center justify-center rounded-full bg-white shadow-inner dark:bg-slate-900">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">
                      {summary?.totalViews ?? 0}
                    </p>
                    <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500">visualizações</p>
                  </div>
                </div>
              </div>
              <ul className="w-full space-y-2.5">
                {data.viewsByTheme
                  .filter((t) => t.views > 0)
                  .sort((a, b) => b.views - a.views)
                  .map((t) => (
                    <li key={t.themeId} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="truncate font-medium">{t.name}</span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-gray-500 dark:text-slate-400">
                        {t.percent}%
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Último acesso dos alunos */}
      <section className="animate-fade-up mt-6 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 dark:bg-slate-900 [animation-delay:250ms]">
        <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase dark:text-slate-200">
Último acesso dos usuários
        </h2>
        {!data?.lastAccess.length ? (
          <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            Nenhum usuário acessou a plataforma ainda.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-gray-100 dark:divide-slate-800">
            {data.lastAccess.map((student) => (
              <li
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-slate-100">{student.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400">{student.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  {formatDate(student.lastAccessAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Engajamento dos alunos */}
      <section className="animate-fade-up mt-6 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 dark:bg-slate-900 [animation-delay:300ms]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase dark:text-slate-200">
Engajamento dos usuários
          </h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
            {data.engagementTotal} usuário(s) com atividade
          </span>
        </div>
        {!data.engagement.length ? (
          <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            Nenhum usuário com progresso ou streak registrado ainda.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.engagement.map((student) => (
              <div
                key={student.id}
                className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-slate-100">{student.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-slate-400">{student.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                    {student.percentual}%
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                    style={{ width: `${student.percentual}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600 dark:text-slate-300">
                  <span className="rounded-full bg-white px-2 py-1 shadow-sm dark:bg-slate-900">
                    ✓ {student.completed} concluída(s)
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 shadow-sm dark:bg-slate-900">
                    ★ {student.favorites} favorita(s)
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 shadow-sm dark:bg-slate-900">
                    🔥 {student.streakCount} dia(s) seguidos
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
