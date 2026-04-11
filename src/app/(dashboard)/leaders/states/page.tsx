"use client";

import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

const ALL_STATES = [
  { code: "al", name: "Alabama" }, { code: "ak", name: "Alaska" },
  { code: "az", name: "Arizona" }, { code: "ar", name: "Arkansas" },
  { code: "ca", name: "California" }, { code: "co", name: "Colorado" },
  { code: "ct", name: "Connecticut" }, { code: "de", name: "Delaware" },
  { code: "fl", name: "Florida" }, { code: "ga", name: "Georgia" },
  { code: "hi", name: "Hawaii" }, { code: "id", name: "Idaho" },
  { code: "il", name: "Illinois" }, { code: "in", name: "Indiana" },
  { code: "ia", name: "Iowa" }, { code: "ks", name: "Kansas" },
  { code: "ky", name: "Kentucky" }, { code: "la", name: "Louisiana" },
  { code: "me", name: "Maine" }, { code: "md", name: "Maryland" },
  { code: "ma", name: "Massachusetts" }, { code: "mi", name: "Michigan" },
  { code: "mn", name: "Minnesota" }, { code: "ms", name: "Mississippi" },
  { code: "mo", name: "Missouri" }, { code: "mt", name: "Montana" },
  { code: "ne", name: "Nebraska" }, { code: "nv", name: "Nevada" },
  { code: "nh", name: "New Hampshire" }, { code: "nj", name: "New Jersey" },
  { code: "nm", name: "New Mexico" }, { code: "ny", name: "New York" },
  { code: "nc", name: "North Carolina" }, { code: "nd", name: "North Dakota" },
  { code: "oh", name: "Ohio" }, { code: "ok", name: "Oklahoma" },
  { code: "or", name: "Oregon" }, { code: "pa", name: "Pennsylvania" },
  { code: "ri", name: "Rhode Island" }, { code: "sc", name: "South Carolina" },
  { code: "sd", name: "South Dakota" }, { code: "tn", name: "Tennessee" },
  { code: "tx", name: "Texas" }, { code: "ut", name: "Utah" },
  { code: "vt", name: "Vermont" }, { code: "va", name: "Virginia" },
  { code: "wa", name: "Washington" }, { code: "wv", name: "West Virginia" },
  { code: "wi", name: "Wisconsin" }, { code: "wy", name: "Wyoming" },
];

export default function LeadersStatesPage() {
  const { isAuthenticated } = useConvexAuth();
  const stats = useQuery(
    api.leaders.getStatesStats,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          States
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Browse legislators by state. Click a state to view its leaders.
        </p>
      </div>

      {/* Loading */}
      {stats === undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      )}

      {stats !== undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {ALL_STATES.map((state) => {
            const count = stats.leadersByState[state.code] ?? 0;
            const pending = stats.changesByState[state.code] ?? 0;
            const hasSynced = count > 0;

            return (
              <Link
                key={state.code}
                href={`/leaders/states/${state.code}`}
                className={`group relative flex flex-col rounded-xl border p-4 transition-colors ${
                  hasSynced
                    ? "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                    : "border-dashed border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {state.code}
                  </span>
                  {pending > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {pending}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-800 leading-tight dark:text-gray-200">
                  {state.name}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {hasSynced ? `${count} leaders` : "Not synced"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
