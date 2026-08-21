import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { recordStudyActivity } from "@/lib/progress";
import { DeleteAulaButton } from "@/components/DeleteAulaButton";
import { AulaPlayer } from "@/components/AulaPlayer";

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

  const isStaff = user.role === "ADMIN" || user.role === "MASTER";
  const canDelete = user.role === "MASTER";

  const { id } = await params;
  const aula = await prisma.aula.findUnique({
    where: { id },
    include: {
      theme: true,
      materials: {
        select: { id: true, title: true, sizeBytes: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!aula) notFound();

  const chapters = Array.isArray(aula.chapters)
    ? (aula.chapters as { t: number; label: string }[])
    : [];

  const canPlay = Boolean(aula.videoUrl) && (aula.status === "READY" || aula.status === "SYNCED");

  let progress = null;
  if (canPlay && !isStaff) {
    await prisma.aula.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastAccessAt: new Date() },
    });
    await prisma.aulaProgress.upsert({
      where: { userId_aulaId: { userId: user.id, aulaId: id } },
      update: { lastAccessedAt: new Date() },
      create: { userId: user.id, aulaId: id },
    });
    await recordStudyActivity(user.id);
    progress = await prisma.aulaProgress.findUnique({
      where: { userId_aulaId: { userId: user.id, aulaId: id } },
    });
  }

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
        {canDelete && <DeleteAulaButton aulaId={aula.id} size="full" />}
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

          <div className="mt-6">
            {canPlay ? (
              <AulaPlayer
                aulaId={aula.id}
                videoUrl={`/api/videos/${aula.id}`}
                captionsUrl={aula.captionsVtt ? `/api/captions/${aula.id}` : null}
                chapters={chapters}
                statusLabel={statusLabels[aula.status]}
                initialCompleted={progress?.completed ?? false}
                initialFavorite={progress?.favorite ?? false}
                initialPosition={progress?.positionSec ?? 0}
                admin={isStaff}
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-black text-sm text-gray-400 shadow-lg">
                Vídeo indisponível ({statusLabels[aula.status]})
              </div>
            )}
          </div>

          {aula.materials.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
                Materiais complementares
              </h2>
              <ul className="mt-3 space-y-2">
                {aula.materials.map((material) => (
                  <li key={material.id}>
                    <a
                      href={`/api/materiais/${material.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                          />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-gray-800">
                          {material.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          PDF{material.sizeBytes ? ` · ${(material.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}
                        </span>
                      </span>
                      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}