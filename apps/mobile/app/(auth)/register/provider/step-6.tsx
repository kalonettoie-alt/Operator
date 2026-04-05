import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// URL de la page formation (Next.js web-guest)
const FORMATION_URL = process.env.EXPO_PUBLIC_FORMATION_URL ?? 'https://deltom.fr/formation';

export default function ProviderRegisterStep6() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6 pb-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
          <Text className="text-2xl text-text-primary">←</Text>
        </TouchableOpacity>

        <View className="flex-row gap-1 mb-8">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <View key={i} className={`flex-1 h-1 rounded-full ${i <= 6 ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </View>

        <Text className="text-2xl font-bold text-text-primary mb-1">Formation obligatoire</Text>
        <Text className="text-sm text-text-secondary mb-8">Étape 6 sur 8</Text>

        <View className="bg-primary/5 rounded-xl p-5 mb-6">
          <Text className="text-lg font-bold text-primary mb-2">Formation Deltom</Text>
          <Text className="text-sm text-text-secondary leading-5 mb-4">
            Une formation de 2h en ligne pour maîtriser les standards Deltom : protocole de ménage, rapport photo, gestion des incidents, relation client.
          </Text>
          <View className="gap-2">
            {['Protocole de ménage Deltom', 'Utilisation de l\'application', 'Rapport photo et checklist', 'Gestion des incidents'].map((item) => (
              <View key={item} className="flex-row items-center gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                <Text className="text-sm text-text-primary">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-orange-50 rounded-xl px-4 py-3 mb-8 flex-row gap-3 items-start">
          <Text className="text-lg">💡</Text>
          <Text className="text-xs text-orange-800 flex-1 leading-5">
            La formation se déroule sur notre site web. Une fois le paiement effectué, revenez sur cette page pour continuer votre inscription.
          </Text>
        </View>

        <TouchableOpacity
          className="h-14 bg-primary rounded-btn items-center justify-center mb-3"
          onPress={() => Linking.openURL(FORMATION_URL)}>
          <Text className="text-white text-base font-semibold">Accéder à la formation →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="h-12 items-center justify-center"
          onPress={() => router.push('/(auth)/register/provider/step-7')}>
          <Text className="text-sm text-text-secondary">J'ai déjà payé la formation — continuer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
