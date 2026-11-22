import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnnouncementModal } from '@/components/AnnouncementModal';
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
import { WodTodayCardNew } from '@/components/home/WodTodayCardNew';
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

/** Canje falso: nunca llama al servidor (siempre "código inválido"). */
type Redeem = React.ComponentProps<typeof JoinBoxModal>['onRedeem'];
const FAKE_REDEEM = (async () => ({ joined: false, alreadyMember: false })) as unknown as Redeem;

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

function Item({ n, name, kind, when, buttons, children }: { n: number; name: string; kind: string; when: string; buttons: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.item}>
      <Text style={[styles.itemName, { color: colors.foreground }]}>
        {n}. {name}
      </Text>
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
  const [joinOpen, setJoinOpen] = useState(false);
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
          <VersionLabel text="Diseño actual" />
          <OwnBirthdayCard name="Camila Rojas" />
          <VersionLabel text="Diseño nuevo (nombre corto y nombre largo)" />
          <OwnBirthdayCardNew name="Camila Rojas" />
          <OwnBirthdayCardNew name="Anastasia-Valentina Rojas" />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[1]} kind="Tarjeta" buttons='1 botón: "Ingresar código de invitación" (abre la ventana de abajo)' when="la alumna no pertenece a ningún box">
          <JoinBoxCard onPress={() => setJoinOpen(true)} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[2]} kind="Ventana (hoja desde abajo)" buttons='"Unirme" y cerrar; en esta prueba el canje es falso (siempre "código inválido")' when="la alumna toca el botón de la tarjeta anterior (archivo sensible: JoinBoxModal.tsx)">
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
          <OpenButton label="Abrir la ventana" onPress={() => setPopup(true)} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[8]} kind="Tarjeta (toda es un botón)" buttons="1 botón: abre el WOD de hoy" when='tiene box y el box programó un WOD para hoy ("· registrado" si ya subió su resultado)'>
          <VersionLabel text="Diseño actual" />
          <WodTodayCard wod={{ name: 'Fran', description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.', myResult: null }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodTodayCard wod={{ name: 'Fran', description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.', myResult: {} }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <VersionLabel text="Diseño nuevo (sin registrar, registrado, nombre largo y sin descripción)" />
          <WodTodayCardNew wod={{ name: 'Fran', description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.', myResult: null }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodTodayCardNew wod={{ name: 'Fran', description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.', myResult: {} }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodTodayCardNew wod={{ name: 'Murph de los héroes caídos con chaleco y mucho aguante', description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.' + ' ' + '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.' + ' ' + '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.', myResult: null }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
          <WodTodayCardNew wod={{ name: 'Cindy', description: null, myResult: {} }} onPress={simulated('Aquí se abriría el WOD de hoy.')} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[9]} kind="Sección (lista)" buttons="sin botones" when="tiene box y hay cumpleaños próximos de otros alumnos (nunca edad ni año; los menores solo con autorización del apoderado)">
          <VersionLabel text="Diseño actual" />
          <UpcomingBirthdaysSection birthdays={[birthdayIn('Valentina Soto', 0), birthdayIn('Matías Pérez Rojas', 3), birthdayIn('Ana López', 9)]} />
          <VersionLabel text="Diseño nuevo (1 persona; 3 personas con una de Hoy; nombre muy largo)" />
          <UpcomingBirthdaysSectionNew birthdays={[birthdayIn('Ana López', 9)]} />
          <UpcomingBirthdaysSectionNew birthdays={[birthdayIn('Valentina Soto', 0), birthdayIn('Matías Pérez Rojas', 3), birthdayIn('Ana López', 9)]} />
          <UpcomingBirthdaysSectionNew birthdays={[birthdayIn('Isabella Fernanda Contreras Valenzuela de la Rosa', 2)]} />
        </Item>

        <Item n={next()} name={AVISOS_NAMES[10]} kind="Alerta del sistema (no es un componente diseñable)" buttons='1 botón: "OK" (el del sistema)' when="el dueño del box entra por primera vez después de que su box fue aprobado (una sola vez)">
          <OpenButton label="Mostrar la alerta" onPress={() => Alert.alert(BOX_APPROVED_ALERT.title, BOX_APPROVED_ALERT.message)} />
        </Item>
      </ScrollView>

      <AnnouncementModal visible={popup} announcement={DEMO_ANNOUNCEMENT} onClose={() => setPopup(false)} onConfirmRead={() => {}} />
      <JoinBoxModal visible={joinOpen} onClose={() => setJoinOpen(false)} onRedeem={FAKE_REDEEM} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.xxl, gap: SPACING.xl, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT_SIZE.lg, fontFamily: 'Anton_400Regular' },
  item: { gap: SPACING.xs2 },
  itemName: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_700Bold' },
  itemMeta: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', lineHeight: 16 },
  itemBody: { gap: 11, marginTop: SPACING.sm },
  versionLabel: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_700Bold', marginTop: SPACING.xs2 },
  openButton: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  openButtonText: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_700Bold' },
});
