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

// Clave del almacenamiento local que solo servía para marcar como leídas las notificaciones de ejemplo (ya no
// existen); se borra una vez para no dejar basura en los teléfonos que la tenían.
const LEGACY_READ_IDS_KEY = 'wodplace_notifications_read';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [remoteNotifications, setRemoteNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_READ_IDS_KEY).catch(() => {});
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
        // Sin conexión: se conserva la última lista cargada (o ninguna).
      }
    };

    void loadRemoteNotifications();
    const interval = setInterval(loadRemoteNotifications, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  // Solo notificaciones reales del servidor (GET /notifications), de la más nueva a la más antigua.
  const notifications = useMemo<AppNotification[]>(
    () =>
      [...remoteNotifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [remoteNotifications],
  );

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markAsRead = (id: string) => {
    if (!user || !remoteNotifications.some((item) => item.id === id)) return;
    setRemoteNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    markNotificationRead(id, { userId: user.id }).catch(() => {});
  };

  const markAllAsRead = () => {
    if (user) {
      setRemoteNotifications((current) => current.map((item) => ({ ...item, read: true })));
      markAllNotificationsRead({ userId: user.id }).catch(() => {});
    }
  };

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead }),
    [notifications, unreadCount],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
