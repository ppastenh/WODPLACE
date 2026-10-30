import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { RADIUS } from '@/constants/radius';

/**
 * MENÚ INFERIOR (decisión (p) de DECISIONES-DISENO.md, aprobada como diseño definitivo; aplicada a la app real por la decisión (q)).
 * `BottomNavView` es la parte de presentación (sin enrutador: el estado llega por props, así la pantalla de desarrollo la usa para
 * probar estados); `BottomNavBar` la conecta al enrutador y es lo que dibuja app/_layout.tsx en las cuatro pantallas principales.
 *
 * Geometría (dp): fila de 64 + franja de 14 por encima (OPCIÓN B: reservada dentro de la barra, transparente y sin captar toques) + la
 * zona del sistema (insets.bottom), todo con el fondo carbón extendido hasta el borde inferior. Alto total = 14 + 64 + insets.bottom
 * (+ hasta 2 dp con la letra a 1,1). Sin barra de acento: la opción seleccionada se distingue por el cobre claro, la negrita y
 * accessibilityState selected. El botón de Agenda mide 52, sobresale 14 por encima de la fila y queda por encima de la franja del
 * gesto del sistema; los cinco ítems también. Presionado SIEMPRE con color sólido (nunca opacidad).
 */
export type NavKey = 'inicio' | 'comunidad' | 'agenda' | 'progreso' | 'perfil';
type NavRoute = '/home' | '/community' | '/calendar' | '/rm' | '/profile';

// Agenda va al Calendario y Progreso a /rm, como siempre.
export const NAV_ITEMS: { key: NavKey; label: string; route: NavRoute }[] = [
  { key: 'inicio', label: 'Inicio', route: '/home' },
  { key: 'comunidad', label: 'Comunidad', route: '/community' },
  { key: 'agenda', label: 'Agenda', route: '/calendar' },
  { key: 'progreso', label: 'Progreso', route: '/rm' },
  { key: 'perfil', label: 'Perfil', route: '/profile' },
];

// `/rm` es su propio navegador con una barra inferior propia (RmBottomNav), así que la barra de toda la app se oculta ahí: no va en esta lista.
export const BOTTOM_NAV_ROUTES = NAV_ITEMS.filter((item) => item.route !== '/rm').map((item) => item.route) as NavRoute[];

function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function isBottomNavRoute(pathname: string): pathname is NavRoute {
  return BOTTOM_NAV_ROUTES.includes(normalizePath(pathname) as NavRoute);
}

/** Cuánto sobresale el botón de Agenda por encima de la fila (franja reservada). */
export const NAV_RAISE = 14;
export const NAV_ROW = 64;
const CIRCLE = 52;
const ICON = 22;
const LABEL_SIZE = 11;
const LABEL_LINE = 14;
/** Crecimiento máximo de los rótulos con la letra grande del sistema: 1,1 veces (1,0 si la barra mide menos de 340 dp). */
const MAX_FONT_SCALE = 1.1;
const NARROW_WIDTH = 340;

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const FEATHER_ICONS: Partial<Record<NavKey, FeatherName>> = {
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

function NavIcon({ item, color }: { item: NavKey; color: string }) {
  if (item === 'progreso') return <DumbbellIcon color={color} />;
  return <Feather name={FEATHER_ICONS[item]!} size={ICON} color={color} />;
}

export function BottomNavView({
  selected,
  onSelect,
  bottomInset,
  stripColor = 'transparent',
  labelScale,
}: {
  /** Opción seleccionada (null si la ruta actual no es ninguna de las cinco). */
  selected: NavKey | null;
  onSelect: (key: NavKey) => void;
  /** Zona del sistema bajo la barra (insets.bottom): el carbón se extiende hasta el borde inferior. */
  bottomInset: number;
  /** Color que se ve en la franja de 14 dp junto al botón: el fondo de la pantalla que hay detrás. */
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
  const rowHeight = NAV_ROW + Math.ceil(LABEL_LINE * (scale - 1));

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
    <View pointerEvents="box-none" accessibilityRole="tablist" style={styles.wrapper} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
      {/* Franja reservada del botón elevado: transparente y sin captar toques. */}
      <View pointerEvents="none" style={{ height: NAV_RAISE, backgroundColor: stripColor }} />
      <View style={{ backgroundColor: colors.charcoal, paddingBottom: bottomInset }}>
        <View style={[styles.row, { height: rowHeight }]}>
          {NAV_ITEMS.map((item) => {
            const active = item.key === selected;
            if (item.key === 'agenda') {
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
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
                accessibilityRole="tab"
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
      {/* Botón de Agenda: sobresale NAV_RAISE por encima de la fila, centrado. */}
      <View
        pointerEvents="box-none"
        style={styles.circleLayer}
        // El lector de pantalla anuncia la columna de Agenda (misma opción, mismo orden); el círculo solo es táctil.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Pressable
          accessibilityRole="tab"
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

/** Barra real, conectada al enrutador. Conserva los nombres exportados de siempre (BottomNavBar, isBottomNavRoute). */
export function BottomNavBar() {
  const colors = useColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const path = normalizePath(pathname);
  const selected = NAV_ITEMS.find((item) => item.route === path)?.key ?? null;
  // La franja de 14 dp deja ver el fondo de la pantalla: Inicio es de crema fija; las demás siguen el tema.
  const stripColor = path === '/home' ? colors.cream : colors.background;

  const handleSelect = (key: NavKey) => {
    const item = NAV_ITEMS.find((i) => i.key === key);
    if (!item) return;
    Haptics.selectionAsync().catch(() => {});
    if (path !== item.route) router.replace(item.route);
  };

  return <BottomNavView selected={selected} onSelect={handleSelect} bottomInset={bottomInset} stripColor={stripColor} />;
}
