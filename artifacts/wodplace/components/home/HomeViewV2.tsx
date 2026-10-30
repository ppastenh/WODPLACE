import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SkillLevel } from '@workspace/api-client-react';
import { AutoFitImage } from '@/components/AutoFitImage';
import type { HomeViewData, HomeViewEvents } from '@/components/home/HomeView';
import { JoinBoxCard } from '@/components/JoinBoxCard';
import { MedalBadge } from '@/components/MedalBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ThemeOverride } from '@/context/ThemeContext';
import { useColors } from '@/hooks/useColors';
import { getMedalIconColor } from '@/lib/medalColors';
import { coachLine } from '@/lib/nextClassCard';
import { monthlyCardParts } from '@/lib/planProgress';
import { formatClassDateShort, formatHM, MONTH_NAMES } from '@/lib/dateUtils';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * DISEÑO NUEVO DE INICIO (decisión (k) de DECISIONES-DISENO.md). TEMPORAL: copia de HomeView con otra cabecera, solo para la
 * pantalla de desarrollo "Estados de Inicio (dev)". Cuando Pía apruebe el diseño, esto reemplaza a HomeView en un solo commit.
 * Es de CLARO FIJO (no sigue el tema) y no toca ni HomeView ni home.tsx.
 *
 *  - Barra superior de carbón SÓLIDO (menú a la izquierda, logo WODPLACE en Anton, campana con punto cobre), fija arriba y siempre
 *    sólida; cubre también la zona de la barra de estado. El banner empieza justo debajo de ella (decisión (l)).
 *  - Banner con la foto clase-piernas.jpg (decorativa), velo oscuro y una tarjeta de vidrio informativa (sin toque) con avatar,
 *    nombre del box y saludo. SIN desenfoque real: negro al 60 % con borde blanco muy sutil.
 *  - Superficie crema con esquinas superiores redondeadas con el contenido de Inicio, sin cambiar su contenido ni su lógica.
 */

/** Datos de HomeView más la foto del alumno (hoy HomeViewData no la trae) y la cantidad de notificaciones sin leer. */
export type HomeViewV2Data = HomeViewData & { avatarUri?: string | null; unreadCount?: number };
export type HomeViewV2Events = HomeViewEvents & { onMenu?: () => void; onBell?: () => void };

/** Copia local de SKILL_LEVEL_LABELS (lib/api-client-react/src/skillLevel.ts): un import de valores desde la API no pasa la frontera del diseño. */
const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  rookie: 'Rookie',
  scaled: 'Scaled',
  master: 'Master',
  rx: 'RX',
  elite: 'Elite',
};

const PHOTO = require('@/assets/images/home/clase-piernas.jpg');

/** Alto de la barra sin la zona de la barra de estado; los botones miden 48 (mínimo táctil: 44). */
const TOP_BAR_H = 48;
const BAR_BUTTON = 48;
/**
 * Alto del banner (foto + velo), medido BAJO la barra superior; fijo, no depende del ancho ni del alto de la pantalla. 202 -5 % = 192.
 * Con la tarjeta de vidrio (74), el aire hasta la crema (12) y lo que la crema sube sobre el banner (32) quedan 192 - 44 - 74 = 74 dp de
 * foto sobre la tarjeta.
 */
const BANNER_H = 192;

/** Foto ENTERA (contain) a lo alto del banner: 1080 x 692 escalada a BANNER_H de alto mide unos 300 dp de ancho. */
const PHOTO_W_AT_BANNER = (1080 / 692) * BANNER_H;
/** Cuánto de la foto, hacia adentro, se desvanece hacia el carbón en cada costado (la banda de carbón sobrante va aparte). */
const SIDE_FADE = 28;

