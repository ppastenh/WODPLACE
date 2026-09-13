import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

/**
 * Reached from admin-login.tsx's goToPanel whenever this box_admin's box
 * has its details filled in (see box-details.tsx) but isn't 'activo' yet
 * ('pendiente', 'rechazado', or 'suspendido' — one generic message covers
 * all three, no per-status wording). Bounces to /home the moment the box
 * turns 'activo' (checked on mount and via "Actualizar estado"), where the
 * one-time welcome popup takes over from there.
 */
export default function BoxWaitingScreen() {
  const colors = useColors();
  const { adminStatus, refreshActivationStatus } = useAuth();
  const [checking, setChecking] = useState(false);
  const box = adminStatus?.box ?? null;

  useEffect(() => {
    if (box?.status === 'activo') {
      router.replace('/home' as never);
    }
  }, [box?.status]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await refreshActivationStatus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.replace('/home')} />
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="cover"
        />
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="clock" size={28} color={colors.secondaryForeground} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Tu box todavía no está disponible
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Si tenés dudas, contactá a WODPLACE.
        </Text>
        <AppButton
          label="Actualizar estado"
          variant="outlineDark"
          loading={checking}
          onPress={handleCheck}
          style={{ ...styles.button, alignSelf: 'center', borderColor: colors.navActive, borderWidth: 1.5 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    marginBottom: 4,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 12,
  },
});
