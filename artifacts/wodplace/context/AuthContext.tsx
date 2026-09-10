import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getContractAcceptance,
  redeemBoxCode as redeemBoxCodeApi,
  syncUser,
  updateProfileFields,
  verifyAccountRecovery,
  type RedeemBoxCodeResult,
} from '@workspace/api-client-react';

export type AccountStatus = 'active' | 'inactive';
export type AthleteRank =
  | 'Beginner'
  | 'Rookie'
  | 'Scaled'
  | 'Rx'
  | 'Elite'
  | 'Coach'
  | 'Administrador';

export const RANK_OPTIONS: AthleteRank[] = [
  'Beginner',
  'Rookie',
  'Scaled',
  'Rx',
  'Elite',
  'Coach',
];

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
}

interface AuthContextValue {
  user: WodplaceUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
   * Re-checks whether the account has an accepted contract on file and
   * updates `user.status` accordingly ('active' if a contract_acceptances
   * row exists, 'inactive' otherwise) — the account's "active" state is
   * derived from that row, not a separately-synced field. Called on boot,
   * after login, and right after Contratos Activos records an acceptance,
   * so the badge flips without needing an app restart.
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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const restored = JSON.parse(raw) as WodplaceUser;
          setUser(restored);
          // Accounts created before the backend existed (or that failed to
          // sync last time) never get another chance to sync, since this
          // boot path used to skip it — only login/register/updateProfile
          // called persist(). Re-sync on every app open (idempotent upsert)
          // so contract read/acceptance calls (FK on userId) don't 400.
          syncUser({ id: restored.id, name: restored.name, email: restored.email }).catch(
            (err) => {
              console.warn('Failed to sync restored user to backend', err);
            },
          );
          // rank/phrase used to be AsyncStorage-only (no public profile to
          // show them on); keep the backend copy current too.
          updateProfileFields(restored.id, { rank: restored.rank, phrase: restored.phrase }).catch(
            (err) => {
              console.warn('Failed to sync rank/phrase to backend', err);
            },
          );
          refreshActivationStatus(restored);
        }
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
      syncUser({ id: next.id, name: next.name, email: next.email }).catch((err) => {
        console.warn('Failed to sync user to backend', err);
      });
      updateProfileFields(next.id, { rank: next.rank, phrase: next.phrase }).catch((err) => {
        console.warn('Failed to sync rank/phrase to backend', err);
      });
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const refreshActivationStatus = async (forUser?: WodplaceUser) => {
    const target = forUser ?? user;
    if (!target) return;
    try {
      const { acceptance } = await getContractAcceptance({ userId: target.id });
      const nextStatus: AccountStatus = acceptance ? 'active' : 'inactive';
      if (nextStatus !== target.status) {
        await persist({
          ...target,
          status: nextStatus,
          // Assigned once, at the moment the account actually activates —
          // not re-applied on later refreshes (the status-unchanged check
          // above skips those), so a rank set some other way later isn't
          // stomped on.
          ...(nextStatus === 'active' ? { rank: 'Beginner' as AthleteRank } : {}),
        });
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

  const checkEmailExists = async (email: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const db = await getUsersDb();
    return !!db[email.trim().toLowerCase()];
  };

  const login = async (email: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const key = email.trim().toLowerCase();
    const db = await getUsersDb();
    const existing = db[key];
    if (!existing) {
      throw new Error('No encontramos una cuenta con ese email.');
    }
    if (existing.password !== password) {
      throw new Error('Contraseña incorrecta.');
    }
    const { password: _pw, ...profile } = existing;
    await persist(profile);
    refreshActivationStatus(profile);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    birthdate: string,
    phone: string,
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const key = email.trim().toLowerCase();
    const db = await getUsersDb();
    if (db[key]) {
      throw new Error('Ya existe una cuenta con ese email.');
    }
    const profile: WodplaceUser = {
      id: makeId(),
      name: name.trim() || nameFromEmail(email),
      email: email.trim(),
      avatarUri: null,
      phrase: '',
      // Inactive until Contratos Activos records an acceptance —
      // refreshActivationStatus() is what flips this, not registration.
      status: 'inactive',
      rank: 'Beginner',
      birthdate,
      phone,
    };
    db[key] = { ...profile, password };
    await saveUsersDb(db);
    await persist(profile);
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
      rank: (recovered.rank as WodplaceUser['rank']) || 'Beginner',
      birthdate: null,
      phone: null,
    };
    const db = await getUsersDb();
    db[key] = { ...profile, password: newPassword };
    await saveUsersDb(db);
    await persist(profile);
    refreshActivationStatus(profile);
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
      rank: 'Beginner',
      birthdate: null,
      phone: null,
    };
    await persist(next);
    refreshActivationStatus(next);
  };

  const logout = async () => {
    await persist(null);
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
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
