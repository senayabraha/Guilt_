import { useState } from "react";
import { AlertTriangleIcon, LifeBuoyIcon } from "lucide-react";

const ISSUE_TYPES = [
  "Customer unavailable",
  "Wrong or invalid address",
  "Store cannot release order",
  "Vehicle or driver issue",
  "App or location issue",
  "Other",
] as const;

interface ReportIssueModalProps {
  /** True when the order is Picked Up or Out for Delivery — enables the
   *  "Report Failed Delivery" action in addition to "Cancel". */
  canReportFailed: boolean;
  cancelSubmitting: boolean;
  failedSubmitting: boolean;
  onClose: () => void;
  onCancel: (issueType: string, note: string) => void;
  onReportFailed: (issueType: string, note: string) => void;
}

export default function ReportIssueModal({
  canReportFailed,
  cancelSubmitting,
  failedSubmitting,
  onClose,
  onCancel,
  onReportFailed,
}: ReportIssueModalProps) {
  const [issueType, setIssueType] = useState("");
  const [note, setNote] = useState("");

  const hasIssue = issueType.trim() !== "";
  const submitting = cancelSubmitting || failedSubmitting;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-fade-in max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangleIcon className="size-5 text-red-500 shrink-0" />
            <h3 className="text-lg font-semibold text-zinc-900">Report Issue</h3>
          </div>

          {/* Issue type */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            What's the issue? *
          </p>
          <div className="space-y-1.5 mb-4">
            {ISSUE_TYPES.map((t) => (
              <label
                key={t}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  issueType === t
                    ? "border-app-green bg-app-green/5"
                    : "border-app-border hover:bg-zinc-50"
                }`}
              >
                <input
                  type="radio"
                  name="issue-type"
                  value={t}
                  checked={issueType === t}
                  onChange={() => setIssueType(t)}
                  className="accent-app-green shrink-0"
                />
                <span className="text-sm text-zinc-800">{t}</span>
              </label>
            ))}
          </div>

          {/* Note */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Additional details (optional)
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Any extra context for the operations team…"
            className="w-full px-4 py-3 text-sm rounded-xl border border-app-border focus:border-app-green outline-none resize-none mb-4"
          />

          {/* Actions */}
          <div className="space-y-2">
            {canReportFailed && (
              <button
                type="button"
                onClick={() => onReportFailed(issueType, note.trim())}
                disabled={!hasIssue || submitting}
                className="w-full py-3 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {failedSubmitting ? "Reporting…" : "Report Failed Delivery"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onCancel(issueType, note.trim())}
              disabled={!hasIssue || submitting}
              className="w-full py-3 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
            >
              {cancelSubmitting ? "Cancelling…" : "Cancel Delivery"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </div>

          {/* Support stub */}
          <div className="mt-4 pt-3 border-t border-app-border flex items-start gap-2 text-xs text-zinc-400">
            <LifeBuoyIcon className="size-3.5 shrink-0 mt-0.5" />
            <span>
              For urgent support, contact the operations team via the admin
              portal. Your issue type and notes are visible to admins.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
