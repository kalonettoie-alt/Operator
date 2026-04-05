import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePropertyCreateStore } from '../../../../stores/property-create-store';

type Kit = 'lavant' | 'proprete' | 'bienvenue';

const KITS: { id: Kit; emoji: string; label: string; price: number; priceLabel: string; items: string[] }[] = [
  {
    id: 'lavant',
    emoji: '🧴',
    label: 'Kit Lavant',
    price: 3.5,
    priceLabel: '3,50€',
    items: ['Shampooing', 'Gel douche'],
  },
  {
    id: 'proprete',
    emoji: '🧹',
    label: 'Kit Propreté',
    price: 5,
    priceLabel: '5,00€',
    items: ['3 sacs poubelle', '2 rouleaux papier toilette', '1 éponge verte', '1 liquide vaisselle'],
  },
  {
    id: 'bienvenue',
    emoji: '🎁',
    label: 'Kit Bienvenue',
    price: 7.5,
    priceLabel: '7,50€',
    items: ['2 rouleaux papier toilette', '3 capsules café', '3 sachets thé', '1 gel douche', '1 liquide vaisselle', '3 sacs poubelle'],
  },
];

export default function PropertyCreateStep5() {
  const store = usePropertyCreateStore();
  const [selected, setSelected] = useState<Kit[]>(store.consumablesKits);

  function toggle(kit: Kit) {
    setSelected((prev) =>
      prev.includes(kit) ? prev.filter((k) => k !== kit) : [...prev, kit]
    );
  }

  const total = KITS.filter((k) => selected.includes(k.id)).reduce((sum, k) => sum + k.price, 0);

  function handleContinue() {
    store.setConsumables(selected);
    router.replace('/(client)/properties/create/step-6');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-6 pb-8">

          <TouchableOpacity onPress={() => router.replace('/(client)/properties/create/step-4')} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          <View className="flex-row gap-1 mb-8">
            {[1,2,3,4,5,6,7].map((i) => (
              <View key={i} className={`flex-1 h-1 rounded-full ${i <= 5 ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </View>

          <Text className="text-2xl font-bold text-text-primary mb-1">Consommables</Text>
          <Text className="text-sm text-text-secondary mb-2">Étape 5 sur 7</Text>
          <Text className="text-sm text-text-secondary mb-8">
            Sélectionnez un ou plusieurs kits livrés à chaque passage. Optionnel.
          </Text>

          {/* Kits */}
          {KITS.map((kit) => {
            const active = selected.includes(kit.id);
            return (
              <TouchableOpacity
                key={kit.id}
                onPress={() => toggle(kit.id)}
                className={`rounded-xl border-2 px-4 py-4 mb-3 ${active ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-3">
                    {/* Checkbox */}
                    <View className={`w-5 h-5 rounded border-2 items-center justify-center ${active ? 'border-primary bg-primary' : 'border-border'}`}>
                      {active && <Text className="text-white text-xs leading-none font-bold">✓</Text>}
                    </View>
                    <Text className="text-xl">{kit.emoji}</Text>
                    <Text className={`text-base font-bold ${active ? 'text-primary' : 'text-text-primary'}`}>
                      {kit.label}
                    </Text>
                  </View>
                  <View className={`rounded-full px-3 py-1 ${active ? 'bg-primary' : 'bg-bg-light'}`}>
                    <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-text-primary'}`}>
                      +{kit.priceLabel}/passage
                    </Text>
                  </View>
                </View>
                <View className="ml-8 gap-1">
                  {kit.items.map((item) => (
                    <View key={item} className="flex-row items-center gap-2">
                      <View className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-primary' : 'bg-text-secondary'}`} />
                      <Text className="text-xs text-text-secondary">{item}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Récapitulatif prix */}
          {selected.length > 0 && (
            <View className="bg-primary/10 rounded-xl px-4 py-3 mb-5">
              <Text className="text-sm font-semibold text-primary">
                +{total.toFixed(2).replace('.', ',')}€ / passage
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                Ajouté au prix de chaque intervention
              </Text>
            </View>
          )}

          <TouchableOpacity className="h-14 rounded-btn items-center justify-center bg-primary" onPress={handleContinue}>
            <Text className="text-white text-base font-semibold">
              {selected.length > 0 ? 'Confirmer et continuer' : 'Continuer sans consommables'}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
