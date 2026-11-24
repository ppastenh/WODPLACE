import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnnouncementModal } from '@/components/AnnouncementModal';
import { AnnouncementModalNew } from '@/components/home/AnnouncementModalNew';
import { JoinBoxCard } from '@/components/JoinBoxCard';
import { JoinBoxModal } from '@/components/JoinBoxModal';
import {
  OwnBirthdayCard,
  PendingContractCard,
  PinnedAvisoCard,
  PlanNoticeCard,
  UpcomingBirthdaysSection,
  WodTodayCard,
} from '@/components/home/ConditionalCards';
import { OwnBirthdayCardNew, UpcomingBirthdaysSectionNew } from '@/components/home/BirthdayCardsNew';
import { NoBoxCard } from '@/components/home/NoBoxCard';
import { WodCard } from '@/components/home/WodCard';
import { todayKeyInChile, wodCardView, type WodInput } from '@/components/home/wodCardModel';
import { PendingContractBanner, PinnedAvisoBanner, PlanNoticeBanner } from '@/components/home/NoticeBanners';
import { AVISO, DEMO_ANNOUNCEMENT, birthdayIn, planDemo } from '@/components/home/devHomeStates';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * "VER AVISOS" (solo desarrollo; pedido 42): cada aviso, tarjeta o ventana de Inicio que NO se ve en un Inicio normal, con datos de ejemplo, uno debajo del otro y con su nombre, para revisarlos
 * en el teléfono sin provocarlos. Dibuja los MISMOS componentes que usa Inicio (components/home/ConditionalCards.tsx, JoinBoxCard, AnnouncementModal, JoinBoxModal); no toca la lógica real, home.tsx
 * ni ningún archivo sensible (JoinBoxModal solo se importa para abrirlo con un canje falso). Nadie lo importa fuera de DevHomeScreen, que solo se carga con __DEV__: no llega a producción.
 */

const simulated = (what: string) => () => Alert.alert('Toque simulado', what);

/** WOD de ejemplo (SOLO desarrollo; los textos de Fran, Helen y Murph son los del catálogo). */
/** Avisos de ejemplo (SOLO desarrollo) para la ventana de aviso importante: corto, largo (se desplaza dentro) y con imagen. */
type AvisoExample = 'corto' | 'largo' | 'imagen';
const AVISO_EXAMPLES: { id: AvisoExample; label: string }[] = [
  { id: 'corto', label: 'Aviso corto' },
  { id: 'largo', label: 'Aviso largo' },
  { id: 'imagen', label: 'Aviso con imagen' },
];
const PARRAFO = 'Este sábado la clase de las 10:00 pasa a las 09:00 porque el box va a estar ocupado desde media mañana. Trae agua y tu toalla; nos vemos en el box y empezamos puntuales con el calentamiento.';
const AVISO_LARGO = { ...AVISO, title: 'Cambio de horario del sábado y recomendaciones para toda la semana', body: Array(6).fill(PARRAFO).join(' ') };
const avisoFor = (e: AvisoExample) => (e === 'corto' ? { ...AVISO, imageUrl: null } : e === 'largo' ? { ...AVISO_LARGO, imageUrl: null } : DEMO_ANNOUNCEMENT);

