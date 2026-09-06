import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

// config.matcher must stay a literal array — Next statically analyzes it at
// build time and ignores anything computed. PROTECTED_PATHS derives from it
// instead of duplicating the route list, so the two can never drift apart.
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/find-jobs/:path*"],
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
