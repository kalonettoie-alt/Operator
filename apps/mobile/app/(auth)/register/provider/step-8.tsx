import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useProviderRegisterStore } from '../../../../stores/provider-register-store';

const KIT_ITEMS = [
  { emoji: '🧹', label: 'Balai + pelle à poussière' },
  { emoji: '🪣', label: 'Seau + serpillière' },
  { emoji: '🧴', label: 'Produits ménagers (4 types)' },
  { emoji: '🧽', label: 'Éponges et chiffons microfibre (x10)' },
  { emoji: '🧤', label: 'Gants de ménage' },
  { emoji: '🦠', label: 'Spray désinfectant' },
  { emoji: '🚿', label: 'Détartrant salle de bain' },
  { emoji: '📋', label: 'Bloc-notes de bord' },
];

export default function ProviderRegisterStep8() {
  const store = useProviderRegisterStore();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFinish() {
    if (!confirmed) return;
    setLoading(true);
    setError('');

    try {
      // 1. Créer le compte Auth avec rôle provider dans les métadonnées
      const { error: signUpError } = await supabase.auth.signUp({
        email: store.email,
        password: store.password,
        options: {
          data: {
            role: 'provider',
            first_name: store.firstName,
            last_name: store.lastName,
            phone: store.phone,
          },
        },
      });
      if (signUpError) throw signUpError;

      // 2. Se connecter pour obtenir une session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: store.email,
        password: store.password,
      });
      if (signInError) throw signInError;

      // 3. Sauvegarder les détails prestataire
      const { error: detailsError } = await supabase.rpc('provider_save_details', {
        p_siret: store.siret,
        p_company_name: store.companyName || '',
        p_is_auto_entrepreneur: store.isAutoEntrepreneur,
        p_zones: store.zones,
        p_skills: store.skills,
      });
      if (detailsError) throw detailsError;

      // 4. Soumettre l'onboarding (kit_validated = true, provider_status = pending)
      const { error: submitError } = await supabase.rpc('provider_submit_onboarding');
      if (submitError) throw submitError;

      store.reset();
      router.replace('/(auth)/register/provider/pending');
    } catch (e: any) {
      setError(e.message ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-6 pb-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          <View className="flex-row gap-1 mb-8">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <View key={i} className="flex-1 h-1 rounded-full bg-primary" />
            ))}
          </View>

          <Text className="text-2xl font-bold text-text-primary mb-1">Kit matériel</Text>
          <Text className="text-sm text-text-secondary mb-8">Étape 8 sur 8 — Dernière étape !</Text>

          {error ? (
            <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="bg-bg-light rounded-xl p-4 mb-4">
            <Text className="text-sm font-semibold text-text-primary mb-3">
              Pour réaliser vos interventions, vous devez disposer du matériel suivant :
            </Text>
            <View className="gap-2">
              {KIT_ITEMS.map((item) => (
                <View key={item.label} className="flex-row items-center gap-3">
                  <Text className="text-base">{item.emoji}</Text>
                  <Text className="text-sm text-text-primary">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="bg-primary/5 rounded-xl px-4 py-3 mb-8">
            <Text className="text-xs text-primary leading-5">
              Ce matériel est à votre charge. Il vous appartient et vous pourrez l'utiliser pour toutes vos missions. Assurez-vous de le renouveler régulièrement.
            </Text>
          </View>

          <TouchableOpacity onPress={() => setConfirmed(!confirmed)}
            className="flex-row items-center gap-3 mb-8">
            <View className={`w-6 h-6 rounded border-2 items-center justify-center ${confirmed ? 'border-primary bg-primary' : 'border-border'}`}>
              {confirmed && <Text className="text-white text-xs font-bold">✓</Text>}
            </View>
            <Text className="text-sm text-text-primary flex-1">
              Je confirme disposer (ou m'engager à acquérir) le matériel nécessaire
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`h-14 rounded-btn items-center justify-center ${confirmed && !loading ? 'bg-primary' : 'bg-text-muted'}`}
            onPress={handleFinish}
            disabled={!confirmed || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text className="text-white text-base font-semibold">Terminer l'inscription</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
