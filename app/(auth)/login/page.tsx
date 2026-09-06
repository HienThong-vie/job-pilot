import { Logo } from "@/components/layout/Logo";
import { OAuthButton } from "@/components/auth/OAuthButton";

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo href="/" />
          <h1 className="mt-4 text-lg font-semibold text-text-primary">
            Welcome to JobPilot
          </h1>
          <p className="text-sm text-text-secondary">
            Sign in to find jobs, research companies, and track your search.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-error/10 px-3 py-2 text-center text-sm text-error">
            Something went wrong signing you in. Please try again.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <OAuthButton provider="google" label="Continue with Google" />
          <OAuthButton provider="github" label="Continue with GitHub" />
        </div>
      </div>
    </main>
  );
}
