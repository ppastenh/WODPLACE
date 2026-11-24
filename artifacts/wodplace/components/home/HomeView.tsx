import React, { useCallback, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  BoxAnnouncement,
  MyPlan,
  SkillLevel,
  TodayWod,
  UpcomingBirthday,
} from '@workspace/api-client-react';
import { JoinBoxCard } from '@/components/JoinBoxCard';
import { MedalBadge } from '@/components/MedalBadge';
import { DailyQuoteCard, QUOTE_LOOK, type QuoteLook } from '@/components/home/DailyQuoteCard';
import { NEXT_CLASS_LOOK, NextClassCard, type NextClassLook } from '@/components/home/NextClassCard';
import { OwnBirthdayCardNew, UpcomingBirthdaysSectionNew } from '@/components/home/BirthdayCardsNew';
import {
  PendingContractCard,
  PinnedAvisoCard,
  PlanNoticeCard,
  WodTodayCard,
  getFirstName,
} from '@/components/home/ConditionalCards';
import { MonthlyProgressCard } from '@/components/home/MonthlyProgressCard';
import { LevelStreakCards } from '@/components/home/LevelStreakCards';
import { PrHighlightCard } from '@/components/home/PrHighlightCard';
import { MEDALS_LOOK, MedalsCard, type MedalsLook } from '@/components/home/MedalsCard';
import { medalsStatusOf } from '@/components/home/medalsModel';
import type { PrStatus } from '@/components/home/prHighlightModel';
import { NoBoxCard } from '@/components/home/NoBoxCard';
import { WodCard } from '@/components/home/WodCard';
import { todayKeyInChile, wodCardView, type WodStatus } from '@/components/home/wodCardModel';
import type { StreakStatus } from '@/components/home/levelStreakModel';
import type { useBooking } from '@/context/BookingContext';
import { ThemeOverride, useTheme } from '@/context/ThemeContext';
import { useColors } from '@/hooks/useColors';
import { statusBarStyleFor } from '@/lib/theme';
import type { nextClassCardState } from '@/lib/nextClassCard';
import type { PlanProgressView } from '@/lib/planProgress';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * DISEÑO NUEVO DE INICIO (decisión (k) de DECISIONES-DISENO.md; aplicado a la app real por la decisión (q)). Antes era HomeViewV2: este
 * archivo reemplazó al HomeView antiguo (queda en el historial de git). Es de CLARO FIJO (no sigue el tema): Inicio siempre se ve claro.
 *
 *  - Barra superior de carbón SÓLIDO (menú a la izquierda, logo WODPLACE en Anton, campana con punto cobre), fija arriba y siempre
 *    sólida; cubre también la zona de la barra de estado. El banner empieza justo debajo de ella (decisión (l)).
 *  - Banner con la foto home-banner-anillo.jpg (decorativa), velo oscuro y una tarjeta de vidrio informativa (sin toque) con avatar,
 *    nombre del box y saludo. SIN desenfoque real: negro al 60 % con borde blanco muy sutil.
 *  - Superficie crema con esquinas superiores redondeadas con el contenido de Inicio, sin cambiar su contenido ni su lógica.
 */

/**
 * Lo que se DIBUJA en Inicio. HomeScreen (app/home.tsx) calcula todo (consultas, reglas, sesión) y se lo entrega a este
 * componente como `data`, junto con los eventos; aquí no hay consultas ni reglas. Los textos fijos de las tarjetas
 * ("Tu próxima clase", "Plan ilimitado", ...) viven aquí: los datos traen valores, no frases.
 */
