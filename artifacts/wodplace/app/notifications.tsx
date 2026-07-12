import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { MONTH_NAMES } from '@/lib/dateUtils';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Notificaciones</Text>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllAsRead} hitSlop={6}>
              <Text style={[styles.markAll, { color: colors.primary }]}>Marcar todas leídas</Text>
            </Pressable>
          ) : null}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No tienes notificaciones.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => markAsRead(item.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: item.read ? colors.card : colors.secondary,
                  },
                ]}
              >
                {!item.read ? <View style={[styles.dot, { backgroundColor: colors.destructive }]} /> : null}
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                  <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
  },
  markAll: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    padding: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  cardBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
