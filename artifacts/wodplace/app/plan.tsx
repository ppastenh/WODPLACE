import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';

export default function PlanScreen() {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Plan</Text>

        <View style={[styles.planCard, { backgroundColor: colors.foreground }]}>
          <View style={styles.planHeaderRow}>
            <Text style={[styles.planName, { color: colors.background }]}>Plan Ilimitado</Text>
            <View style={[styles.activeTag, { backgroundColor: colors.success }]}>
              <Text style={styles.activeTagText}>Activo</Text>
            </View>
          </View>
          <Text style={[styles.planPrice, { color: colors.background }]}>
            $45.000 <Text style={styles.planPriceUnit}>/ mes</Text>
          </Text>
          <View style={[styles.planDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
          <View style={styles.planRow}>
            <Feather name="refresh-cw" size={15} color={colors.background} />
            <Text style={[styles.planRowText, { color: colors.background }]}>
              Se renueva el 15 de agosto de 2026
            </Text>
          </View>
          <View style={styles.planRow}>
            <Feather name="check-circle" size={15} color={colors.background} />
            <Text style={[styles.planRowText, { color: colors.background }]}>
              Clases ilimitadas, todas las disciplinas
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Beneficios incluidos</Text>
        <View style={[styles.benefitsCard, { backgroundColor: colors.card }]}>
          {[
            'Acceso a todas las clases del box',
            'Reserva anticipada de hasta 7 días',
            'Invita a 1 amigo al mes',
          ].map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Feather name="check" size={15} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.foreground }]}>{benefit}</Text>
            </View>
          ))}
        </View>

        <AppButton
          label="Cambiar plan"
          variant="dark"
          fullWidth
          style={styles.changeButton}
          onPress={() =>
            Alert.alert('Cambiar plan', 'Muy pronto podrás cambiar tu plan desde la app.')
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 4 },
  title: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    marginTop: 8,
    marginBottom: 18,
  },
  planCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
  },
  activeTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  planPrice: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  planPriceUnit: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  planDivider: {
    height: 1,
    marginVertical: 4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planRowText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
    marginTop: 26,
    marginBottom: 12,
  },
  benefitsCard: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  changeButton: {
    marginTop: 26,
  },
});
