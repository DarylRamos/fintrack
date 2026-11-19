import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

// A new client for every request, as @supabase/ssr requires. For Server Components, Server Actions
// and Route Handlers. The proxy has its own client (proxy-session.ts).
export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. The proxy refreshes the session for them, so
          // this is safe to ignore. Server Actions and Route Handlers can set cookies.
        }
      },
    },
  });
}
