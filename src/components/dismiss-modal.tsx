"use client";

import { useState } from "react";

const DISMISS_REASONS = [
  { value: "", label: "No reason selected" },
  { value: "wrong_focus", label: "Wrong focus area" },
  { value: "too_restrictive", label: "Too restrictive / eligibility issue" },
  { value: "not_eligible", label: "Not eligible" },
  { value: "invitation_only", label: "Invitation only" },
  { value: "other", label: "Other" },
];

interface DismissModalProps {
  grantTitle: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function DismissModal({
  grantTitle,
  onConfirm,
  onCancel,
  isPending,
}: DismissModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Sheet on mobile, modal on desktop */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white px-6 py-6 shadow-xl sm:rounded-xl">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Dismiss grant?
          </h2>
          <button
            onClick={onCancel}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500 line-clamp-2">
          {grantTitle}
        </p>

        <label
          htmlFor="dismiss-reason"
          className="block text-sm font-medium text-gray-700"
        >
          Reason{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <select
          id="dismiss-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
        >
          {DISMISS_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason || undefined)}
            disabled={isPending}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Dismissing…" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}
