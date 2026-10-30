import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { RADIUS } from '@/constants/radius';

/**
 * MENÚ INFERIOR NUEVO (decisión (p) de DECISIONES-DISENO.md). PROTOTIPO: componente de presentación SIN enrutador (el estado llega por
 * props) que hoy solo se dibuja en la pantalla de desarrollo "Estados de Inicio (dev)". La barra real (BottomNavBar.tsx) NO cambia hasta
 * que Pía lo apruebe.
 *
 * Geometría (dp): fila de 64 + franja de 14 por encima (OPCIÓN B: reservada dentro de la barra, transparente y sin captar toques) + la
 * zona del sistema (insets.bottom), todo con el fondo carbón extendido hasta el borde inferior. Alto total = 14 + 64 + insets.bottom
 * (+ hasta 5 dp con la letra al máximo). El botón de Agenda mide 52, sobresale 14 por encima de la fila y queda por encima de la franja
 * del gesto del sistema; los cinco ítems también.
 */
export type NavV2Key = 'inicio' | 'comunidad' | 'agenda' | 'progreso' | 'perfil';

export const NAV_V2_ITEMS: { key: NavV2Key; label: string }[] = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'comunidad', label: 'Comunidad' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'progreso', label: 'Progreso' },
  { key: 'perfil', label: 'Perfil' },
];

/** Cuánto sobresale el botón de Agenda por encima de la fila (franja reservada). */
export const NAV_V2_RAISE = 14;
export const NAV_V2_ROW = 64;
const CIRCLE = 52;
const ICON = 22;
const LABEL_SIZE = 11;
const LABEL_LINE = 14;
const MAX_FONT_SCALE = 1.3;

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const FEATHER_ICONS: Partial<Record<NavV2Key, FeatherName>> = {
  inicio: 'home',
  comunidad: 'users',
  agenda: 'calendar',
  perfil: 'user',
};

/** Pesa dibujada con la misma grilla y el mismo trazo que Feather (viewBox 24, trazo 2, extremos redondeados). */
function DumbbellIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M3 9v6 M6 6v12 M6 12h12 M18 6v12 M21 9v6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function NavIcon({ item, color }: { item: NavV2Key; color: string }) {
  if (item === 'progreso') return <DumbbellIcon color={color} />;
  return <Feather name={FEATHER_ICONS[item]!} size={ICON} color={color} />;
}

export function BottomNavBarV2({
  selected,
  onSelect,
  bottomInset,
  stripColor = 'transparent',
  labelScale,
}: {
  selected: NavV2Key;
  onSelect: (key: NavV2Key) => void;
  /** Zona del sistema bajo la barra (insets.bottom): el carbón se extiende hasta el borde inferior. */
  bottomInset: number;
  /** Solo desarrollo: color que se ve en la franja de 14 dp junto al botón (en la app real es el fondo de la pantalla). */
  stripColor?: string;
  /** Solo desarrollo: simula la letra grande del sistema (por ejemplo 1,3) aunque el teléfono la tenga en normal. */
  labelScale?: number;
}) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const [agendaPressed, setAgendaPressed] = useState(false);
  const scale = labelScale ?? Math.min(fontScale, MAX_FONT_SCALE);
  // Con la letra grande la fila crece lo justo para que el rótulo de Agenda no toque el botón elevado.
  const rowHeight = NAV_V2_ROW + Math.ceil(LABEL_LINE * (scale - 1));

  const labelStyle = (active: boolean) => ({
    color: active ? colors.charcoalAccent : colors.charcoalMuted,
    fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium',
    fontSize: LABEL_SIZE * (labelScale ?? 1),
    lineHeight: LABEL_LINE * (labelScale ?? 1),
  });
  const labelProps = {
    numberOfLines: 1,
    maxFontSizeMultiplier: MAX_FONT_SCALE,
    // "Comunidad" en negrita mide 61,9 dp a 11 sp y la columna de 320 dp mide 64: con la letra grande se reduce hasta el 75 % para caber.
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.75,
  } as const;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      {/* Franja reservada del botón elevado: transparente y sin captar toques. */}
      <View pointerEvents="none" style={{ height: NAV_V2_RAISE, backgroundColor: stripColor }} />
      <View style={{ backgroundColor: colors.charcoal, paddingBottom: bottomInset }}>
        <View style={[styles.row, { height: rowHeight }]}>
          {NAV_V2_ITEMS.map((item) => {
            const active = item.key === selected;
            if (item.key === 'agenda') {
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(item.key)}
                  onPressIn={() => setAgendaPressed(true)}
                  onPressOut={() => setAgendaPressed(false)}
                  style={styles.item}
                >
                  <Text style={labelStyle(active)} {...labelProps}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }
            const color = active ? colors.charcoalAccent : colors.charcoalMuted;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(item.key)}
                // Presionado SÓLIDO (charcoalPressed); el ítem ya seleccionado no se rellena (tocarlo no navega).
                style={({ pressed }) => [styles.item, pressed && !active && { backgroundColor: colors.charcoalPressed }]}
              >
                {active ? <View style={[styles.activeBar, { backgroundColor: colors.charcoalAccent }]} /> : null}
                <View style={styles.iconSlot}>
                  <NavIcon item={item.key} color={color} />
                </View>
                <Text style={labelStyle(active)} {...labelProps}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {/* Botón de Agenda: sobresale NAV_V2_RAISE por encima de la fila, centrado. */}
      <View pointerEvents="box-none" style={styles.circleLayer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Agenda"
          accessibilityState={{ selected: selected === 'agenda' }}
          onPress={() => onSelect('agenda')}
          onPressIn={() => setAgendaPressed(true)}
          onPressOut={() => setAgendaPressed(false)}
          style={[
            styles.circle,
            {
              backgroundColor: agendaPressed ? colors.charcoalPressed : colors.charcoal,
              borderColor: colors.charcoalAccent,
              borderWidth: selected === 'agenda' ? 2.5 : 1.5,
            },
          ]}
        >
          <NavIcon item="agenda" color={selected === 'agenda' ? colors.charcoalAccent : colors.charcoalMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  row: { flexDirection: 'row' },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    gap: 4,
    borderRadius: RADIUS.lg,
  },
  iconSlot: { height: 30, width: 48, alignItems: 'center', justifyContent: 'center' },
  // Barra de acento de 3 px sobre el ícono de la opción seleccionada (siempre, no solo en el tema oscuro).
  activeBar: { position: 'absolute', top: 2, width: 20, height: 3, borderRadius: 2 },
  circleLayer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
