import {
  clerkMiddleware,
  clerkClient,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_EMAILS = new Set([
  "micahbarnes16@gmail.com",
  "miriambarnes98@gmail.com",
  "mattrbarnes98@gmail.com",
  "sarahrosebarnes@gmail.com",
]);

// /access-denied is public so we can show it to authenticated-but-not-allowed users
// without causing a redirect loop back to sign-in.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/access-denied",
]);

export const proxy = clerkMiddleware(async (auth, request: NextRequest) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Ensure the user is signed in; redirects to /sign-in if not.
  await auth.protect();

  const { userId } = await auth();
  if (userId) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail || !ALLOWED_EMAILS.has(primaryEmail)) {
      return NextResponse.redirect(new URL("/access-denied", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