const wodBase = { timeCapMinutes: null, sessionDate: todayKeyInChile(), myResult: null as unknown };
const WOD_ESTANDAR: WodInput = { ...wodBase, wodId: 'custom-demo', name: 'Fuerza y pierna', format: 'amrap', timeCapMinutes: 12, description: 'Calentamiento libre. Luego 12 minutos: 8 Back Squats a 60 %, 10 Burpees, 12 Sit-ups. Anota tus rondas.' };
const WOD_LARGO: WodInput = { ...wodBase, wodId: 'custom-demo-largo', name: 'Fuerza máxima y trabajo de gimnásticos del sábado', format: 'max_reps', timeCapMinutes: 17, description: 'Parte A: 5 series de 3 repeticiones de Deadlift pesado, con 2 minutos de descanso entre series. Parte B: 3 rondas, 1 minuto por estación: Wall-ball, Sumo deadlift high-pull, Box jump, Push press y Row en calorías. Parte C: 10 minutos de movilidad y core.' };
const WOD_FRAN: WodInput = { ...wodBase, wodId: 'fran', name: 'Fran', format: 'for_time', description: '21-15-9 reps for time: Thrusters (95/65 lb), Pull-ups' };
const WOD_HELEN: WodInput = { ...wodBase, wodId: 'helen', name: 'Helen', format: 'for_time', description: '3 rounds for time: 400m Run, 21 Kettlebell Swings (53/35 lb), 12 Pull-ups' };
const WOD_MURPH: WodInput = { ...wodBase, wodId: 'murph', name: 'Murph', format: 'for_time', description: 'For time: 1 milla Run, 100 Pull-ups, 200 Push-ups, 300 Squats, 1 milla Run (particioná las reps como necesites; con chaleco de 20/14 lb si podés)' };
const wodView = (w: WodInput) => wodCardView(w, 'ready', todayKeyInChile());

/** Canje falso: nunca llama al servidor. Según el modo elegido responde "código inválido", falla (sin red), se queda cargando, "te uniste" o "ya perteneces" (así se ven todos los estados de la ventana sin tocar su lógica). */
type FakeMode = 'invalido' | 'falla' | 'lento' | 'unido' | 'ya';
const FAKE_MODES: { id: FakeMode; label: string }[] = [
  { id: 'invalido', label: 'Código inválido (error)' },
  { id: 'falla', label: 'Falla de red (error)' },
  { id: 'lento', label: 'Validando… (cargando)' },
  { id: 'unido', label: 'Te uniste (enviado)' },
  { id: 'ya', label: 'Ya perteneces (enviado)' },
];
type Redeem = React.ComponentProps<typeof JoinBoxModal>['onRedeem'];
const fakeRedeemFor = (mode: FakeMode): Redeem =>
  (async () => {
    if (mode === 'falla') throw new Error('sin red');
    if (mode === 'lento') return new Promise(() => {});
    if (mode === 'unido') return { joined: true, alreadyMember: false, boxName: 'Box Demo' };
    if (mode === 'ya') return { joined: false, alreadyMember: true, boxName: 'Box Demo' };
    return { joined: false, alreadyMember: false };
  }) as unknown as Redeem;

/** Textos de la alerta del sistema que home.tsx muestra cuando el box recién fue aprobado (copia: una prueba exige que sigan iguales a los de home.tsx). */
export const BOX_APPROVED_ALERT = { title: '¡Tu box ya está aprobado!', message: 'Ya puedes administrarlo y empezar a invitar alumnos.' } as const;

/** Lista del inventario (nombre, forma, condición y botones); la usa también la prueba para exigir que no falte ninguno. */
export const AVISOS_NAMES = [
  'Cumpleaños propio',
  'Sin box: tarjeta "Todavía no tienes un box"',
  'Ventana "Agregar código de box"',
  'Aviso del plan: "Te quedan N clases"',
  'Aviso del plan: "Tu plan vence…"',
  'Contrato pendiente',
  'Aviso fijo del box',
  'Ventana de aviso importante (popup)',
  'WOD de hoy',
  'Próximos cumpleaños',
  'Alerta "¡Tu box ya está aprobado!"',
] as const;

/** Estado de revisión de cada elemento (pedido 49): lo que Pía ya revisó y si está conectado a Inicio, para mirarlos todos juntos. */
const REVIEW: Record<number, string> = {
  1: 'REVISADO · conectado a Inicio',
  2: 'REVISADO · conectado a Inicio',
  3: 'REVISADO · conectado a Inicio',
  4: 'REVISADO · sin conectar a Inicio',
  5: 'REVISADO · sin conectar a Inicio',
  6: 'REVISADO · sin conectar a Inicio',
  7: 'REVISADO · sin conectar a Inicio',
  8: 'SIN REVISAR · en evaluación (Inicio real usa la actual)',
  9: 'REVISADO · conectado a Inicio',
  10: 'REVISADO · conectado a Inicio',
  11: 'Alerta del sistema: no se rediseña',
};

