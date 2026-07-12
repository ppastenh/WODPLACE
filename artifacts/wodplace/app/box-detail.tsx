import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { SUBSCRIBED_BOX } from '@/constants/boxInfo';

const MAP_SIZE = { width: 600, height: 300 };

function staticMapUrl(lat: number, lng: number): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=${MAP_SIZE.width}x${MAP_SIZE.height}&markers=${lat},${lng},red-pushpin`;
}

export default function BoxDetailScreen() {
  const colors = useColors();
  const box = SUBSCRIBED_BOX;

  const socialLinks: { key: string; icon: string; url?: string; label: string }[] = [
    { key: 'instagram', icon: 'instagram', url: box.instagramUrl, label: 'Instagram' },
    { key: 'facebook', icon: 'facebook', url: box.facebookUrl, label: 'Facebook' },
    { key: 'tiktok', icon: 'tiktok', url: box.tiktokUrl, label: 'TikTok' },
  ].filter((s) => !!s.url);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const openDirections = () => {
    openUrl(`https://www.google.com/maps/search/?api=1&query=${box.latitude},${box.longitude}`);
  };

  const openWhatsApp = () => {
    openUrl(`https://wa.me/${box.whatsapp}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.heroLogo, { backgroundColor: colors.primary }]}>
            <Text style={[styles.heroLogoText, { color: colors.primaryForeground }]}>
              {box.name.charAt(0)}
            </Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{box.name}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="user" size={16} color={colors.secondaryForeground} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
                Encargado del box
              </Text>
              <Text style={[styles.rowValue, { color: colors.foreground }]}>{box.owner}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ubicación</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="map-pin" size={16} color={colors.secondaryForeground} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Dirección</Text>
              <Text style={[styles.rowValue, { color: colors.foreground }]}>{box.address}</Text>
            </View>
          </View>

          <Image
            source={{ uri: staticMapUrl(box.latitude, box.longitude) }}
            style={[styles.mapImage, { backgroundColor: colors.muted }]}
            resizeMode="cover"
          />

          <AppButton
            label="Cómo llegar"
            variant="dark"
            fullWidth
            onPress={openDirections}
            icon={<Feather name="navigation" size={16} color={colors.authText} />}
            style={styles.actionButton}
            testID="box-directions"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contacto</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="smartphone" size={16} color={colors.secondaryForeground} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
                Celular / WhatsApp
              </Text>
              <Text style={[styles.rowValue, { color: colors.foreground }]}>
                +{box.whatsapp.slice(0, 2)} {box.whatsapp.slice(2, 3)} {box.whatsapp.slice(3, 7)}{' '}
                {box.whatsapp.slice(7)}
              </Text>
            </View>
          </View>

          <AppButton
            label="Abrir WhatsApp"
            variant="primary"
            fullWidth
            onPress={openWhatsApp}
            icon={<FontAwesome5 name="whatsapp" size={16} color={colors.primaryForeground} />}
            style={styles.actionButton}
            testID="box-whatsapp"
          />
        </View>

        {socialLinks.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Redes sociales</Text>
            <View style={[styles.card, styles.socialCard, { backgroundColor: colors.card }]}>
              {socialLinks.map((social) => (
                <Pressable
                  key={social.key}
                  onPress={() => social.url && openUrl(social.url)}
                  hitSlop={4}
                  style={({ pressed }) => [
                    styles.socialButton,
                    { backgroundColor: colors.secondary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <FontAwesome5
                    name={social.icon as any}
                    size={20}
                    color={colors.secondaryForeground}
                  />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 4 },
  hero: {
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  heroLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoText: {
    fontSize: 30,
    fontFamily: 'Anton_400Regular',
  },
  heroName: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  rowValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  mapImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
  },
  actionButton: {
    marginTop: 2,
  },
  socialCard: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
