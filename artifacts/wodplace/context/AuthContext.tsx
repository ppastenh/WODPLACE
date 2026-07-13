import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncUser } from '@workspace/api-client-react';

export type AccountStatus = 'active' | 'inactive';
export type AthleteRank = 'Beginner' | 'Rookie' | 'Scaled' | 'Rx' | 'Elite' | 'Coach';

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
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (partial: Partial<WodplaceUser>) => Promise<void>;
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
          setUser(JSON.parse(raw) as WodplaceUser);
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
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
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
  };

  const register = async (name: string, email: string, password: string) => {
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
      status: 'active',
      rank: 'Beginner',
      birthdate: null,
      phone: null,
    };
    db[key] = { ...profile, password };
    await saveUsersDb(db);
    await persist(profile);
  };

  const loginWithProvider = async (provider: 'google' | 'apple') => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const next: WodplaceUser = {
      id: makeId(),
      name: provider === 'google' ? 'Atleta Google' : 'Atleta Apple',
      email: provider === 'google' ? 'atleta@gmail.com' : 'atleta@icloud.com',
      avatarUri: null,
      phrase: '',
      status: 'active',
      rank: 'Beginner',
      birthdate: null,
      phone: null,
    };
    await persist(next);
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
      loginWithProvider,
      logout,
      updateProfile,
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
