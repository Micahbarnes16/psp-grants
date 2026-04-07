"use client";

import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RENEWAL_WARN_DAYS = 90;

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

function daysUntil(ts: number) {
  return Math.ceil((ts - Date.now()) / MS_PER_DAY);
}

type ActiveGrant = {
  _id: string;
  title: string;
  funderName: string;
  awardAmount?: number;
  grantPeriodStart?: number;
  grantPeriodEnd?: number;
  reapplyReminderDate?: number;
};

function ActiveGrantCard({ grant }: { grant: ActiveGrant }) {
  const now = Date.now();
  const daysLeft =
    grant.grantPeriodEnd !== undefined
      ? Math.ceil((grant.grantPeriodEnd - now) / MS_PER_DAY)
      : null;
  const renewalDays =
    grant.reapplyReminderDate !== undefined
      ? daysUntil(grant.reapplyReminderDate)
      : null;
  const showRenewalBanner =
    renewalDays !== null && renewalDays <= RENEWAL_WARN_DAYS;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Renewal reminder banner */}
      {showRenewalBanner && (
        <div
          className={`-mx-4 -mt-4 mb-4 rounded-t-xl px-4 py-2.5 sm:-mx-5 sm:-mt-5 sm:px-5 ${
            renewalDays! <= 30
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <p className="text-xs font-semibold">
            {renewalDays! <= 0
              ? "Renewal deadline has passed"
              : `Renewal reminder in ${renewalDays} day${renewalDays === 1 ? "" : "s"}`}{" "}
            — reapply by {formatDate(grant.reapplyReminderDate!)}
          </p>
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {grant.funderName}
        </span>
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
          Active
        </span>
      </div>

      <h3 className="mt-2 text-base font-semibold text-gray-900 leading-snug">
        {grant.title}
      </h3>

      {/* Metadata row */}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        {grant.awardAmount !== undefined && (
          <span className="text-sm font-medium text-gray-700">
            {formatCurrency(grant.awardAmount)} awarded
          </span>
        )}

        {grant.grantPeriodStart !== undefined &&
          grant.grantPeriodEnd !== undefined && (
            <span className="text-sm text-gray-500">
              {formatDate(grant.grantPeriodStart)} –{" "}
              {formatDate(grant.grantPeriodEnd)}
            </span>
          )}
      </div>

      {/* Days remaining */}
      {daysLeft !== null && (
        <p
          className={`mt-1 text-sm ${
            daysLeft < 0
              ? "text-gray-400"
              : daysLeft <= 30
                ? "font-medium text-red-600"
                : "text-gray-500"
          }`}
        >
          {daysLeft < 0
            ? "Grant period ended"
            : daysLeft === 0
              ? "Grant period ends today"
              : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining in grant period`}
        </p>
      )}

      <div className="mt-4">
        <Link
          href={`/inbox/${grant._id}`}
          className="text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
        >
          View details →
        </Link>
      </div>
    </article>
  );
}

export default function ActiveGrantsPage() {
  const { isAuthenticated } = useConvexAuth();
  const grants = useQuery(
    api.grants.listActive,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Active Grants</h2>
        <p className="mt-1 text-sm text-gray-500">
          Grants you&apos;ve been awarded and are currently managing.
        </p>
      </div>

      {grants === undefined && (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-36 animate-pulse rounded-xl bg-gray-100" />
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
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No active grants yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Grants you&apos;ve been awarded will appear here.
          </p>
        </div>
      )}

      {grants !== undefined && grants.length > 0 && (
        <div className="space-y-3">
          {grants.map((grant) => (
            <ActiveGrantCard key={grant._id} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}
