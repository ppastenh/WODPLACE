import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RmHeader } from '@/components/rm/RmHeader';
import { useDarkColors } from '@/hooks/useDarkColors';

const ITEMS: Array<{
  route: string;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}> = [
  {
    route: '/rm/tools/estimated-max',
    label: 'Máximo estimado',
    hint: 'Calcula tu 1RM a partir de un peso y las reps que hiciste.',
    icon: 'trending-up',
  },
  {
    route: '/rm/tools/bar-loader',
    label: 'Carga de barra',
    hint: 'Qué discos poner de cada lado para un peso objetivo.',
    icon: 'sliders',
  },
];

export default function ToolsHubScreen() {
  const colors = useDarkColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader title="Calculadoras" />
      <ScrollView contentContainerStyle={styles.content}>
        {ITEMS.map((it) => (
          <Pressable
            key={it.route}
            onPress={() => router.push(it.route as never)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name={it.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>{it.label}</Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>{it.hint}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
});
