"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils/date";
import { Loader2, Send } from "lucide-react";

interface Note {
  id: string;
  note: string;
  created_at: string;
  profiles: { name: string | null };
}

interface InternalNotesSectionProps {
  orderId: string;
  initialNotes: Note[];
}

export function InternalNotesSection({ orderId, initialNotes }: InternalNotesSectionProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: newNote.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add note");
      }

      const data = await response.json();
      setNotes([data.note, ...notes]);
      setNewNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      {/* Add note form */}
      <form onSubmit={handleAddNote} className="mb-6">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an internal note..."
            disabled={isSubmitting}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newNote.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          No internal notes yet
        </p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{note.note}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {note.profiles.name || "Admin"} · {formatDateTime(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
