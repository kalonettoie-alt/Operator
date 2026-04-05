import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useClientProfile } from '../../hooks/use-client-dashboard';
import { useProviderDashboard, useProviderMissions } from '../../hooks/use-provider-missions';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/query-client';

const SITE_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://deltom.fr';

const STATUS_DOT: Record<string, string> = {
  assigned: 'bg-orange-400',
  accepted: 'bg-blue-400',
  in_progress: 'bg-primary',
  completed: 'bg-green-500',
};
const STATUS_LABEL: Record<string, string> = {
  assigned: 'A accepter',
  accepted: 'Acceptée',
  in_progress: 'En cours',
};

function formatDateFR(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function ProviderDashboard() {
  const { data: profile, error: profileError } = useClientProfile();
  const { data: dash, isLoading, error: dashError, refetch } = useProviderDashboard();
  const { data: missions = [] } = useProviderMissions();
  const [refreshing, setRefreshing] = useState(false);
  const [showPropositions, setShowPropositions] = useState(false);
  const isPending = !profile?.provider_status || profile.provider_status !== 'active';

  const propositions = missions.filter((m) => m.status === 'assigned');

  console.log('[provider-dashboard] profile:', profile?.first_name, 'status:', profile?.provider_status, 'profileError:', profileError?.message);
  console.log('[provider-dashboard] dash:', !!dash, 'isLoading:', isLoading, 'dashError:', dashError?.message);
  console.log('[provider-dashboard] propositions:', propositions.length);

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}>
          <Text className="text-2xl font-bold text-text-primary mb-1">Bonjour {profile?.first_name ?? ''}</Text>
          <Text className="text-sm text-text-secondary mb-8">Votre compte est en cours d'activation</Text>

          <View className="bg-orange-50 rounded-xl px-4 py-4 mb-6 flex-row gap-3 items-start">
            <Text className="text-xl">⏳</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-orange-800 mb-1">Compte en attente de validation</Text>
              <Text className="text-xs text-orange-700 leading-5">
                Complétez les étapes ci-dessous sur notre site, puis l'équipe Deltom activera votre compte.
              </Text>
            </View>
          </View>

          <View className="gap-3 mb-8">
            {[
              { n: '1', title: 'Formation en ligne', desc: 'Modules de formation Deltom — environ 2h.' },
              { n: '2', title: 'Test de certification', desc: 'Score minimum 80% requis.' },
              { n: '3', title: 'Kit matériel', desc: 'Commande du kit de démarrage sur le site.' },
            ].map((step) => (
              <View key={step.n} className="bg-bg-light rounded-xl px-4 py-4 flex-row items-start gap-4">
                <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mt-0.5">
                  <Text className="text-white text-sm font-bold">{step.n}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary mb-0.5">{step.title}</Text>
                  <Text className="text-xs text-text-secondary">{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity className="h-14 bg-primary rounded-btn items-center justify-center"
            onPress={() => Linking.openURL(SITE_URL)}>
            <Text className="text-white text-base font-semibold">Accéder au site Deltom →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  const todayMissions = dash?.missions_today ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor="#1A3A3A" />}
      >
        <Text className="text-2xl font-bold text-text-primary mb-1">Bonjour {profile?.first_name}</Text>
        <Text className="text-sm text-text-secondary mb-6">
          {(dash?.rating_count ?? 0) > 0 ? `${Number(dash?.rating ?? 0).toFixed(1)}/5 (${dash?.rating_count} avis)` : 'Bienvenue sur Deltom'}
        </Text>

        {/* KPIs */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-primary/5 rounded-xl px-4 py-3">
            <Text className="text-2xl font-bold text-primary">{Number(dash?.earnings_month ?? 0).toFixed(0)}€</Text>
            <Text className="text-[10px] text-text-secondary mt-0.5">Ce mois</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-xl px-4 py-3">
            <Text className="text-2xl font-bold text-green-700">{dash?.completed_month ?? 0}</Text>
            <Text className="text-[10px] text-text-secondary mt-0.5">Missions terminées</Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-blue-50 rounded-xl px-4 py-3">
            <Text className="text-2xl font-bold text-blue-600">{dash?.missions_week ?? 0}</Text>
            <Text className="text-[10px] text-text-secondary mt-0.5">Cette semaine</Text>
          </View>
          <View className="flex-1 bg-bg-light rounded-xl px-4 py-3">
            <Text className="text-2xl font-bold text-text-primary">{Number(dash?.earnings_total ?? 0).toFixed(0)}€</Text>
            <Text className="text-[10px] text-text-secondary mt-0.5">Total revenus</Text>
          </View>
        </View>

        {/* Propositions à accepter */}
        {propositions.length > 0 && (
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setShowPropositions(!showPropositions)}
              className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4 flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-orange-800">
                  +{propositions.length} proposition{propositions.length > 1 ? 's' : ''} de mission
                </Text>
                <Text className="text-xs text-orange-600 mt-0.5">À accepter ou refuser</Text>
              </View>
              <Text className="text-orange-600 text-lg">{showPropositions ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showPropositions && (
              <View className="mt-3 gap-3">
                {propositions.map((m) => {
                  const prop = m.properties as any;
                  const typeLabel = prop?.property_type === 'studio' ? 'Studio' : prop?.property_type === 'T2' ? 'F2' : prop?.property_type === 'T3' ? 'F3' : prop?.property_type === 'T4+' ? 'F4+' : prop?.property_type;
                  return (
                    <View key={m.id} className="bg-white border border-border rounded-xl px-4 py-4">
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-1 mr-3">
                          <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{prop?.internal_name}</Text>
                          <Text className="text-xs text-text-secondary">{prop?.city} {prop?.postal_code}</Text>
                        </View>
                        <Text className="text-sm font-bold text-primary">{Number(m.provider_payout).toFixed(2).replace('.', ',')}€</Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2 mb-2">
                        {typeLabel && <View className="bg-bg-light rounded px-2 py-0.5"><Text className="text-[10px] text-text-secondary">{typeLabel}</Text></View>}
                        {prop?.address && <View className="bg-bg-light rounded px-2 py-0.5"><Text className="text-[10px] text-text-secondary">{prop.address}</Text></View>}
                      </View>
                      <Text className="text-xs text-text-secondary mb-3">
                        {new Date(m.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {String(m.scheduled_time).slice(0, 5)}
                      </Text>
                      {m.owner_reminder && (
                        <View className="bg-orange-50 rounded-lg px-3 py-2 mb-3">
                          <Text className="text-[10px] text-orange-700">{m.owner_reminder}</Text>
                        </View>
                      )}
                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          className="flex-1 h-11 rounded-lg bg-primary items-center justify-center"
                          onPress={async () => {
                            const { error } = await supabase.rpc('provider_accept_mission', { p_intervention_id: m.id });
                            if (error) { Alert.alert('Erreur', error.message); return; }
                            // Pré-remplir le cache du détail mission pour accès offline immédiat
                            queryClient.setQueryData(['provider-mission', m.id], { ...m, status: 'accepted' });
                            queryClient.invalidateQueries({ queryKey: ['provider-missions'] });
                            queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
                          }}>
                          <Text className="text-white text-sm font-semibold">Accepter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 h-11 rounded-lg border border-red-300 bg-red-50 items-center justify-center"
                          onPress={() => {
                            Alert.alert('Refuser la mission ?', 'La mission sera proposée à un autre prestataire.', [
                              { text: 'Annuler', style: 'cancel' },
                              { text: 'Refuser', style: 'destructive', onPress: async () => {
                                const { error } = await supabase.rpc('provider_refuse_mission', { p_intervention_id: m.id });
                                if (error) { Alert.alert('Erreur', error.message); return; }
                                queryClient.invalidateQueries({ queryKey: ['provider-missions'] });
                                queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
                              }},
                            ]);
                          }}>
                          <Text className="text-red-600 text-sm font-semibold">Refuser</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Missions du jour */}
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Aujourd'hui ({todayMissions.length})
        </Text>
        {todayMissions.length === 0 ? (
          <View className="bg-bg-light rounded-xl px-4 py-6 items-center">
            <Text className="text-sm text-text-secondary">Aucune mission aujourd'hui</Text>
          </View>
        ) : (
          <View className="gap-3">
            {todayMissions.map((m) => (
              <TouchableOpacity key={m.id} onPress={() => router.push(`/(provider)/mission/${m.id}`)}
                className="bg-white border border-border rounded-xl px-4 py-3">
                <View className="flex-row items-center gap-3">
                  <View className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[m.status] ?? 'bg-gray-300'}`} />
                  <Text className="text-xs font-semibold text-text-primary w-12">{m.scheduled_time?.slice(0, 5)}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>{m.property_name}</Text>
                    <Text className="text-xs text-text-secondary">{m.city} · {STATUS_LABEL[m.status] ?? m.status}</Text>
                  </View>
                  <Text className="text-xs font-semibold text-primary">{Number(m.provider_payout).toFixed(0)}€</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
