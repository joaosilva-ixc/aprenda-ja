"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

type Tema = { id: string; name: string; color: string };

type Material = {
  id: string;
  title: string;
  sizeBytes: number | null;
  createdAt: string;
};

type Aula = {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  videoUrl: string;
  hasCaptions?: boolean;
  chapters?: { t: number; label: string }[] | unknown;
  materials?: Material[];
  theme: { id: string; name: string; color: string };
};

const statusLabels: Record<string, string> = {
  UPLOADING: "Enviando",
  READY: "Pronto",
  SYNCING: "Sincronizando",
  SYNCED: "Sincronizado",
  FAILED: "Falhou",
};

const statusOptions = ["UPLOADING", "READY", "SYNCING", "SYNCED", "FAILED"];

const statusColor: Record<string, string> = {
  UPLOADING: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
  SYNCING: "bg-blue-100 text-blue-700",
  SYNCED: "bg-indigo-100 text-indigo-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function AdminAulasPage() {
  const router = useRouter();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [themeId, setThemeId] = useState("");

  const [editing, setEditing] = useState<Aula | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThemeId, setEditThemeId] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editSending, setEditSending] = useState(false);
  const [editError, setEditError] = useState("");
  const [editCaptions, setEditCaptions] = useState<string | null | undefined>(undefined);
  const [editCaptionsName, setEditCaptionsName] = useState("");
  const [editChapters, setEditChapters] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialBusy, setMaterialBusy] = useState(false);
  const captionsInputRef = useRef<HTMLInputElement | null>(null);
  const materialInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAulas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (themeId) params.set("themeId", themeId);
      const res = await fetch(`/api/admin/aulas?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error(data.error ?? "Erro ao carregar aulas.");
      }
      setAulas(data.aulas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar aulas.");
    } finally {
      setLoading(false);
    }
  }, [q, status, themeId, router]);

  useEffect(() => {
    const t = setTimeout(fetchAulas, 200);
    return () => clearTimeout(t);
  }, [fetchAulas]);

  useEffect(() => {
    fetch("/api/temas")
      .then((r) => r.json())
      .then((d) => setTemas(d.temas));
  }, []);

  function openEdit(aula: Aula) {
    setEditing(aula);
    setEditTitle(aula.title);
    setEditDescription(aula.description);
    setEditThemeId(aula.theme.id);
    setEditTags(aula.tags.join(", "));
    setEditStatus(aula.status);
    setEditError("");
    setEditCaptions(undefined);
    setEditCaptionsName("");
    setEditChapters(
      Array.isArray(aula.chapters)
        ? (aula.chapters as { t: number; label: string }[])
            .map((c) => {
              const h = Math.floor(c.t / 3600);
              const m = Math.floor((c.t % 3600) / 60);
              const s = String(c.t % 60).padStart(2, "0");
              return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${s} ${c.label}`;
            })
            .join("\n")
        : "",
    );
    setMaterialFile(null);
  }

  function handleCaptionsFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditCaptions(String(reader.result ?? ""));
      setEditCaptionsName(file.name);
    };
    reader.readAsText(file);
  }

  function parseChaptersInput(text: string): { t: number; label: string }[] | null {
    const chapters: { t: number; label: string }[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+)$/);
      if (!match) return null;
      chapters.push({
        t: (Number(match[1]) || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]),
        label: match[4].trim(),
      });
    }
    return chapters;
  }

  async function uploadMaterialPdf(file: File) {
    try {
      return await upload(`materiais/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type || "application/pdf",
      });
    } catch {
      return await upload(`materiais/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type || "application/pdf",
      });
    }
  }

  async function registerMaterial(aulaId: string, file: File) {
    const blobResult = await uploadMaterialPdf(file);
    const res = await fetch(`/api/admin/aulas/${aulaId}/materiais`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: file.name.replace(/\.[^.]+$/, ""),
        url: blobResult.url,
        pathname: blobResult.pathname,
        sizeBytes: file.size,
        contentType: file.type || "application/pdf",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erro ao registrar material.");
    return data.material as Material;
  }

  function clearMaterialFile() {
    setMaterialFile(null);
    if (materialInputRef.current) materialInputRef.current.value = "";
  }

  async function handleAddMaterial() {
    if (!editing || !materialFile) return;
    setMaterialBusy(true);
    setEditError("");
    try {
      const material = await registerMaterial(editing.id, materialFile);
      setEditing({
        ...editing,
        materials: [...(editing.materials ?? []), material],
      });
      clearMaterialFile();
      fetchAulas();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao enviar material.");
    } finally {
      setMaterialBusy(false);
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    if (!editing) return;
    try {
      const res = await fetch(`/api/admin/materiais/${materialId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Erro ao remover material.");
      }
      setEditing({
        ...editing,
        materials: (editing.materials ?? []).filter((m) => m.id !== materialId),
      });
      fetchAulas();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao remover material.");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSending(true);
    setEditError("");
    try {
      const chapters = parseChaptersInput(editChapters);
      if (chapters === null) {
        throw new Error("Formato de capítulos inválido. Use uma por linha: mm:ss Título");
      }
      const res = await fetch(`/api/admin/aulas/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          themeId: editThemeId,
          tags: editTags,
          status: editStatus,
          ...(editCaptions !== undefined ? { captionsVtt: editCaptions } : {}),
          ...(editChapters.trim() || editing.chapters ? { chapters } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao atualizar a aula.");
      }
      if (materialFile) {
        try {
          await registerMaterial(editing.id, materialFile);
          clearMaterialFile();
        } catch (err) {
          setEditError(
            `A aula foi salva, mas o material não pôde ser enviado: ${
              err instanceof Error ? err.message : "erro desconhecido"
            }`,
          );
          return;
        }
      }
      setEditing(null);
      fetchAulas();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao atualizar a aula.");
    } finally {
      setEditSending(false);
    }
  }

  async function handleDelete(aula: Aula) {
    if (!window.confirm(`Excluir a aula "${aula.title}"? O vídeo hospedado também será removido.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/aulas/${aula.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Erro ao excluir a aula.");
        return;
      }
      fetchAulas();
    } catch {
      window.alert("Falha de rede ao excluir a aula.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
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
            Gerenciar aulas
          </h1>
          <p className="text-xs font-medium text-blue-100/80">
            Edite, filtre por status e exclua gravações cadastradas.
          </p>
        </div>
        <Link
          href="/upload"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-95"
        >
          Enviar gravação
        </Link>
      </div>

      {/* Filtros */}
      <div className="animate-fade-up mb-4 flex flex-col gap-3 rounded-3xl bg-white p-4 [animation-delay:100ms] sm:flex-row sm:items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, descrição ou tag…"
          className="w-full flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 sm:w-44"
        >
          <option value="">Todos os status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <select
          value={themeId}
          onChange={(e) => setThemeId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 sm:w-48"
        >
          <option value="">Todos os temas</option>
          {temas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="animate-fade-up [animation-delay:150ms]">
        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-white/40" />
        ) : aulas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/40 bg-white/60 p-10 text-center text-sm text-gray-600">
            Nenhuma aula encontrada com estes filtros.
          </p>
        ) : (
          <ul className="space-y-2">
            {aulas.map((aula) => (
              <li
                key={aula.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-blue-900/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{aula.title}</p>
                  <p className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: aula.theme.color }}
                      />
                      {aula.theme.name}
                    </span>
                    <span>·</span>
                    <span>{aula.viewCount} visualizações</span>
                    <span>·</span>
                    <span>
                      {new Date(aula.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      statusColor[aula.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {statusLabels[aula.status] ?? aula.status}
                  </span>
                  <Link
                    href={`/aula/${aula.id}`}
                    className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                  >
                    Ver
                  </Link>
                  <button
                    onClick={() => openEdit(aula)}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(aula)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !editSending && setEditing(null)}
        >
          <form
            onSubmit={handleUpdate}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-up w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/30"
          >
            <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
              Editar aula
            </h2>
            <p className="mt-1 text-xs text-gray-500">Atualize os dados de {editing.title}.</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Título</label>
                <input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Descrição</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tema</label>
                  <select
                    value={editThemeId}
                    onChange={(e) => setEditThemeId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  >
                    {temas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Tags <span className="font-normal text-gray-400">(separadas por vírgula)</span>
                </label>
                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="ramal, fila, integração"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="rounded-2xl border border-gray-100 p-3">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Legendas (WebVTT)</p>
                {editing.hasCaptions && editCaptions === undefined && (
                  <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                    Legendas já cadastradas nesta aula.
                  </p>
                )}
                {editCaptionsName && (
                  <p className="mt-1.5 text-xs font-semibold text-blue-600">
                    Novo arquivo carregado: {editCaptionsName}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={captionsInputRef}
                    type="file"
                    accept=".vtt,text/vtt"
                    onChange={(e) => handleCaptionsFile(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => captionsInputRef.current?.click()}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95"
                  >
                    {editing.hasCaptions ? "Substituir legendas" : "Carregar arquivo .vtt"}
                  </button>
                  {(editCaptions !== undefined || editing.hasCaptions) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditCaptions(null);
                        setEditCaptionsName("");
                        if (captionsInputRef.current) captionsInputRef.current.value = "";
                      }}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95"
                    >
                      Remover legendas
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-3">
                <label className="block text-xs font-bold tracking-wide text-gray-500 uppercase">
                  Capítulos{" "}
                  <span className="font-normal normal-case">(uma por linha: mm:ss Título)</span>
                </label>
                <textarea
                  value={editChapters}
                  onChange={(e) => setEditChapters(e.target.value)}
                  rows={3}
                  placeholder={"0:00 Introdução\n2:30 Configuração inicial\n10:15 Exemplo prático"}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="rounded-2xl border border-gray-100 p-3">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                  Materiais complementares (PDF)
                </p>
                {(editing.materials ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {(editing.materials ?? []).map((material) => (
                      <li key={material.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">
                          {material.title}
                          {material.sizeBytes
                            ? ` · ${(material.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                            : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 transition hover:bg-red-100 active:scale-95"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={materialInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
                    className="max-w-full flex-1 text-xs text-gray-600 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-600 hover:file:bg-blue-100"
                  />
                  <button
                    type="button"
                    disabled={!materialFile || materialBusy}
                    onClick={handleAddMaterial}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {materialBusy ? "Enviando…" : "Adicionar PDF"}
                  </button>
                </div>
              </div>
            </div>

            {editError && (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {editError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={editSending}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSending}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editSending ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}