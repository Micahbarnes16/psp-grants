"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function useAuthFromClerk() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  return {
    isLoading: !isLoaded,
    isAuthenticated: isLoaded && !!isSignedIn,
    fetchAccessToken: async ({
      forceRefreshToken,
    }: {
      forceRefreshToken: boolean;
    }) => {
      return await getToken({ template: "convex", skipCache: forceRefreshToken });
    },
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromClerk}>
        {children}
      </ConvexProviderWithAuth>
    </ClerkProvider>
  );
}
