import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BoxAnnouncement } from '@workspace/api-client-react';
import { AutoFitImage } from '@/components/AutoFitImage';
import { noBoxColors } from '@/components/home/noBoxCardColors';
import colors from '@/constants/colors';
import { RADIUS } from '@/constants/radius';

/**
 * VENTANA DE AVISO IMPORTANTE (decisión (ad) de DECISIONES-DISENO.md; aplicada en Inicio real: la usa app/home.tsx con las mismas propiedades de siempre). Mismos textos, mismos dos pasos y la misma lógica que la versión anterior;
 * solo cambió la apariencia: hoja grafito con esquinas redondeadas, título en Anton crema, cuerpo en crema y secundario en gris cálido, botón principal ancho de cobre con texto carbón (presionado sólido en cobre claro), botón
 * secundario en crema sin relleno (presionado sólido en #2E2F35) e imagen con esquinas redondeadas. No hay indicador "paso 1 de 2": nunca existió y no se inventa texto. Es de claro fijo, como todo Inicio. Si el texto es largo
 * se desplaza dentro de la ventana (nunca pasa del 80 % del alto de la pantalla).
 */
const CARD_MAX_WIDTH = 380;
const CARD_PADDING = 20;
const CARD_WIDTH = Math.min(Dimensions.get('window').width - 48, CARD_MAX_WIDTH) - CARD_PADDING * 2;

const c = noBoxColors(colors.light);
const PRESSED_GRAPHITE = colors.light.nextClassCardPressed;

interface AnnouncementModalProps {
  visible: boolean;
  announcement: BoxAnnouncement | null;
  /** Called once the athlete has confirmed reading it and the modal is actually done closing. */
  onClose: () => void;
  /** Called exactly once, when the athlete confirms having read it. */
  onConfirmRead: () => void;
}

/**
 * Home's must-acknowledge popup for a "push" aviso: closing it is a two-step action — tapping close (or the backdrop, or the Android back button) shows a "¿ya leíste esto?" confirmation, and only confirming
 * that actually dismisses it. There's no bare single-step close here on purpose.
 */
export function AnnouncementModal({ visible, announcement, onClose, onConfirmRead }: AnnouncementModalProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) setConfirming(false);
  }, [visible, announcement?.id]);

  if (!announcement) return null;

  const requestClose = () => {
    // Backdrop tap / Android back button while the confirm step is already showing must NOT close it — only the two explicit buttons below can.
    if (!confirming) setConfirming(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <Pressable style={styles.backdrop} onPress={requestClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: c.background }]}>
          {confirming ? (
            <View style={styles.confirmContent}>
              <View style={[styles.iconCircle, { borderColor: c.circleBorder }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Feather name="help-circle" size={22} color={c.icon} />
              </View>
              <Text style={[styles.confirmTitle, { color: c.primary }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                ¿Ya leíste este aviso?
              </Text>
              <Text style={[styles.confirmSubtitle, { color: c.secondary }]} maxFontSizeMultiplier={1.3}>
                Este aviso es importante — confirma que lo leíste para cerrarlo.
              </Text>
              <View style={styles.actions}>
                <SheetButton
                  label="Sí, ya lo leí"
                  kind="primary"
                  onPress={() => {
                    onConfirmRead();
                    onClose();
                  }}
                />
                <SheetButton label="Volver al aviso" kind="secondary" onPress={() => setConfirming(false)} />
              </View>
            </View>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={requestClose}
                hitSlop={8}
                style={({ pressed }) => [styles.closeButton, { backgroundColor: pressed ? PRESSED_GRAPHITE : c.inner }]}
              >
                <Feather name="x" size={16} color={c.primary} />
              </Pressable>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                {announcement.imageUrl ? <AutoFitImage uri={announcement.imageUrl} width={CARD_WIDTH} borderRadius={RADIUS.md + 2} style={styles.image} /> : null}
                <View style={styles.textWrap}>
                  <Text style={[styles.title, { color: c.primary }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                    {announcement.title}
                  </Text>
                  {announcement.body ? (
                    <Text style={[styles.body, { color: c.primary }]} maxFontSizeMultiplier={1.3}>
                      {announcement.body}
                    </Text>
                  ) : null}
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Botón ancho de la ventana: principal = cobre con texto carbón (presionado sólido en cobre claro); secundario = crema sin relleno con borde crema (presionado sólido #2E2F35). 48 dp de alto mínimo; sin opacidad. */
function SheetButton({ label, kind, onPress }: { label: string; kind: 'primary' | 'secondary'; onPress: () => void }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: pressed ? c.buttonPressed : c.button }
          : { backgroundColor: pressed ? PRESSED_GRAPHITE : 'transparent', borderWidth: 1, borderColor: c.primary },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? c.buttonText : c.primary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 14, 0.6)',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    maxHeight: '80%',
    borderRadius: RADIUS.xl,
    padding: CARD_PADDING,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    marginTop: 4,
  },
  image: {
    marginBottom: 14,
  },
  textWrap: {
    paddingRight: 28,
    paddingBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Anton_400Regular',
  },
  body: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  confirmContent: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Anton_400Regular',
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  button: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
