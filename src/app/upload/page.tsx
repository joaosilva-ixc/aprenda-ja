"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

type Tema = {
  id: string;
  slug: string;
  name: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function captureThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => URL.revokeObjectURL(url);

    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.onloadeddata = () => {
      try {
        const target = Math.min(video.duration * 0.1 || 1, 3);
        video.currentTime = Math.max(0.1, target);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onseeked = () => {
      try {
        const width = 640;
        const height = Math.round(
          width * (video.videoHeight / video.videoWidth),
        );
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("sem contexto");
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          "image/jpeg",
          0.8,
        );
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.src = url;
  });
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [themeId, setThemeId] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setAuthChecked(true);
        if (!data.user) {
          router.push("/login");
          return;
        }
        if (data.user.role !== "MASTER") {
          router.push("/");
          return;
        }
      })
      .catch(() => {
        setAuthChecked(true);
        router.push("/login");
      });
    fetch("/api/temas")
      .then((r) => r.json())
      .then((d) => setTemas(d.temas));
  }, [router]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError("");
    setProgress(0);
    if (f) {
      const baseName = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      setTitle((t) => t || baseName);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo de vídeo.");
      return;
    }
    if (!themeId) {
      setError("Selecione o tema da aula.");
      return;
    }
    setSending(true);
    setError("");
    setProgress(0);

    try {
      let blobResult;
      try {
        blobResult = await upload(`aulas/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/blob/upload",
          contentType: file.type || "video/mp4",
          onUploadProgress: ({ percentage }) => setProgress(percentage),
        });
      } catch {
        blobResult = await upload(`aulas/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          contentType: file.type || "video/mp4",
          onUploadProgress: ({ percentage }) => setProgress(percentage),
        });
      }

      let thumbnailUrl: string | null = null;
      const thumbBlob = await captureThumbnail(file);
      if (thumbBlob) {
        try {
          const thumbName = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
          const thumbResult = await upload(`thumbnails/${thumbName}`, thumbBlob, {
            access: "public",
            handleUploadUrl: "/api/blob/upload",
            contentType: "image/jpeg",
          });
          thumbnailUrl = thumbResult.url;
        } catch {
          thumbnailUrl = null;
        }
      }

      const res = await fetch("/api/aulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          themeId,
          tags,
          videoUrl: blobResult.url,
          thumbnailUrl,
          blobPathname: blobResult.pathname,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao salvar a aula.");
      }
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Erro ao enviar o vídeo.",
      );
      setSending(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4">
        <div className="h-24 w-full max-w-sm animate-pulse rounded-2xl bg-white/40" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
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
        <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow">
          Enviar gravação
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="animate-fade-up space-y-5 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:100ms] sm:p-8"
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tema</label>
          <select
            required
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Selecione…</option>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Arquivo de vídeo
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={pickFile}
            className="block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 outline-none transition file:mr-3 file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
          />
          {file && (
            <p className="mt-1.5 text-xs text-gray-500">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Título da aula
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Configurando ramais no PABX"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Resumo do conteúdo da gravação…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Tags <span className="font-normal text-gray-400">(separadas por vírgula)</span>
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ramal, fila, integração"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {sending && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
              <span>Enviando vídeo…</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={sending || !file}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Enviar gravação"}
        </button>
      </form>
    </main>
  );
}