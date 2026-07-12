import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

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
  const { user } = useAuth();

  if (!user) return null;

  const rows: { icon: keyof typeof Feather.glyphMap; label: string; value: string }[] = [
    { icon: 'user', label: 'Nombre completo', value: user.name },
    { icon: 'mail', label: 'Correo electrónico', value: user.email },
    {
      icon: 'shield',
      label: 'Estado de cuenta',
      value: user.status === 'active' ? 'Activa' : 'Inactiva',
    },
    { icon: 'award', label: 'Rango de atleta', value: RANK_LABELS[user.rank] ?? user.rank },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Datos Personales</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Esta información es administrada por WODPLACE. Si necesitas actualizarla, contacta a tu
          box.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.row,
                index < rows.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
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
        </View>
      </ScrollView>
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
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
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
