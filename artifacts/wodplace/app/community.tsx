import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { AppHeader } from '@/components/AppHeader';

export default function CommunityScreen() {
  const colors = useColors();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Comunidad</Text>
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="users" size={26} color={colors.secondaryForeground} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Tu comunidad está tomando forma
          </Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            Comparte tus WODs, celebra tus PRs y conecta con los atletas de tu box.
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