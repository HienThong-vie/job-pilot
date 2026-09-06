import { cookies } from "next/headers";
import type { InsForgeClient } from "@insforge/sdk";
import { createServerClient } from "@insforge/sdk/ssr";

export const createInsforgeServer = async (): Promise<InsForgeClient> => {
  return createServerClient({
    cookies: await cookies(),
  });
};

type PrimaryCta = { href: string; label: string };

export async function getPrimaryCta(loggedOutLabel: string): Promise<PrimaryCta> {
  const insforge = await createInsforgeServer();
  const { data } = await insforge.auth.getCurrentUser();

  return data.user
    ? { href: "/dashboard", label: "Go to Dashboard" }
    : { href: "/login", label: loggedOutLabel };
}
