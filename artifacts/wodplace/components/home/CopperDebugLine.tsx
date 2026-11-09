import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { copperColors, copperMeasure, copperPasses, type CopperChoice } from '@/components/home/copperLook';
import { copperDebugLines } from '@/components/home/copperDebugText';

/** SOLO DESARROLLO: contraste real de la combinación de cobre elegida (misma fórmula que las pruebas); las que no pasan van marcadas. Se carga con require dentro de __DEV__. */
export function CopperDebugLine({ copper }: { copper: CopperChoice }) {
  const c = useColors();
  const m = copperMeasure(copperColors(c, copper));
  const ok = copperPasses(m);
  return (
    <View style={styles.box}>
      {copperDebugLines(copper, m).map((line, i) => {
        const bad = i === 0 ? !ok : line.includes('NO pasa');
        return (
          <Text key={i} style={[styles.text, { color: bad ? '#FF8A80' : '#FFFFFF' }, i === 0 && styles.title]}>
            {(bad ? '✘ ' : '✔ ') + line}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 6, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: 8, gap: 2 },
  text: { fontSize: 11, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  title: { fontFamily: 'Inter_700Bold' },
});
