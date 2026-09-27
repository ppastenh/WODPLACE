import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BoxAnnouncement } from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AutoFitImage } from '@/components/AutoFitImage';
import { useColors } from '@/hooks/useColors';

const CARD_MAX_WIDTH = 380;
const CARD_PADDING = 20;
const CARD_WIDTH = Math.min(Dimensions.get('window').width - 48, CARD_MAX_WIDTH) - CARD_PADDING * 2;

interface AnnouncementModalProps {
  visible: boolean;
  announcement: BoxAnnouncement | null;
  /** Called once the athlete has confirmed reading it and the modal is
   *  actually done closing. */
  onClose: () => void;
  /** Called exactly once, when the athlete confirms having read it. */
  onConfirmRead: () => void;
}

/**
 * Home's must-acknowledge popup for a "push" aviso: closing it is a
 * two-step action — tapping close (or the backdrop, or the Android back
 * button) shows a "¿ya leíste esto?" confirmation, and only confirming
 * that actually dismisses it. There's no bare single-step close here on
 * purpose — anything less would defeat the point of a push aviso.
 */
export function AnnouncementModal({
  visible,
  announcement,
  onClose,
  onConfirmRead,
}: AnnouncementModalProps) {
  const colors = useColors();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) setConfirming(false);
  }, [visible, announcement?.id]);

  if (!announcement) return null;

  const requestClose = () => {
    // Backdrop tap / Android back button while the confirm step is already
    // showing must NOT close it — only the two explicit buttons below can.
    // Otherwise the "must confirm to close" requirement has a one-tap
    // loophole around it.
    if (!confirming) setConfirming(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <Pressable style={styles.backdrop} onPress={requestClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {confirming ? (
            <View style={styles.confirmContent}>
              <Feather name="help-circle" size={30} color={colors.navActive} />
              <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
                ¿Ya leíste este aviso?
              </Text>
              <Text style={[styles.confirmSubtitle, { color: colors.mutedForeground }]}>
                Este aviso es importante — confirma que lo leíste para cerrarlo.
              </Text>
              <View style={styles.actions}>
                <AppButton
                  label="Sí, ya lo leí"
                  variant="dark"
                  fullWidth
                  onPress={() => {
                    onConfirmRead();
                    onClose();
                  }}
                />
                <AppButton
                  label="Volver al aviso"
                  variant="outlineDark"
                  fullWidth
                  onPress={() => setConfirming(false)}
                />
              </View>
            </View>
          ) : (
            <>
              <Pressable
                accessibilityLabel="Cerrar"
                onPress={requestClose}
                hitSlop={8}
                style={[styles.closeButton, { backgroundColor: colors.secondary }]}
              >
                <Feather name="x" size={16} color={colors.secondaryForeground} />
              </Pressable>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                {announcement.imageUrl ? (
                  <AutoFitImage
                    uri={announcement.imageUrl}
                    width={CARD_WIDTH}
                    borderRadius={16}
                    style={styles.image}
                  />
                ) : null}
                <View style={styles.textWrap}>
                  <Text style={[styles.title, { color: colors.foreground }]}>
                    {announcement.title}
                  </Text>
                  {announcement.body ? (
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
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
    borderRadius: 24,
    padding: CARD_PADDING,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
    width: 30,
    height: 30,
    borderRadius: 15,
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
    paddingRight: 24,
    paddingBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 18,
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
  confirmTitle: {
    fontSize: 17,
    fontFamily: 'Anton_400Regular',
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
});
