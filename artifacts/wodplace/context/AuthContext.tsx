import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuthMode,
  getContractAcceptance,
  getMe,
  getMyBox,
  getPlatformAgreementStatus,
  getPublicProfile,
  redeemBoxCode as redeemBoxCodeApi,
  registerRealAccount,
  setAuthTokenGetter,
  syncUser,
  updateProfileFields,
  verifyAccountRecovery,
  type MyBox,
  type PlatformAgreementStatus,
  type RealAccountProfile,
  type RedeemBoxCodeResult,
  type SkillLevel,
} from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';

// Fase 2 of the mock-auth -> real Supabase Auth migration: every wodplace
// API call now carries the live Supabase session's JWT when there is one.
// A no-op for every mock account (no session ever exists), and for a real
// account before it's logged in — this is safe to set once, unconditionally,
// at module load rather than only after a real login.
setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

/** Builds the local WodplaceUser shape from a real-account server profile. */
function toWodplaceUser(profile: RealAccountProfile, status: AccountStatus): WodplaceUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatarUri: profile.avatarUrl,
    phrase: profile.phrase ?? '',
    status,
    rank: (profile.rank as AthleteRank) || 'beginner',
    birthdate: profile.birthdate,
    phone: profile.phone,
    authMode: 'real',
  };
}

/** Server errors (customFetch's ApiError) carry the clean message in
 *  `.data.error` — `.message` itself is prefixed with "HTTP 409 ...". */
function extractApiErrorMessage(err: unknown, fallback: string): string {
  return (err as { data?: { error?: string } })?.data?.error ?? fallback;
}

export type AccountStatus = 'active' | 'inactive';
// Assigned by a coach from box-admin (see member-detail.$id.tsx) — new
// accounts start at 'beginner' until a coach sets it. Same 6-value scale as
// a WOD result's level (see skillLevel.ts), unified on purpose.
export type AthleteRank = SkillLevel;

export interface WodplaceUser {
  id: string;
  name: string;
  email: string;
  avatarUri: string | null;
  phrase: string;
  status: AccountStatus;
  rank: AthleteRank;
  birthdate: string | null;
  phone: string | null;
  /**
   * Fase 2 of the mock-auth -> real Supabase Auth migration. `'real'` means
   * this session has a live Supabase Auth account (register()/login()
   * resolved it via the server) — boot/logout/verifyPassword branch on this
   * to use the real Supabase session instead of the local AsyncStorage
   * flow. `'mock'` is every account from before this fase (still 100% the
   * old flow, untouched — migrating them is Fase 3). Read with `=== 'real'`
   * everywhere, never `!== 'mock'`: a profile blob persisted before this
   * field existed has it `undefined` at runtime despite the type, and that
   * must fall back to the mock path, not silently be treated as real.
   */
  authMode: 'mock' | 'real';
}

