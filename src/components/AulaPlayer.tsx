"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SPEED_KEY = "aulas-playback-speed";

export function AulaPlayer({
  aulaId,
  videoUrl,
  statusLabel,
  initialCompleted,
  initialFavorite,
  initialPosition = 0,
  admin,
}: {
  aulaId: string;
  videoUrl: string;
  statusLabel: string;
  initialCompleted: boolean;
  initialFavorite: boolean;
  initialPosition?: number;
  admin: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [saving, setSaving] = useState(false);
  const [speed, setSpeed] = useState(1);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const positionRef = useRef(0);
  const lastSavedRef = useRef(0);
  const completedRef = useRef(initialCompleted);
  const restoredRef = useRef(false);

  completedRef.current = completed;

  useEffect(() => {
    let stored = 1;
    try {
      stored = Number(window.localStorage.getItem(SPEED_KEY));
    } catch {}
    if (!SPEEDS.includes(stored)) return;
    const id = requestAnimationFrame(() => setSpeed(stored));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  function changeSpeed(value: number) {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
    try {
      window.localStorage.setItem(SPEED_KEY, String(value));
    } catch {}
  }

  async function update(body: Record<string, unknown>, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setSaving(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!opts.silent && !res.ok && res.status !== 401) {
        window.alert("Não foi possível salvar o progresso.");
      }
    } catch {
      if (!opts.silent) window.alert("Falha de rede ao salvar o progresso.");
    } finally {
      if (!opts.silent) {
        setSaving(false);
        router.refresh();
      }
    }
  }

  const savePosition = useCallback(
    (position: number) => {
      if (position <= 0) return;
      positionRef.current = position;
      if (Math.abs(position - lastSavedRef.current) < 5) return;
      lastSavedRef.current = position;
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aulaId, positionSec: Math.floor(position) }),
        keepalive: true,
      }).catch(() => {});
    },
    [aulaId],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && video.currentTime > 0) {
        savePosition(video.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [savePosition]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        savePosition(videoRef.current?.currentTime ?? 0);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [savePosition]);

  useEffect(() => {
    return () => {
      const position = positionRef.current;
      if (position <= 0) return;
      const payload = JSON.stringify({ aulaId, positionSec: Math.floor(position) });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/progress",
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [aulaId]);

  function onLoadedMetadata() {
    const video = videoRef.current;
    if (!video || restoredRef.current) return;
    if (
      initialPosition > 5 &&
      (video.duration === Infinity || initialPosition < video.duration - 5)
    ) {
      video.currentTime = initialPosition;
    }
    restoredRef.current = true;
  }

  function onTimeUpdate() {
    const video = videoRef.current;
    if (video) positionRef.current = video.currentTime;
    if (
      video &&
      video.duration > 0 &&
      !completedRef.current &&
      video.currentTime / video.duration >= 0.95
    ) {
      setCompleted(true);
      update({ aulaId, completed: true });
    }
  }

  function onPause() {
    savePosition(videoRef.current?.currentTime ?? 0);
  }

  function onEnded() {
    const video = videoRef.current;
    if (!completedRef.current) {
      setCompleted(true);
      update({ aulaId, completed: true });
    }
    savePosition(video?.currentTime ?? 0);
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
          ref={videoRef}
          className="aspect-video w-full"
          controls
          playsInline
          preload="metadata"
          src={videoUrl}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPause={onPause}
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
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              : "bg-white text-gray-700 shadow hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
              ? "bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:hover:bg-rose-900/60"
              : "bg-white text-gray-700 shadow hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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

        <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500 dark:bg-slate-800 dark:text-slate-400">
          {statusLabel}
        </span>

        <div
          className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-1 dark:bg-slate-800"
          role="group"
          aria-label="Velocidade de reprodução"
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeSpeed(s)}
              aria-pressed={speed === s}
              className={`rounded-lg px-2 py-1 text-xs font-bold transition active:scale-95 ${
                speed === s
                  ? "bg-white text-blue-700 shadow dark:bg-slate-900 dark:text-blue-300"
                  : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}