import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { BirthdateModal } from '@/components/BirthdateModal';
import { PhoneModal } from '@/components/PhoneModal';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { formatLongDate } from '@/lib/dateUtils';
import { SUBSCRIBED_BOX } from '@/constants/boxInfo';

const RANK_LABELS: Record<string, string> = {
  Beginner: 'Beginner',
  Rookie: 'Rookie',
  Scaled: 'Scaled',
  Rx: 'Rx',
  Elite: 'Elite',
  Coach: 'Coach',
};

export default function PersonalDataScreen() {
  const colors = useColors();
  const { user, updateProfile } = useAuth();
  const [birthdateVisible, setBirthdateVisible] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);

  if (!user) return null;

  const statCards: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value: string;
    valueColor: string;
  }[] = [
    {
      icon: 'shield',
      label: 'Estado de cuenta',
      value: user.status === 'active' ? 'Activa' : 'Inactiva',
      valueColor: user.status === 'active' ? colors.success : colors.inactive,
    },
    {
      icon: 'award',
      label: 'Rango de atleta',
      value: RANK_LABELS[user.rank] ?? user.rank,
      valueColor: colors.foreground,
    },
  ];

  const readOnlyRows: { icon: keyof typeof Feather.glyphMap; label: string; value: string }[] = [
    { icon: 'user', label: 'Nombre completo', value: user.name },
    { icon: 'mail', label: 'Correo electrónico', value: user.email },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Datos Personales</Text>

        <View style={styles.statsRow}>
          {statCards.map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name={stat.icon} size={18} color={colors.secondaryForeground} />
              </View>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.valueColor }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/box-detail')}
          style={({ pressed }) => [
            styles.boxCard,
            { backgroundColor: colors.card },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={[styles.boxLogo, { backgroundColor: colors.primary }]}>
            <Text style={[styles.boxLogoText, { color: colors.primaryForeground }]}>
              {SUBSCRIBED_BOX.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Box suscrito</Text>
            <Text style={[styles.boxName, { color: colors.foreground }]}>{SUBSCRIBED_BOX.name}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 14 }]}>
          {readOnlyRows.map((row) => (
            <View
              key={row.label}
              style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name={row.icon} size={16} color={colors.secondaryForeground} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                <Text style={[styles.rowValue, { color: colors.foreground }]}>{row.value}</Text>
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => setPhoneVisible(true)}
            disabled={!!user.phone}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              pressed && !user.phone && { opacity: 0.6 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="smartphone" size={16} color={colors.secondaryForeground} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Celular</Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: user.phone ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {user.phone ?? 'Agregar celular'}
              </Text>
            </View>
            <Feather
              name={user.phone ? 'lock' : 'chevron-right'}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>

          <Pressable
            onPress={() => setBirthdateVisible(true)}
            disabled={!!user.birthdate}
            style={({ pressed }) => [styles.row, pressed && !user.birthdate && { opacity: 0.6 }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="calendar" size={16} color={colors.secondaryForeground} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
                Fecha de nacimiento
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: user.birthdate ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {user.birthdate ? formatLongDate(user.birthdate) : 'Agregar fecha de nacimiento'}
              </Text>
            </View>
            <Feather
              name={user.birthdate ? 'lock' : 'chevron-right'}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          El celular y la fecha de nacimiento quedan bloqueados una vez registrados. Si necesitas
          corregirlos, contacta a tu box.
        </Text>
      </ScrollView>

      <BirthdateModal
        visible={birthdateVisible}
        onClose={() => setBirthdateVisible(false)}
        initialValue={user.birthdate}
        onSave={(value) => updateProfile({ birthdate: value })}
      />

      <PhoneModal
        visible={phoneVisible}
        onClose={() => setPhoneVisible(false)}
        initialValue={user.phone}
        onSave={(value) => updateProfile({ phone: value })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 4 },
  title: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 24,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  boxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
  },
  boxLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLogoText: {
    fontSize: 20,
    fontFamily: 'Anton_400Regular',
  },
  boxName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  rowValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
