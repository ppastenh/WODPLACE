import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';

interface JoinBoxCardProps {
  onPress: () => void;
}

/**
 * The main call-to-action on Home while the athlete doesn't belong to any
 * box yet — replaces the old one-time popup shown right after registering.
 * Deliberately prominent (copper accent, sizable) since joining a box is
 * the single most important thing to do before anything else on this
 * screen becomes useful (Comunidad, Progreso mensual, Clases, Próximos
 * cumpleaños and Plan/Contratos Activos all depend on it — see
 * lib/navigation.ts's shouldShowContracts and home.tsx).
 */
export function JoinBoxCard({ onPress }: JoinBoxCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.accent, borderColor: colors.navActive }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.navActive }]}>
        <Feather name="key" size={22} color={colors.card} />
      </View>
      <Text style={[styles.title, { color: colors.accentForeground }]}>Todavía no tenés un box</Text>
      <Text style={[styles.subtitle, { color: colors.accentForeground }]}>
        Ingresá el código de invitación que te dio tu box para unirte y desbloquear el resto de la app.
      </Text>
      <AppButton
        label="Ingresar código de invitación"
        variant="dark"
        fullWidth
        onPress={onPress}
        icon={<Feather name="plus-circle" size={18} color={colors.authText} />}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    gap: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 19,
    fontFamily: 'Anton_400Regular',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 19,
  },
  button: {
    marginTop: 8,
  },
});
