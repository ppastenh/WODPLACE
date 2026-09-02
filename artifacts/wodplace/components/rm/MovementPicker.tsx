import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useCreateMovement,
  useListMovements,
  type Movement,
} from '@workspace/api-client-react';
import { useDarkColors } from '@/hooks/useDarkColors';

const CATEGORY_LABEL: Record<string, string> = {
  squat_dl: 'Sentadillas / Peso muerto',
  press: 'Presses',
  olympic: 'Olímpicos',
};

type Props = {
  userId: string;
  selectedId: string | null;
  onSelect: (movement: Movement) => void;
};

export function MovementPicker({ userId, selectedId, onSelect }: Props) {
  const colors = useDarkColors();
  const list = useListMovements({ userId }, { query: { enabled: !!userId } as never });
  const createMutation = useCreateMovement();
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState('');

  const movements = list.data ?? [];
  const groups = React.useMemo(() => {
    const byCat = new Map<string, Movement[]>();
    for (const m of movements) {
      const key = m.isDefault ? m.category ?? 'other' : 'custom';
      const arr = byCat.get(key) ?? [];
      arr.push(m);
      byCat.set(key, arr);
    }
    const order = ['squat_dl', 'press', 'olympic', 'other', 'custom'];
    return order
      .filter((k) => byCat.has(k))
      .map((k) => ({
        key: k,
        label: k === 'custom' ? 'Míos' : CATEGORY_LABEL[k] ?? 'Otros',
        items: byCat.get(k)!,
      }));
  }, [movements]);

  const submitNew = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { data: { userId, name: trimmed } },
      {
        onSuccess: (created) => {
          setName('');
          setAdding(false);
          list.refetch();
          onSelect(created);
        },
      },
    );
  };

  if (list.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />;
  }

  return (
    <View style={{ gap: 16 }}>
      {groups.map((g) => (
        <View key={g.key} style={{ gap: 8 }}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{g.label}</Text>
          <View style={styles.chips}>
            {g.items.map((m) => {
              const active = m.id === selectedId;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => onSelect(m)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {m.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {adding ? (
        <View style={styles.addRow}>
          <TextInput
            style={[
              styles.input,
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del movimiento"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            maxLength={40}
            onSubmitEditing={submitNew}
          />
          <Pressable
            onPress={submitNew}
            disabled={!name.trim() || createMutation.isPending}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
              {createMutation.isPending ? '...' : 'Agregar'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setAdding(false)} hitSlop={10}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => [
            styles.addLink,
            { borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="plus" size={15} color={colors.primary} />
          <Text style={[styles.addLinkText, { color: colors.primary }]}>
            Agregar movimiento propio
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  addBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  addLinkText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
