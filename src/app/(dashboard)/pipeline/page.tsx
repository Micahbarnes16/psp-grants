"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RecordDecisionModal } from "@/components/record-decision-modal";

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

type PipelineGrant = {
  _id: Id<"grants">;
  title: string;
  funderName: string;
  status: string;
  amountMin?: number;
  amountMax?: number;
  submittedAt?: number;
  _creationTime: number;
};

function PipelineCard({ grant }: { grant: PipelineGrant }) {
  const markSubmitted = useMutation(api.grants.markSubmitted);
  const recordDecision = useMutation(api.grants.recordDecision);

  const [submitPending, setSubmitPending] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);

  const isApproved = grant.status === "approved";
  const isSubmitted = grant.status === "submitted";

  const amountStr = (() => {
    if (grant.amountMin && grant.amountMax && grant.amountMin !== grant.amountMax) {
      return `${formatCurrency(grant.amountMin)} – ${formatCurrency(grant.amountMax)}`;
    }
    if (grant.amountMax) return `Up to ${formatCurrency(grant.amountMax)}`;
    if (grant.amountMin) return formatCurrency(grant.amountMin);
    return null;
  })();

  async function handleMarkSubmitted() {
    setSubmitPending(true);
    try {
      await markSubmitted({ grantId: grant._id });
    } finally {
      setSubmitPending(false);
    }
  }

  async function handleDecision(params: {
    decision: "accepted" | "rejected";
    awardAmount?: number;
    decisionNotes?: string;
  }) {
    setDecisionPending(true);
    try {
      await recordDecision({ grantId: grant._id, ...params });
      setShowDecisionModal(false);
    } finally {
      setDecisionPending(false);
    }
  }

  return (
    <>
      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {grant.funderName}
          </span>
          {isApproved && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Approved to Apply
            </span>
          )}
          {isSubmitted && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Submitted — Awaiting Decision
            </span>
          )}
        </div>

        <h3 className="mt-2 text-base font-semibold text-gray-900 leading-snug dark:text-gray-100">
          {grant.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          {amountStr && (
            <span className="text-sm text-gray-600 dark:text-gray-400">{amountStr} requested</span>
          )}
          {isApproved && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Approved {formatDate(grant._creationTime)}
            </span>
          )}
          {isSubmitted && grant.submittedAt && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Submitted {formatDate(grant.submittedAt)}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isApproved && (
            <button
              onClick={handleMarkSubmitted}
              disabled={submitPending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {submitPending ? "Saving…" : "Mark as Submitted"}
            </button>
          )}
          {isSubmitted && (
            <button
              onClick={() => setShowDecisionModal(true)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Record Decision
            </button>
          )}
        </div>
      </article>

      {showDecisionModal && (
        <RecordDecisionModal
          grantTitle={grant.title}
          onConfirm={handleDecision}
          onCancel={() => setShowDecisionModal(false)}
          isPending={decisionPending}
        />
      )}
    </>
  );
}

export default function PipelinePage() {
  const { isAuthenticated } = useConvexAuth();
  const grants = useQuery(
    api.grants.listPipeline,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pipeline</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Grants approved to apply for and submitted applications awaiting decisions.
        </p>
      </div>

      {grants === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {grants !== undefined && grants.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <svg
              className="h-6 w-6 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No grants in the pipeline yet
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Grants you approve to apply for will appear here.
          </p>
        </div>
      )}

      {grants !== undefined && grants.length > 0 && (
        <div className="space-y-3">
          {grants.map((grant) => (
            <PipelineCard key={grant._id} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}
