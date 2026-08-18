"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeSlug } from "@/generated/prisma/enums";

type Tema = {
  id: string;
  slug: ThemeSlug;
  name: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  size?: string | null;
  modifiedTime?: string | null;
};

type DriveFolder = {
  id: string;
  name: string;
  files: DriveFile[];
};

export default function UploadPage() {
  const router = useRouter();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [themeId, setThemeId] = useState("");
  const [tags, setTags] = useState("");
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [manualLink, setManualLink] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [listError, setListError] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/temas")
      .then((r) => r.json())
      .then((d) => setTemas(d.temas));
    loadFiles();
  }, []);

  async function loadFiles() {
    setLoadingFiles(true);
    setListError("");
    try {
      const res = await fetch("/api/drive/files");
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "Falha ao carregar gravações.");
      } else {
        setFolders(data.folders ?? []);
        setSelected(null);
      }
    } catch {
      setListError("Falha de rede ao carregar as gravações.");
    } finally {
      setLoadingFiles(false);
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar o link automaticamente.");
    }
  }

  const driveLink = selected?.webViewLink ?? manualLink.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driveLink) {
      setError("Selecione uma gravação da pasta ou cole o link do Drive.");
      return;
    }
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/aulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          themeId,
          tags,
          driveFileId: selected?.id ?? "",
          driveLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao enviar a gravação.");
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar a gravação.");
      setSending(false);
    }
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

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Gravação <span className="font-normal text-gray-400">(pasta no Google Drive)</span>
            </label>
            <button
              type="button"
              onClick={loadFiles}
              disabled={loadingFiles}
              className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 disabled:opacity-50"
            >
              {loadingFiles ? "Carregando…" : "Atualizar lista"}
            </button>
          </div>

          {loadingFiles ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
              <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Carregando gravações do Drive…
            </div>
          ) : listError ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
              <p className="text-sm text-red-700">{listError}</p>
              <button
                type="button"
                onClick={loadFiles}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95"
              >
                Tentar novamente
              </button>
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center text-sm text-gray-500">
              Nenhuma gravação encontrada na pasta do Drive.
            </div>
          ) : (
            <div className="max-h-80 space-y-4 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3">
              {folders
                .filter((f) => f.files.length > 0)
                .map((folder) => (
                  <div key={folder.id}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wide text-gray-500 uppercase">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                      </svg>
                      {folder.name}
                    </p>
                    <div className="space-y-2">
                      {folder.files.map((f) => (
                        <label
                          key={f.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                            selected?.id === f.id
                              ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                              : "border-transparent bg-white hover:border-blue-200 hover:bg-blue-50/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="gravação"
                            className="flex h-4 w-4 shrink-0 accent-blue-600"
                            checked={selected?.id === f.id}
                            onChange={() => {
                              setSelected(f);
                              setManualLink("");
                              const tema = temas.find((t) => t.name === folder.name);
                              if (tema) setThemeId(tema.id);
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800">{f.name}</p>
                            <p className="truncate text-xs text-gray-500">
                              {f.mimeType === "application/vnd.google-apps.video" ? "Vídeo do Drive" : f.mimeType}
                              {f.size ? ` · ${(Number(f.size) / (1024 * 1024)).toFixed(1)} MB` : ""}
                            </p>
                          </div>
                          {f.webViewLink && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                copyLink(f.webViewLink!);
                              }}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-95"
                            >
                              Copiar link
                            </button>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              {folders.every((f) => f.files.length === 0) && (
                <p className="px-3 py-6 text-center text-sm text-gray-500">
                  Nenhuma gravação encontrada nas subpastas.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Link da gravação
          </label>
          <input
            value={driveLink}
            readOnly={!!selected}
            onChange={(e) => {
              setManualLink(e.target.value);
              setSelected(null);
            }}
            placeholder="https://drive.google.com/…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 read-only:bg-white"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Selecione uma gravação acima (o tema é preenchido automaticamente) ou cole o link copiado do Drive.
          </p>
          {driveLink && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyLink(driveLink)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95"
              >
                {copied ? "Link copiado!" : "Copiar link"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Enviar gravação"}
        </button>
      </form>
    </main>
  );
}