import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

// config.matcher must stay a literal array — Next statically analyzes it at
// build time and ignores anything computed. PROTECTED_PATHS derives from it
// instead of duplicating the route list, so the two can never drift apart.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/find-jobs/:path*",
    // The resume routes need this as much as the pages do: `updateSession` is
    // the only thing that refreshes the 15-minute access token, and
    // `createServerClient` only reads it. Without this entry a link clicked
    // more than 15 minutes after the page loaded fails as if signed out.
    "/api/resume/:path*",
  ],
};

const PROTECTED_PATHS = config.matcher.map((pattern) =>
  pattern.replace(/\/:path\*$/, ""),
);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const { accessToken } = await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
