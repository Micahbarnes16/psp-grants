import { SignOutButton } from "@clerk/nextjs";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full mx-auto text-center px-6">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <svg
              className="h-7 w-7 text-red-500 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed dark:text-gray-400">
          Your account does not have permission to access this application.
          This tool is reserved for the Barnes family. If you believe this is
          a mistake, please contact the administrator.
        </p>

        <div className="mt-8">
          <SignOutButton redirectUrl="/sign-in">
            <button className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
