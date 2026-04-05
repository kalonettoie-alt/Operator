import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePropertyCreateStore } from '../../../../stores/property-create-store';

const FEATURES = [
  { icon: '⏱', title: 'Suivi en temps réel', desc: "Votre voyageur voit l'avancement du ménage en direct, minute par minute." },
  { icon: '🔐', title: "Codes d'accès sécurisés", desc: 'Digicode, boîte à clé, WiFi — visibles uniquement à l\'heure exacte du check-in.' },
  { icon: '🛎', title: 'Early check-in payant', desc: 'Le voyageur peut demander un accès anticipé (15€ à 45€). Revenu direct pour vous.' },
  { icon: '⭐', title: 'Note de satisfaction', desc: 'À la fin du ménage, le voyageur note la propreté. Transmis au prestataire.' },
  { icon: '📞', title: 'Contact direct hôte', desc: 'Un bouton d\'appel vers vous, visible en cas d\'urgence.' },
  { icon: '🌐', title: 'Lien unique personnalisé', desc: 'Envoyé automatiquement avant chaque arrivée. Aucune appli à installer.' },
];

export default function PropertyCreateStep6() {
  const store = usePropertyCreateStore();
  const [enabled, setEnabled] = useState(store.guestLinkEnabled);

  function handleContinue() {
    store.setReport(store.photoReportEnabled, store.reportExtras, enabled);
    router.replace('/(client)/properties/create/step-7');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-6 pb-8">

          <TouchableOpacity onPress={() => router.replace('/(client)/properties/create/step-5')} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          <View className="flex-row gap-1 mb-8">
            {[1,2,3,4,5,6,7].map((i) => (
              <View key={i} className={`flex-1 h-1 rounded-full ${i <= 6 ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </View>

          <Text className="text-2xl font-bold text-text-primary mb-1">Page voyageur</Text>
          <Text className="text-sm text-text-secondary mb-2">Étape 6 sur 7</Text>

          {/* Hero card */}
          <View className={`rounded-2xl overflow-hidden mb-6 ${enabled ? 'bg-primary' : 'bg-bg-light'}`}>
            <View className="px-5 pt-5 pb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3">
                  <Text className="text-3xl">🌐</Text>
                  <View>
                    <Text className={`text-lg font-bold ${enabled ? 'text-white' : 'text-text-primary'}`}>Page voyageur</Text>
                    <View className={`mt-0.5 self-start rounded-full px-2 py-0.5 ${enabled ? 'bg-white/20' : 'bg-primary'}`}>
                      <Text className="text-xs font-bold text-white">+2€ / mois / logement</Text>
                    </View>
                  </View>
                </View>
                <Switch value={enabled} onValueChange={setEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#2C4F4F' }} thumbColor="#FFFFFF" />
              </View>
              <Text className={`text-sm leading-5 ${enabled ? 'text-white/80' : 'text-text-secondary'}`}>
                Un lien web unique envoyé automatiquement à chaque voyageur avant son arrivée.
              </Text>
            </View>
            {enabled && (
              <View className="bg-white/10 px-5 py-3">
                <Text className="text-white/90 text-xs font-medium">
                  💡 Les propriétaires avec la page voyageur obtiennent en moyenne 4,8★ sur Airbnb
                </Text>
              </View>
            )}
          </View>

          <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Ce que reçoit votre voyageur</Text>
          <View className="gap-3 mb-8">
            {FEATURES.map((f) => (
              <View key={f.title} className="flex-row gap-4 bg-bg-light rounded-xl px-4 py-4">
                <Text className="text-2xl mt-0.5">{f.icon}</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary mb-0.5">{f.title}</Text>
                  <Text className="text-xs text-text-secondary leading-5">{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Aperçu */}
          <View className="rounded-2xl border-2 border-border overflow-hidden mb-8">
            <View className="bg-primary px-4 py-3">
              <Text className="text-white text-xs font-medium text-center">Aperçu — ce que voit le voyageur</Text>
            </View>
            <View className="bg-white px-4 py-4">
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-lg">🌐</Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-text-primary">Votre logement</Text>
                  <Text className="text-xs text-text-secondary">Paris · Arrivée 14 avr.</Text>
                </View>
              </View>
              <View className="bg-green-50 rounded-lg px-3 py-2 mb-3 flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-green-500" />
                <Text className="text-xs text-green-700 font-medium">Ménage terminé — logement prêt</Text>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1 bg-bg-light rounded-lg px-3 py-2">
                  <Text className="text-xs text-text-secondary">Check-in</Text>
                  <Text className="text-sm font-bold text-text-primary">16:00</Text>
                </View>
                <View className="flex-1 bg-primary/10 rounded-lg px-3 py-2">
                  <Text className="text-xs text-primary font-medium">Codes d'accès</Text>
                  <Text className="text-sm font-bold text-primary">Disponibles</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity className="h-14 rounded-btn items-center justify-center bg-primary mb-3" onPress={handleContinue}>
            <Text className="text-white text-base font-semibold">
              {enabled ? 'Activer et continuer' : 'Continuer sans activer'}
            </Text>
          </TouchableOpacity>

          {enabled && (
            <TouchableOpacity className="h-10 items-center justify-center" onPress={() => setEnabled(false)}>
              <Text className="text-sm text-text-secondary">Passer — activer plus tard dans les réglages</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
