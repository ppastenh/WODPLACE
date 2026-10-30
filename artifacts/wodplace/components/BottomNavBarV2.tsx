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
 * (+ hasta 2 dp con la letra a 1,1). Sin barra de acento: la opción seleccionada se distingue por el cobre claro y la negrita. El botón de Agenda mide 52, sobresale 14 por encima de la fila y queda por encima de la franja
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
/** Crecimiento máximo de los rótulos con la letra grande del sistema: 1,1 veces (1,0 si la barra mide menos de 340 dp). */
const MAX_FONT_SCALE = 1.1;
const NARROW_WIDTH = 340;

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
  const { fontScale, width: windowWidth } = useWindowDimensions();
  const [barWidth, setBarWidth] = useState(windowWidth);
  const inactive = colors.charcoalMuted;
  const accent = colors.charcoalAccentLight;
  const [agendaPressed, setAgendaPressed] = useState(false);
  const cap = barWidth < NARROW_WIDTH ? 1 : MAX_FONT_SCALE;
  const scale = Math.min(labelScale ?? fontScale, cap);
  // Con la letra grande la fila crece lo justo para que el rótulo de Agenda no toque el botón elevado.
  const rowHeight = NAV_V2_ROW + Math.ceil(LABEL_LINE * (scale - 1));

  // Con la letra simulada (solo desarrollo) el tamaño se calcula aquí y se apaga el escalado del sistema para no escalar dos veces.
  const simulated = labelScale !== undefined;
  const labelStyle = (active: boolean) => ({
    color: active ? accent : inactive,
    fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium',
    fontSize: LABEL_SIZE * (simulated ? scale : 1),
    lineHeight: LABEL_LINE * (simulated ? scale : 1),
  });
  const labelProps = {
    numberOfLines: 1,
    maxFontSizeMultiplier: cap,
    allowFontScaling: !simulated,
  } as const;

  return (
    <View pointerEvents="box-none" style={styles.wrapper} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
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
            const color = active ? accent : inactive;
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
              borderColor: accent,
              borderWidth: selected === 'agenda' ? 2.5 : 1.5,
            },
          ]}
        >
          <NavIcon item="agenda" color={selected === 'agenda' ? accent : inactive} />
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
  circleLayer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
