import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useProviderRegisterStore } from '../../../../stores/provider-register-store';

const CONTRACT = `CONTRAT DE PRESTATION DE SERVICES INDEPENDANTS

Entre Deltom (ci-après "la Plateforme") et le Prestataire souscrivant ce contrat.

1. OBJET
Le Prestataire s'engage à réaliser des interventions de ménage, remise de clés et services associés pour les logements référencés sur la Plateforme, dans les zones et selon les compétences déclarées lors de son inscription.

2. STATUT
Le Prestataire intervient en qualité de travailleur indépendant. Aucun lien de subordination ne lie le Prestataire à Deltom. Le Prestataire est seul responsable de ses obligations fiscales et sociales.

3. MISSIONS
Les missions sont proposées via l'application mobile. Le Prestataire est libre d'accepter ou de refuser toute mission. L'acceptation d'une mission vaut engagement ferme à l'exécuter dans les délais et conditions convenus.

4. RÉMUNÉRATION
Le Prestataire perçoit 80% du prix de l'intervention hors consommables. Les paiements sont effectués par virement bancaire via Stripe Connect, sous 15 jours après confirmation SEPA du client.

5. QUALITÉ
Le Prestataire s'engage à respecter les standards de qualité Deltom : respect des horaires, checklist complète, rapport photo obligatoire, logement rendu propre et conforme.

6. CONFIDENTIALITÉ
Le Prestataire s'engage à ne pas divulguer les informations des logements (codes d'accès, informations clients) à des tiers.

7. RÉSILIATION
Chacune des parties peut résilier le présent contrat avec un préavis de 7 jours. En cas de manquement grave (no-show, fraude, comportement inapproprié), Deltom se réserve le droit de suspendre le compte immédiatement.

8. DROIT APPLICABLE
Le présent contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents de Paris.`;

export default function ProviderRegisterStep5() {
  const store = useProviderRegisterStore();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFinish() {
    if (!accepted) return;
    setLoading(true);
    setError('');
    try {
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

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: store.email,
        password: store.password,
      });
      if (signInError) throw signInError;

      const { error: detailsError } = await supabase.rpc('provider_save_details', {
        p_siret: store.siret,
        p_company_name: store.companyName || '',
        p_is_auto_entrepreneur: store.isAutoEntrepreneur,
        p_zones: store.zones,
        p_skills: store.skills,
      });
      if (detailsError) throw detailsError;

      store.reset();
      router.replace('/(provider)/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pt-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
          <Text className="text-2xl text-text-primary">←</Text>
        </TouchableOpacity>

        <View className="flex-row gap-1 mb-8">
          {[1,2,3,4,5].map((i) => (
            <View key={i} className="flex-1 h-1 rounded-full bg-primary" />
          ))}
        </View>

        <Text className="text-2xl font-bold text-text-primary mb-1">Contrat prestataire</Text>
        <Text className="text-sm text-text-secondary mb-4">Étape 5 sur 5 — Lisez et acceptez le contrat</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 16 }}>
        {error ? (
          <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
            <Text className="text-danger text-sm">{error}</Text>
          </View>
        ) : null}
        <View className="bg-bg-light rounded-xl p-4 mb-6">
          <Text className="text-xs text-text-secondary leading-5">{CONTRACT}</Text>
        </View>
      </ScrollView>

      <View className="px-6 pb-8">
        <TouchableOpacity onPress={() => setAccepted(!accepted)}
          className="flex-row items-center gap-3 mb-6">
          <View className={`w-6 h-6 rounded border-2 items-center justify-center ${accepted ? 'border-primary bg-primary' : 'border-border'}`}>
            {accepted && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
          <Text className="text-sm text-text-primary flex-1">
            J'ai lu et j'accepte les conditions du contrat de prestation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`h-14 rounded-btn items-center justify-center ${accepted && !loading ? 'bg-primary' : 'bg-text-muted'}`}
          onPress={handleFinish}
          disabled={!accepted || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text className="text-white text-base font-semibold">Créer mon compte</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