export type HomeViewData = {
  user: { name: string; rank: SkillLevel };
  myBox: { name: string; photoUrl?: string | null } | null;
  isOwnBirthdayToday: boolean;
  /** true / false = ya se sabe; null = todavía cargando. */
  hasBoxMembership: boolean | null;
  hasActivePlan: boolean | null;
  myPlan: MyPlan | null;
  nearPlanLimit: boolean;
  nextClassState: ReturnType<typeof nextClassCardState>;
  nextBooked: ReturnType<ReturnType<typeof useBooking>['getUpcomingBooked']>[number] | null;
  quote: string;
  /** Contrato pendiente de leer y aceptar, y la cuenta no es de personal del box. */
  hasPendingContract: boolean;
  pinnedPush: BoxAnnouncement | null;
  todayWod: TodayWod | null;
  planView: PlanProgressView;
  /** Estado de la consulta del WOD de hoy (cargando, con error o lista). Si no llega, se asume 'ready' (sin WOD = no se dibuja nada, como hasta ahora). */
  wodStatus?: WodStatus;
  achievementStats: { currentStreakDays?: number | null } | null;
  /** Estado de la consulta de la racha (cargando, con error o lista). Si no llega, se deduce de achievementStats (null = cargando). */
  streakStatus?: StreakStatus;
  rotatingFeaturedPr: { liftName: string; weightKg: number } | null;
  /** Estado de la consulta de las marcas (cargando o lista). Si no llega, se asume 'ready' (null = sin marcas, como hasta ahora). */
  prStatus?: PrStatus;
  medalsSummary: {
    totalUnlocked: number;
    totalAchievements: number;
    recent: { id: string; icon: React.ComponentProps<typeof MedalBadge>['icon']; name: string }[];
  };
  birthdays: UpcomingBirthday[];
  /** Foto del alumno para el recuadro de la tarjeta de vidrio. Opcional: hoy home.tsx no la pasa y se muestra la inicial. */
  avatarUri?: string | null;
  /** Notificaciones sin leer (punto de la campana). */
  unreadCount?: number;
  /** El menú lateral está abierto (estado "expandido" del botón de menú para lectores de pantalla). */
  menuOpen?: boolean;
};

export type HomeViewEvents = {
  onJoinBox: () => void;
  onOpenCalendar: () => void;
  onOpenContracts: () => void;
  onOpenWod: () => void;
  onOpenRm: () => void;
  onOpenProfile: () => void;
  onOpenMedals: () => void;
  onShareQuote: () => void;
  /** Abre el menú lateral. */
  onMenu?: () => void;
  /** Va a Notificaciones. */
  onBell?: () => void;
};


/**
 * FOTO del banner (decisión (o) de DECISIONES-DISENO.md): home-banner-anillo.jpg, de Leon Mart (Pexels; créditos en CREDITOS-IMAGENES.md).
 * Esta es la ÚNICA constante que decide la foto: cuando haya otra solo cambian el require y el foco; el alto del banner, el velo, la
 * tarjeta de vidrio, el halo y la crema no dependen de ella. Siempre cover a todo el ancho (foco 50 % horizontal y 0 % vertical: arriba
 * queda completo el aro y lo que se recorta en pantallas anchas es la parte baja, que tapa la crema). Procedimiento para cambiarla y
 * para medir el contraste antes de activarla: CREDITOS-IMAGENES.md.
 */
const BANNER_PHOTO = {
  source: require('@/assets/images/home/home-banner-anillo.jpg'),
  focus: { left: '50%', top: '0%' },
} as const;

/** Alto de la barra sin la zona de la barra de estado; los botones miden 48 (mínimo táctil: 44). */
const TOP_BAR_H = 48;
const BAR_BUTTON = 48;
/**
 * Alto del banner (foto + velo), medido BAJO la barra superior; fijo, no depende del ancho ni del alto de la pantalla. 202 -5 % = 192.
 * Con la tarjeta de vidrio (74), el aire hasta la crema (12) y lo que la crema sube sobre el banner (32) quedan 192 - 44 - 74 = 74 dp de
 * foto sobre la tarjeta.
 */
const BANNER_H = 192;