interface AuthContextValue {
  user: WodplaceUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * Real admin roles (box_admin/super_admin, an account can hold both)
   * resolved server-side via the profiles/user_roles email bridge, plus
   * whether the platform agreement is satisfied — an empty `roles` array
   * means "not an admin at all", not "unknown". Drives whether/what
   * admin-related nav items show (see lib/navigation.ts getAdminNavItem).
   * Refreshed alongside refreshActivationStatus.
   */
  adminStatus: PlatformAgreementStatus | null;
  /**
   * Whether this account belongs to at least one box (redeemed a join
   * code) — null while not yet resolved. Contratos Activos has nothing to
   * apply to before that, so it stays hidden until this is true (see
   * lib/navigation.ts's shouldShowContracts). Refreshed alongside
   * refreshActivationStatus.
   */
  hasBoxMembership: boolean | null;
  /**
   * Whether the box_admin has assigned this athlete a real plan (box_members
   * .plan_id) — distinct from hasBoxMembership: joining a box via a code
   * doesn't assign one automatically. "Progreso Mensual" on Home depends on
   * this, not just box membership. Refreshed alongside refreshActivationStatus.
   */
  hasActivePlan: boolean | null;
  /**
   * The athlete's box (name, photo, socials, etc.) — the same object
   * refreshActivationStatus already fetches to derive hasBoxMembership/
   * hasActivePlan, exposed here so screens that also need the full box
   * (Home's logo/name badge, Comunidad's title) don't each fetch it again.
   * null while box-less or not yet resolved.
   */
  myBox: MyBox | null;
  /**
   * Where to navigate right after auth resolves (boot, login, register,
   * account recovery): a choice screen ("Entrar como Super Admin" / "Ver
   * como alumno") for a super_admin — asked fresh every time, never
   * remembered — else the caller's normal `fallback` route (box_admin and
   * plain athlete accounts are unaffected). Reads the latest resolved
   * status via a ref, not React state, so it's correct immediately after
   * `await`ing login()/register()/etc. — no stale-closure race with the
   * state update.
   */
  getPostAuthRoute: (fallback: string) => string;
  checkEmailExists: (email: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    birthdate: string,
    phone: string,
  ) => Promise<WodplaceUser>;
  /**
   * Re-checks activation + admin status and updates both `user.status` and
   * `adminStatus` accordingly:
   *  - Detected admins (box_admin/super_admin) are always 'active' — the
   *    athlete membership contract is for people who train at the box, not
   *    for whoever manages the platform, so it's never checked for them.
   *  - Everyone else is 'active' iff a contract_acceptances row exists,
   *    'inactive' otherwise.
   * Called on boot, after login, right after Contratos Activos records an
   * acceptance, and after accepting the platform agreement, so both badges
   * flip without needing an app restart.
   */
  refreshActivationStatus: () => Promise<void>;
  /**
   * New device / cleared data recovery: after the emailed 6-digit code is
   * verified, adopt the existing server account locally (its id, so all
   * server-side data reconnects) with a fresh local password.
   */
  recoverAccount: (email: string, code: string, newPassword: string) => Promise<void>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (partial: Partial<WodplaceUser>) => Promise<void>;
  /**
   * Redeem a box invite code, joining that box as an athlete. Resolves with
   * the backend result ({ joined, alreadyMember, boxName, ... }); it does not
   * throw for an unknown code, only for network/backend failures. `account`
   * is used right after register(), before `user` state has settled.
   */
  redeemBoxCode: (
    code: string,
    account?: Pick<WodplaceUser, 'id' | 'name' | 'email'>,
  ) => Promise<RedeemBoxCodeResult>;
  /**
   * Checks a password against the signed-in account without touching the
   * session. Used by the admin PIN flow ("forgot PIN" / unlock while locked).
   * Client-side only, like login() — the mock auth model has no server-side
   * password.
   */
  verifyPassword: (password: string) => Promise<boolean>;
}

type StoredUser = WodplaceUser & { password: string };

