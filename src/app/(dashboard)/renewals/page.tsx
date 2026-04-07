"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type RenewalGrant = {
  _id: Id<"grants">;
  title: string;
  funderName: string;
  awardAmount?: number;
  reapplyReminderDate?: number;
  grantPeriodEnd?: number;
};

function RenewalCard({ grant }: { grant: RenewalGrant }) {
  const startRenewal = useMutation(api.grants.startRenewal);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const daysUntil = grant.reapplyReminderDate
    ? Math.ceil((grant.reapplyReminderDate - Date.now()) / MS_PER_DAY)
    : null;

  const urgencyClass =
    daysUntil === null
      ? "text-gray-500"
      : daysUntil <= 0
        ? "font-semibold text-red-600"
        : daysUntil <= 30
          ? "font-semibold text-red-600"
          : daysUntil <= 60
            ? "font-semibold text-amber-600"
            : "text-gray-700";

  async function handleStartRenewal() {
    setPending(true);
    try {
      await startRenewal({ grantId: grant._id });
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {grant.funderName}
        </span>
      </div>

      <h3 className="mt-2 text-base font-semibold text-gray-900 leading-snug">
        {grant.title}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        {grant.awardAmount !== undefined && (
          <span className="text-sm text-gray-600">
            {formatCurrency(grant.awardAmount)} awarded
          </span>
        )}
        {grant.grantPeriodEnd !== undefined && (
          <span className="text-sm text-gray-500">
            Period ends {formatDate(grant.grantPeriodEnd)}
          </span>
        )}
      </div>

      {grant.reapplyReminderDate !== undefined && (
        <p className={`mt-2 text-sm ${urgencyClass}`}>
          {daysUntil !== null && daysUntil <= 0
            ? `Reapply deadline passed — was ${formatDate(grant.reapplyReminderDate)}`
            : daysUntil === 1
              ? `Reapply by ${formatDate(grant.reapplyReminderDate)} — tomorrow`
              : `Reapply by ${formatDate(grant.reapplyReminderDate)}${
                  daysUntil !== null ? ` — ${daysUntil} days` : ""
                }`}
        </p>
      )}

      <div className="mt-4">
        {done ? (
          <p className="text-sm font-medium text-green-700">
            Renewal draft created — it&apos;s saved in your applications.
          </p>
        ) : (
          <button
            onClick={handleStartRenewal}
            disabled={pending}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Start Renewal"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function RenewalsPage() {
  const { isAuthenticated } = useConvexAuth();
  const grants = useQuery(
    api.grants.listRenewals,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Renewals</h2>
        <p className="mt-1 text-sm text-gray-500">
          Active grants with upcoming reapplication deadlines, sorted by urgency.
        </p>
      </div>

      {grants === undefined && (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {grants !== undefined && grants.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No renewals due</p>
          <p className="mt-1 text-sm text-gray-400">
            When you have active grants approaching renewal, they will appear here.
          </p>
        </div>
      )}

      {grants !== undefined && grants.length > 0 && (
        <div className="space-y-3">
          {grants.map((grant) => (
            <RenewalCard key={grant._id} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}
