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
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListMovementsQueryKey,
  useCreateMovement,
  useCreatePr,
  type Movement,
} from '@workspace/api-client-react';
import { RmHeader } from '@/components/rm/RmHeader';
import { MovementSheet } from '@/components/rm/MovementSheet';
import { PercentSlider } from '@/components/rm/PercentSlider';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { trimNum, type Unit } from '@/lib/rm/units';

const todayIso = () => new Date().toISOString().slice(0, 10);
const shiftIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
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
    prefillUnit?: string;
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
  const [unit, setUnit] = React.useState<Unit>(
    params.prefillUnit === 'lb' ? 'lb' : 'kg',
  );
  const [pct, setPct] = React.useState(100);
  const [date, setDate] = React.useState(todayIso());
  const [note, setNote] = React.useState('');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [addingMv, setAddingMv] = React.useState(false);
  const [mvName, setMvName] = React.useState('');

  const create = useCreatePr();
  const createMovement = useCreateMovement();
  const qc = useQueryClient();

  const submitNewMovement = () => {
    const n = mvName.trim();
    if (!n || createMovement.isPending) return;
    createMovement.mutate(
      { data: { userId, name: n } },
      {
        onSuccess: (created) => {
          setMovement(created);
          setAddingMv(false);
          setMvName('');
          qc.invalidateQueries({ queryKey: getListMovementsQueryKey({ userId }) });
        },
        onError: () => Alert.alert('Error', 'No se pudo crear el movimiento.'),
      },
    );
  };

  const lifted = Number(weight.replace(',', '.'));
  const liftedValid = Number.isFinite(lifted) && lifted > 0;
  // Project the full 1RM from the lift + how close to max it felt.
  const projected = liftedValid ? (lifted * 100) / pct : 0;
  const over = pct > 100;

  const dateRel =
    date === todayIso() ? 'hoy' : date === shiftIso(-1) ? 'ayer' : null;

  const save = () => {
    if (!movement) {
      Alert.alert('Falta el movimiento', 'Elegí un movimiento.');
      return;
    }
    if (!liftedValid) {
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
          weight: Math.round(projected * 100) / 100,
          unit,
          percentage: pct,
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
        {/* Movimiento */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Movimiento</Text>
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => [
            styles.selectRow,
            { borderColor: colors.border, backgroundColor: colors.card },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text
            style={[
              styles.selectText,
              { color: movement ? colors.foreground : colors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {movement?.name ?? 'Seleccionar movimiento'}
          </Text>
          <Feather name={movement ? 'chevron-down' : 'arrow-right'} size={18} color={colors.mutedForeground} />
        </Pressable>

        {addingMv ? (
          <View style={styles.addRow}>
            <TextInput
              style={[
                styles.addInput,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
              value={mvName}
              onChangeText={setMvName}
              placeholder="Nombre del movimiento"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              maxLength={40}
              onSubmitEditing={submitNewMovement}
            />
            <Pressable
              onPress={submitNewMovement}
              disabled={!mvName.trim() || createMovement.isPending}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: colors.primary },
                (pressed || !mvName.trim()) && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                {createMovement.isPending ? '…' : 'Agregar'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAddingMv(false);
                setMvName('');
              }}
              hitSlop={10}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setAddingMv(true)}
            style={({ pressed }) => [styles.addLink, pressed && { opacity: 0.6 }]}
          >
            <Feather name="plus" size={15} color={colors.primary} />
            <Text style={[styles.addLinkText, { color: colors.primary }]}>
              Agregar movimiento propio
            </Text>
          </Pressable>
        )}

        {/* Peso del RM */}
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 18 }]}>Peso del RM</Text>
        <View style={styles.row}>
          <TextInput
            style={[
              styles.input,
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

        {/* % del RM realizado */}
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 22 }]}>
          % del RM realizado
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Qué tan cerca de tu máximo real sentiste el levantamiento.
        </Text>
        <View style={{ marginTop: 8 }}>
          <PercentSlider value={pct} onChange={setPct} />
        </View>

        <View style={[styles.calc, { borderColor: colors.border }]}>
          <View style={styles.calcRow}>
            <Text style={[styles.calcKey, { color: colors.mutedForeground }]}>Peso levantado</Text>
            <Text style={[styles.calcVal, { color: colors.foreground }]}>
              {liftedValid ? `${trimNum(lifted, 2)} ${unit}` : '—'}
            </Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={[styles.calcKey, { color: colors.mutedForeground }]}>
              Equivale a {pct}% de tu RM
            </Text>
            <Text style={[styles.calcBig, { color: over ? colors.primary : colors.foreground }]}>
              {liftedValid ? `${trimNum(projected, 1)} ${unit}` : '—'}
            </Text>
          </View>
          {over && liftedValid ? (
            <Text style={[styles.overNote, { color: colors.primary }]}>
              Levantaste por encima de tu RM registrado.
            </Text>
          ) : null}
        </View>

        {/* Fecha */}
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Fecha</Text>
          {dateRel ? (
            <Text style={[styles.labelRel, { color: colors.mutedForeground }]}>· {dateRel}</Text>
          ) : null}
        </View>
        <View style={styles.row}>
          <TextInput
            style={[
              styles.input,
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

        {/* Nota */}
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 18 }]}>
          Nota (opcional)
        </Text>
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
            (pressed || create.isPending) && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            {create.isPending ? 'Guardando…' : 'Guardar RM'}
          </Text>
        </Pressable>
      </ScrollView>

      <MovementSheet
        visible={sheetOpen}
        userId={userId}
        selectedId={movement?.id ?? null}
        onSelect={setMovement}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 18 },
  labelRel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    marginTop: 8,
  },
  selectText: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  addBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  addBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  addLinkText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  input: {
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
  calc: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    paddingTop: 14,
    gap: 10,
  },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  calcKey: { fontSize: 13, fontFamily: 'Inter_500Medium', flexShrink: 1 },
  calcVal: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  calcBig: { fontSize: 22, fontFamily: 'Anton_400Regular' },
  overNote: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
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
    marginTop: 8,
  },
  save: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
