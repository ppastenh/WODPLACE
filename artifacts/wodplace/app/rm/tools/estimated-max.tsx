import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { RmHeader } from '@/components/rm/RmHeader';
import { useDarkColors } from '@/hooks/useDarkColors';
import { estimate1RM, repTable } from '@/lib/rm/epley';
import { trimNum, type Unit } from '@/lib/rm/units';

export default function EstimatedMaxScreen() {
  const colors = useDarkColors();
  const [weight, setWeight] = React.useState('');
  const [reps, setReps] = React.useState('');
  const [unit, setUnit] = React.useState<Unit>('kg');

  const w = Number(weight.replace(',', '.'));
  const r = Number(reps);
  const valid = Number.isFinite(w) && w > 0 && Number.isFinite(r) && r >= 1;
  const oneRm = valid ? estimate1RM(w, r) : 0;
  const table = valid ? repTable(oneRm, 10) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader title="Máximo estimado" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Peso</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={{ width: 90, gap: 6 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Reps</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        <View style={[styles.toggle, { borderColor: colors.border }]}>
          {(['kg', 'lb'] as Unit[]).map((u) => (
            <Pressable
              key={u}
              onPress={() => setUnit(u)}
              style={[styles.toggleBtn, { backgroundColor: unit === u ? colors.primary : 'transparent' }]}
            >
              <Text style={[styles.toggleText, { color: unit === u ? colors.primaryForeground : colors.mutedForeground }]}>
                {u}
              </Text>
            </Pressable>
          ))}
        </View>

        {valid ? (
          <>
            <View style={[styles.result, { backgroundColor: colors.card }]}>
              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>1RM estimado</Text>
              <Text style={[styles.resultValue, { color: colors.foreground }]}>
                {trimNum(oneRm, 1)} {unit}
              </Text>
              <Text style={[styles.resultNote, { color: colors.mutedForeground }]}>Fórmula de Epley</Text>
            </View>

            <Pressable
              onPress={() =>
                router.push(`/rm/record?prefillWeight=${trimNum(oneRm, 1)}`)
              }
              style={[styles.useBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.useBtnText, { color: colors.primary }]}>Usar como RM</Text>
            </Pressable>

            <View style={[styles.table, { backgroundColor: colors.card }]}>
              {table.map((row, i) => (
                <View
                  key={row.reps}
                  style={[
                    styles.trow,
                    i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <Text style={[styles.treps, { color: colors.mutedForeground }]}>{row.reps} reps</Text>
                  <Text style={[styles.tweight, { color: colors.foreground }]}>
                    {trimNum(row.weight, 1)} {unit}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Ingresá el peso que levantaste y cuántas repeticiones lograste.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  inputRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  toggleText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  result: { borderRadius: 18, padding: 18, gap: 3, alignItems: 'center' },
  resultLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultValue: { fontSize: 36, fontFamily: 'Anton_400Regular' },
  resultNote: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  useBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  useBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  table: { borderRadius: 16, overflow: 'hidden' },
  trow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  treps: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  tweight: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
});
