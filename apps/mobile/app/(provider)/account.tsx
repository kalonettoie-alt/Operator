import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';
import { useClientProfile } from '../../hooks/use-client-dashboard';

const ZONE_LABELS: Record<string, string> = {
  '75': 'Paris', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne', '77': 'Seine-et-Marne', '78': 'Yvelines',
  '91': 'Essonne', '95': "Val-d'Oise",
};

export default function ProviderAccount() {
  const { signOut } = useAuthStore();
  const { data: profile, error: profileError } = useClientProfile();
  const [loading, setLoading] = useState(false);

  console.log('[provider-account] profile:', profile?.first_name, 'error:', profileError?.message);

  async function handleSignOut() {
    await supabase.auth.signOut();
    signOut();
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données personnelles seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement', style: 'destructive',
          onPress: () => {
            Alert.alert('Confirmation', 'Dernière chance. Supprimer votre compte ?', [
              { text: 'Non', style: 'cancel' },
              { text: 'Oui, supprimer', style: 'destructive', onPress: async () => {
                setLoading(true);
                const { error } = await supabase.rpc('delete_own_account' as any);
                setLoading(false);
                if (error) { Alert.alert('Erreur', error.message); }
                else { await supabase.auth.signOut(); signOut(); }
              }},
            ]);
          },
        },
      ]
    );
  }

  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-text-primary mb-6">Mon compte</Text>

        <View className="bg-bg-light rounded-xl px-5 py-5 mb-6">
          <Text className="text-lg font-semibold text-text-primary mb-1">{profile?.first_name} {profile?.last_name}</Text>
          <Text className="text-sm text-text-secondary mb-1">{profile?.email}</Text>
          {profile?.phone && <Text className="text-sm text-text-secondary mb-1">{profile.phone}</Text>}
          <View className="flex-row items-center gap-2 mt-2">
            <View className="rounded-full px-3 py-1 bg-blue-50"><Text className="text-xs font-medium text-blue-700">Prestataire</Text></View>
            {memberSince ? <Text className="text-xs text-text-secondary">Membre depuis {memberSince}</Text> : null}
          </View>
        </View>

        <View className="bg-bg-light rounded-xl px-5 py-4 mb-6 gap-2">
          {profile?.siret && <View className="flex-row justify-between"><Text className="text-xs text-text-secondary">SIRET</Text><Text className="text-xs font-medium text-text-primary">{profile.siret}</Text></View>}
          {profile?.company_name && <View className="flex-row justify-between"><Text className="text-xs text-text-secondary">Entreprise</Text><Text className="text-xs font-medium text-text-primary">{profile.company_name}</Text></View>}
          <View className="flex-row justify-between"><Text className="text-xs text-text-secondary">Statut</Text><Text className="text-xs font-medium text-text-primary">{profile?.is_auto_entrepreneur ? 'Auto-entrepreneur' : 'Autre statut'}</Text></View>
          {(profile?.zones?.length ?? 0) > 0 && <View className="flex-row justify-between"><Text className="text-xs text-text-secondary">Zones</Text><Text className="text-xs font-medium text-text-primary">{(profile?.zones ?? []).map((z: string) => ZONE_LABELS[z] ?? z).join(', ')}</Text></View>}
          {(profile?.skills?.length ?? 0) > 0 && <View className="flex-row justify-between"><Text className="text-xs text-text-secondary">Compétences</Text><Text className="text-xs font-medium text-text-primary">{(profile?.skills ?? []).join(', ')}</Text></View>}
          {(profile?.rating_count ?? 0) > 0 && <View className="flex-row justify-between"><Text className="text-xs text-text-secondary">Note</Text><Text className="text-xs font-medium text-text-primary">{Number(profile?.rating ?? 0).toFixed(1)}/5 ({profile?.rating_count} avis)</Text></View>}
        </View>

        <View className="gap-3">
          <TouchableOpacity onPress={handleSignOut} className="h-14 rounded-xl items-center justify-center border border-border">
            <Text className="text-base font-medium text-text-primary">Se déconnecter</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAccount} disabled={loading} className="h-14 rounded-xl items-center justify-center bg-red-50 border border-red-200">
            {loading ? <ActivityIndicator color="#EF4444" /> : <Text className="text-base font-medium text-red-600">Supprimer mon compte</Text>}
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-text-muted text-center mt-10">Deltom v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
