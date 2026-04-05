import { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/auth-store';

export default function RegisterStep4() {
  const role = useAuthStore((s) => s.role);

  // Si session déjà active (confirmation email désactivée) → dashboard direct
  useEffect(() => {
    if (role === 'client') router.replace('/(client)/dashboard');
    else if (role === 'provider') router.replace('/(provider)/dashboard');
    else if (role === 'admin') router.replace('/(admin)/dashboard');
  }, [role]);

  // Session active → affiche un loader pendant la redirection
  if (role) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1A3A3A" />
      </SafeAreaView>
    );
  }

  // Pas de session → confirmation email requise
  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 items-center justify-center">
        <Text className="text-6xl mb-6">📧</Text>
        <Text className="text-2xl font-bold text-text-primary text-center mb-3">
          Vérifiez votre email
        </Text>
        <Text className="text-base text-text-secondary text-center mb-12 leading-6">
          Un lien de confirmation a été envoyé à votre adresse email. Cliquez dessus pour activer votre compte.
        </Text>

        <TouchableOpacity
          className="h-14 bg-primary rounded-btn items-center justify-center w-full"
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text className="text-white text-base font-semibold">Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
