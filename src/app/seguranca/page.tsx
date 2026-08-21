"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";

type Me = {
  id: string;
  name: string;
  role: "MASTER" | "ADMIN" | "ALUNO";
};

export default function SegurancaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [totpEnabled, setTotpEnabled] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setMe(d.user);
        setTotpEnabled(Boolean(d.user.totpEnabled));
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function startSetup() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao iniciar configuração.");
      setSecret(data.secret);
      setQrDataUrl(await QRCode.toDataURL(data.otpauthUri, { width: 220 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar configuração.");
    } finally {
      setSending(false);
    }
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao ativar 2FA.");
      setTotpEnabled(true);
      setRecoveryCodes(data.recoveryCodes ?? []);
      setQrDataUrl("");
      setSecret("");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar 2FA.");
    } finally {
      setSending(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao desativar 2FA.");
      setTotpEnabled(false);
      setDisablePassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desativar 2FA.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <div className="h-64 animate-pulse rounded-3xl bg-white/40" />
      </main>
    );
  }

  if (!me || me.role === "ALUNO") {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <div className="rounded-3xl bg-white p-8 text-center shadow-2xl shadow-blue-900/20">
          <h1 className="text-xl font-extrabold text-gray-900">Acesso restrito</h1>
          <p className="mt-2 text-sm text-gray-500">
            A verificação em duas etapas está disponível apenas para perfis de gestão.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <div className="animate-fade-up rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/20 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Segurança</h1>
            <p className="text-xs font-medium text-gray-500">Verificação em duas etapas (2FA)</p>
          </div>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-[11px] font-bold ${
              totpEnabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {totpEnabled ? "Ativo" : "Inativo"}
          </span>
        </div>

        {!totpEnabled && (
          <>
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Perfis de gestão devem ativar a verificação em duas etapas para acessar o painel.
              Use um app autenticador (Google Authenticator, Microsoft Authenticator, Authy…).
              Enquanto isso, você pode continuar navegando no site.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-xs font-semibold text-gray-500 underline-offset-2 transition hover:text-blue-700 hover:underline"
            >
              Voltar ao início
            </Link>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        {!totpEnabled && !qrDataUrl && (
          <button
            type="button"
            onClick={startSetup}
            disabled={sending}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Preparando…" : "Configurar 2FA"}
          </button>
        )}

        {!totpEnabled && qrDataUrl && (
          <form onSubmit={confirmEnable} className="mt-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Code do autenticador" className="rounded-2xl border border-gray-100" />
              <p className="text-center text-xs text-gray-500">
                Escaneie com seu app autenticador ou digite a chave manualmente:
              </p>
              <code className="break-all rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold tracking-wide text-gray-700">
                {secret}
              </code>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Código do app (6 dígitos)
              </label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <button
              type="submit"
              disabled={sending || code.length !== 6}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Verificando…" : "Ativar 2FA"}
            </button>
          </form>
        )}

        {recoveryCodes.length > 0 && (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4">
            <h2 className="text-sm font-bold text-emerald-800">Códigos de recuperação</h2>
            <p className="mt-1 text-xs text-emerald-700">
              Guarde estes códigos em local seguro. Cada um pode ser usado uma única vez para
              entrar caso você perca acesso ao app autenticador. Eles não serão exibidos novamente.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {recoveryCodes.map((c) => (
                <code key={c} className="rounded-lg bg-white px-2 py-1.5 text-center text-xs font-bold text-gray-800">
                  {c}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n")).catch(() => {})}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95"
            >
              Copiar códigos
            </button>
          </div>
        )}

        {totpEnabled && (
          <form onSubmit={handleDisable} className="mt-6 space-y-4">
            <p className="text-sm text-gray-600">
              A verificação em duas etapas está <strong>ativa</strong>. Você precisará de um código
              do seu app autenticador (ou um código de recuperação) a cada login.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Para desativar, confirme sua senha
              </label>
              <input
                type="password"
                required
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !disablePassword}
              className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Desativando…" : "Desativar 2FA"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
