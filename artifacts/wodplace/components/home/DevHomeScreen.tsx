import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { HomeView, type HomeViewEvents } from '@/components/home/HomeView';
import {
  DEV_GROUPS,
  buildDevState,
  defaultSelection,
  type DevSelection,
} from '@/components/home/devHomeStates';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

const simulated = (what: string) => () => Alert.alert('Toque simulado', what);

const EVENTS: HomeViewEvents = {
  onJoinBox: simulated('Aquí se abriría "Unirte a un box".'),
  onOpenCalendar: simulated('Aquí se abriría el Calendario.'),
  onOpenContracts: simulated('Aquí se abriría Contratos Activos.'),
  onOpenWod: simulated('Aquí se abriría el WOD de hoy.'),
  onOpenRm: simulated('Aquí se abriría Progreso y PRs.'),
  onOpenProfile: simulated('Aquí se abrirían tus Datos personales.'),
  onOpenMedals: simulated('Aquí se abrirían las Medallas.'),
  onShareQuote: simulated('Aquí se abriría el menú de compartir.'),
};

/**
 * Estados de Inicio (dev). Solo se carga con __DEV__ (ver app/dev-home.tsx): dibuja el MISMO HomeView de la Home real
 * con datos inventados (components/home/devHomeStates.ts), sin llamadas al servidor ni a la base.
 */
export default function DevHomeScreen() {
  const colors = useColors();
  const [selection, setSelection] = useState<DevSelection>(defaultSelection);
  const [chipsOpen, setChipsOpen] = useState(true);
  const state = useMemo(() => buildDevState(selection), [selection]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell unreadCount={state.unreadCount} onBack={() => router.back()} />
      <View style={[styles.panel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" onPress={() => setChipsOpen((v) => !v)} style={styles.panelHeader}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>
            Estados de Inicio (dev) · datos inventados
          </Text>
          <Text style={[styles.panelToggle, { color: colors.accentForeground }]}>
            {chipsOpen ? 'Ocultar' : 'Mostrar'}
          </Text>
        </Pressable>
        {chipsOpen ? (
          <ScrollView style={styles.chipsScroll} nestedScrollEnabled>
            {DEV_GROUPS.map((group) => (
              <View key={group.id} style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.navInactive }]}>{group.title}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {group.options.map((option) => {
                    const selected = (selection[group.id] ?? group.options[0]!.id) === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setSelection((s) => ({ ...s, [group.id]: option.id }))}
                        style={[styles.chip, { backgroundColor: selected ? colors.accent : colors.input }]}
                      >
                        <Text
                          style={[styles.chipText, { color: selected ? colors.accentForeground : colors.foreground }]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
      <HomeView data={state} events={EVENTS} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: { borderBottomWidth: 1 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  panelTitle: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_700Bold', flex: 1 },
  panelToggle: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_700Bold' },
  chipsScroll: { maxHeight: 210 },
  group: { paddingBottom: SPACING.sm },
  groupTitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  chipRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  chipText: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold' },
});
