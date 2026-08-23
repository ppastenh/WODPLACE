import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { AppHeader } from '@/components/AppHeader';

export default function ProgressScreen() {
  const colors = useColors();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Progreso</Text>
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={28}
              color={colors.secondaryForeground}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Tu evolución empieza aquí
          </Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            Registra tus pesos, PRs y marcas personales para ver cómo avanzas.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  title: {
    fontSize: 24,
    fontFamily: 'Anton_400Regular',
    marginTop: 8,
    marginBottom: 18,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 22,
    padding: 28,
    gap: 10,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});