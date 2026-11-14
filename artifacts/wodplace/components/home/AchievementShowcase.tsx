import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AchievementMedal } from '@/components/ui/AchievementMedal';
import { Laurel } from '@/components/ui/Laurel';
import { DEFAULT_SCALE, NAME_GAP, nameSlotHeight, nameStyleFor, showcaseGeometry } from '@/components/home/achievementShowcaseLayout';

/**
 * BLOQUE DERECHO de la tarjeta de Medallas (decisión (y)): el laurel 'relieve' de fondo, la medalla del logro centrada encima (su centro a 31 dp desde arriba del laurel, con escala 1) y,
 * debajo del borde inferior del laurel con 4 dp de separación, el NOMBRE del logro centrado en crema #F6F1E8, Inter SemiBold 14 con interlineado 20 (13/19 con 20 o más letras), en una o
 * dos líneas según el largo, sin "…" ni cortes y sin adjustsFontSizeToFit. Todo escala con `scale` (0,95 por defecto: laurel de 84 x 68 dp y medalla de 36 dp). Sin sombras ni opacidad al presionar.
 * La casilla del nombre tiene un alto fijo (dos líneas), así que el bloque mide lo mismo con nombre, sin nombre, con esqueleto o con un guion.
 * Estados: `muted` (medalla atenuada y laurel más tenue), `skeletonColor` (esqueleto: medalla y barra del nombre de ese color, laurel muy tenue). Decorativo salvo el nombre: la tarjeta lo lee en su frase.
 */
type Props = {
  icon: string;
  /** Texto bajo el laurel: el nombre del logro (o "Desbloquea tu primera"). Sin texto, la casilla queda vacía y conserva su alto. */
  name?: string;
  scale?: number;
  /** Letra (simulada o del sistema, con tope 1,3). */
  fontScale?: number;
  /** Ancho disponible para el nombre (la mitad derecha de la tarjeta). */
  textWidth?: number;
  laurelOpacity?: number;
  muted?: boolean;
  mutedIconColor?: string;
  skeletonColor?: string;
};

const CREAM = '#F6F1E8';

export function AchievementShowcase({
  icon,
  name,
  scale = DEFAULT_SCALE,
  fontScale = 1,
  textWidth = 112,
  laurelOpacity,
  muted = false,
  mutedIconColor,
  skeletonColor,
}: Props) {
  const g = showcaseGeometry(scale);
  const slot = nameSlotHeight(fontScale);
  return (
    <View style={[styles.wrap, { width: Math.max(textWidth, g.boxW) }]}>
      <View style={{ width: g.boxW, height: g.boxH }}>
        <Laurel scale={scale} opacity={laurelOpacity} />
        <View style={[styles.medal, { left: g.medalLeft, top: g.medalTop }]}>
          {skeletonColor ? (
            <View style={{ width: g.medal, height: g.medal, borderRadius: g.medal / 2, backgroundColor: skeletonColor }} />
          ) : (
            <AchievementMedal icon={icon} size={g.medal} muted={muted} iconColor={muted ? mutedIconColor : undefined} />
          )}
        </View>
      </View>
      <View style={{ width: textWidth, height: slot, marginTop: NAME_GAP, alignItems: 'center' }}>
        {skeletonColor ? (
          <View style={{ width: textWidth * 0.62, height: 10 * fontScale, borderRadius: 5 * fontScale, marginTop: 3, backgroundColor: skeletonColor }} />
        ) : name ? (
          <Text style={[styles.name, nameStyleFor(name, fontScale)]} maxFontSizeMultiplier={1.3}>
            {name}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  medal: { position: 'absolute' },
  name: { color: CREAM, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
});
