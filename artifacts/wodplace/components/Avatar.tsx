import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface AvatarProps {
  uri: string | null;
  size?: number;
  onChange: (uri: string) => void;
}

export function Avatar({ uri, size = 88, onChange }: AvatarProps) {
  const colors = useColors();

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        'Activa el acceso a tus fotos para cambiar tu imagen de perfil.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onChange(result.assets[0].uri);
    }
  };

  return (
    <Pressable
      onPress={pickImage}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.muted,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>Foto</Text>
        )}
      </View>
      <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
        <Feather name="camera" size={13} color={colors.primaryForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