/**
 * MARCADOR del logo del box: el recuadro de cobre de la tarjeta (avatar con la inicial) es un marcador del logo del box: transparente
 * hasta que se agregue el logo definitivo, que será SÓLIDO. CUANDO LLEGUE EL LOGO DEFINITIVO, ESTE RECUADRO SERÁ SÓLIDO: se borra esta
 * constante y el fondo vuelve a ser colors.charcoalAccentLight. Es una opacidad fija de un elemento decorativo (no es un estado
 * presionado). Mientras tanto se dibuja con el cobre CLARO #C79A6B (regla del cobre: el #B98250 se ve naranjo sobre fondo oscuro o foto)
 * al 55 % de opacidad (8C en hex). La letra es blanca porque el carbón sobre el cobre al 55 % da menos de 4,5:1.
 * Valor elegido por el contraste de la letra blanca con el cobre claro, en el peor caso (velo mínimo de 40 %, vidrio al 60 %, parte más
 * clara de la foto bajo el recuadro; 320 / 360 / 412 dp): 0,60 = 4,41 / 4,42 / 5,70 (no pasa); 0,55 = 4,78 / 4,78 / 6,40; 0,50 = 5,16 /
 * 5,16 / 7,19. Más opacidad ACLARA el recuadro y baja el contraste de la letra blanca. (Con el cobre #B98250 al 60 % daba 5,32 / 5,32 / 6,93.)
 */
const LOGO_MARKER_ALPHA = '8C';

/** Anillos del halo de cobre de la tarjeta de vidrio, de adentro hacia afuera: [alfa en hex]. Cada anillo mide GLOW_STEP dp. */
const GLOW_RINGS = ['38', '1C', '0D'] as const;
const GLOW_STEP = 3;



