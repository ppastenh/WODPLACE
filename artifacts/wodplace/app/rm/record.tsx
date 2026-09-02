import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreatePr, type Movement } from '@workspace/api-client-react';
import { RmHeader } from '@/components/rm/RmHeader';
import { MovementPicker } from '@/components/rm/MovementPicker';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import type { Unit } from '@/lib/rm/units';

const todayIso = () => new Date().toISOString().slice(0, 10);
const newId = () =>
  `pr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export default function RecordRmScreen() {
  const colors = useDarkColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const params = useLocalSearchParams<{
    movementId?: string;
    movementName?: string;
    prefillWeight?: string;
  }>();

  const [movement, setMovement] = React.useState<Movement | null>(
    params.movementId && params.movementName
      ? {
          id: params.movementId,
          name: params.movementName,
          isDefault: false,
          category: null,
          createdBy: null,
        }
      : null,
  );
  const [weight, setWeight] = React.useState(params.prefillWeight ?? '');
  const [unit, setUnit] = React.useState<Unit>('kg');
  const [date, setDate] = React.useState(todayIso());
  const [note, setNote] = React.useState('');

  const create = useCreatePr();

  const save = () => {
    const w = Number(weight.replace(',', '.'));
    if (!movement) {
      Alert.alert('Falta el movimiento', 'Elegí un movimiento.');
      return;
    }
    if (!Number.isFinite(w) || w <= 0) {
      Alert.alert('Peso inválido', 'Ingresá un peso mayor que cero.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Fecha inválida', 'Usá el formato AAAA-MM-DD.');
      return;
    }
    create.mutate(
      {
        data: {
          id: newId(),
          userId,
          movementId: movement.id,
          weight: w,
          unit,
          achievedAt: date,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: () => Alert.alert('Error', 'No se pudo guardar el registro.'),
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader title="Registrar RM" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Movimiento</Text>
        <MovementPicker userId={userId} selectedId={movement?.id ?? null} onSelect={setMovement} />

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>Peso</Text>
        <View style={styles.weightRow}>
          <TextInput
            style={[
              styles.weightInput,
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
            ]}
            value={weight}
            onChangeText={setWeight}
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />
          <View style={[styles.toggle, { borderColor: colors.border }]}>
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                style={[
                  styles.toggleBtn,
                  { backgroundColor: unit === u ? colors.primary : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: unit === u ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Fecha</Text>
        <View style={styles.weightRow}>
          <TextInput
            style={[
              styles.weightInput,
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
            ]}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => setDate(todayIso())}
            style={[styles.todayBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.toggleText, { color: colors.primary }]}>Hoy</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Nota (opcional)</Text>
        <TextInput
          style={[
            styles.noteInput,
            { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
          ]}
          value={note}
          onChangeText={setNote}
          placeholder="Cómo se sintió el levantamiento…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={300}
        />

        <Pressable
          onPress={save}
          disabled={create.isPending}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            {create.isPending ? 'Guardando…' : 'Guardar RM'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 10 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightInput: {
    flex: 1,
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
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  toggleText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  todayBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noteInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 76,
    textAlignVertical: 'top',
  },
  save: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  saveText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
