'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export function DeleteAccount() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/user', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete account.' }));
        setError(data.error ?? 'Failed to delete account.');
        setIsDeleting(false);
        return;
      }
      await signOut({ callbackUrl: '/' });
    } catch {
      setError('An unexpected error occurred.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-6 backdrop-blur-xl">
      <h3 className="mb-1 text-[14px] font-medium text-red-400">Danger Zone</h3>
      <p className="mb-4 text-[12px] text-[#fff6]">
        Permanently delete your account and all associated data including instances, subscriptions,
        and integrations. This action cannot be undone.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-[12px] font-medium text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/10"
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-[12px] text-[#fff9]">
            Type <span className="font-mono font-bold text-white">DELETE</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full max-w-xs rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-3 py-2 text-[12px] text-white placeholder-[#fff3] outline-none focus:border-red-500/40"
            autoFocus
          />
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText('');
                setError(null);
              }}
              className="rounded-lg border border-[#ffffff14] px-4 py-2 text-[12px] text-[#fff9] transition-all hover:border-[#ffffff26]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
