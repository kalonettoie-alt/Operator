import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/query-client';
import { useAdminDashboardKPIs } from '../../hooks/use-admin';

const STATUS_DOT: Record<string, string> = {
  pending:     'bg-orange-400',
  assigned:    'bg-blue-400',
  accepted:    'bg-indigo-400',
  in_progress: 'bg-primary',
  completed:   'bg-green-500',
  cancelled:   'bg-gray-300',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  assigned: 'Assignée',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export default function AdminDashboard() {
  const { data: kpis, isLoading, refetch } = useAdminDashboardKPIs();
  const [refreshing, setRefreshing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchEnabled, setDispatchEnabled] = useState<boolean | null>(null);

  // Sync local state avec les données serveur (seulement si pas de valeur locale)
  const displayDispatch = dispatchEnabled ?? kpis?.dispatch_auto_enabled ?? false;

  async function handleToggleDispatch(enabled: boolean) {
    setDispatchEnabled(enabled); // Optimiste immédiat
    await supabase.rpc('admin_toggle_dispatch_auto' as any, { p_enabled: enabled });
  }

  async function handleDispatchNow() {
    setDispatching(true);
    const { data, error } = await supabase.rpc('admin_run_dispatch' as any);
    setDispatching(false);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      const count = data as number;
      Alert.alert('Dispatch terminé', `${count} mission${count > 1 ? 's' : ''} assignée${count > 1 ? 's' : ''}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-pending-interventions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['provider-missions'] });
    }
  }

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  const missions = kpis?.today_missions ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor="#1A3A3A" />}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-text-primary">Dashboard</Text>
          <Text className="text-sm text-text-secondary">Deltom</Text>
        </View>

        {/* KPIs */}
        {kpis && (
          <View className="gap-3 mb-6">
            {/* Ligne 1 */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-primary/5 rounded-xl px-4 py-3">
                <Text className="text-2xl font-bold text-primary">{kpis.missions_month}</Text>
                <Text className="text-[10px] text-text-secondary mt-0.5">Interventions du mois</Text>
              </View>
              <TouchableOpacity className="flex-1 bg-orange-50 rounded-xl px-4 py-3"
                onPress={() => router.push('/(admin)/interventions')}>
                <Text className="text-2xl font-bold text-orange-600">{kpis.missions_pending}</Text>
                <Text className="text-[10px] text-orange-700 mt-0.5">En attente d'assignation →</Text>
              </TouchableOpacity>
            </View>
            {/* Ligne 2 */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-blue-50 rounded-xl px-4 py-3">
                <Text className="text-2xl font-bold text-blue-600">{kpis.new_clients_month}</Text>
                <Text className="text-[10px] text-blue-700 mt-0.5">Nouveaux clients</Text>
              </View>
              <View className="flex-1 bg-blue-50 rounded-xl px-4 py-3">
                <Text className="text-2xl font-bold text-blue-600">{kpis.new_properties_month}</Text>
                <Text className="text-[10px] text-blue-700 mt-0.5">Nouveaux logements</Text>
              </View>
            </View>
            {/* Ligne 3 */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-green-50 rounded-xl px-4 py-3">
                <Text className="text-2xl font-bold text-green-700">{kpis.active_subscriptions}</Text>
                <Text className="text-[10px] text-green-700 mt-0.5">Logements actifs</Text>
              </View>
              <TouchableOpacity className="flex-1 bg-orange-50 rounded-xl px-4 py-3"
                onPress={() => router.push('/(admin)/users')}>
                <Text className="text-2xl font-bold text-orange-600">{kpis.providers_pending}</Text>
                <Text className="text-[10px] text-orange-700 mt-0.5">Prestataires à valider →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="gap-3 mb-6">
          {/* Toggle dispatch auto */}
          {kpis && (
            <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-medium text-text-primary">Dispatch automatique</Text>
                <Text className="text-[10px] text-text-secondary">Assignation auto toutes les heures</Text>
              </View>
              <Switch
                value={displayDispatch}
                onValueChange={handleToggleDispatch}
                trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }}
                thumbColor="#fff"
              />
            </View>
          )}

          {/* Dispatch maintenant */}
          <TouchableOpacity
            onPress={handleDispatchNow}
            disabled={dispatching}
            className={`h-12 rounded-xl items-center justify-center ${dispatching ? 'bg-text-muted' : 'bg-primary'}`}>
            {dispatching
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white text-sm font-semibold">Lancer le dispatch maintenant</Text>
            }
          </TouchableOpacity>

          {/* Créer une mission */}
          <TouchableOpacity
            onPress={() => router.push('/(admin)/create-mission')}
            className="h-12 rounded-xl items-center justify-center border border-primary">
            <Text className="text-primary text-sm font-semibold">+ Créer une mission</Text>
          </TouchableOpacity>
        </View>

        {/* Demandes d'arrivée anticipée */}
        {kpis && kpis.early_checkin_requests > 0 && (
          <View className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6">
            <Text className="text-sm font-semibold text-orange-800">
              {kpis.early_checkin_requests} demande{kpis.early_checkin_requests > 1 ? 's' : ''} d'arrivée anticipée
            </Text>
            <Text className="text-xs text-orange-600 mt-0.5">À traiter</Text>
          </View>
        )}

        {/* Interventions du jour */}
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Interventions du jour ({missions.length})
        </Text>
        {missions.length === 0 ? (
          <Text className="text-sm text-text-secondary mb-6">Aucune intervention aujourd'hui</Text>
        ) : (
          <View className="gap-2">
            {missions.map((m) => (
              <TouchableOpacity key={m.id} onPress={() => router.push(`/(admin)/intervention-detail?id=${m.id}`)}
                className="flex-row items-center bg-bg-light rounded-xl px-4 py-3 gap-3">
                <View className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[m.status] ?? 'bg-gray-300'}`} />
                <Text className="text-xs font-semibold text-text-primary w-12">{m.scheduled_time?.slice(0, 5)}</Text>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-text-primary" numberOfLines={1}>{m.property_name}</Text>
                  <Text className="text-[10px] text-text-secondary">{m.provider_name} · {STATUS_LABEL[m.status] ?? m.status}</Text>
                </View>
                <Text className="text-xs font-semibold text-primary">{Number(m.provider_payout ?? 0).toFixed(0)}€</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
