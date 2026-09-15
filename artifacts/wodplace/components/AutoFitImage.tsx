import React, { useState } from 'react';
import { Image, type ImageLoadEventData, type ImageStyle } from 'expo-image';

interface AutoFitImageProps {
  uri: string;
  width: number;
  /** Shown before the real aspect ratio is known, and as a floor after. */
  minHeight?: number;
  /** Caps how tall a very elongated portrait image can get. */
  maxHeight?: number;
  borderRadius?: number;
  style?: ImageStyle;
}

/**
 * Sizes its own container to the image's real aspect ratio (measured on
 * load) and renders with `contentFit="contain"` — the photo always shows
 * whole, scaled down as needed, never cropped, whether it's landscape or
 * portrait. Replaces the old fixed-aspect-ratio + `cover` treatment that
 * used to crop anything that didn't match the box.
 */
export function AutoFitImage({
  uri,
  width,
  minHeight = 180,
  maxHeight = 520,
  borderRadius = 0,
  style,
}: AutoFitImageProps) {
  const [ratio, setRatio] = useState<number | null>(null);

  const height = ratio
    ? Math.min(maxHeight, Math.max(minHeight, width / ratio))
    : minHeight;

  return (
    <Image
      source={{ uri }}
      style={[{ width, height, borderRadius }, style]}
      contentFit="contain"
      transition={300}
      onLoad={(event: ImageLoadEventData) => {
        const { width: w, height: h } = event.source;
        if (w > 0 && h > 0) setRatio(w / h);
      }}
    />
  );
}
