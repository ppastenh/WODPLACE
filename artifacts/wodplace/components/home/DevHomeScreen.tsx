import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnnouncementModal } from '@/components/AnnouncementModal';
import { BottomNavView, NAV_ITEMS, type NavKey } from '@/components/BottomNavBar';
import { HomeView, type HomeViewEvents } from '@/components/home/HomeView';
import { QUOTE_LOOK, type QuoteCenter, type QuoteHighlight, type QuoteLook, type QuoteVariant } from '@/components/home/DailyQuoteCard';
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
import { MEDALS_LOOK, type MedalsLook, type MedalsVariant } from '@/components/home/MedalsCard';
import type { MedalsGradient } from '@/components/home/medalsColors';
import { LaurelStudy } from '@/components/home/LaurelStudy';
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
// Tarjeta de frases del día (decisión (s)): variante, largo de la frase, resaltado y centrado de la frase corta.
const QUOTE_VARIANT_CHIPS: { id: QuoteVariant; label: string }[] = [
  { id: 'actual', label: 'Frase: actual' },
  { id: 'editorialCream', label: 'Frase: C editorial' },
];
// Frases de largo exacto para medir el alto de la tarjeta (se cortan de un texto base y terminan en punto).
const QUOTE_BASE =
  'La constancia de hoy construye la fuerza de mañana, y cada repetición cuenta cuando eliges seguir avanzando, porque entrenar también es una forma de cuidar tu mente y tu cuerpo todos los días del año y de volver a intentarlo con calma.';
