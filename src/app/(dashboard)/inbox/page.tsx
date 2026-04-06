"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { GrantCard } from "@/components/grant-card";

export default function InboxPage() {
  const grants = useQuery(api.grants.listInbox);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Inbox</h2>
        <p className="mt-1 text-sm text-gray-500">
          Newly discovered grants awaiting your review.
        </p>
      </div>

      {/* Loading */}
      {grants === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-40 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
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
                d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Inbox is clear
          </p>
          <p className="mt-1 text-sm text-gray-400">
            No new grants to review. Check back soon — scrapers run weekly.
          </p>
        </div>
      )}

      {/* Grant cards */}
      {grants !== undefined && grants.length > 0 && (
        <div className="space-y-3">
          {grants.map((grant) => (
            <GrantCard key={grant._id} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}
