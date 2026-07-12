import React, { useEffect } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(Math.max(SCREEN_WIDTH * 0.78, 280), 380);
const EDGE_ZONE_WIDTH = 24;
const ANIM_DURATION = 280;

export interface DrawerNavItem {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  badge?: number;
}

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpen: () => void;
  onNavigate: (route: string) => void;
  currentRoute: string;
  userName: string;
  avatarUri: string | null;
  navItems: DrawerNavItem[];
  onLogout: () => void;
  swipeToOpenEnabled?: boolean;
}

export function SideDrawer({
  visible,
  onClose,
  onOpen,
  onNavigate,
  currentRoute,
  userName,
  avatarUri,
  navItems,
  onLogout,
  swipeToOpenEnabled = true,
}: SideDrawerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);
  const dragStartX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : DRAWER_WIDTH, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(visible ? 1 : 0, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible]);

  const closeDrawer = () => {
    onClose();
  };

  const openDrawer = () => {
    onOpen();
  };

  const panClose = Gesture.Pan()
    .enabled(visible)
    .onStart(() => {
      dragStartX.value = translateX.value;
    })
    .onUpdate((event) => {
      const next = dragStartX.value + event.translationX;
      translateX.value = Math.min(DRAWER_WIDTH, Math.max(0, next));
      backdropOpacity.value = 1 - translateX.value / DRAWER_WIDTH;
    })
    .onEnd((event) => {
      const shouldClose = translateX.value > DRAWER_WIDTH * 0.35 || event.velocityX > 800;
      if (shouldClose) {
        translateX.value = withTiming(DRAWER_WIDTH, {
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(0, { duration: ANIM_DURATION });
        runOnJS(closeDrawer)();
      } else {
        translateX.value = withTiming(0, {
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(1, { duration: ANIM_DURATION });
      }
    });

  const panOpen = Gesture.Pan()
    .enabled(!visible && swipeToOpenEnabled)
    .onStart(() => {
      dragStartX.value = DRAWER_WIDTH;
    })
    .onUpdate((event) => {
      const next = dragStartX.value + event.translationX;
      translateX.value = Math.min(DRAWER_WIDTH, Math.max(0, next));
      backdropOpacity.value = 1 - translateX.value / DRAWER_WIDTH;
    })
    .onEnd((event) => {
      const shouldOpen = translateX.value < DRAWER_WIDTH * 0.65 || event.velocityX < -800;
      if (shouldOpen) {
        translateX.value = withTiming(0, {
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(1, { duration: ANIM_DURATION });
        runOnJS(openDrawer)();
      } else {
        translateX.value = withTiming(DRAWER_WIDTH, {
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(0, { duration: ANIM_DURATION });
      }
    });

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <>
      {!visible && swipeToOpenEnabled ? (
        <GestureDetector gesture={panOpen}>
          <View style={styles.edgeZone} />
        </GestureDetector>
      ) : null}

      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      <GestureDetector gesture={panClose}>
        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            {
              width: DRAWER_WIDTH,
              backgroundColor: colors.card,
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable onPress={closeDrawer} hitSlop={12} style={styles.closeButton}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>

          <View style={styles.profileBlock}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.muted }]}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Feather name="user" size={26} color={colors.mutedForeground} />
              )}
            </View>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {userName}
            </Text>
            <Pressable
              onPress={() => onNavigate('/profile')}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[styles.viewProfile, { color: colors.primary }]}>Ver perfil</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.navList}>
            {navItems.map((item) => {
              const active = currentRoute === item.route;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onNavigate(item.route)}
                  style={({ pressed }) => [
                    styles.navRow,
                    active && { backgroundColor: colors.secondary },
                    pressed && !active && { backgroundColor: colors.muted },
                  ]}
                >
                  <Feather
                    name={item.icon}
                    size={19}
                    color={active ? colors.secondaryForeground : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      { color: active ? colors.secondaryForeground : colors.foreground },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.badge ? (
                    <View style={[styles.navBadge, { backgroundColor: colors.destructive }]}>
                      <Text style={styles.navBadgeText}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={onLogout}
              style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]}
            >
              <Feather name="log-out" size={19} color={colors.destructive} />
              <Text style={[styles.navLabel, { color: colors.destructive }]}>Cerrar sesión</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  edgeZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: EDGE_ZONE_WIDTH,
    zIndex: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 14, 0.5)',
    zIndex: 30,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  profileBlock: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 20,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  userName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  viewProfile: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  navList: {
    flexGrow: 0,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  navLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  navBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
    marginHorizontal: 4,
  },
});
