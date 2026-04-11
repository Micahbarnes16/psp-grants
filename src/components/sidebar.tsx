"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

function LeadersTotalBadge() {
  const { isAuthenticated } = useConvexAuth();
  const count = useQuery(
    api.leaders.getLeaderCount,
    isAuthenticated ? {} : "skip"
  );
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      {count > 9999 ? "9999+" : count}
    </span>
  );
}

function LeadersPendingBadge() {
  const { isAuthenticated } = useConvexAuth();
  const count = useQuery(
    api.leaders.getPendingChangesCount,
    isAuthenticated ? {} : "skip"
  );
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function InboxBadge() {
  const { isAuthenticated } = useConvexAuth();
  const count = useQuery(api.grants.getInboxCount, isAuthenticated ? {} : "skip");
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white dark:bg-white dark:text-gray-900">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function WatchlistBadge() {
  const { isAuthenticated } = useConvexAuth();
  const count = useQuery(api.grants.getWatchlistCount, isAuthenticated ? {} : "skip");
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-gray-400 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white dark:bg-gray-600 dark:text-gray-200">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const navItems = [
  {
    label: "Inbox",
    href: "/inbox",
    badge: <InboxBadge />,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
      </svg>
    ),
  },
  {
    label: "Watchlist",
    href: "/watchlist",
    badge: <WatchlistBadge />,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    label: "Active Grants",
    href: "/active-grants",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    label: "Renewals",
    href: "/renewals",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
      </svg>
    ),
  },
  {
    label: "History",
    href: "/history",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

const leaderItems = [
  {
    label: "Dashboard",
    href: "/leaders",
    badge: <LeadersTotalBadge />,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    label: "Pending Changes",
    href: "/leaders/changes",
    badge: <LeadersPendingBadge />,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    label: "States",
    href: "/leaders/states",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
    ),
  },
];

const bottomItems = [
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <>
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          PSP Grants
        </span>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 md:hidden"
          aria-label="Close navigation"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          {/* Grants section */}
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/inbox" && pathname.startsWith("/inbox/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    }`}
                  >
                    <span className={isActive ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                      {item.icon}
                    </span>
                    {item.label}
                    {"badge" in item && item.badge}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Leaders section */}
          <div>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Leaders
            </p>
            <ul className="space-y-0.5">
              {leaderItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                      }`}
                    >
                      <span className={isActive ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                        {item.icon}
                      </span>
                      {item.label}
                      {"badge" in item && item.badge}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <ul className="space-y-0.5">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  }`}
                >
                  <span className={isActive ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );

  return (
    <>
      {/* Backdrop — mobile only, shown when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white dark:bg-gray-900",
          "transition-transform duration-200 ease-in-out",
          "md:relative md:z-auto md:w-56 md:translate-x-0 md:border-r md:border-gray-200 md:dark:border-gray-700",
          isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        ].join(" ")}
      >
        {navContent}
      </aside>
    </>
  );
}
