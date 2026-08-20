"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  title: string | null;
  message: string;
  type: "AVISO" | "COMUNICADO" | "NOVIDADE";
  createdAt: string;
  read: boolean;
};

const typeLabel: Record<Notification["type"], string> = {
  AVISO: "Aviso",
  COMUNICADO: "Comunicado",
  NOVIDADE: "Novidade",
};

const typeBadge: Record<Notification["type"], string> = {
  AVISO: "bg-amber-100 text-amber-700",
  COMUNICADO: "bg-blue-100 text-blue-700",
  NOVIDADE: "bg-emerald-100 text-emerald-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (!res.ok) return;
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    const timer = setInterval(load, 15000);
    function onFocus() {
      load();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(t);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markRead(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnread((u) => Math.max(0, u - 1));
      }
    } catch {
      // silencioso
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnread(0);
      }
    } catch {
      // silencioso
    } finally {
      setBusy(false);
    }
  }

  async function clearList() {
    if (busy) return;
    if (!window.confirm("Limpar a lista de notificações?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/clear", { method: "POST" });
      if (res.ok) {
        setItems([]);
        setUnread(0);
      }
    } catch {
      // silencioso
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            if (!o) load();
            return !o;
          });
        }}
        title="Notificações"
        aria-label="Notificações"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"
      >
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
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-blue-900/30 ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Notificações</h3>
              <p className="text-[11px] text-gray-500">
                {unread > 0
                  ? `${unread} não lida(s)`
                  : "Você está em dia ✨"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={busy}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                type="button"
                onClick={clearList}
                disabled={busy}
                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpar lista
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                Nenhuma notificação por aqui.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start justify-between gap-3 px-4 py-3 ${
                      n.read ? "bg-white" : "bg-blue-50/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${typeBadge[n.type]}`}
                        >
                          {typeLabel[n.type]}
                        </span>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" title="Não lida" />
                        )}
                        {n.title && (
                          <span className="truncate text-sm font-bold text-gray-900">
                            {n.title}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-3 text-xs text-gray-600">{n.message}</p>
                      <p className="mt-1 text-[10px] font-medium text-gray-400">
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        disabled={busy}
                        className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}