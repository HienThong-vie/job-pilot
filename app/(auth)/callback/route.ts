import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";
import { trackServerSignIn } from "@/lib/analytics";

const CODE_VERIFIER_COOKIE = "insforge_code_verifier";
const PROVIDER_COOKIE = "insforge_oauth_provider";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const codeVerifier = request.cookies.get(CODE_VERIFIER_COOKIE)?.value;
  const provider = request.cookies.get(PROVIDER_COOKIE)?.value;

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  try {
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    const auth = createAuthActions({
      requestCookies: request.cookies,
      responseCookies: response.cookies,
    });

    const { data, error } = await auth.exchangeOAuthCode(code, codeVerifier);

    if (error) {
      throw new Error(error.message);
    }

    if (data?.user) {
      await trackServerSignIn(data.user, provider);
    }

    response.cookies.delete(CODE_VERIFIER_COOKIE);
    response.cookies.delete(PROVIDER_COOKIE);
    return response;
  } catch (error) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }
}
