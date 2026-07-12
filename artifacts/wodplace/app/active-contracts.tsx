import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useColors } from '@/hooks/useColors';

const CONTRACTS = [
  {
    id: 'c1',
    title: 'Membresía Mensual Ilimitada',
    since: 'Activo desde el 01 de junio de 2026',
    status: 'active' as const,
  },
  {
    id: 'c2',
    title: 'Seguro deportivo básico',
    since: 'Activo desde el 01 de junio de 2026',
    status: 'active' as const,
  },
];

export default function ActiveContractsScreen() {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Contratos Activos</Text>

        <View style={styles.list}>
          {CONTRACTS.map((contract) => (
            <View key={contract.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="file-text" size={18} color={colors.secondaryForeground} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{contract.title}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                  {contract.since}
                </Text>
              </View>
              <View style={[styles.statusTag, { backgroundColor: colors.success }]}>
                <Text style={styles.statusTagText}>Activo</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() =>
            Alert.alert('Historial de contratos', 'Muy pronto podrás ver tus contratos anteriores.')
          }
          style={styles.historyRow}
        >
          <Feather name="clock" size={15} color={colors.mutedForeground} />
          <Text style={[styles.historyText, { color: colors.mutedForeground }]}>
            Ver historial de contratos
          </Text>
        </Pressable>
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
    marginBottom: 18,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  statusTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  historyText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