function Item({ n, name, kind, when, buttons, children }: { n: number; name: string; kind: string; when: string; buttons: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.item}>
      <Text style={[styles.itemName, { color: colors.foreground }]}>
        {n}. {name}
      </Text>
      <Text style={[styles.reviewTag, { color: REVIEW[n]?.startsWith('SIN REVISAR') ? colors.destructiveTextSmall : colors.navActiveTextSmall }]}>{REVIEW[n]}</Text>
      <Text style={[styles.itemMeta, { color: colors.navInactive }]}>
        {kind} · {buttons}
      </Text>
      <Text style={[styles.itemMeta, { color: colors.navInactive }]}>Aparece cuando: {when}</Text>
      <View style={styles.itemBody}>{children}</View>
    </View>
  );
}

/** Rótulo de una versión dentro de un elemento ("Diseño actual" o "Diseño nuevo", pedido 43). */
function VersionLabel({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[styles.versionLabel, { color: colors.navInactive }]}>{text}</Text>;
}

function OpenButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.openButton, { backgroundColor: colors.accent }]}>
      <Text style={[styles.openButtonText, { color: colors.accentForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function DevAvisosView() {
  const colors = useColors();
  const [popup, setPopup] = useState(false);
  const [avisoLook, setAvisoLook] = useState<'actual' | 'nuevo'>('nuevo');
  const [avisoExample, setAvisoExample] = useState<AvisoExample>('corto');
  const [joinOpen, setJoinOpen] = useState(false);
  const [fakeMode, setFakeMode] = useState<FakeMode>('invalido');
  let n = 0;
  const next = () => ++n;
  return (
    <View style={[styles.root, { backgroundColor: colors.cream }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Ver avisos (dev) · datos inventados</Text>
        <Text style={[styles.itemMeta, { color: colors.navInactive }]}>
          Cada uno se dibuja con el mismo componente que usa Inicio. Los botones no hacen nada real: abren un aviso de "toque simulado" o la ventana de ejemplo.
        </Text>

        <Item n={next()} name={AVISOS_NAMES[0]} kind="Tarjeta" buttons="sin botones" when="hoy es el cumpleaños de la alumna (fecha de nacimiento, hora de Chile)">
          <VersionLabel text="Diseño anterior (ya no está en Inicio)" />
          <OwnBirthdayCard name="Camila Rojas" />
          <VersionLabel text="Diseño actual en Inicio (nombre corto y nombre largo)" />
          <OwnBirthdayCardNew name="Camila Rojas" />
          <OwnBirthdayCardNew name="Anastasia-Valentina Rojas" />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[1]} kind="Tarjeta" buttons='1 botón: "Ingresar código de invitación" (abre la ventana de abajo)' when="la alumna no pertenece a ningún box">
          <VersionLabel text="Diseño anterior (ya no está en Inicio)" />
          <JoinBoxCard onPress={() => setJoinOpen(true)} />
          <VersionLabel text="Diseño actual en Inicio" />
          <NoBoxCard onPress={() => setJoinOpen(true)} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[2]} kind="Ventana (hoja desde abajo)" buttons='"Unirme" y cerrar (tocando fuera); en esta prueba el canje es falso y respondes tú: elige la respuesta, abre la ventana, escribe un código y toca "Unirme" (vacío y escribiendo se ven sin elegir nada)' when="la alumna toca el botón de la tarjeta anterior (archivo sensible: JoinBoxModal.tsx)">
          <View style={styles.modeRow}>
            {FAKE_MODES.map((m) => (
              <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: fakeMode === m.id }} onPress={() => setFakeMode(m.id)} style={[styles.modeChip, { backgroundColor: fakeMode === m.id ? colors.accent : colors.input }]}>
                <Text style={[styles.modeChipText, { color: fakeMode === m.id ? colors.accentForeground : colors.foreground }]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
          <OpenButton label="Abrir la ventana" onPress={() => setJoinOpen(true)} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[3]} kind="Tarjeta" buttons="sin botones" when="tiene plan por cantidad y le quedan 2 clases o menos en el período">
          <VersionLabel text="Diseño actual" />
          <PlanNoticeCard plan={planDemo({ classesRemaining: 1, daysUntilRenewal: 20 })} />
          <PlanNoticeCard plan={planDemo({ classesRemaining: 0, daysUntilRenewal: 20 })} />
          <VersionLabel text="Diseño nuevo (1 regla)" />
          <PlanNoticeBanner plan={planDemo({ classesRemaining: 1, daysUntilRenewal: 20 })} />
          <PlanNoticeBanner plan={planDemo({ classesRemaining: 0, daysUntilRenewal: 20 })} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[4]} kind="Tarjeta" buttons="sin botones" when="el plan vence en 7 días o menos (también con el aviso de clases, que se suma en la misma tarjeta)">
          <VersionLabel text="Diseño actual" />
          <PlanNoticeCard plan={planDemo({ classesRemaining: 5, daysUntilRenewal: 3 })} />
          <PlanNoticeCard plan={planDemo({ classesRemaining: 5, daysUntilRenewal: 0 })} />
          <PlanNoticeCard plan={planDemo({ classesRemaining: 1, daysUntilRenewal: 1 })} />
          <VersionLabel text="Diseño nuevo (1 regla y 2 reglas)" />
          <PlanNoticeBanner plan={planDemo({ classesRemaining: 5, daysUntilRenewal: 3 })} />
          <PlanNoticeBanner plan={planDemo({ classesRemaining: 5, daysUntilRenewal: 0 })} />
          <PlanNoticeBanner plan={planDemo({ classesRemaining: 1, daysUntilRenewal: 1 })} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[5]} kind="Tarjeta (toda es un botón)" buttons="1 botón: abre Contratos Activos" when="tiene box, tiene un contrato pendiente de leer y aceptar y la cuenta no es de personal del box">
          <VersionLabel text="Diseño actual" />
          <PendingContractCard onPress={simulated('Aquí se abriría Contratos Activos.')} />
          <VersionLabel text="Diseño nuevo (importante, presionable)" />
          <PendingContractBanner onPress={simulated('Aquí se abriría Contratos Activos.')} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[6]} kind="Tarjeta" buttons="sin botones (la imagen y el texto no se tocan)" when="tiene box y el box publicó un aviso 'push' (el más reciente se queda fijo aunque ya lo haya leído)">
          <VersionLabel text="Diseño actual" />
          <PinnedAvisoCard announcement={{ ...AVISO, imageUrl: null }} />
          <PinnedAvisoCard announcement={DEMO_ANNOUNCEMENT} />
          <PinnedAvisoCard
            announcement={{ ...AVISO, imageUrl: null, title: 'Aviso con un texto bastante largo para ver cómo se corta', body: AVISO.body + ' ' + AVISO.body + ' ' + AVISO.body }}
          />
          <VersionLabel text="Diseño nuevo (sin imagen, con imagen y con texto largo)" />
          <PinnedAvisoBanner announcement={{ ...AVISO, imageUrl: null }} />
          <PinnedAvisoBanner announcement={DEMO_ANNOUNCEMENT} />
          <PinnedAvisoBanner announcement={{ ...AVISO, imageUrl: null, title: 'Aviso con un texto bastante largo para ver cómo se corta', body: AVISO.body + ' ' + AVISO.body + ' ' + AVISO.body }} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[7]} kind="Ventana (centrada, con fondo oscuro)" buttons='2 pasos: cerrar → "¿Ya leíste este aviso?" con "Sí, ya lo leí" y "Volver al aviso"' when="tiene box y hay avisos 'push' sin leer (uno por vez, el más reciente primero)">
          <View style={styles.modeRow}>
            {(['actual', 'nuevo'] as const).map((l) => (
              <Pressable key={l} accessibilityRole="button" accessibilityState={{ selected: avisoLook === l }} onPress={() => setAvisoLook(l)} style={[styles.modeChip, { backgroundColor: avisoLook === l ? colors.accent : colors.input }]}>
                <Text style={[styles.modeChipText, { color: avisoLook === l ? colors.accentForeground : colors.foreground }]}>{`Aviso: ${l}`}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.modeRow}>
            {AVISO_EXAMPLES.map((m) => (
              <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: avisoExample === m.id }} onPress={() => setAvisoExample(m.id)} style={[styles.modeChip, { backgroundColor: avisoExample === m.id ? colors.accent : colors.input }]}>
                <Text style={[styles.modeChipText, { color: avisoExample === m.id ? colors.accentForeground : colors.foreground }]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
          <OpenButton label="Abrir la ventana" onPress={() => setPopup(true)} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[8]} kind="Tarjeta (toda es un botón)" buttons="1 botón: abre el WOD de hoy" when='tiene box y el box programó un WOD para hoy ("· registrado" si ya subió su resultado)'>
          <VersionLabel text="Diseño actual" />
          <WodTodayCard wod={{ name: 'Fran', description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.', myResult: null }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodTodayCard wod={{ name: 'Fran', description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.', myResult: {} }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <VersionLabel text="Diseño nuevo, estándar (WOD del coach): normal, texto muy largo, sin descripción" />
          <WodCard view={wodView(WOD_ESTANDAR)} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodCard view={wodView(WOD_LARGO)} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodCard view={wodView({ ...WOD_ESTANDAR, description: null, myResult: {} })} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <VersionLabel text="Diseño nuevo, especial (WOD del catálogo): Fran, Helen registrado y Murph" />
          <WodCard view={wodView(WOD_FRAN)} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodCard view={wodView({ ...WOD_HELEN, myResult: {} })} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodCard view={wodView(WOD_MURPH)} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <VersionLabel text="Diseño nuevo, estados: cargando y error" />
          <WodCard view={wodCardView(null, 'loading', todayKeyInChile())} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodCard view={wodCardView(null, 'error', todayKeyInChile())} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[9]} kind="Sección (lista)" buttons="sin botones" when="tiene box y hay cumpleaños próximos de otros alumnos (nunca edad ni año; los menores solo con autorización del apoderado)">
          <VersionLabel text="Diseño anterior (ya no está en Inicio)" />
          <UpcomingBirthdaysSection birthdays={[birthdayIn('Valentina Soto', 0), birthdayIn('Matías Pérez Rojas', 3), birthdayIn('Ana López', 9)]} />
          <VersionLabel text="Diseño actual en Inicio (1 persona; 3 personas con una de Hoy; nombre muy largo)" />
          <UpcomingBirthdaysSectionNew birthdays={[birthdayIn('Ana López', 9)]} />
          <UpcomingBirthdaysSectionNew birthdays={[birthdayIn('Valentina Soto', 0), birthdayIn('Matías Pérez Rojas', 3), birthdayIn('Ana López', 9)]} />
          <UpcomingBirthdaysSectionNew birthdays={[birthdayIn('Isabella Fernanda Contreras Valenzuela de la Rosa', 2)]} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[10]} kind="Alerta del sistema (no es un componente diseñable)" buttons='1 botón: "OK" (el del sistema)' when="el dueño del box entra por primera vez después de que su box fue aprobado (una sola vez)">
          <OpenButton label="Mostrar la alerta" onPress={() => Alert.alert(BOX_APPROVED_ALERT.title, BOX_APPROVED_ALERT.message)} />
        </Item>
      </ScrollView>

      <AnnouncementModal visible={popup && avisoLook === 'actual'} announcement={avisoFor(avisoExample)} onClose={() => setPopup(false)} onConfirmRead={() => {}} />
      <AnnouncementModalNew visible={popup && avisoLook === 'nuevo'} announcement={avisoFor(avisoExample)} onClose={() => setPopup(false)} onConfirmRead={() => {}} />
      <JoinBoxModal visible={joinOpen} onClose={() => setJoinOpen(false)} onRedeem={fakeRedeemFor(fakeMode)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.xxl, gap: SPACING.xl, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT_SIZE.lg, fontFamily: 'Anton_400Regular' },
  item: { gap: SPACING.xs2 },
  itemName: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_700Bold' },
  reviewTag: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  itemMeta: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', lineHeight: 16 },
  itemBody: { gap: 11, marginTop: SPACING.sm },
  versionLabel: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_700Bold', marginTop: SPACING.xs2 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  modeChip: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  modeChipText: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold' },
  openButton: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  openButtonText: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_700Bold' },
});
