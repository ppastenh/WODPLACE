import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Fase 1 of the mock-auth -> real Supabase Auth migration (see the plan in
 * this feature's own design discussion). Same Supabase project box-admin/
 * super-admin already use for admin accounts (box_admin/super_admin) — this
 * is the same auth system, now also available to athlete accounts.
 *
 * Not wired into AuthContext yet: register()/login() still use the mock
 * AsyncStorage flow. This client exists so the plumbing (client SDK ->
 * JWT -> api-server verification) can be built and proven end-to-end
 * before anything about the real login/register UX changes — see
 * api-server's /api/auth/whoami for the matching proof-of-concept
 * endpoint. Wiring this into AuthContext + setAuthTokenGetter() is Fase 2.
 */
function createSupabaseClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    const missing = [
      ...(!url ? ['EXPO_PUBLIC_SUPABASE_URL'] : []),
      ...(!publishableKey ? ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}.`);
  }

  return createClient(url, publishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // React Native has no URL bar to land a redirect in.
      detectSessionInUrl: false,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
