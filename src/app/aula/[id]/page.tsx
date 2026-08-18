import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { DeleteAulaButton } from "@/components/DeleteAulaButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  UPLOADING: "Enviando",
  READY: "Pronto",
  SYNCING: "Sincronizando",
  SYNCED: "Sincronizado",
  FAILED: "Falhou",
};

export default async function AulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";

  const { id } = await params;
  const aula = await prisma.aula.findUnique({
    where: { id },
    include: { theme: true },
  });

  if (!aula) notFound();

  const canPlay = Boolean(aula.videoUrl) && (aula.status === "READY" || aula.status === "SYNCED");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="animate-fade-up mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Voltar
        </Link>
        {isAdmin && <DeleteAulaButton aulaId={aula.id} size="full" />}
      </div>

      <div className="animate-fade-up overflow-hidden rounded-3xl bg-white shadow-2xl shadow-blue-900/20 [animation-delay:100ms]">
        <div
          className="relative px-6 pt-8 pb-5 sm:px-8"
          style={{
            background: `linear-gradient(120deg, ${aula.theme.color}cc 0%, ${aula.theme.color} 55%, ${aula.theme.color}aa 100%)`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-white" />
              {aula.theme.name}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur ${
                canPlay ? "bg-emerald-400 text-emerald-950" : "bg-amber-400 text-amber-950"
              }`}
            >
              {statusLabels[aula.status]}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white drop-shadow sm:text-3xl">
            {aula.title}
          </h1>
          {aula.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {aula.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-6 sm:px-8">
          <p className="whitespace-pre-line text-gray-600">{aula.description}</p>

          <div className="mt-6 overflow-hidden rounded-2xl bg-black shadow-lg">
            {canPlay ? (
              <video
                className="aspect-video w-full"
                controls
                playsInline
                preload="metadata"
                src={aula.videoUrl}
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-sm text-gray-400">
                Vídeo indisponível ({statusLabels[aula.status]})
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}