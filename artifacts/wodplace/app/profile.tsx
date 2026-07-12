import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { AppButton } from '@/components/AppButton';
import { EditPhraseModal } from '@/components/EditPhraseModal';
import { MenuSheet } from '@/components/MenuSheet';
import { AttendeesModal } from '@/components/AttendeesModal';
import { ClassCard, AgendadoBadge } from '@/components/ClassCard';
import { useAuth } from '@/context/AuthContext';
import { useBooking, ClassSession } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';

export default function ProfileScreen() {
  const colors = useColors();
  const { user, updateProfile, logout } = useAuth();
  const { now, getUpcomingBooked, getAttendeeNames } = useBooking();

  const [phraseVisible, setPhraseVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [attendeesSession, setAttendeesSession] = useState<ClassSession | null>(null);

  if (!user) return null;

  const bookedSessions = getUpcomingBooked(10);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onMenu={() => setMenuVisible(true)} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <Avatar
            uri={user.avatarUri}
            onChange={(uri) => updateProfile({ avatarUri: uri })}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {user.name}
            </Text>
            <Pressable onPress={() => setPhraseVisible(true)} style={styles.phraseRow} hitSlop={6}>
              <Text
                style={[
                  styles.phrase,
                  { color: user.phrase ? colors.mutedForeground : colors.mutedForeground },
                  !user.phrase && styles.phrasePlaceholder,
                ]}
                numberOfLines={1}
              >
                {user.phrase ? `"${user.phrase}"` : '"Inserte texto"'}
              </Text>
              <Feather name="edit-2" size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: user.status === 'active' ? colors.success : colors.inactive,
              },
            ]}
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {user.status === 'active' ? 'Cuenta Activa' : 'Cuenta Inactiva'}
            </Text>
          </View>

          <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.rankText, { color: colors.secondaryForeground }]}>
              {user.rank}
            </Text>
          </View>
        </View>

        <AppButton
          label="Agenda Ahora"
          variant="dark"
          fullWidth
          onPress={() => router.push('/calendar')}
          style={styles.scheduleButton}
          icon={<Feather name="calendar" size={18} color={colors.authText} />}
        />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Agendado</Text>

        {bookedSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Aún no tienes clases agendadas
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Toca "Agenda Ahora" para reservar tu próximo WOD.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {bookedSessions.map((session) => (
              <ClassCard
                key={session.id}
                session={session}
                now={now}
                showDayLabel
                onPressAttendees={() => setAttendeesSession(session)}
                actionSlot={<AgendadoBadge />}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EditPhraseModal
        visible={phraseVisible}
        onClose={() => setPhraseVisible(false)}
        initialValue={user.phrase}
        onSave={(value) => updateProfile({ phrase: value })}
      />
      <MenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogout={handleLogout}
        userName={user.name}
        userEmail={user.email}
      />
      <AttendeesModal
        visible={!!attendeesSession}
        onClose={() => setAttendeesSession(null)}
        session={attendeesSession}
        names={attendeesSession ? getAttendeeNames(attendeesSession, user.name) : []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 19,
    fontFamily: 'Inter_700Bold',
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phrase: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  phrasePlaceholder: {
    opacity: 0.7,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  scheduleButton: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Anton_400Regular',
    marginTop: 28,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
