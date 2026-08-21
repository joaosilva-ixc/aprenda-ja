"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tema = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  _count?: { aulas: number };
};

const defaultColors = [
  "#2563eb",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function AdminTemasPage() {
  const router = useRouter();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColors[0]);
  const [sending, setSending] = useState(false);

  const [editing, setEditing] = useState<Tema | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSending, setEditSending] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchTemas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/temas");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error(data.error ?? "Erro ao carregar temas.");
      }
      setTemas(data.temas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar temas.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = setTimeout(fetchTemas, 100);
    return () => clearTimeout(t);
  }, [fetchTemas]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/temas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao criar o tema.");
      }
      setName("");
      setColor(defaultColors[0]);
      fetchTemas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar o tema.");
    } finally {
      setSending(false);
    }
  }

  function openEdit(tema: Tema) {
    setEditing(tema);
    setEditName(tema.name);
    setEditColor(tema.color);
    setEditError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSending(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/temas/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao atualizar o tema.");
      }
      setEditing(null);
      fetchTemas();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao atualizar o tema.");
    } finally {
      setEditSending(false);
    }
  }

  async function handleDelete(tema: Tema) {
    const count = tema._count?.aulas ?? 0;
    if (count > 0) {
      window.alert(`Não é possível excluir "${tema.name}": existem ${count} aula(s) neste tema.`);
      return;
    }
    if (!window.confirm(`Excluir o tema "${tema.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/temas/${tema.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Erro ao excluir o tema.");
        return;
      }
      fetchTemas();
    } catch {
      window.alert("Falha de rede ao excluir o tema.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
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
            Gerenciar temas
          </h1>
          <p className="text-xs font-medium text-blue-100/80">
            Crie, edite e exclua temas para organizar as aulas.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="animate-fade-up mb-6 space-y-4 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:100ms]"
      >
        <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">Novo tema</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Relatórios e BI"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Cor</label>
            <div className="flex flex-wrap items-center gap-2">
              {defaultColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Usar cor ${c}`}
                  className={`h-8 w-8 rounded-full transition active:scale-95 ${
                    color === c ? "ring-2 ring-gray-900 ring-offset-2" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                />
                Personalizar
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {sending ? "Criando…" : "Criar tema"}
        </button>
      </form>

      <div className="animate-fade-up [animation-delay:150ms]">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-white uppercase">
          Temas ({temas.length})
        </h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-white/40" />
        ) : (
          <div className="space-y-2">
            {temas.map((tema) => (
              <div
                key={tema.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-blue-900/10"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: tema.color }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{tema.name}</p>
                    <p className="text-xs text-gray-500">
                      {tema._count?.aulas ?? 0} aula(s)
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openEdit(tema)}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(tema)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
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
              Editar tema
            </h2>
            <p className="mt-1 text-xs text-gray-500">Atualize as informações de {editing.name}.</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nome</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Cor</label>
                <div className="flex flex-wrap items-center gap-2">
                  {defaultColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      aria-label={`Usar cor ${c}`}
                      className={`h-8 w-8 rounded-full transition active:scale-95 ${
                        editColor === c ? "ring-2 ring-gray-900 ring-offset-2" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                    />
                    Personalizar
                  </label>
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