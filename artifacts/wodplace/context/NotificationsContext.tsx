import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

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
  const [remoteNotifications, setRemoteNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setReadIds(JSON.parse(raw) as string[]);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const loadRemoteNotifications = async () => {
      try {
        const rows = await listNotifications({ userId: user.id });
        if (!mounted) return;
        setRemoteNotifications(rows);
      } catch {
        // Local seed notifications remain available when the API is offline.
      }
    };

    void loadRemoteNotifications();
    const interval = setInterval(loadRemoteNotifications, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  const persist = async (ids: string[]) => {
    setReadIds(ids);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  const notifications = useMemo<AppNotification[]>(() => {
    const local = SEED_NOTIFICATIONS.map((item) => ({
      ...item,
      read: readIds.includes(item.id),
    }));
    return [...remoteNotifications, ...local].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [readIds, remoteNotifications]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markAsRead = (id: string) => {
    const remote = remoteNotifications.some((item) => item.id === id);
    if (remote && user) {
      setRemoteNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      markNotificationRead(id, { userId: user.id }).catch(() => {});
      return;
    }
    if (!readIds.includes(id)) persist([...readIds, id]);
  };

  const markAllAsRead = () => {
    persist(SEED_NOTIFICATIONS.map((item) => item.id));
    if (user) {
      setRemoteNotifications((current) => current.map((item) => ({ ...item, read: true })));
      markAllNotificationsRead({ userId: user.id }).catch(() => {});
    }
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
