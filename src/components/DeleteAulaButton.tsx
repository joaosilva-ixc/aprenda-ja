"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
    />
  </svg>
);

export function DeleteAulaButton({
  aulaId,
  size = "icon",
}: {
  aulaId: string;
  size?: "icon" | "full";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (
      !window.confirm("Excluir esta aula? A gravação no Google Drive será mantida.")
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/aulas/${aulaId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Erro ao excluir a aula.");
        return;
      }
      router.refresh();
      router.push("/");
    } catch {
      window.alert("Falha de rede ao excluir a aula.");
    } finally {
      setBusy(false);
    }
  }

  if (size === "full") {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <TrashIcon className="h-4 w-4" />
        {busy ? "Excluindo…" : "Excluir"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      title="Excluir aula"
      aria-label="Excluir aula"
      className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <TrashIcon className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
    </button>
  );
}