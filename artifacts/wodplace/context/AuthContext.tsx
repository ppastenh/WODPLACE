import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

interface AuthContextValue {
  user: WodplaceUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (partial: Partial<WodplaceUser>) => Promise<void>;
}

const STORAGE_KEY = 'wodplace_user';

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
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = async (email: string, _password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const next: WodplaceUser = {
      id: makeId(),
      name: nameFromEmail(email),
      email,
      avatarUri: null,
      phrase: '',
      status: 'active',
      rank: 'Beginner',
    };
    await persist(next);
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
      login,
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
