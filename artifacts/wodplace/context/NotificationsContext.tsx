import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = 'wodplace_notifications_read';

const SEED_NOTIFICATIONS: Omit<AppNotification, 'read'>[] = [
  {
    id: 'n1',
    title: 'Tu clase de mañana',
    body: 'No olvides tu clase de CrossFit a las 07:00 hrs. ¡Te esperamos!',
    createdAt: '2026-07-11T20:00:00-04:00',
  },
  {
    id: 'n2',
    title: 'Renovación de plan',
    body: 'Tu plan se renueva en 3 días. Revisa tus datos de pago.',
    createdAt: '2026-07-10T14:30:00-04:00',
  },
  {
    id: 'n3',
    title: '¡Nuevo récord!',
    body: 'Felicidades, superaste tu marca anterior en el WOD de la semana.',
    createdAt: '2026-07-08T09:15:00-04:00',
  },
];

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setReadIds(JSON.parse(raw) as string[]);
    })();
  }, []);

  const persist = async (ids: string[]) => {
    setReadIds(ids);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  const notifications = useMemo<AppNotification[]>(
    () =>
      SEED_NOTIFICATIONS.map((item) => ({ ...item, read: readIds.includes(item.id) })).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [readIds],
  );

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markAsRead = (id: string) => {
    if (readIds.includes(id)) return;
    persist([...readIds, id]);
  };

  const markAllAsRead = () => {
    persist(SEED_NOTIFICATIONS.map((item) => item.id));
  };

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead }),
    [notifications, unreadCount, readIds],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
