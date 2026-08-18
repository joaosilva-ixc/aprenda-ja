"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AulaPlayer({
  aulaId,
  videoUrl,
  statusLabel,
  initialCompleted,
  initialFavorite,
  admin,
}: {
  aulaId: string;
  videoUrl: string;
  statusLabel: string;
  initialCompleted: boolean;
  initialFavorite: boolean;
  admin: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [saving, setSaving] = useState(false);

  async function update(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status !== 401) {
        window.alert("Não foi possível salvar o progresso.");
      }
    } catch {
      window.alert("Falha de rede ao salvar o progresso.");
    } finally {
      setSaving(false);
      router.refresh();
    }
  }

  function onEnded() {
    if (!completed) {
      setCompleted(true);
      update({ aulaId, completed: true });
    }
  }

  function toggleComplete() {
    setCompleted((c) => !c);
    update({ aulaId, completed: !completed });
  }

  function toggleFavorite() {
    setFavorite((f) => !f);
    update({ aulaId, favorite: !favorite });
  }

  if (admin) {
    return (
      <div className="overflow-hidden rounded-2xl bg-black shadow-lg">
        <video
          className="aspect-video w-full"
          controls
          playsInline
          preload="metadata"
          src={videoUrl}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-black shadow-lg">
        <video
          className="aspect-video w-full"
          controls
          playsInline
          preload="metadata"
          src={videoUrl}
          onEnded={onEnded}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleComplete}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
            completed
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-white text-gray-700 shadow hover:bg-gray-50"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {completed ? "Concluída" : "Marcar como concluída"}
        </button>

        <button
          type="button"
          onClick={toggleFavorite}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
            favorite
              ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
              : "bg-white text-gray-700 shadow hover:bg-gray-50"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill={favorite ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
          {favorite ? "Favorita" : "Favoritar"}
        </button>

        <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}