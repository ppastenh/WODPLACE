import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnnouncementModal } from '@/components/AnnouncementModal';
import { AppHeader } from '@/components/AppHeader';
import { BottomNavView, NAV_ITEMS, type NavKey } from '@/components/BottomNavBar';
import { HomeView, type HomeViewEvents } from '@/components/home/HomeView';
import { HomeViewV2, type HomeViewV2Events } from '@/components/home/HomeViewV2';
import {
  DEMO_ANNOUNCEMENT,
  DEV_GROUPS,
  buildDevState,
  defaultSelection,
  type DevSelection,
} from '@/components/home/devHomeStates';
import { ThemeOverride } from '@/context/ThemeContext';
import { useColors } from '@/hooks/useColors';
import type { ThemeMode } from '@/lib/theme';
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

const EVENTS_V2: HomeViewV2Events = {
  ...EVENTS,
  onMenu: simulated('Aquí se abriría el menú lateral.'),
  onBell: simulated('Aquí se abrirían las Notificaciones.'),
};

type Design = 'actual' | 'nuevo';
type Photo = 'ok' | 'falla';

// Menú inferior (decisión (p)): aquí se dibuja la parte de presentación de la barra real para probar sus estados, el ancho y la letra.
type MenuWidth = 'real' | '360' | '320';
type MenuFont = 'sistema' | '1' | '1.1' | '1.3';
const MENU_SELECTED_CHIPS = NAV_ITEMS.map((item) => ({ id: item.key, label: item.label }));
const MENU_WIDTH_CHIPS: { id: MenuWidth; label: string }[] = [
  { id: 'real', label: 'Ancho: real' },
  { id: '360', label: 'Ancho: 360' },
  { id: '320', label: 'Ancho: 320' },
];
const MENU_FONT_CHIPS: { id: MenuFont; label: string }[] = [
  { id: 'sistema', label: 'Letra: del sistema' },
  { id: '1', label: 'Letra: 1,0' },
  { id: '1.1', label: 'Letra: 1,1' },
  { id: '1.3', label: 'Letra: 1,3' },
];

const DESIGN_CHIPS: { id: Design; label: string }[] = [
  { id: 'actual', label: 'Diseño: actual' },
  { id: 'nuevo', label: 'Diseño: nuevo' },
];
const THEME_CHIPS: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
];
const PHOTO_CHIPS: { id: Photo; label: string }[] = [
  { id: 'ok', label: 'Foto: carga' },
  { id: 'falla', label: 'Foto: falla' },
];

/**
 * Estados de Inicio (dev). Solo se carga con __DEV__ (ver app/dev-home.tsx): dibuja Inicio con datos inventados
 * (components/home/devHomeStates.ts), sin llamadas al servidor ni a la base. "Diseño: actual" es el HomeView real;
 * "Diseño: nuevo" es HomeViewV2 (decisión (k) de DECISIONES-DISENO.md), que solo existe aquí.
 */
export default function DevHomeScreen() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [design, setDesign] = useState<Design>('actual');
  return (
    <ThemeOverride mode={themeMode}>
      <DevHomeBody themeMode={themeMode} onThemeMode={setThemeMode} design={design} onDesign={setDesign} />
    </ThemeOverride>
  );
}

