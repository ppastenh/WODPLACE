import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useColors } from '@/hooks/useColors';
import { AthleteRank, RANK_OPTIONS } from '@/context/AuthContext';

interface RankSheetProps {
  visible: boolean;
  onClose: () => void;
  current: AthleteRank;
  onSelect: (rank: AthleteRank) => void;
}

export function RankSheet({ visible, onClose, current, onSelect }: RankSheetProps) {
  const colors = useColors();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Selecciona tu nivel">
      <View style={styles.list}>
        {RANK_OPTIONS.map((rank) => {
          const active = rank === current;
          return (
            <Pressable
              key={rank}
              onPress={() => {
                onSelect(rank);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: active ? colors.secondary : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color: active ? colors.secondaryForeground : colors.foreground },
                ]}
              >
                {rank}
              </Text>
              {active ? <Feather name="check" size={18} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
