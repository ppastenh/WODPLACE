import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function SplashRoute() {
  const colors = useColors();
  const { isLoading, isAuthenticated } = useAuth();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    if (isLoading) return;
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, 1100 - elapsed);
    const timer = setTimeout(() => {
      router.replace(isAuthenticated ? '/home' : '/login');
    }, remaining);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  return (
    <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="cover"
        />
        <Text style={[styles.title, { color: colors.authText }]}>WODPLACE</Text>
        <Text style={[styles.tagline, { color: colors.authMuted }]}>
          Reserva tu próxima clase
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 26,
    marginBottom: 18,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Anton_400Regular',
    letterSpacing: 2,
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
