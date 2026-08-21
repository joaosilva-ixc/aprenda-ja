"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [awaiting2fa, setAwaiting2fa] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      if (awaiting2fa) {
        const verifyRes = await fetch("/api/auth/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: twoFactorCode }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error ?? "Erro ao verificar o código.");
        }
        window.location.href = verifyData.user?.mustChangePassword ? "/trocar-senha" : "/";
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao entrar.");
      }
      if (data.twoFactorRequired) {
        setAwaiting2fa(true);
        setSending(false);
        return;
      }
      window.location.href = data.user?.mustChangePassword ? "/trocar-senha" : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <div className="animate-fade-up w-full rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900">
            Acesse a plataforma
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Entre com sua conta para assistir às aulas.
          </p>
        </div>

        {awaiting2fa ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Código de verificação
              </label>
              <input
                required
                inputMode="numeric"
                maxLength={9}
                autoFocus
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="000000 ou código de recuperação"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-lg font-bold tracking-[0.3em] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Digite o código do seu app autenticador ou um código de recuperação.
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Verificando…" : "Verificar e entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">E-mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Senha</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Entrando…" : "Entrar"}
          </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-gray-400">
          Sua conta é criada pelo administrador da plataforma.{" "}
          <Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">
            Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}