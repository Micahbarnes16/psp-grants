"use client";

import { useState } from "react";

interface RecordDecisionModalProps {
  grantTitle: string;
  onConfirm: (params: {
    decision: "accepted" | "rejected";
    awardAmount?: number;
    decisionNotes?: string;
  }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function RecordDecisionModal({
  grantTitle,
  onConfirm,
  onCancel,
  isPending,
}: RecordDecisionModalProps) {
  const [decision, setDecision] = useState<"accepted" | "rejected">("accepted");
  const [amountStr, setAmountStr] = useState("");
  const [notes, setNotes] = useState("");

  function handleConfirm() {
    const awardAmount =
      decision === "accepted" && amountStr
        ? parseFloat(amountStr.replace(/[^0-9.]/g, ""))
        : undefined;
    onConfirm({
      decision,
      awardAmount: awardAmount && !isNaN(awardAmount) ? awardAmount : undefined,
      decisionNotes: notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white px-6 py-6 shadow-xl dark:bg-gray-800 sm:rounded-xl">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Record decision
          </h2>
          <button
            onClick={onCancel}
            className="ml-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">{grantTitle}</p>

        {/* Decision toggle */}
        <div className="mb-4 flex rounded-lg border border-gray-200 p-1 dark:border-gray-600">
          {(["accepted", "rejected"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDecision(d)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                decision === d
                  ? d === "accepted"
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {d === "accepted" ? "Awarded" : "Rejected"}
            </button>
          ))}
        </div>

        {/* Award amount — only for accepted */}
        {decision === "accepted" && (
          <div className="mb-3">
            <label
              htmlFor="award-amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Award amount{" "}
              <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400 dark:text-gray-500">
                $
              </span>
              <input
                id="award-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-7 pr-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label
            htmlFor="decision-notes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Notes{" "}
            <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
          </label>
          <textarea
            id="decision-notes"
            rows={2}
            placeholder="Any context about this decision…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none resize-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 sm:w-auto ${
              decision === "accepted"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isPending
              ? "Saving…"
              : decision === "accepted"
                ? "Mark as Awarded"
                : "Mark as Rejected"}
          </button>
        </div>
      </div>
    </div>
  );
}