// Matches the level values box-admin's own class-scheduling UI writes
// (classes.tsx's level Select) -- "todos" means no restriction, shown as
// "Todos los niveles" rather than literally "Todos".
const CLASS_LEVEL_LABELS: Record<string, string> = {
  todos: 'Todos los niveles',
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

/**
 * Íconos claros de la barra de estado SOLO mientras Inicio está enfocado (la barra superior es de carbón). Al perder el foco (navegar a
 * otra pantalla, o salir de Inicio con replace) el cleanup devuelve el estilo de siempre según el tema REAL de la app: este hook corre
 * fuera del ThemeOverride claro, así que lee el modo verdadero. El estilo se fija con setStyle (imperativo) y no con un <StatusBar>
 * montado, porque al desmontarse este el de React Native vuelve a su valor por defecto (íconos claros) y se quedaría atrapado.
 */
function useInicioStatusBar() {
  const { mode } = useTheme();
  useFocusEffect(
    useCallback(() => {
      StatusBar.setStyle(statusBarStyleFor(true, mode), false);
      return () => StatusBar.setStyle(statusBarStyleFor(false, mode), false);
    }, [mode]),
  );
}

export function HomeView({
  data,
  events,
  photoFails = false,
  nextClassLook = NEXT_CLASS_LOOK,
  quoteLook = QUOTE_LOOK,
  progressFontScale,
  levelStreakFontScale,
  levelStreakWidth,
  prFontScale,
  prWidth,
  medalsLook = MEDALS_LOOK,
  medalsFontScale,
  medalsWidth,
  wodLook = 'nuevo',
  joinBoxLook = 'nuevo',
}: {
  data: HomeViewData;
  events: HomeViewEvents;
  /** Solo para la pantalla de desarrollo: simula que la foto no carga (se ve el color base). */
  photoFails?: boolean;
  /** Solo para la pantalla de desarrollo: cápsula, cobre y textura de la tarjeta de próxima clase (por defecto, NEXT_CLASS_LOOK). */
  nextClassLook?: NextClassLook;
  /** Solo para la pantalla de desarrollo: variante de la tarjeta de frases (por defecto, QUOTE_LOOK: la actual). */
  quoteLook?: QuoteLook;
  /** Solo para la pantalla de desarrollo: simula la letra del sistema en la tarjeta "Progreso mensual". */
  progressFontScale?: number;
  /** Solo para la pantalla de desarrollo: simula la letra del sistema en "Tu nivel" y "Racha de constancia". */
  levelStreakFontScale?: number;
  /** Solo para la pantalla de desarrollo: simula un ancho de pantalla en "Tu nivel" y "Racha de constancia". */
  levelStreakWidth?: number;
  /** Solo para la pantalla de desarrollo: simula la letra del sistema en la tarjeta "PR destacado". */
  prFontScale?: number;
  prWidth?: number;
  /** Solo para la pantalla de desarrollo: variante de la tarjeta "Medallas" (por defecto, MEDALS_LOOK: Copper Achievement), letra y ancho simulados. */
  medalsLook?: MedalsLook;
  medalsFontScale?: number;
  medalsWidth?: number;
  /** Solo para la pantalla de desarrollo: 'actual' dibuja la tarjeta del WOD anterior para compararla (por defecto, 'nuevo': WodCard). */
  wodLook?: 'actual' | 'nuevo';
  /** Solo para la pantalla de desarrollo: 'actual' dibuja la tarjeta "Todavía no tienes un box" anterior para compararla (por defecto, 'nuevo': NoBoxCard). */
  joinBoxLook?: 'actual' | 'nuevo';
}) {
  useInicioStatusBar();
  return (
    <ThemeOverride mode="light">
      <HomeViewInner data={data} events={events} photoFails={photoFails} nextClassLook={nextClassLook} quoteLook={quoteLook} progressFontScale={progressFontScale} levelStreakFontScale={levelStreakFontScale} levelStreakWidth={levelStreakWidth} prFontScale={prFontScale} prWidth={prWidth} medalsLook={medalsLook} medalsFontScale={medalsFontScale} medalsWidth={medalsWidth} wodLook={wodLook} joinBoxLook={joinBoxLook} />
    </ThemeOverride>
  );
}

function BarButton({
  icon,
  label,
  onPress,
  dot,
  expanded,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress?: () => void;
  dot?: boolean;
  /** Solo el botón de menú: si el menú que abre está abierto. */
  expanded?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      hitSlop={4}
      // Estado presionado SÓLIDO (charcoalPressed), nunca opacidad.
      style={({ pressed }) => [styles.barButton, { backgroundColor: pressed ? colors.charcoalPressed : 'transparent' }]}
    >
      <Feather name={icon} size={24} color={colors.cream} />
      {/* Cobre claro sobre la barra de carbón (regla del cobre: #C79A6B sobre superficies oscuras o con foto). */}
      {dot ? <View style={[styles.bellDot, { backgroundColor: colors.charcoalAccentLight, borderColor: colors.charcoal }]} /> : null}
    </Pressable>
  );
}

function HomeViewInner({
  data,
  events,
  photoFails,
  nextClassLook,
  quoteLook,
  progressFontScale,
  levelStreakFontScale,
  levelStreakWidth,
  prFontScale,
  prWidth,
  medalsLook = MEDALS_LOOK,
  medalsFontScale,
  medalsWidth,
  wodLook,
  joinBoxLook,
}: {
  data: HomeViewData;
  events: HomeViewEvents;
  photoFails: boolean;
  nextClassLook: NextClassLook;
  quoteLook: QuoteLook;
  progressFontScale?: number;
  levelStreakFontScale?: number;
  levelStreakWidth?: number;
  prFontScale?: number;
  prWidth?: number;
  medalsLook?: MedalsLook;
  medalsFontScale?: number;
  medalsWidth?: number;
  wodLook: 'actual' | 'nuevo';
  joinBoxLook: 'actual' | 'nuevo';
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [photoError, setPhotoError] = useState(false);
  const {
    user,
    myBox,
    isOwnBirthdayToday,
    hasBoxMembership,
    hasActivePlan,
    myPlan,
    nearPlanLimit,
    nextClassState,
    nextBooked,
    quote,
    hasPendingContract,
    pinnedPush,
    todayWod,
    planView,
    wodStatus,
    achievementStats,
    streakStatus,
    prStatus,
    rotatingFeaturedPr,
    medalsSummary,
    birthdays,
    avatarUri,
    unreadCount = 0,
    menuOpen = false,
  } = data;
  const showPhoto = !photoFails && !photoError;
  // La barra fija (carbón sólido) mide la zona de la barra de estado más TOP_BAR_H; el banner empieza justo debajo.
  const barTotal = insets.top + TOP_BAR_H;
  // Tarjetas blancas: sombra muy suave y borde discreto.
  const firstName = getFirstName(user.name);
  const glassLabel = myBox ? `${myBox.name}. Hola, ${firstName}` : `Hola, ${firstName}`;

  return (
    <View style={[styles.root, { backgroundColor: colors.charcoal }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1, paddingTop: barTotal }}
      >
        <View style={[styles.banner, { height: BANNER_H, backgroundColor: colors.charcoal }]}>
          {showPhoto ? (
            // Foto decorativa: oculta a los lectores de pantalla.
            <View
              style={StyleSheet.absoluteFill}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Image
                source={BANNER_PHOTO.source}
                style={StyleSheet.absoluteFill}
                // Cover a todo el ancho, sin estirar ni deformar; el color base (carbón del banner) se ve mientras carga o si falla.
                contentFit="cover"
                contentPosition={BANNER_PHOTO.focus}
                transition={300}
                onError={() => setPhotoError(true)}
              />
            </View>
          ) : null}
          {/* Velo oscuro (carbón al 55 % arriba y abajo, 40 % al centro: el mínimo en la zona de la tarjeta es 40 %). */}
          <LinearGradient
            colors={[`${colors.charcoal}8C`, `${colors.charcoal}66`, `${colors.charcoal}8C`]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Tarjeta de vidrio: solo informativa (sin flecha ni toque), se lee como un solo grupo. */}
          <View style={styles.glassWrap}>
            {/* Halo de cobre: anillos concéntricos de baja opacidad, SIN desenfoque real; el interior de la tarjeta no se tiñe. */}
            {GLOW_RINGS.map((alpha, i) => (
              <View
                key={alpha}
                pointerEvents="none"
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={{
                  position: 'absolute',
                  top: -GLOW_STEP * (i + 1),
                  bottom: -GLOW_STEP * (i + 1),
                  left: -GLOW_STEP * (i + 1),
                  right: -GLOW_STEP * (i + 1),
                  borderRadius: RADIUS.xl + GLOW_STEP * (i + 1),
                  borderWidth: GLOW_STEP,
                  borderColor: `${colors.charcoalAccentLight}${alpha}`,
                }}
              />
            ))}
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={glassLabel}
              style={[styles.glassCard, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
            >
            <View
              style={[styles.glassAvatar, { backgroundColor: `${colors.charcoalAccentLight}${LOGO_MARKER_ALPHA}` }]}
              importantForAccessibility="no-hide-descendants"
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Text style={[styles.glassAvatarText, { color: colors.primaryForeground }]} maxFontSizeMultiplier={1.3}>
                  {(firstName[0] ?? '?').toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.glassTextCol} importantForAccessibility="no-hide-descendants">
              {myBox ? (
                <Text style={[styles.glassBoxName, { color: colors.cream }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {myBox.name}
                </Text>
              ) : null}
              <Text style={[styles.glassHello, { color: colors.cream }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                Hola, {firstName}
              </Text>
            </View>
            </View>
          </View>
        </View>

        <View style={[styles.surface, { backgroundColor: colors.cream }]}>
        {isOwnBirthdayToday ? <OwnBirthdayCardNew name={user.name} /> : null}

        {hasBoxMembership === false ? (
          joinBoxLook === 'actual' ? <JoinBoxCard onPress={() => events.onJoinBox()} /> : <NoBoxCard onPress={() => events.onJoinBox()} />
        ) : null}

        {hasActivePlan && nearPlanLimit ? <PlanNoticeCard plan={myPlan!} /> : null}

        {hasBoxMembership && (nextClassState === 'loading' || nextClassState === 'invite' || (nextClassState === 'booked' && nextBooked)) ? (
          // Cargando (esqueleto), sin reserva (invitación) o con reserva: tres estados con el mismo marco; ver NextClassCard.tsx.
          <NextClassCard
            state={nextClassState}
            nextBooked={nextBooked}
            levelLabel={nextBooked ? (CLASS_LEVEL_LABELS[nextBooked.level] ?? nextBooked.level) || null : null}
            onPress={() => events.onOpenCalendar()}
            look={nextClassLook}
          />
        ) : null}

        <DailyQuoteCard quote={quote} onShare={events.onShareQuote} look={quoteLook} />

        {hasBoxMembership && hasPendingContract ? <PendingContractCard onPress={() => events.onOpenContracts()} /> : null}

        {hasBoxMembership && pinnedPush ? <PinnedAvisoCard announcement={pinnedPush} /> : null}

        {hasBoxMembership ? (
          wodLook === 'actual' ? (
            todayWod ? <WodTodayCard wod={todayWod} onPress={() => events.onOpenWod()} /> : null
          ) : (
            <WodCard view={wodCardView(todayWod, wodStatus ?? 'ready', todayKeyInChile())} onPress={() => events.onOpenWod()} />
          )
        ) : null}

        <MonthlyProgressCard view={planView} fontScale={progressFontScale} />

        <LevelStreakCards
          rank={user.rank}
          achievementStats={achievementStats}
          streakStatus={streakStatus}
          onOpenProfile={() => events.onOpenProfile()}
          fontScale={levelStreakFontScale}
          screenWidth={levelStreakWidth}
        />

        <PrHighlightCard
          pr={rotatingFeaturedPr}
          prStatus={prStatus}
          onOpenRm={() => events.onOpenRm()}
          fontScale={prFontScale}
          screenWidth={prWidth}
        />
        <MedalsCard
          summary={medalsSummary}
          status={medalsStatusOf(streakStatus, achievementStats === null)}
          onOpenMedals={() => events.onOpenMedals()}
          look={medalsLook}
          fontScale={medalsFontScale}
          screenWidth={medalsWidth}
        />

        {hasBoxMembership && birthdays.length > 0 ? <UpcomingBirthdaysSectionNew birthdays={birthdays} /> : null}
        </View>
      </ScrollView>

      {/* Barra superior fija y SIEMPRE de carbón sólido, también bajo la barra de estado (sin franjas de otro color). */}
      <View style={[styles.topBar, { height: barTotal, backgroundColor: colors.charcoal }]}>
        <View style={{ height: insets.top }} />
        <View style={styles.topBarRow}>
          <BarButton icon="menu" label="Menú" onPress={events.onMenu} expanded={menuOpen} />
          {/* El logo ocupa todo el ancho de la barra y se dibuja ENCIMA del botón de menú: va dentro de un View con pointerEvents="none".
              En Android la propiedad pointerEvents solo existe en View (y ScrollView), NO en Text: puesta en el Text se ignora y el logo se
              come los toques del botón de menú (la campana, que va después en el orden, sí recibía el toque). */}
          <View pointerEvents="none" style={styles.logoWrap}>
            <Text style={[styles.logo, { color: colors.cream }]} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              WODPLACE
            </Text>
          </View>
          <BarButton
            icon="bell"
            label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
            onPress={events.onBell}
            dot={unreadCount > 0}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Diseño nuevo (decisión (k)) ──
  root: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBarRow: { height: TOP_BAR_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.sm },
  logoWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  logo: { textAlign: 'center', fontSize: 22, letterSpacing: 1.5, fontFamily: 'Anton_400Regular' },
  barButton: { width: BAR_BUTTON, height: BAR_BUTTON, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 9, width: 11, height: 11, borderRadius: RADIUS.full, borderWidth: 2 },
  banner: { overflow: 'hidden' },
  glassWrap: { position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: RADIUS.xxl + SPACING.lg },
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  glassAvatar: { width: 52, height: 52, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glassAvatarText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  glassTextCol: { flex: 1, gap: 2 },
  glassBoxName: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4 },
  // Saludo: 15 sp (antes FONT_SIZE.xl = 18, -17 %). Sigue por encima del nombre del box (12 sp) y la tarjeta no crece: con la letra del
  // sistema al máximo permitido (maxFontSizeMultiplier 1,3) las dos líneas miden unos 44 dp, menos que los 52 del avatar.
  glassHello: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  surface: {
    flexGrow: 1,
    marginTop: -RADIUS.xxl,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    gap: 11,
  },
});
