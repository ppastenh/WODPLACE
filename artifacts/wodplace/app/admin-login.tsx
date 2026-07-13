import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useVerifyAdminCode } from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { setAdminCode } from '@/lib/adminSession';

/**
 * Hidden entry point (reached by tapping the "Contratos Activos" title 7
 * times) for the owner-only admin panel. There is no per-owner account —
 * anyone who knows the shared code can manage contract PDFs, matching the
 * scope of this feature (a single hidden owner panel, not multi-admin auth).
 */
export default function AdminLoginScreen() {
  const colors = useColors();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const verifyMutation = useVerifyAdminCode();

  const handleSubmit = () => {
    if (!code.trim()) return;
    setError('');
    verifyMutation.mutate(
      { data: { code: code.trim() } },
      {
        onSuccess: (result) => {
          if (result.ok) {
            setAdminCode(code.trim());
            router.replace('/admin-contracts');
          } else {
            setError('Código incorrecto.');
          }
        },
        onError: () => setError('No se pudo verificar el código.'),
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
      <Text style={[styles.title, { color: colors.authText }]}>Panel de administración</Text>
      <Text style={[styles.subtitle, { color: colors.authMuted }]}>
        Ingresa el código de acceso para continuar.
      </Text>
      <TextInput
        value={code}
        onChangeText={(v) => {
          setCode(v);
          if (error) setError('');
        }}
        placeholder="Código"
        placeholderTextColor={colors.authMuted}
        secureTextEntry
        autoFocus
        style={[
          styles.input,
          { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
        ]}
      />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <AppButton
        label="Entrar"
        variant="primary"
        fullWidth
        loading={verifyMutation.isPending}
        onPress={handleSubmit}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontFamily: 'Anton_400Regular', textAlign: 'center' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 12 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  button: { marginTop: 6 },
});
