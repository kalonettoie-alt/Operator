import { View, Text, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

const SITE_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://deltom.fr';

export default function ProviderPending() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}>
        <View className="items-center mb-10">
          <Text className="text-6xl mb-4">🎉</Text>
          <Text className="text-2xl font-bold text-text-primary text-center mb-3">
            Compte créé !
          </Text>
          <Text className="text-sm text-text-secondary text-center leading-6">
            Votre profil est enregistré. Il vous reste 3 étapes à compléter sur notre site pour activer votre compte.
          </Text>
        </View>

        {/* Étapes restantes */}
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">Prochaines étapes</Text>

        <View className="gap-3 mb-8">
          <View className="bg-bg-light rounded-xl px-4 py-4 flex-row items-start gap-4">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mt-0.5">
              <Text className="text-white text-sm font-bold">1</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary mb-1">Formation en ligne</Text>
              <Text className="text-xs text-text-secondary leading-5">
                Suivez les modules de formation Deltom sur notre site. Environ 2h de contenu pour maîtriser nos standards.
              </Text>
            </View>
          </View>

          <View className="bg-bg-light rounded-xl px-4 py-4 flex-row items-start gap-4">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mt-0.5">
              <Text className="text-white text-sm font-bold">2</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary mb-1">Test de certification</Text>
              <Text className="text-xs text-text-secondary leading-5">
                Passez le test à la fin de la formation. Un score de 80% minimum est requis pour valider votre certification.
              </Text>
            </View>
          </View>

          <View className="bg-bg-light rounded-xl px-4 py-4 flex-row items-start gap-4">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mt-0.5">
              <Text className="text-white text-sm font-bold">3</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary mb-1">Kit matériel</Text>
              <Text className="text-xs text-text-secondary leading-5">
                Commandez votre kit de démarrage Deltom (éponges, produits, sacs...) directement sur le site.
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-orange-50 rounded-xl px-4 py-3 mb-8 flex-row gap-3 items-start">
          <Text className="text-base">💡</Text>
          <Text className="text-xs text-orange-800 leading-5 flex-1">
            Une fois ces 3 étapes complétées, l'équipe Deltom valide votre compte. Vous recevrez un email de confirmation dès que vous pouvez commencer à recevoir des missions.
          </Text>
        </View>

        <TouchableOpacity
          className="h-14 bg-primary rounded-btn items-center justify-center mb-4"
          onPress={() => Linking.openURL(SITE_URL)}>
          <Text className="text-white text-base font-semibold">Accéder au site Deltom →</Text>
        </TouchableOpacity>

        <TouchableOpacity className="h-12 items-center justify-center" onPress={handleLogout}>
          <Text className="text-sm text-text-secondary">Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
