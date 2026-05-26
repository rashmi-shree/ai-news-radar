"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export default function DeleteCollectionButton({ collectionId }: { collectionId: string }) {
  const router   = useRouter();
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/collections/${collectionId}`, { method: "DELETE" });
    if (res.ok) router.push("/collections");
    else setDeleting(false);
  }

  if (confirm) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Delete collection?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40"
        >
          {deleting ? <Loader2 size={11} className="animate-spin" /> : null}
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-zinc-600 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 rounded border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-600 transition-colors hover:border-red-500/30 hover:text-red-400"
    >
      <Trash2 size={11} />
      Delete
    </button>
  );
}
