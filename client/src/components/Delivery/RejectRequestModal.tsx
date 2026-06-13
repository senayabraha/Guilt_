import { useState } from "react";

interface RejectRequestModalProps {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}

export default function RejectRequestModal({
  onClose,
  onConfirm,
  submitting,
}: RejectRequestModalProps) {
  const [reason, setReason] = useState("");

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-fade-in">
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            Reject Delivery Request
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Optionally explain why you can't take this delivery. Admins will be
            notified to find another driver.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason (optional)…"
            autoFocus
            className="w-full px-4 py-3 text-sm rounded-xl border border-app-border focus:border-red-400 outline-none resize-none mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason.trim())}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Rejecting…" : "Confirm Reject"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
