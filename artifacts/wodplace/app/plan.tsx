import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getMyPlans, type MyPlan } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

function formatPrice(price: number): string {
  return `$${Math.round(price).toLocaleString('es-CL')}`;
}

export default function PlanScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [plans, setPlans] = useState<MyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getMyPlans(user.id)
      .then((res) => setPlans(res.plans))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Plan</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.center}>
            <Feather name="award" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tu box todavía no cargó planes de membresía.
            </Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.isSubscribed
                  ? { backgroundColor: colors.foreground }
                  : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <View style={styles.planHeaderRow}>
                <Text
                  style={[
                    styles.planName,
                    { color: plan.isSubscribed ? colors.background : colors.foreground },
                  ]}
                >
                  {plan.name}
                </Text>
                {plan.isSubscribed ? (
                  <View style={[styles.activeTag, { backgroundColor: colors.success }]}>
                    <Text style={styles.activeTagText}>Suscrito</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.planPrice,
                  { color: plan.isSubscribed ? colors.background : colors.foreground },
                ]}
              >
                {formatPrice(plan.price)}{' '}
                <Text style={styles.planPriceUnit}>
                  / {plan.durationDays} días · {plan.classesPerPeriod != null ? `${plan.classesPerPeriod} clases` : 'Ilimitado'}
                </Text>
              </Text>
              {plan.benefits.length > 0 ? (
                <>
                  <View
                    style={[
                      styles.planDivider,
                      {
                        backgroundColor: plan.isSubscribed
                          ? 'rgba(255,255,255,0.15)'
                          : colors.border,
                      },
                    ]}
                  />
                  {plan.benefits.map((benefit) => (
                    <View key={benefit} style={styles.planRow}>
                      <Feather
                        name="check-circle"
                        size={15}
                        color={plan.isSubscribed ? colors.background : colors.primary}
                      />
                      <Text
                        style={[
                          styles.planRowText,
                          { color: plan.isSubscribed ? colors.background : colors.foreground },
                        ]}
                      >
                        {benefit}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 14 },
  title: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    marginTop: 8,
    marginBottom: 4,
  },
  center: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
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
    flex: 1,
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
});