function ChipGroup<T extends string>({
  title,
  chips,
  selected,
  onSelect,
}: {
  title: string;
  chips: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.navInactive }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {chips.map((chip) => {
          const isSelected = selected === chip.id;
          return (
            <Pressable
              key={chip.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(chip.id)}
              style={[styles.chip, { backgroundColor: isSelected ? colors.accent : colors.input }]}
            >
              <Text style={[styles.chipText, { color: isSelected ? colors.accentForeground : colors.foreground }]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DevHomeBody({
  themeMode,
  onThemeMode,
  design,
  onDesign,
}: {
  themeMode: ThemeMode;
  onThemeMode: (mode: ThemeMode) => void;
  design: Design;
  onDesign: (design: Design) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<DevSelection>(defaultSelection);
  const [photo, setPhoto] = useState<Photo>('ok');
  const [menuSel, setMenuSel] = useState<NavKey>('inicio');
  const [menuWidth, setMenuWidth] = useState<MenuWidth>('real');
  const [menuFont, setMenuFont] = useState<MenuFont>('sistema');
  const { width: screenWidth, fontScale } = useWindowDimensions();
  // Con el diseño actual el panel va arriba y abierto; con el nuevo va plegado al pie, para no tapar la barra superior.
  const [chipsOpen, setChipsOpen] = useState(true);
  const state = useMemo(() => buildDevState(selection), [selection]);

  const changeDesign = (next: Design) => {
    onDesign(next);
    setChipsOpen(next === 'actual');
  };

  const panel = (
    <View
      style={[
        styles.panel,
        design === 'actual' ? { borderBottomWidth: 1 } : { borderTopWidth: 1 },
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Pressable accessibilityRole="button" onPress={() => setChipsOpen((v) => !v)} style={styles.panelHeader}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>
          Estados de Inicio (dev) · datos inventados
        </Text>
        <Text style={[styles.panelToggle, { color: colors.accentForeground }]}>{chipsOpen ? 'Ocultar' : 'Mostrar'}</Text>
      </Pressable>
      <Text style={[styles.insetsLine, { color: colors.navInactive }]}>
        insets.bottom: {insets.bottom.toFixed(1)} dp · ancho: {Math.round(screenWidth)} dp · letra del sistema: ×{fontScale.toFixed(2)}
      </Text>
      {chipsOpen ? (
        <ScrollView style={styles.chipsScroll} nestedScrollEnabled>
          <ChipGroup title="Diseño de Inicio" chips={DESIGN_CHIPS} selected={design} onSelect={changeDesign} />
          {design === 'actual' ? (
            <ChipGroup title="Tema (solo esta pantalla)" chips={THEME_CHIPS} selected={themeMode} onSelect={onThemeMode} />
          ) : (
            <>
              <ChipGroup title="Foto del banner" chips={PHOTO_CHIPS} selected={photo} onSelect={setPhoto} />
              <ChipGroup title="Menú: opción seleccionada" chips={MENU_SELECTED_CHIPS} selected={menuSel} onSelect={setMenuSel} />
              <ChipGroup title="Menú: ancho simulado" chips={MENU_WIDTH_CHIPS} selected={menuWidth} onSelect={setMenuWidth} />
              <ChipGroup title="Menú: letra simulada" chips={MENU_FONT_CHIPS} selected={menuFont} onSelect={setMenuFont} />
            </>
          )}
          {DEV_GROUPS.map((group) => (
            <ChipGroup
              key={group.id}
              title={group.title}
              chips={group.options}
              selected={selection[group.id] ?? group.options[0]!.id}
              onSelect={(id) => setSelection((s) => ({ ...s, [group.id]: id }))}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const popup = (
    <AnnouncementModal
      visible={state.popup}
      announcement={DEMO_ANNOUNCEMENT}
      onClose={() => setSelection((s) => ({ ...s, popup: 'cerrado' }))}
      onConfirmRead={() => {}}
    />
  );

  const menuNode = (
    <View style={{ alignSelf: 'center', width: menuWidth === 'real' ? '100%' : Number(menuWidth) }}>
      <BottomNavView
        selected={menuSel}
        onSelect={setMenuSel}
        bottomInset={insets.bottom}
        stripColor={design === 'nuevo' ? colors.cream : colors.background}
        labelScale={menuFont === 'sistema' ? undefined : Number(menuFont)}
      />
    </View>
  );

  if (design === 'nuevo') {
    return (
      <View style={[styles.container, { backgroundColor: colors.charcoal }]}>
        {/* Íconos claros de la barra de estado SOLO mientras esta pantalla está en "nuevo": el componente se desmonta al
            cambiar a "actual" o al salir, y React Native restaura el estilo que había antes. */}
        <StatusBar style="light" />
        <HomeViewV2 data={state} events={EVENTS_V2} photoFails={photo === 'falla'} />
        {panel}
        {menuNode}
        {popup}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell unreadCount={state.unreadCount} onBack={() => router.back()} />
      {panel}
      <HomeView data={state} events={EVENTS} />
      {menuNode}
      {popup}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: {},
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
  insetsLine: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
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
