import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePropertyCreateStore } from '../../../../stores/property-create-store';

const REPORT_SECTIONS = [
  { icon: '🖼', label: 'Vue générale', note: 'Obligatoire' },
  { icon: '🍳', label: 'Cuisine', note: '3 angles requis' },
  { icon: '🚿', label: 'Salle de bain', note: 'Sanitaires + sols' },
  { icon: '🛏', label: 'Chambres', note: 'Literie + rangements' },
  { icon: '🚽', label: 'Toilettes', note: '' },
];

const REPORT_EXTRAS = [
  { value: 'garage_remote', label: '🚗 Bip garage' },
  { value: 'tv_remote', label: '📺 Télécommande TV' },
  { value: 'meter', label: '⚡ Compteur (eau / électricité)' },
  { value: 'key_box', label: '🔑 Boîte à clés' },
  { value: 'balcony', label: '🌿 Balcon' },
  { value: 'trash', label: '🗑 Poubelles' },
  { value: 'fridge', label: '❄️ Frigo' },
];

export default function PropertyCreateStep4() {
  const store = usePropertyCreateStore();

  const [photoEnabled, setPhotoEnabled] = useState(store.photoReportEnabled);
  const [extras, setExtras] = useState<string[]>(store.reportExtras);

  function toggleExtra(value: string) {
    setExtras((prev) => prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]);
  }

  function handleContinue() {
    store.setReport(photoEnabled, extras, store.guestLinkEnabled);
    router.replace('/(client)/properties/create/step-5');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-6 pb-8">

          <TouchableOpacity onPress={() => router.replace('/(client)/properties/create/step-3')} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          <View className="flex-row gap-1 mb-8">
            {[1,2,3,4,5,6,7].map((i) => (
              <View key={i} className={`flex-1 h-1 rounded-full ${i <= 4 ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </View>

          <Text className="text-2xl font-bold text-text-primary mb-1">Configuration du rapport</Text>
          <Text className="text-sm text-text-secondary mb-2">Étape 4 sur 7</Text>
          <Text className="text-sm text-text-secondary mb-8">
            Définissez les éléments visuels requis pour le rapport d'état des lieux.
          </Text>

          {/* ── RAPPORT PHOTO ── */}
          <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3 mb-6">
            <View className="flex-1 mr-4">
              <Text className="text-base font-semibold text-text-primary">Rapport photo activé</Text>
              <Text className="text-xs text-text-secondary mt-0.5">Le prestataire documente chaque intervention</Text>
            </View>
            <Switch value={photoEnabled} onValueChange={setPhotoEnabled}
              trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }} thumbColor="#FFFFFF" />
          </View>

          {/* ── SECTIONS INCLUSES ── */}
          <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Sections incluses</Text>
          <View className="bg-bg-light rounded-xl px-4 mb-6">
            {REPORT_SECTIONS.map((s, i) => (
              <View key={s.label} className={`flex-row items-center gap-3 py-3 ${i < REPORT_SECTIONS.length - 1 ? 'border-b border-border' : ''}`}>
                <Text className="text-lg">{s.icon}</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-text-primary">{s.label}</Text>
                  {s.note ? <Text className="text-xs text-text-secondary">{s.note}</Text> : null}
                </View>
                <View className="bg-green-100 rounded-full px-2 py-0.5">
                  <Text className="text-xs text-green-700 font-medium">Inclus</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── ÉLÉMENTS SUPPLÉMENTAIRES ── */}
          <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Éléments supplémentaires à vérifier</Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {REPORT_EXTRAS.map((e) => {
              const selected = extras.includes(e.value);
              return (
                <TouchableOpacity key={e.value} onPress={() => toggleExtra(e.value)}
                  className={`rounded-full border px-3 py-2 ${selected ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                  <Text className={`text-sm ${selected ? 'text-white font-medium' : 'text-text-primary'}`}>{e.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity className="h-14 rounded-btn items-center justify-center bg-primary" onPress={handleContinue}>
            <Text className="text-white text-base font-semibold">Continuer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