const phraseOf = (n: number): string => {
  let t = QUOTE_BASE.slice(0, n - 1);
  if (t.endsWith(' ')) t = t.slice(0, -1) + 'o';
  return t + '.';
};
type QuoteLength = 'corta' | 'media' | 'larga' | 'marcada' | 'c62' | 'c85' | 'c105' | 'c125';
const QUOTE_LENGTHS: Record<QuoteLength, string> = {
  corta: 'Vuelve a intentarlo.',
  media: 'La constancia de hoy construye la fuerza de mañana.',
  larga: 'No necesitas hacerlo perfecto; necesitas volver a intentarlo.', // la más larga de las 5 reales (61 caracteres)
  marcada: 'Tu constancia es *tu mejor entrenamiento* siempre.', // con marcado manual (*…*)
  c62: phraseOf(62),
  c85: phraseOf(85),
  c105: phraseOf(105),
  c125: phraseOf(125),
};
const QUOTE_LENGTH_CHIPS: { id: QuoteLength; label: string }[] = [
  { id: 'corta', label: 'Largo: corta' },
  { id: 'media', label: 'Largo: media' },
  { id: 'larga', label: 'Largo: la más larga de las reales' },
  { id: 'c62', label: 'Largo: 62 caracteres' },
  { id: 'c85', label: 'Largo: 85 caracteres' },
  { id: 'c105', label: 'Largo: 105 caracteres' },
  { id: 'c125', label: 'Largo: 125 caracteres' },
  { id: 'marcada', label: 'Largo: con marcado manual *…*' },
];
const QUOTE_SHADOW_CHIPS: { id: 'no' | 'si'; label: string }[] = [
  { id: 'no', label: 'Sombra del resaltado: no' },
  { id: 'si', label: 'Sombra del resaltado: sí' },
];
const QUOTE_HL_STYLE_CHIPS: { id: QuoteHighlight; label: string }[] = [
  { id: 'cobre', label: 'Resaltado: texto cobre' },
  { id: 'marcador', label: 'Resaltado: marcador cobre' },
  { id: 'subrayado', label: 'Resaltado: subrayado' },
];
// Tarjeta "Progreso mensual" (decisión (v)): letra simulada para probar el tope de 1,3 (la versión de la tarjeta es una sola).
const PROGRESS_FONT_CHIPS: { id: QuoteFont; label: string }[] = [
  { id: '1', label: 'Progreso, letra simulada: 1,0' },
  { id: '1.1', label: 'Progreso, letra simulada: 1,1' },
  { id: '1.3', label: 'Progreso, letra simulada: 1,3' },
];
type QuoteFont = '1' | '1.1' | '1.3';
// Recuadros "Tu nivel" y "Racha de constancia" (decisión (w), opción E en grafito): ancho y letra simulados para probar el caso angosto. Solo desarrollo.
// Tarjeta "PR destacado" (decisión (x)): ancho y letra simulados para probar el caso angosto. Solo desarrollo.
// Tarjeta "Medallas" (decisión (y)): diseño, degradado, corona de laurel, ancho y letra simulados. Solo desarrollo.
const MEDALS_VARIANT_CHIPS: { id: MedalsVariant; label: string }[] = [
  { id: 'actual', label: 'Medallas: actual' },
  { id: 'cobre', label: 'Medallas: cobre' },
];
const MEDALS_GRADIENT_CHIPS: { id: MedalsGradient; label: string }[] = [
  { id: 'legible', label: 'Degradado: legible' },
  { id: 'pedido', label: 'Degradado: como lo pedí' },
];
const MEDALS_SCALE_LAUREL_CHIPS: { id: '1' | '0.95' | '0.9' | '0.85'; label: string }[] = [
  { id: '0.85', label: 'Escala del laurel: 85 %' },
  { id: '0.9', label: 'Escala del laurel: 90 %' },
  { id: '0.95', label: 'Escala del laurel: 95 %' },
  { id: '1', label: 'Escala del laurel: 100 %' },
];
const MEDALS_WIDTH_CHIPS: { id: LevelWidth; label: string }[] = [
  { id: 'real', label: 'Medallas, ancho: real' },
  { id: '412', label: 'Medallas, ancho: 412' },
  { id: '360', label: 'Medallas, ancho: 360' },
  { id: '320', label: 'Medallas, ancho: 320' },
];
const MEDALS_SCALE_CHIPS: { id: QuoteFont; label: string }[] = [
  { id: '1', label: 'Medallas, letra simulada: 1,0' },
  { id: '1.1', label: 'Medallas, letra simulada: 1,1' },
  { id: '1.3', label: 'Medallas, letra simulada: 1,3' },
];
const PR_WIDTH_CHIPS: { id: LevelWidth; label: string }[] = [
  { id: 'real', label: 'PR, ancho: real' },
  { id: '412', label: 'PR, ancho: 412' },
  { id: '360', label: 'PR, ancho: 360' },
  { id: '320', label: 'PR, ancho: 320' },
];
const PR_SCALE_CHIPS: { id: QuoteFont; label: string }[] = [
  { id: '1', label: 'PR, letra simulada: 1,0' },
  { id: '1.1', label: 'PR, letra simulada: 1,1' },
  { id: '1.3', label: 'PR, letra simulada: 1,3' },
];
type LevelWidth = 'real' | '412' | '360' | '320';
const LEVEL_WIDTH_CHIPS: { id: LevelWidth; label: string }[] = [
  { id: 'real', label: 'Nivel y racha, ancho: real' },
  { id: '412', label: 'Nivel y racha, ancho: 412' },
  { id: '360', label: 'Nivel y racha, ancho: 360' },
  { id: '320', label: 'Nivel y racha, ancho: 320' },
];
const LEVEL_SCALE_CHIPS: { id: QuoteFont; label: string }[] = [
  { id: '1', label: 'Nivel y racha, letra simulada: 1,0' },
  { id: '1.1', label: 'Nivel y racha, letra simulada: 1,1' },
  { id: '1.3', label: 'Nivel y racha, letra simulada: 1,3' },
];
const QUOTE_FONT_CHIPS: { id: QuoteFont; label: string }[] = [
  { id: '1', label: 'Letra simulada: 1,0' },
  { id: '1.1', label: 'Letra simulada: 1,1' },
  { id: '1.3', label: 'Letra simulada: 1,3' },
];
const QUOTE_HIGHLIGHT_CHIPS: { id: 'si' | 'no'; label: string }[] = [
  { id: 'si', label: 'Resaltado: sí' },
  { id: 'no', label: 'Resaltado: no' },
];
const QUOTE_CENTER_CHIPS: { id: QuoteCenter; label: string }[] = [
  { id: 'vertical', label: 'Frase corta: centrada vertical' },
  { id: 'ambos', label: 'Frase corta: centrada vertical y horizontal' },
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
  const [quoteVariant, setQuoteVariant] = useState<QuoteVariant>(QUOTE_LOOK.variant);
  const [quoteLength, setQuoteLength] = useState<QuoteLength>('media');
  const [quoteHighlight, setQuoteHighlight] = useState<'si' | 'no'>('si');
  const [quoteCenter, setQuoteCenter] = useState<QuoteCenter>(QUOTE_LOOK.center);
  const [quoteFont, setQuoteFont] = useState<QuoteFont>('1');
  const [quoteHlStyle, setQuoteHlStyle] = useState<QuoteHighlight>('cobre');
  const [progressFont, setProgressFont] = useState<QuoteFont>('1');
  const [levelWidth, setLevelWidth] = useState<LevelWidth>('real');
  const [levelScale, setLevelScale] = useState<QuoteFont>('1');
  const [prWidth, setPrWidth] = useState<LevelWidth>('real');
  const [prScale, setPrScale] = useState<QuoteFont>('1');
  const [medalsVariant, setMedalsVariant] = useState<MedalsVariant>(MEDALS_LOOK.variant);
  const [medalsGradient, setMedalsGradient] = useState<MedalsGradient>(MEDALS_LOOK.gradient);
  const [medalsLaurelScale, setMedalsLaurelScale] = useState<'1' | '0.95' | '0.9' | '0.85'>(String(MEDALS_LOOK.laurelScale) as '1' | '0.95' | '0.9' | '0.85');
  const [medalsWidth, setMedalsWidth] = useState<LevelWidth>('real');
  const [medalsScale, setMedalsScale] = useState<QuoteFont>('1');
  const medalsLook: MedalsLook = { variant: medalsVariant, gradient: medalsGradient, laurelScale: Number(medalsLaurelScale) };
  const [quoteShadow, setQuoteShadow] = useState<'no' | 'si'>('no');
  const quoteLook: QuoteLook = {
    variant: quoteVariant,
    highlight: quoteHighlight === 'si',
    center: quoteCenter,
    fontScale: Number(quoteFont),
    highlightStyle: quoteHlStyle,
    highlightShadow: quoteShadow === 'si',
  };
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
          <ChipGroup title="Tarjeta Progreso mensual: letra simulada" chips={PROGRESS_FONT_CHIPS} selected={progressFont} onSelect={setProgressFont} />
          <ChipGroup title="Nivel y racha: ancho simulado" chips={LEVEL_WIDTH_CHIPS} selected={levelWidth} onSelect={setLevelWidth} />
          <ChipGroup title="Nivel y racha: letra simulada" chips={LEVEL_SCALE_CHIPS} selected={levelScale} onSelect={setLevelScale} />
          <ChipGroup title="PR destacado: ancho simulado" chips={PR_WIDTH_CHIPS} selected={prWidth} onSelect={setPrWidth} />
          <ChipGroup title="PR destacado: letra simulada" chips={PR_SCALE_CHIPS} selected={prScale} onSelect={setPrScale} />
          <ChipGroup title="Medallas: diseño" chips={MEDALS_VARIANT_CHIPS} selected={medalsVariant} onSelect={setMedalsVariant} />
          <ChipGroup title="Medallas: degradado" chips={MEDALS_GRADIENT_CHIPS} selected={medalsGradient} onSelect={setMedalsGradient} />
          <ChipGroup title="Medallas: escala del laurel" chips={MEDALS_SCALE_LAUREL_CHIPS} selected={medalsLaurelScale} onSelect={setMedalsLaurelScale} />
          <ChipGroup title="Medallas: ancho simulado" chips={MEDALS_WIDTH_CHIPS} selected={medalsWidth} onSelect={setMedalsWidth} />
          <ChipGroup title="Medallas: letra simulada" chips={MEDALS_SCALE_CHIPS} selected={medalsScale} onSelect={setMedalsScale} />
          <ChipGroup title="Frase del día: variante" chips={QUOTE_VARIANT_CHIPS} selected={quoteVariant} onSelect={setQuoteVariant} />
          <ChipGroup title="Frase del día: largo" chips={QUOTE_LENGTH_CHIPS} selected={quoteLength} onSelect={setQuoteLength} />
          <ChipGroup title="Frase del día: letra simulada" chips={QUOTE_FONT_CHIPS} selected={quoteFont} onSelect={setQuoteFont} />
          <ChipGroup title="Frase del día: sombra del resaltado (solo desarrollo)" chips={QUOTE_SHADOW_CHIPS} selected={quoteShadow} onSelect={setQuoteShadow} />
          <ChipGroup title="Frase del día: estilo del resaltado" chips={QUOTE_HL_STYLE_CHIPS} selected={quoteHlStyle} onSelect={setQuoteHlStyle} />
          <ChipGroup title="Frase del día: resaltado" chips={QUOTE_HIGHLIGHT_CHIPS} selected={quoteHighlight} onSelect={setQuoteHighlight} />
          <ChipGroup title="Frase del día: frase corta" chips={QUOTE_CENTER_CHIPS} selected={quoteCenter} onSelect={setQuoteCenter} />
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
          <LaurelStudy />
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
      <HomeView
        data={{ ...state, quote: QUOTE_LENGTHS[quoteLength] }}
        events={EVENTS}
        photoFails={photo === 'falla'}
        nextClassLook={look}
        quoteLook={quoteLook}
        progressFontScale={Number(progressFont)}
        levelStreakFontScale={Number(levelScale)}
        levelStreakWidth={levelWidth === 'real' ? undefined : Number(levelWidth)}
        prFontScale={Number(prScale)}
        prWidth={prWidth === 'real' ? undefined : Number(prWidth)}
        medalsLook={medalsLook}
        medalsFontScale={Number(medalsScale)}
        medalsWidth={medalsWidth === 'real' ? undefined : Number(medalsWidth)}
      />
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
