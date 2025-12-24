import "server-only"; // Fails build if imported in client code

import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client with service role key
 * This bypasses RLS and should only be used server-side for admin operations
 *
 * Used for:
 * - Fetching owner API keys for owner-funded execution
 * - Rate limit logging
 */
export function createServiceRoleClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
