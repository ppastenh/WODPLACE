import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnnouncementModal } from '@/components/AnnouncementModal';
import { BottomNavView, NAV_ITEMS, type NavKey } from '@/components/BottomNavBar';
import { HomeView, type HomeViewEvents } from '@/components/home/HomeView';
import {
  NEXT_CLASS_LOOK,
  NEXT_CLASS_TEXTURE,
  NEXT_CLASS_TEXTURE_ARO,
  type NextClassCapsule,
  type NextClassCopper,
  type NextClassLook,
  type NextClassTexture,
} from '@/components/home/NextClassCard';
import {
  DEMO_ANNOUNCEMENT,
  DEV_GROUPS,
  buildDevState,
  defaultSelection,
  type DevSelection,
} from '@/components/home/devHomeStates';
import { ThemeOverride } from '@/context/ThemeContext';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

const simulated = (what: string) => () => Alert.alert('Toque simulado', what);

const EVENTS: HomeViewEvents = {
  onMenu: simulated('Aquí se abriría el menú lateral.'),
  onBell: simulated('Aquí se abrirían las Notificaciones.'),
  onJoinBox: simulated('Aquí se abriría "Unirte a un box".'),
  onOpenCalendar: simulated('Aquí se abriría el Calendario.'),
  onOpenContracts: simulated('Aquí se abriría Contratos Activos.'),
  onOpenWod: simulated('Aquí se abriría el WOD de hoy.'),
  onOpenRm: simulated('Aquí se abriría Progreso y PRs.'),
  onOpenProfile: simulated('Aquí se abrirían tus Datos personales.'),
  onOpenMedals: simulated('Aquí se abrirían las Medallas.'),
  onShareQuote: simulated('Aquí se abriría el menú de compartir.'),
};

type Photo = 'ok' | 'falla';

// Tarjeta "Tu próxima clase" (decisión (r)): cápsula de la fecha, cobre y textura. La textura de por defecto es la pizarra elegida por Pía
// (home-card-pizarra.jpg); los patrones (rombos, líneas, puntos) se dibujan en código y el aro es un recorte de la foto del banner.
type Texture = 'pizarra' | 'rombos' | 'lineas' | 'puntos' | 'aro' | 'ninguna';
const TEXTURES: Record<Texture, NextClassTexture> = {
  pizarra: NEXT_CLASS_TEXTURE,
  rombos: { kind: 'pattern', pattern: 'rombos' },
  lineas: { kind: 'pattern', pattern: 'lineas' },
  puntos: { kind: 'pattern', pattern: 'puntos' },
  aro: NEXT_CLASS_TEXTURE_ARO,
  ninguna: null,
};
const CAPSULE_CHIPS: { id: NextClassCapsule; label: string }[] = [
  { id: 'A', label: 'Cápsula: A' },
  { id: 'B', label: 'Cápsula: B' },
  { id: 'C', label: 'Cápsula: C' },
];
const COPPER_CHIPS: { id: NextClassCopper; label: string }[] = [
  { id: 'base', label: 'Cobre: #B98250' },
  { id: 'claro', label: 'Cobre: #C79A6B' },
];
const TEXTURE_CHIPS: { id: Texture; label: string }[] = [
  { id: 'pizarra', label: 'Textura: pizarra' },
  { id: 'rombos', label: 'Textura: rombos' },
  { id: 'lineas', label: 'Textura: líneas' },
  { id: 'puntos', label: 'Textura: puntos' },
  { id: 'aro', label: 'Textura: aro' },
  { id: 'ninguna', label: 'Textura: ninguna' },
];

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

const PHOTO_CHIPS: { id: Photo; label: string }[] = [
  { id: 'ok', label: 'Foto: carga' },
  { id: 'falla', label: 'Foto: falla' },
];

/**
 * Estados de Inicio (dev). Solo se carga con __DEV__ (ver app/dev-home.tsx): dibuja el Inicio real (HomeView, decisión (q) de
 * DECISIONES-DISENO.md) con datos inventados (components/home/devHomeStates.ts), sin llamadas al servidor ni a la base, y la parte de
 * presentación del menú inferior para probar sus estados, el ancho y la letra.
 */
export default function DevHomeScreen() {
  // Inicio es de claro fijo: esta pantalla también.
  return (
    <ThemeOverride mode="light">
      <DevHomeBody />
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

function DevHomeBody() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<DevSelection>(defaultSelection);
  const [photo, setPhoto] = useState<Photo>('ok');
  const [capsule, setCapsule] = useState<NextClassCapsule>(NEXT_CLASS_LOOK.capsule);
  const [copper, setCopper] = useState<NextClassCopper>(NEXT_CLASS_LOOK.copper);
  const [texture, setTexture] = useState<Texture>('pizarra');
  const look: NextClassLook = { capsule, copper, texture: TEXTURES[texture] };
  const [menuSel, setMenuSel] = useState<NavKey>('inicio');
  const [menuWidth, setMenuWidth] = useState<MenuWidth>('real');
  const [menuFont, setMenuFont] = useState<MenuFont>('sistema');
  const { width: screenWidth, fontScale } = useWindowDimensions();
  // El panel va plegado al pie, para no tapar la barra superior.
  const [chipsOpen, setChipsOpen] = useState(false);
  const state = useMemo(() => buildDevState(selection), [selection]);

  const panel = (
    <View
      style={[
        styles.panel,
        { borderTopWidth: 1 },
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
          <ChipGroup title="Foto del banner" chips={PHOTO_CHIPS} selected={photo} onSelect={setPhoto} />
          <ChipGroup title="Tarjeta de próxima clase: cápsula" chips={CAPSULE_CHIPS} selected={capsule} onSelect={setCapsule} />
          <ChipGroup title="Tarjeta de próxima clase: cobre" chips={COPPER_CHIPS} selected={copper} onSelect={setCopper} />
          <ChipGroup title="Tarjeta de próxima clase: textura" chips={TEXTURE_CHIPS} selected={texture} onSelect={setTexture} />
          <ChipGroup title="Menú: opción seleccionada" chips={MENU_SELECTED_CHIPS} selected={menuSel} onSelect={setMenuSel} />
          <ChipGroup title="Menú: ancho simulado" chips={MENU_WIDTH_CHIPS} selected={menuWidth} onSelect={setMenuWidth} />
          <ChipGroup title="Menú: letra simulada" chips={MENU_FONT_CHIPS} selected={menuFont} onSelect={setMenuFont} />
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
        stripColor={colors.cream}
        labelScale={menuFont === 'sistema' ? undefined : Number(menuFont)}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.charcoal }]}>
      <HomeView data={state} events={EVENTS} photoFails={photo === 'falla'} nextClassLook={look} />
      {panel}
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
