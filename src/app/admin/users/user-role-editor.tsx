"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";

interface UserRoleEditorProps {
  userId: string;
  currentRole: string;
}

export function UserRoleEditor({ userId, currentRole }: UserRoleEditorProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [newRole, setNewRole] = useState(currentRole);

  async function handleUpdate() {
    if (newRole === currentRole) {
      setShowEditor(false);
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      setSuccess(true);
      router.refresh();
      setShowEditor(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUpdating(false);
    }
  }

  if (showEditor) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          disabled={isUpdating}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          <option value="customer">Customer</option>
          <option value="farm">Farm</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        </button>
        <button
          onClick={() => {
            setShowEditor(false);
            setNewRole(currentRole);
            setError(null);
          }}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        {error && (
          <span className="text-xs text-red-600" title={error}>
            <AlertCircle className="h-3 w-3" />
          </span>
        )}
        {success && (
          <span className="text-xs text-green-600">
            <CheckCircle className="h-3 w-3" />
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowEditor(true)}
      className="text-slate-400 hover:text-slate-600 transition-colors"
      title="Click to edit role"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
