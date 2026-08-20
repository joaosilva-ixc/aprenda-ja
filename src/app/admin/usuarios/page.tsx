"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: "MASTER" | "ADMIN" | "ALUNO";
  createdAt: string;
};

const roleLabels: Record<User["role"], string> = {
  MASTER: "Master",
  ADMIN: "Admin",
  ALUNO: "Aluno",
};

const roleBadges: Record<User["role"], string> = {
  MASTER: "bg-amber-100 text-amber-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  ALUNO: "bg-emerald-100 text-emerald-700",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<{ id: string; role: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("ALUNO");
  const [sending, setSending] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<User["role"]>("ALUNO");
  const [editPassword, setEditPassword] = useState("");
  const [editSending, setEditSending] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrent({ id: d.user.id, role: d.user.role });
      })
      .catch(() => {});
  }, []);

  const canAssignMaster = current?.role === "MASTER";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error(data.error ?? "Erro ao carregar usuários.");
      }
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [q, router]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 200);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setCreatedUser(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao criar usuário.");
      }
      setCreatedUser({
        name: data.user.name,
        email: data.user.email,
        temporaryPassword: data.temporaryPassword,
      });
      setName("");
      setEmail("");
      setRole("ALUNO");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar usuário.");
    } finally {
      setSending(false);
    }
  }

  async function copyPassword() {
    if (!createdUser) return;
    try {
      await navigator.clipboard.writeText(createdUser.temporaryPassword);
      window.alert("Senha temporária copiada para a área de transferência.");
    } catch {
      window.alert("Não foi possível copiar. Anote a senha manualmente.");
    }
  }

  async function handleDelete(user: User) {
    if (user.role === "MASTER" || user.id === current?.id) return;
    if (!window.confirm(`Excluir o usuário ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Erro ao excluir usuário.");
        return;
      }
      fetchUsers();
    } catch {
      window.alert("Falha de rede ao excluir o usuário.");
    }
  }

  function openEdit(user: User) {
    setEditing(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword("");
    setEditError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSending(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao atualizar usuário.");
      }
      setEditing(null);
      fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao atualizar usuário.");
    } finally {
      setEditSending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
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
            Gerenciar usuários
          </h1>
          <p className="text-xs font-medium text-blue-100/80">
            Crie contas de acesso para usuários e administradores.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="animate-fade-up mb-6 space-y-4 rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 [animation-delay:100ms]"
      >
        <h2 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
          Novo usuário
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Maria Souza"
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
              placeholder="maria@exemplo.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Perfil</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as User["role"])}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            >
              <option value="ALUNO">Aluno</option>
              <option value="ADMIN">Administrador</option>
              {canAssignMaster && <option value="MASTER">Master</option>}
            </select>
          </div>
        </div>

        {createdUser && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">
              Usuário criado com sucesso!
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              {createdUser.name} · {createdUser.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-bold text-gray-900 shadow-sm">
                {createdUser.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={copyPassword}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
              >
                Copiar senha
              </button>
            </div>
            <p className="mt-2 text-xs text-emerald-700">
              Senha temporária exibida apenas uma vez. No primeiro login, o usuário será
              obrigado a definir uma nova senha.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {sending ? "Criando…" : "Criar usuário"}
        </button>
      </form>

      <div className="animate-fade-up [animation-delay:150ms]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">
            Usuários ({users.length})
          </h2>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="w-44 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white outline-none transition placeholder:text-blue-100/50 focus:border-blue-300 focus:bg-white/15"
          />
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/40" />
          ) : users.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/40 bg-white/60 p-8 text-center text-sm text-gray-600">
              Nenhum usuário encontrado.
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-blue-900/10"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{user.name}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      roleBadges[user.role]
                    }`}
                  >
                    {roleLabels[user.role]}
                  </span>
                  {user.role !== "MASTER" && (
                    <button
                      onClick={() => openEdit(user)}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95"
                    >
                      Editar
                    </button>
                  )}
                  {user.role !== "MASTER" && user.id !== current?.id && (
                    <button
                      onClick={() => handleDelete(user)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
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
              Editar usuário
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Atualize as informações de {editing.name}.
            </p>

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
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">E-mail</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Perfil</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as User["role"])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                >
                  <option value="ALUNO">Aluno</option>
                  <option value="ADMIN">Administrador</option>
                  {canAssignMaster && <option value="MASTER">Master</option>}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Nova senha{" "}
                  <span className="font-normal text-gray-400">(opcional — só para trocar)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  minLength={6}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="deixe em branco para manter"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
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