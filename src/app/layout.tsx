import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserMenu } from "@/components/UserMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aprenda Já - Academy",
  description:
    "Plataforma de treinamentos do Opa: Configuração Geral, Usabilidade, PABX e Fluxo de Comunicação.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-gray-900">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-white/70 backdrop-blur-xl">
          <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="group flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition group-hover:scale-105">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-base font-bold tracking-tight">Aprenda Já</span>
                <span className="text-xs font-medium text-gray-500">Academy</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                Início
              </Link>
              <UserMenu />
            </div>
          </nav>
        </header>

        {children}

        <footer className="mt-auto border-t border-white/10 bg-slate-900/40 py-8 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 text-center">
            <p className="text-sm font-semibold text-white">Aprenda Já · Academy</p>
            <p className="text-xs text-blue-100/70">
              Treinamentos Opa — Configuração Geral, Usabilidade, PABX e Fluxo de Comunicação.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}