/**
 * MARCADOR del logo del box: mientras no exista el logo definitivo, el recuadro de cobre de la tarjeta (avatar con la inicial) se
 * dibuja con el cobre al 70 % de opacidad (B3 en hex). CUANDO SE AGREGUE EL LOGO DEFINITIVO DEL BOX, ESTE RECUADRO SERÁ SÓLIDO: se
 * borra esta constante y el fondo vuelve a ser colors.navActive. Es una opacidad fija de un elemento decorativo (no es un estado
 * presionado). La letra es blanca porque carbón o crema sobre el cobre al 70 % bajan de 4,5:1.
 */
const LOGO_MARKER_ALPHA = 'B3';

/** Anillos del halo de cobre de la tarjeta de vidrio, de adentro hacia afuera: [alfa en hex]. Cada anillo mide GLOW_STEP dp. */
const GLOW_RINGS = ['38', '1C', '0D'] as const;
const GLOW_STEP = 3;

// scrollContent has 20px horizontal padding each side; the pinned aviso
// card itself has 16px padding each side (see pinnedAvisoCard).
const PINNED_AVISO_IMAGE_WIDTH = Dimensions.get('window').width - 40 - 32;

function birthdayInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

function birthdayDayLabel(month: number, day: number): string {
  const abbrev = (MONTH_NAMES[month - 1] ?? '').slice(0, 3).toUpperCase();
  return `${day} ${abbrev}`;
}

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Atleta';
}


