import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useProviderRegisterStore } from '../../../../stores/provider-register-store';

const ZONES = [
  { code: '75', label: 'Paris (75)' },
  { code: '92', label: 'Hauts-de-Seine (92)' },
  { code: '93', label: 'Seine-Saint-Denis (93)' },
  { code: '94', label: 'Val-de-Marne (94)' },
  { code: '77', label: 'Seine-et-Marne (77)' },
  { code: '78', label: 'Yvelines (78)' },
  { code: '91', label: 'Essonne (91)' },
  { code: '95', label: "Val-d'Oise (95)" },
];

const SKILLS = [
  { code: 'cleaning_standard', label: '🧹 Ménage standard' },
  { code: 'cleaning_premium', label: '✨ Ménage premium' },
  { code: 'laundry', label: '🧺 Gestion du linge' },
  { code: 'key_handover', label: '🔑 Remise de clés' },
  { code: 'photo_report', label: '📸 Rapport photo' },
  { code: 'extras', label: '🛒 Réassort consommables' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}
      className={`rounded-full border px-3 py-2 ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
      <Text className={`text-sm ${active ? 'text-white font-medium' : 'text-text-primary'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProviderRegisterStep4() {
  const { setZonesSkills } = useProviderRegisterStore();
  const [zones, setZones] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState('');

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function handleNext() {
    if (zones.length === 0) { setError('Sélectionnez au moins une zone.'); return; }
    if (skills.length === 0) { setError('Sélectionnez au moins une compétence.'); return; }
    setZonesSkills(zones, skills);
    router.push('/(auth)/register/provider/step-5');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-6 pb-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          <View className="flex-row gap-1 mb-8">
            {[1,2,3,4,5].map((i) => (
              <View key={i} className={`flex-1 h-1 rounded-full ${i <= 4 ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </View>

          <Text className="text-2xl font-bold text-text-primary mb-1">Zones et compétences</Text>
          <Text className="text-sm text-text-secondary mb-8">Étape 4 sur 5</Text>

          {error ? (
            <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          ) : null}

          <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Zones d'intervention</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {ZONES.map((z) => (
              <Chip key={z.code} label={z.label} active={zones.includes(z.code)}
                onPress={() => setZones(toggle(zones, z.code))} />
            ))}
          </View>

          <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Compétences</Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {SKILLS.map((s) => (
              <Chip key={s.code} label={s.label} active={skills.includes(s.code)}
                onPress={() => setSkills(toggle(skills, s.code))} />
            ))}
          </View>

          <TouchableOpacity className="h-14 bg-primary rounded-btn items-center justify-center" onPress={handleNext}>
            <Text className="text-white text-base font-semibold">Continuer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