const STORAGE_KEY = 'wodplace_user';
const USERS_KEY = 'wodplace_users';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] ?? 'Atleta';
  return handle
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WodplaceUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<PlatformAgreementStatus | null>(null);
  const [hasBoxMembership, setHasBoxMembership] = useState<boolean | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [myBox, setMyBox] = useState<MyBox | null>(null);

  // Mirror of adminStatus, updated synchronously (state updates aren't
  // visible until the next render) — getPostAuthRoute reads this right
  // after an `await`ed login()/register()/etc. resolves, when no re-render
  // has necessarily happened yet.
  const adminStatusRef = useRef<PlatformAgreementStatus | null>(null);

  const getPostAuthRoute = (fallback: string): string => {
    const roles = adminStatusRef.current?.roles ?? [];
    // Asked fresh every time (never remembered) — see choose-view.tsx.
    // box_admin (without super_admin) is unaffected: straight to fallback,
    // same as a plain athlete account.
    return roles.includes('super_admin') ? '/choose-view' : fallback;
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const restored = JSON.parse(raw) as WodplaceUser;

        if (restored.authMode === 'real') {
          // Supabase's own client already restored its session from
          // AsyncStorage by the time this runs (see lib/supabase.ts) — this
          // just checks it's actually still valid before trusting the
          // cached profile.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            return;
          }
          try {
            const me = await getMe();
            const refreshed = toWodplaceUser(me, restored.status);
            setUser(refreshed);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
            await refreshActivationStatus(refreshed);
          } catch (err) {
            // Network hiccup, not an invalid session — don't log the user
            // out over it, just use the cached profile for this session.
            console.warn('Failed to refresh real account profile on boot', err);
            setUser(restored);
            await refreshActivationStatus(restored);
          }
          return;
        }

        // Mock account (or a profile persisted before this field existed —
        // authMode is undefined at runtime for those, which fails the
        // check above and correctly lands here) — exactly today's flow.
        setUser(restored);
        // Accounts created before the backend existed (or that failed to
        // sync last time) never get another chance to sync, since this
        // boot path used to skip it — only login/register/updateProfile
        // called persist(). Re-sync on every app open (idempotent upsert)
        // so contract read/acceptance calls (FK on userId) don't 400.
        syncUser({
          id: restored.id,
          name: restored.name,
          email: restored.email,
          birthdate: restored.birthdate,
        }).catch((err) => {
          console.warn('Failed to sync restored user to backend', err);
        });
        // phrase used to be AsyncStorage-only (no public profile to show
        // it on); keep the backend copy current too. rank is NOT pushed
        // here — it's coach-assigned from box-admin, pulled (not pushed)
        // by refreshActivationStatus below.
        updateProfileFields(restored.id, { phrase: restored.phrase }).catch((err) => {
          console.warn('Failed to sync phrase to backend', err);
        });
        // Awaited (unlike the two syncs above): the app's very first
        // navigation decision (see app/index.tsx) depends on adminStatus
        // having resolved first.
        await refreshActivationStatus(restored);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = async (next: WodplaceUser | null) => {
    setUser(next);
    if (next) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Best-effort: make sure the backend has a row for this user so
      // contract read-progress/acceptance calls (which have a FK on userId)
      // succeed. Never blocks or crashes the app if the API is unreachable.
      syncUser({ id: next.id, name: next.name, email: next.email, birthdate: next.birthdate }).catch(
        (err) => {
          console.warn('Failed to sync user to backend', err);
        },
      );
      // rank is NOT pushed here — see the boot-time sync comment above.
      updateProfileFields(next.id, { phrase: next.phrase }).catch((err) => {
        console.warn('Failed to sync phrase to backend', err);
      });
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const refreshActivationStatus = async (forUser?: WodplaceUser) => {
    let target = forUser ?? user;
    if (!target) return;

    // Pull the athlete's real rank from the server — it's coach-assigned
    // from box-admin, never set locally, so this is the only place `rank`
    // enters the client. Local-only update (no syncUser/updateProfileFields
    // push back) to avoid re-triggering the very push model this replaces.
    try {
      const profile = await getPublicProfile(target.id);
      if (profile.rank && profile.rank !== target.rank) {
        target = { ...target, rank: profile.rank as AthleteRank };
        setUser(target);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(target));
      }
    } catch (err) {
      console.warn('Failed to pull rank from backend', err);
    }

    let platform: PlatformAgreementStatus | null = null;
    try {
      platform = await getPlatformAgreementStatus(target.id);
      setAdminStatus(platform);
      adminStatusRef.current = platform;
    } catch (err) {
      console.warn('Failed to refresh admin status', err);
    }

    try {
      const myBoxResult = await getMyBox(target.id);
      setHasBoxMembership(!!myBoxResult.box);
      setHasActivePlan(!!myBoxResult.box?.planId);
      setMyBox(myBoxResult.box);
    } catch (err) {
      console.warn('Failed to refresh box membership status', err);
    }

    try {
      // Detected admins skip the athlete contract check entirely — see the
      // doc comment on refreshActivationStatus in the context type above.
      // super_admin is exempt outright (same precedent as the platform
      // agreement's own acceptance flow — she's the one approving boxes,
      // not subject to one). A plain box_admin's status instead reflects
      // her own box's real approval state (boxes.status): 'pendiente' /
      // 'suspendido' / 'rechazado' all correctly show as not active, not
      // just "admin = always active" regardless of whether the box was
      // ever approved.
      const roles = platform?.roles ?? [];
      const nextStatus: AccountStatus = roles.includes('super_admin')
        ? 'active'
        : roles.includes('box_admin')
          ? (platform?.box?.status === 'activo' ? 'active' : 'inactive')
          : (await getContractAcceptance({ userId: target.id })).acceptance
            ? 'active'
            : 'inactive';
      if (nextStatus !== target.status) {
        await persist({ ...target, status: nextStatus });
      }
    } catch (err) {
      console.warn('Failed to refresh activation status', err);
    }
  };

  const getUsersDb = async (): Promise<Record<string, StoredUser>> => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredUser>) : {};
  };

  const saveUsersDb = async (db: Record<string, StoredUser>) => {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(db));
  };

  // Server-first (Fase 2): sees real accounts AND mock accounts registered
  // on a different device — the local-only check never could, which is the
  // whole reason account-recovery exists. Falls back to the local mock db
  // only if the network check itself fails, not merely when it says "none"
  // (the server is authoritative there — a local-only fallback in that case
  // would just be dead code, since a mock register() always syncs its row).
  const checkEmailExists = async (email: string): Promise<boolean> => {
    const key = email.trim().toLowerCase();
    try {
      const mode = await getAuthMode(key);
      return mode !== 'none';
    } catch (err) {
      console.warn('Failed to check auth mode, falling back to local check', err);
      const db = await getUsersDb();
      return !!db[key];
    }
  };

  const login = async (email: string, password: string) => {
    const key = email.trim().toLowerCase();

    // Known mock account on this device — exactly today's flow, unchanged,
    // no network required. Checked first so an existing mock user's login
    // stays offline-capable and doesn't slow down waiting on a server
    // round-trip it never needed before.
    const db = await getUsersDb();
    const existing = db[key];
    if (existing) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (existing.password !== password) {
        throw new Error('Contraseña incorrecta.');
      }
      const { password: _pw, ...profile } = existing;
      const next: WodplaceUser = { ...profile, authMode: 'mock' };
      await persist(next);
      // Awaited so getPostAuthRoute() is correct the instant login()
      // resolves (the caller navigates right after awaiting this).
      await refreshActivationStatus(next);
      return;
    }

    // Not a local mock account — could be a real account, or a mock one
    // registered on a different device (same "no encontramos" message as
    // always in that case; recovering it is what account-recovery is for).
    const mode = await getAuthMode(key);
    if (mode !== 'real') {
      throw new Error('No encontramos una cuenta con ese email.');
    }
    const { error } = await supabase.auth.signInWithPassword({ email: key, password });
    if (error) {
      throw new Error('Contraseña incorrecta.');
    }
    const me = await getMe();
    const profile = toWodplaceUser(me, 'inactive');
    await persist(profile);
    await refreshActivationStatus(profile);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    birthdate: string,
    phone: string,
  ) => {
    let created: RealAccountProfile;
    try {
      created = await registerRealAccount({
        email: email.trim(),
        password,
        name: name.trim() || nameFromEmail(email),
        birthdate: birthdate || null,
        phone: phone || null,
      });
    } catch (err) {
      throw new Error(extractApiErrorMessage(err, 'No se pudo crear la cuenta.'));
    }

    // The account is pre-confirmed server-side (see the endpoint's own doc
    // comment for why), so this succeeds immediately — no separate
    // "verify your email" step.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: created.email,
      password,
    });
    if (signInError) {
      throw new Error('La cuenta se creó pero no se pudo iniciar sesión. Intenta ingresar de nuevo.');
    }

    // Inactive until Contratos Activos records an acceptance —
    // refreshActivationStatus() is what flips this, not registration.
    const profile = toWodplaceUser(created, 'inactive');
    await persist(profile);
    // Was missing — adminStatus stayed at its initial null for a freshly
    // registered account until the next login/app restart, hiding e.g. an
    // admin test account's "Acuerdo de Plataforma" item indefinitely even
    // though the role was resolving correctly server-side all along.
    await refreshActivationStatus(profile);
    return profile;
  };

  /**
   * New device / cleared data: adopt the existing server account after the
   * one-time email code was verified. `rank`/`phrase`/`avatarUri` come from
   * the server so `persist()`'s sync doesn't overwrite them with defaults;
   * `birthdate`/`phone` were never synced so they come back empty, and
   * `status` is recomputed from contract_acceptances.
   */
  const recoverAccount = async (
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> => {
    const recovered = await verifyAccountRecovery(email.trim(), code.trim());
    const key = email.trim().toLowerCase();
    const profile: WodplaceUser = {
      id: recovered.userId,
      name: recovered.name,
      email: recovered.email,
      avatarUri: recovered.avatarUrl,
      phrase: recovered.phrase ?? '',
      status: 'inactive',
      rank: (recovered.rank as WodplaceUser['rank']) || 'beginner',
      birthdate: null,
      phone: null,
      // account-recovery is entirely a mock-era mechanism (see this
      // function's own doc comment) — still true in Fase 2, since no
      // existing account is migrated to real yet (that's Fase 3).
      authMode: 'mock',
    };
    const db = await getUsersDb();
    db[key] = { ...profile, password: newPassword };
    await saveUsersDb(db);
    await persist(profile);
    await refreshActivationStatus(profile);
  };

  const redeemBoxCode = async (
    code: string,
    account?: Pick<WodplaceUser, 'id' | 'name' | 'email'>,
  ): Promise<RedeemBoxCodeResult> => {
    const target = account ?? user;
    if (!target) {
      throw new Error('Debes iniciar sesión para agregar un código de box.');
    }
    return redeemBoxCodeApi({
      userId: target.id,
      name: target.name,
      email: target.email,
      code,
    });
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!user) return false;
    if (user.authMode === 'real') {
      // Re-authenticates without disturbing the active session (still the
      // same account, worst case it just rotates to a fresh token pair) —
      // there's no local password to compare for a real account.
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      return !error;
    }
    const db = await getUsersDb();
    const entry = db[user.email.trim().toLowerCase()];
    return !!entry && entry.password === password;
  };

  const loginWithProvider = async (provider: 'google' | 'apple') => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const next: WodplaceUser = {
      id: makeId(),
      name: provider === 'google' ? 'Atleta Google' : 'Atleta Apple',
      email: provider === 'google' ? 'atleta@gmail.com' : 'atleta@icloud.com',
      avatarUri: null,
      phrase: '',
      status: 'inactive',
      rank: 'beginner',
      birthdate: null,
      phone: null,
      // Still fully simulated — real Google/Apple sign-in is Fase 5.
      authMode: 'mock',
    };
    await persist(next);
    await refreshActivationStatus(next);
  };

  const logout = async () => {
    if (user?.authMode === 'real') {
      // Best-effort — a failed sign-out shouldn't block clearing the local
      // session; a stale Supabase session left behind just means the next
      // boot's getSession() check finds it and re-establishes it, which is
      // the correct behavior for a network-blip failure here anyway.
      await supabase.auth.signOut().catch((err) => {
        console.warn('Failed to sign out of Supabase', err);
      });
    }
    await persist(null);
    setAdminStatus(null);
    adminStatusRef.current = null;
    setHasBoxMembership(null);
    setHasActivePlan(null);
    setMyBox(null);
  };

  const updateProfile = async (partial: Partial<WodplaceUser>) => {
    if (!user) return;
    await persist({ ...user, ...partial });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      adminStatus,
      hasBoxMembership,
      hasActivePlan,
      myBox,
      getPostAuthRoute,
      checkEmailExists,
      login,
      register,
      redeemBoxCode,
      verifyPassword,
      loginWithProvider,
      logout,
      updateProfile,
      refreshActivationStatus: () => refreshActivationStatus(),
      recoverAccount,
    }),
    [user, isLoading, adminStatus, hasBoxMembership, hasActivePlan, myBox],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
