"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeSlug } from "@/generated/prisma/enums";
import { DeleteAulaButton } from "@/components/DeleteAulaButton";

type Tema = {
  id: string;
  slug: ThemeSlug;
  name: string;
  icon: string;
  color: string;
  _count: { aulas: number };
};

type Aula = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  status: string;
  tags: string[];
  createdAt: string;
  theme: Tema;
};

const statusLabels: Record<string, string> = {
  UPLOADING: "Enviando",
  READY: "Pronto",
  SYNCING: "Sincronizando",
  SYNCED: "Sincronizado",
  FAILED: "Falhou",
};

const playIcon = (
  <svg
    className="h-6 w-6"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M8 5.14v14l11-7-11-7Z" />
  </svg>
);

export default function Home() {
  const router = useRouter();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [q, setQ] = useState("");
  const [themeId, setThemeId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setAuthChecked(true);
        if (!data.user) {
          router.push("/login");
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        setAuthChecked(true);
        router.push("/login");
      });
  }, [router]);

  const fetchAulas = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (themeId) params.set("themeId", themeId);
    const res = await fetch(`/api/aulas?${params.toString()}`);
    const data = await res.json();
    setAulas(data.aulas);
  }, [q, themeId]);

  useEffect(() => {
    fetch("/api/temas")
      .then((r) => r.json())
      .then((d) => setTemas(d.temas));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAulas().finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [fetchAulas]);

  const totalAulas = useMemo(
    () => temas.reduce((acc, t) => acc + t._count.aulas, 0),
    [temas],
  );

  const byTheme = useMemo(() => {
    if (themeId) {
      return [{ theme: temas.find((t) => t.id === themeId)!, aulas: aulas }].filter(
        (g) => g.theme,
      );
    }
    return temas
      .map((tema) => ({ theme: tema, aulas: aulas.filter((a) => a.theme.id === tema.id) }))
      .filter((g) => g.aulas.length > 0);
  }, [temas, aulas, themeId]);

  if (!authChecked) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4">
        <div className="h-24 w-full max-w-md animate-pulse rounded-2xl bg-white/40" />
      </main>
    );
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
      {/* Hero */}
      <section className="animate-fade-up pt-12 pb-8 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur">
          <span className="h-2 w-2 animate-pulse-slow rounded-full bg-emerald-400" />
          Plataforma de treinamentos · Opa
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          Domine o Opa Suite{" "}
          <span className="bg-gradient-to-r from-sky-300 via-white to-blue-200 bg-clip-text text-transparent">
            aprendendo na prática
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-blue-100/90 sm:text-lg">
          Gravações de aulas e cursos, organizadas por tema para você consultar quando precisar.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#temas"
            className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
          >
            Explorar aulas
          </a>
        </div>

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
          <div className="animate-fade-up rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur [animation-delay:150ms]">
            <p className="text-3xl font-extrabold text-white">{totalAulas}</p>
            <p className="mt-1 text-xs font-medium text-blue-100/80">Aulas</p>
          </div>
          <div className="animate-fade-up rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur [animation-delay:250ms]">
            <p className="text-3xl font-extrabold text-white">{temas.length}</p>
            <p className="mt-1 text-xs font-medium text-blue-100/80">Temas</p>
          </div>
          <div className="animate-fade-up rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur [animation-delay:350ms]">
            <p className="text-3xl font-extrabold text-white">
              {aulas.filter((a) => a.status === "READY" || a.status === "SYNCED").length}
            </p>
            <p className="mt-1 text-xs font-medium text-blue-100/80">Disponíveis</p>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section
        id="temas"
        className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/95 p-4 shadow-xl shadow-blue-900/10 backdrop-blur sm:p-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35m1.35-5.4a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z"
              />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, descrição ou tag…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setThemeId("")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                themeId === ""
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todos
            </button>
            {temas.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(themeId === t.id ? "" : t.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                  themeId === t.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: themeId === t.id ? "#fff" : t.color }}
                />
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Aulas */}
      <section className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/40"
              />
            ))}
          </div>
        ) : byTheme.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/40 bg-white/60 p-12 text-center backdrop-blur">
            <p className="text-5xl">🎓</p>
            <p className="mt-3 font-semibold text-gray-800">Nenhuma aula encontrada</p>
            <p className="mt-1 text-sm text-gray-500">
              Tente ajustar a busca ou o filtro de tema.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {byTheme.map(({ theme, aulas: themeAulas }, idx) => (
              <section key={theme.id} id={`tema-${theme.slug.toLowerCase()}`}>
                <div className="animate-fade-up mb-4 flex items-center gap-3 [animation-delay:100ms]">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{
                      backgroundColor: theme.color,
                      boxShadow: `0 8px 20px -6px ${theme.color}99`,
                    }}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                      />
                    </svg>
                  </span>
                  <div>
                    <h2
                      className="text-lg font-bold text-white"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                    >
                      {theme.name}
                    </h2>
                    <p className="text-xs font-medium text-blue-100/80">
                      {themeAulas.length} aula(s)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {themeAulas.map((aula, i) => (
                    <AulaCard
                      key={aula.id}
                      aula={aula}
                      statusLabels={statusLabels}
                      isAdmin={isAdmin}
                      delay={100 + idx * 40 + i * 60}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AulaCard({
  aula,
  statusLabels,
  isAdmin,
  delay,
}: {
  aula: Aula;
  statusLabels: Record<string, string>;
  isAdmin: boolean;
  delay: number;
}) {
  const canPlay = aula.status === "READY" || aula.status === "SYNCED";
  const hasTags = aula.tags.length > 0;

  const content = (
    <article
      className="card-hover animate-fade-up group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-blue-900/10 [animation-delay:0ms]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Thumbnail */}
      <div
        className="relative flex aspect-video items-center justify-center overflow-hidden"
        style={{ backgroundColor: aula.theme.color }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/20 transition duration-300 group-hover:from-black/60 group-hover:to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          {canPlay ? (
            <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-white/90 text-blue-700 opacity-90 shadow-xl transition duration-300 group-hover:scale-110 group-hover:bg-white group-hover:opacity-100">
              {playIcon}
            </span>
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </span>
          )}
        </span>
        <span
          className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold shadow backdrop-blur ${
            canPlay ? "bg-emerald-400/90 text-emerald-950" : "bg-amber-400/90 text-amber-950"
          }`}
        >
          {statusLabels[aula.status]}
        </span>
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {aula.theme.name}
        </span>
        {isAdmin && <DeleteAulaButton aulaId={aula.id} />}
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-bold leading-snug text-gray-900 transition group-hover:text-blue-700">
          {aula.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-gray-500">{aula.description}</p>

        {hasTags && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {aula.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-400">
            {new Date(aula.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold transition ${
              canPlay
                ? "text-blue-600 group-hover:gap-2"
                : "text-gray-300"
            }`}
          >
            {canPlay ? "Assistir" : "Indisponível"}
            {canPlay && (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12l-7.5 7.5M21 12H3" />
              </svg>
            )}
          </span>
        </div>
      </div>
    </article>
  );

  return canPlay ? (
    <Link href={`/aula/${aula.id}`} className="block h-full">
      {content}
    </Link>
  ) : (
    <div className="h-full">{content}</div>
  );
}