// Matches the level values box-admin's own class-scheduling UI writes
// (classes.tsx's level Select) -- "todos" means no restriction, shown as
// "Todos los niveles" rather than literally "Todos".
const CLASS_LEVEL_LABELS: Record<string, string> = {
  todos: 'Todos los niveles',
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export function HomeViewV2({
  data,
  events,
  photoFails = false,
  photoMode = 'entera',
}: {
  data: HomeViewV2Data;
  events: HomeViewV2Events;
  /** Solo para la pantalla de desarrollo: simula que la foto no carga (se ve el color base). */
  photoFails?: boolean;
  /** 'entera': la foto completa a lo alto del banner, con desvanecido a carbón en los costados. 'recorte': cover con foco 50 % / 70 %. */
  photoMode?: 'recorte' | 'entera';
}) {
  return (
    <ThemeOverride mode="light">
      <HomeViewV2Inner data={data} events={events} photoFails={photoFails} photoMode={photoMode} />
    </ThemeOverride>
  );
}

function BarButton({
  icon,
  label,
  onPress,
  dot,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress?: () => void;
  dot?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      // Estado presionado SÓLIDO (charcoalPressed), nunca opacidad.
      style={({ pressed }) => [styles.barButton, { backgroundColor: pressed ? colors.charcoalPressed : 'transparent' }]}
    >
      <Feather name={icon} size={24} color={colors.cream} />
      {dot ? <View style={[styles.bellDot, { backgroundColor: colors.navActive, borderColor: colors.charcoal }]} /> : null}
    </Pressable>
  );
}

function HomeViewV2Inner({
  data,
  events,
  photoFails,
  photoMode,
}: {
  data: HomeViewV2Data;
  events: HomeViewV2Events;
  photoFails: boolean;
  photoMode: 'recorte' | 'entera';
}) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
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
    achievementStats,
    rotatingFeaturedPr,
    medalsSummary,
    birthdays,
    avatarUri,
    unreadCount = 0,
  } = data;
  const monthly = monthlyCardParts(planView);
  const showPhoto = !photoFails && !photoError;
  // La barra fija (carbón sólido) mide la zona de la barra de estado más TOP_BAR_H; el banner empieza justo debajo.
  const barTotal = insets.top + TOP_BAR_H;
  // Tarjetas blancas: sombra muy suave y borde discreto.
  const soft = {
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  } as const;
  // Banda de carbón que sobra a cada lado cuando la foto va entera (0 si la pantalla es más angosta que la foto).
  const sideBand = Math.max(0, (screenWidth - PHOTO_W_AT_BANNER) / 2);
  const fadeWidth = sideBand + SIDE_FADE;
  const solidShare = fadeWidth > 0 ? sideBand / fadeWidth : 0;
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
                source={PHOTO}
                style={StyleSheet.absoluteFill}
                // 'entera': contain, la foto completa (100 %) a lo alto del banner. 'recorte': cover con foco 50 % horizontal (el disco
                // está al centro) y 70 % vertical, que deja ver el disco desde su borde superior (fila 130) en 320, 360 y 412 dp; muestra
                // el 94 %, 83 % y 73 % de la foto. Nunca se estira ni se deforma.
                contentFit={photoMode === 'entera' ? 'contain' : 'cover'}
                contentPosition={photoMode === 'entera' ? { left: '50%', top: '50%' } : { left: '50%', top: '70%' }}
                transition={300}
                onError={() => setPhotoError(true)}
              />
              {photoMode === 'entera' ? (
                <>
                  {/* Desvanecido hacia el carbón en los costados: sin franja a la vista. */}
                  <LinearGradient
                    colors={[colors.charcoal, colors.charcoal, `${colors.charcoal}00`]}
                    locations={[0, solidShare, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: fadeWidth }}
                    pointerEvents="none"
                  />
                  <LinearGradient
                    colors={[`${colors.charcoal}00`, colors.charcoal, colors.charcoal]}
                    locations={[0, 1 - solidShare, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: fadeWidth }}
                    pointerEvents="none"
                  />
                </>
              ) : null}
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
                  borderColor: `${colors.navActive}${alpha}`,
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
              style={[styles.glassAvatar, { backgroundColor: `${colors.navActive}${LOGO_MARKER_ALPHA}` }]}
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
        {isOwnBirthdayToday ? (
          <View style={[styles.ownBirthdayCard, { backgroundColor: colors.accent }]}>
            <View style={[styles.iconBadge, { backgroundColor: colors.card }]}>
              <Feather name="gift" size={17} color={colors.navActive} />
            </View>
            <View style={styles.ownBirthdayTextCol}>
              <Text style={[styles.ownBirthdayTitle, { color: colors.accentForeground }]}>
                ¡Feliz cumpleaños, {getFirstName(user.name)}!
              </Text>
              <Text style={[styles.ownBirthdaySubtitle, { color: colors.accentForeground }]}>
                Que tengas un gran entrenamiento hoy
              </Text>
            </View>
          </View>
        ) : null}

        {hasBoxMembership === false ? (
          <JoinBoxCard onPress={() => events.onJoinBox()} />
        ) : null}

        {hasActivePlan && nearPlanLimit ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.warningBackground }]}>
            <View style={[styles.noticeIcon, { backgroundColor: colors.warning }]}>
              <Feather name="alert-circle" size={16} color={colors.warningForeground} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {myPlan!.classesPerPeriod != null &&
              myPlan!.classesRemaining != null &&
              myPlan!.classesRemaining <= 2 ? (
                <Text style={[styles.noticeText, { color: colors.foreground }]}>
                  Te quedan {myPlan!.classesRemaining} clase{myPlan!.classesRemaining === 1 ? '' : 's'} este período.
                </Text>
              ) : null}
              {myPlan!.daysUntilRenewal != null && myPlan!.daysUntilRenewal <= 7 ? (
                <Text style={[styles.noticeText, { color: colors.foreground }]}>
                  Tu plan {myPlan!.daysUntilRenewal <= 0
                    ? 'vence hoy'
                    : `vence en ${myPlan!.daysUntilRenewal} día${myPlan!.daysUntilRenewal === 1 ? '' : 's'}`}.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {hasBoxMembership && nextClassState === 'loading' ? (
          // Cargando: ni invitación ni datos; esqueleto con la misma forma y altura de la tarjeta.
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Cargando tu próxima clase"
            style={[styles.nextClassCard, { backgroundColor: colors.nextClassCard }]}
          >
            <Skeleton width="40%" height={SPACING.xxl} />
            <View style={styles.nextClassSkeletonBottom}>
              <Skeleton width="85%" height={FONT_SIZE.hero} />
              <Skeleton width="60%" height={FONT_SIZE.xs} />
            </View>
          </View>
        ) : null}

        {hasBoxMembership && nextClassState === 'invite' ? (
          // Sin reserva (haya o no clases, o haya fallado la carga): solo la invitación.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir al Calendario para reservar una clase"
            onPress={() => events.onOpenCalendar()}
            style={({ pressed }) => [
              styles.nextClassCard,
              { backgroundColor: pressed ? colors.nextClassCardPressed : colors.nextClassCard },
            ]}
          >
            <View style={styles.nextClassTopEnd}>
              <Feather name="arrow-up-right" size={18} color={colors.nextClassCardForeground} />
            </View>
            <Text style={[styles.nextClassName, { color: colors.nextClassCardForeground }]} numberOfLines={2}>
              Reserva tu próxima clase
            </Text>
          </Pressable>
        ) : null}

        {hasBoxMembership && nextClassState === 'booked' && nextBooked ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver próxima clase"
            onPress={() => events.onOpenCalendar()}
            style={({ pressed }) => [
              styles.nextClassCard,
              { backgroundColor: pressed ? colors.nextClassCardPressed : colors.nextClassCard },
            ]}
          >
            <View style={styles.nextClassTop}>
              <View style={[styles.timeChip, { backgroundColor: colors.navActive }]}>
                <Feather name="calendar" size={13} color={colors.card} />
                <Text style={[styles.timeChipText, { color: colors.card }]} numberOfLines={1}>
                  {formatClassDateShort(nextBooked.startDate)} · {formatHM(nextBooked.startMinutes)}
                </Text>
              </View>
              <Feather name="arrow-up-right" size={18} color={colors.nextClassCardForeground} />
            </View>
            <Text style={[styles.nextClassLabel, { color: colors.nextClassCardForeground }]}>Tu próxima clase</Text>
            <Text style={[styles.nextClassName, { color: colors.nextClassCardForeground }]}>{nextBooked.type}</Text>
            {coachLine(nextBooked.coach) ? (
              <Text style={[styles.nextClassCoach, { color: colors.inactive }]}>{coachLine(nextBooked.coach)}</Text>
            ) : null}
            <View style={styles.nextClassMetaRow}>
              <View style={styles.nextClassMetaChip}>
                <Feather name="clock" size={12} color={colors.inactive} />
                <Text style={[styles.nextClassMetaText, { color: colors.inactive }]}>{nextBooked.durationLabel}</Text>
              </View>
              <View style={styles.nextClassMetaChip}>
                <Feather name="bar-chart-2" size={12} color={colors.inactive} />
                <Text style={[styles.nextClassMetaText, { color: colors.inactive }]}>
                  {CLASS_LEVEL_LABELS[nextBooked.level] ?? nextBooked.level}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        <LinearGradient
          colors={[colors.accent, colors.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quoteRow}
        >
          <MaterialCommunityIcons
            name="image-filter-hdr"
            size={30}
            color={colors.accentForeground}
            style={styles.quoteIconLeft}
          />
          <View style={styles.quoteRowTextWrap}>
            <Text style={[styles.quoteRowText, { color: colors.accentForeground }]} numberOfLines={3}>
              {quote.toUpperCase()}
            </Text>
          </View>
          <View style={styles.quoteRowActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartir frase motivacional"
              onPress={events.onShareQuote}
              hitSlop={10}
              style={({ pressed }) => [styles.shareButton, pressed && { backgroundColor: colors.accentPressed }]}
            >
              <Feather name="share-2" size={16} color={colors.accentForeground} />
            </Pressable>
            <Feather name="chevron-right" size={20} color={colors.accentForeground} />
          </View>
        </LinearGradient>

        {hasBoxMembership && hasPendingContract ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir a Contratos Activos"
            onPress={() => events.onOpenContracts()}
            style={({ pressed }) => [
              styles.pinnedAvisoCard,
              { backgroundColor: pressed ? colors.warningBackgroundPressed : colors.warningBackground },
            ]}
          >
            <View style={styles.cardHeadingRow}>
              <Text style={[styles.cardEyebrow, { color: colors.creamMuted }]}>Aviso Importante</Text>
              <Feather name="file-text" size={16} color={colors.warning} />
            </View>
            <Text style={[styles.pinnedAvisoTitle, { color: colors.foreground }]}>
              Tienes un contrato pendiente de leer y aceptar
            </Text>
            <Text style={[styles.pinnedAvisoBodyBold, { color: colors.foreground }]}>
              Toca aquí para revisarlo en Contratos Activos. Mientras esté pendiente, no podrás hacer
              nuevas reservas.
            </Text>
          </Pressable>
        ) : null}

        {hasBoxMembership && pinnedPush ? (
          <View style={[styles.pinnedAvisoCard, { backgroundColor: colors.warningBackground }]}>
            <View style={styles.cardHeadingRow}>
              <Text style={[styles.cardEyebrow, { color: colors.creamMuted }]}>Aviso Importante</Text>
              <Feather name="bell" size={16} color={colors.warning} />
            </View>
            {pinnedPush.imageUrl ? (
              <View style={styles.pinnedAvisoImageWrap}>
                <AutoFitImage uri={pinnedPush.imageUrl} width={PINNED_AVISO_IMAGE_WIDTH} borderRadius={12} />
              </View>
            ) : null}
            <Text style={[styles.pinnedAvisoTitle, { color: colors.foreground }]}>
              {pinnedPush.title}
            </Text>
            {pinnedPush.body ? (
              <Text style={[styles.pinnedAvisoBodyBold, { color: colors.foreground }]} numberOfLines={3}>
                {pinnedPush.body}
              </Text>
            ) : null}
          </View>
        ) : null}

        {hasBoxMembership && todayWod ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver WOD de hoy"
            onPress={() => events.onOpenWod()}
            style={({ pressed }) => [
              styles.wodCard,
              { backgroundColor: pressed ? colors.accentPressed : colors.accent },
            ]}
          >
            <View style={styles.smallCardHeader}>
              <View style={styles.wodTitleRow}>
                <Feather name="zap" size={18} color={colors.accentForeground} />
                <Text style={[styles.smallCardLabel, { color: colors.accentForeground, marginTop: 0 }]}>
                  WOD de hoy{todayWod.myResult ? ' · registrado' : ''}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.accentForeground} />
            </View>
            <Text style={[styles.wodName, { color: colors.accentForeground }]}>{todayWod.name}</Text>
            <Text style={[styles.wodDescription, { color: colors.accentForeground }]} numberOfLines={2}>
              {todayWod.description}
            </Text>
          </Pressable>
        ) : null}

        {planView.kind === 'loading' ? (
          <View style={[styles.wideCard, soft, { backgroundColor: colors.card }]}>
            <Skeleton width="45%" height={FONT_SIZE.xs} />
            <View style={styles.monthlySkeletonBottom}>
              <Skeleton width="30%" height={FONT_SIZE.display} />
              <Skeleton width="100%" height={7} />
              <Skeleton width="55%" height={FONT_SIZE.xs} />
            </View>
          </View>
        ) : planView.kind === 'none' ? (
          <View style={[styles.monthlyEmptyCard, soft, { backgroundColor: colors.card }]}>
            <View>
              <Text style={[styles.smallCardLabel, styles.monthlyTitle, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
                Progreso mensual
              </Text>
              <Text style={[styles.statsValue, { color: colors.foreground }]} maxFontSizeMultiplier={1.3}>
                —
              </Text>
            </View>
            <Text style={[styles.statsDetail, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
              Sin plan activo
            </Text>
          </View>
        ) : monthly ? (
          <View style={[styles.wideCard, soft, { backgroundColor: colors.card }]}>
            <View style={styles.monthlyHeader}>
              <Text style={[styles.smallCardLabel, styles.monthlyTitle, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
                Progreso mensual
              </Text>
              <View style={styles.monthlyTopEnd}>
                {monthly.chip ? (
                  <View style={[styles.planChip, styles.monthlyChip, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.planChipText, { color: colors.accentForeground }]} maxFontSizeMultiplier={1.3}>
                      {monthly.chip}
                    </Text>
                  </View>
                ) : null}
                {monthly.topRightReserved || monthly.chipReserved ? (
                  <Text style={[styles.statsDetail, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
                    {monthly.topRightReserved ?? monthly.chipReserved}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={[styles.statsValue, { color: colors.foreground }]} maxFontSizeMultiplier={1.3}>
              {monthly.value}
              {monthly.totalSuffix ? (
                <Text style={[styles.monthlyTotal, { color: colors.creamMuted }]}>{monthly.totalSuffix}</Text>
              ) : null}
            </Text>
            {monthly.showBar ? (
              <View style={[styles.progressTrack, { backgroundColor: colors.input, marginTop: SPACING.sm }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.navActive, width: `${monthly.ratio * 100}%` }]} />
              </View>
            ) : null}
            <Text style={[styles.statsDetail, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
              {monthly.legend}
            </Text>
          </View>
        ) : null}

        <View style={styles.twoColumnRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver perfil"
            onPress={() => events.onOpenProfile()}
            style={({ pressed }) => [
              styles.statsCard, soft,
              { backgroundColor: pressed ? colors.cardPressed : colors.card },
            ]}
          >
            <View style={styles.smallCardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: colors.accent }]}>
                <Feather name="shield" size={17} color={colors.accentForeground} />
              </View>
              <Feather name="chevron-right" size={18} color={colors.creamMuted} />
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
              Tu nivel
            </Text>
            <Text
              style={[styles.statsValue, { color: colors.foreground }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={1.3}
            >
              {SKILL_LEVEL_LABELS[user.rank] ?? user.rank}
            </Text>
            <Text
              style={[styles.statsDetail, { color: colors.creamMuted }]}
              maxFontSizeMultiplier={1.3}
            >
              Sigue avanzando
            </Text>
          </Pressable>
          <View style={[styles.statsCard, soft, { backgroundColor: colors.card }]}>
            <View style={styles.smallCardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: colors.warningBackground }]}>
                <MaterialCommunityIcons name="fire" size={18} color={colors.warning} />
              </View>
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
              Racha de constancia
            </Text>
            <Text
              style={[styles.statsValue, { color: colors.foreground }]}
              maxFontSizeMultiplier={1.3}
            >
              {achievementStats?.currentStreakDays ?? 0}
            </Text>
            <Text
              style={[styles.statsDetail, { color: colors.creamMuted }]}
              maxFontSizeMultiplier={1.3}
            >
              {achievementStats?.currentStreakDays ? 'días seguidos' : 'Empieza hoy'}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver progreso y PRs"
          onPress={() => events.onOpenRm()}
          style={({ pressed }) => [
            styles.wideCard, soft,
            { backgroundColor: pressed ? colors.successBackgroundPressed : colors.successBackground },
          ]}
        >
          <View style={styles.smallCardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.success} />
            </View>
            <Feather name="chevron-right" size={18} color={colors.creamMuted} />
          </View>
          <Text style={[styles.smallCardLabel, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
            PR destacado
          </Text>
          {rotatingFeaturedPr ? (
            <>
              <Text
                style={[styles.statsValue, { color: colors.foreground }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                {rotatingFeaturedPr.liftName}
              </Text>
              <Text
                style={[styles.statsDetail, { color: colors.creamMuted }]}
                maxFontSizeMultiplier={1.3}
              >
                {rotatingFeaturedPr.weightKg} kg
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[styles.prEmptyValue, { color: colors.foreground }]}
                maxFontSizeMultiplier={1.3}
              >
                Aún no hay PRs
              </Text>
              <Text
                style={[styles.statsDetail, { color: colors.creamMuted }]}
                maxFontSizeMultiplier={1.3}
              >
                Registra tu primera marca
              </Text>
            </>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver medallas"
          onPress={() => events.onOpenMedals()}
          style={({ pressed }) => [
            styles.medalsWideCard, soft,
            { backgroundColor: pressed ? colors.cardPressed : colors.card, marginTop: 12 },
          ]}
        >
          <View style={styles.medalsWideLeft}>
            <View style={styles.smallCardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: colors.accent }]}>
                <Feather name="award" size={17} color={colors.accentForeground} />
              </View>
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
              Medallas
            </Text>
            <Text
              style={[styles.statsValue, { color: colors.foreground }]}
              maxFontSizeMultiplier={1.3}
            >
              {medalsSummary.totalUnlocked} de {medalsSummary.totalAchievements}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.input, marginTop: 6 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.navActive,
                    width: `${
                      medalsSummary.totalAchievements > 0
                        ? (medalsSummary.totalUnlocked / medalsSummary.totalAchievements) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.medalsWideRight}>
            {medalsSummary.recent[0] ? (
              <>
                <MedalBadge
                  icon={medalsSummary.recent[0].icon}
                  unlocked
                  size={40}
                  showRibbon={false}
                  iconColor={getMedalIconColor(medalsSummary.recent[0].id)}
                />
                <Text
                  style={[styles.medalsRecentName, { color: colors.creamMuted }]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                >
                  {medalsSummary.recent[0].name}
                </Text>
              </>
            ) : (
              <Text
                style={[styles.statsDetail, { color: colors.creamMuted }]}
                maxFontSizeMultiplier={1.3}
              >
                Desbloquea tu primera
              </Text>
            )}
          </View>
        </Pressable>

        {hasBoxMembership && birthdays.length > 0 ? (
          <View style={styles.birthdaySection}>
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Próximos cumpleaños
              </Text>
              <Feather name="gift" size={19} color={colors.navActiveTextSmall} />
            </View>
            <View style={styles.birthdayList}>
              {birthdays.map((birthday) => (
                <View key={`${birthday.name}-${birthday.month}-${birthday.day}`} style={styles.birthdayRow}>
                  <View style={[styles.avatar, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                    <Text style={[styles.avatarText, { color: colors.navActiveTextSmall }]}>
                      {birthdayInitials(birthday.name)}
                    </Text>
                  </View>
                  <Text style={[styles.birthdayName, { color: colors.foreground }]}>
                    {birthday.name}
                  </Text>
                  <Text style={[styles.birthdayDay, { color: colors.creamMuted }]}>
                    {birthday.daysUntil === 0 ? 'Hoy' : birthdayDayLabel(birthday.month, birthday.day)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        </View>
      </ScrollView>

      {/* Barra superior fija y SIEMPRE de carbón sólido, también bajo la barra de estado (sin franjas de otro color). */}
      <View style={[styles.topBar, { height: barTotal, backgroundColor: colors.charcoal }]}>
        <View style={{ height: insets.top }} />
        <View style={styles.topBarRow}>
          <BarButton icon="menu" label="Abrir el menú" onPress={events.onMenu} />
          <Text
            style={[styles.logo, { color: colors.cream }]}
            accessibilityRole="header"
            pointerEvents="none"
            maxFontSizeMultiplier={1.2}
          >
            WODPLACE
          </Text>
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
  logo: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 22, letterSpacing: 1.5, fontFamily: 'Anton_400Regular' },
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
  shareButton: { padding: SPACING.xs, borderRadius: RADIUS.full },

  // Fase 1 (tokens): solo valores que calzan EXACTO con SPACING/RADIUS.
  // Fase 2, paso 1 (2026-10-21): los 8/4 que eran gap/marginTop reales ya
  // se migraron a SPACING.sm2/xs2. El borderRadius:8 de BoxLogoImage (más
  // arriba, estilo inline) NO se tocó: es un radio, no un espaciado, y no
  // hay un escalón RADIUS de valor 8.
  // 11, 14, 1, 13, 15, 18, 170, 1, 3, 5, 104, 32, 45, etc. no calzan con
  // ningún token de la escala y quedan sin tocar a propósito -- ver la
  // propuesta de Fase 2 (alineación) en AUDITORIA-VISUAL.md antes de
  // mover cualquiera de esos.
  pinnedAvisoCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  pinnedAvisoImageWrap: {
    marginTop: SPACING.xs,
  },
  pinnedAvisoTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
  },
  pinnedAvisoBodyBold: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
    fontFamily: 'Inter_700Bold',
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
  },
  progressTrack: {
    height: 7,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: 13,
  },
  ownBirthdayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: 13,
  },
  ownBirthdayTextCol: {
    flex: 1,
    gap: 1,
  },
  ownBirthdayTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
  },
  ownBirthdaySubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
  },
  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  nextClassCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    minHeight: 170,
    justifyContent: 'space-between',
  },
  nextClassTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Chip "Plan ilimitado" del mosaico "Clases del plan": mismos tokens que el resto (accent / accentForeground).
  planChip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
  },
  planChipText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
  // Invitación sin chip: la flecha va a la derecha.
  nextClassTopEnd: { alignItems: 'flex-end' },
  // Esqueleto: los dos renglones de abajo, separados como el título y la línea de la tarjeta real.
  nextClassSkeletonBottom: { gap: SPACING.md },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  timeChipText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
  nextClassLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    marginTop: SPACING.lg,
  },
  nextClassName: {
    fontSize: FONT_SIZE.hero,
    fontFamily: 'Anton_400Regular',
    marginTop: 1,
  },
  nextClassCoach: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  nextClassMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  nextClassMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nextClassMetaText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
  },
  wodCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  wodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  wodName: { fontSize: FONT_SIZE.lg, fontFamily: 'Anton_400Regular', marginTop: SPACING.sm2 },
  wodDescription: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    marginTop: SPACING.xs2,
    lineHeight: 16,
  },
  wideCard: {
    minHeight: 112,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  monthlyEmptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  monthlyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  monthlyTitle: { marginTop: 0 },
  monthlyTopEnd: { alignItems: 'flex-end' },
  monthlyChip: { marginTop: 0, alignSelf: 'flex-end' },
  monthlyTotal: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_600SemiBold',
  },
  monthlySkeletonBottom: { gap: SPACING.md, marginTop: SPACING.md },
  twoColumnRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  statsCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  statsValue: {
    fontSize: FONT_SIZE.display,
    lineHeight: 26,
    fontFamily: 'Anton_400Regular',
    marginTop: SPACING.sm2,
  },
  statsDetail: {
    fontSize: FONT_SIZE.xs,
    lineHeight: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  // "PR destacado" empty state only — deliberately smaller than statsValue
  // so "Aún no hay PRs" fits the card's width without truncating (statsValue
  // is 22px Anton, too wide for that string in a 2-column card).
  prEmptyValue: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 16,
    fontFamily: 'Inter_700Bold',
    marginTop: SPACING.sm2,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 104,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  quoteIconLeft: {
    opacity: 0.8,
  },
  quoteRowTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  quoteRowText: {
    fontSize: FONT_SIZE.base,
    lineHeight: 18,
    fontFamily: 'Inter_700Bold',
    fontStyle: 'italic',
  },
  quoteRowActions: {
    alignItems: 'center',
    gap: SPACING.sm2,
  },
  medalsWideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  medalsWideLeft: {
    flex: 1,
  },
  medalsWideRight: {
    alignItems: 'center',
    gap: SPACING.sm,
    width: 72,
  },
  medalsRecentName: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    marginTop: SPACING.lg,
  },
  birthdaySection: {
    marginTop: SPACING.xs,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Anton_400Regular',
  },
  birthdayList: {
    gap: SPACING.sm2,
  },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 45,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
  birthdayName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
  },
  birthdayDay: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
});