"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";

const CODE_VERIFIER_COOKIE = "insforge_code_verifier";
const PROVIDER_COOKIE = "insforge_oauth_provider";
const OAUTH_COOKIE_MAX_AGE = 600;

export async function signInWithOAuthAction(
  provider: "google" | "github",
): Promise<void> {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });

  let oauthUrl: string;
  let codeVerifier: string | undefined;

  try {
    const { data, error } = await auth.signInWithOAuth(provider, {
      redirectTo: `${origin}/callback`,
      skipBrowserRedirect: true,
    });

    if (error || !data.url) {
      throw new Error(error?.message ?? "No OAuth URL returned");
    }

    oauthUrl = data.url;
    codeVerifier = data.codeVerifier;
  } catch (error) {
    console.error("[actions/auth]", error);
    redirect("/login?error=oauth_failed");
  }

  const oauthCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  } as const;

  // codeVerifier (PKCE) must round-trip to the callback route handler, which
  // has no other way to recover it — held in a short-lived httpOnly cookie.
  if (codeVerifier) {
    cookieStore.set(CODE_VERIFIER_COOKIE, codeVerifier, oauthCookieOptions);
  }

  // The callback needs to know which provider was used to attribute the
  // `signed_in` analytics event — it isn't recoverable from the exchange.
  cookieStore.set(PROVIDER_COOKIE, provider, oauthCookieOptions);

  redirect(oauthUrl);
}
