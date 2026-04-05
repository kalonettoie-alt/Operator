import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useProviderMissions } from '../../hooks/use-provider-missions';
import { usePhotoQueueStore } from '../../stores/photo-queue-store';
import { getProcessQueue } from '../../hooks/use-photo-queue';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  assigned:    { label: 'À accepter', bg: 'bg-orange-100', text: 'text-orange-700' },
  accepted:    { label: 'Acceptée',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_progress: { label: 'En cours',   bg: 'bg-primary/10', text: 'text-primary' },
  completed:   { label: 'Terminée',   bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:   { label: 'Annulée',    bg: 'bg-gray-100',   text: 'text-gray-500' },
};

function formatDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.getTime() === today.getTime()) return "Aujourd'hui";
  if (date.getTime() === tomorrow.getTime()) return 'Demain';
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function ProviderMissions() {
  const { data: missions = [], isLoading, refetch } = useProviderMissions();
  const [refreshing, setRefreshing] = useState(false);
  const completionQueue = usePhotoQueueStore((s) => s.completionQueue);

  const pendingSync = missions.filter((m) => completionQueue.includes(m.id));
  const active = missions.filter((m) =>
    ['assigned', 'accepted', 'in_progress'].includes(m.status) && !completionQueue.includes(m.id)
  );
  const history = missions.filter((m) => ['completed', 'cancelled'].includes(m.status));

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text className="text-text-secondary text-sm">Chargement...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          const pq = getProcessQueue();
          if (pq) await pq();
          await refetch();
          setRefreshing(false);
        }} tintColor="#1A3A3A" />}
      >
        <Text className="text-2xl font-bold text-text-primary mb-6">Mes missions</Text>

        {missions.length === 0 && pendingSync.length === 0 ? (
          <View className="items-center pt-20">
            <Text className="text-4xl mb-4">📋</Text>
            <Text className="text-base font-semibold text-text-primary mb-2">Aucune mission</Text>
            <Text className="text-sm text-text-secondary text-center">Vos missions assignées apparaîtront ici.</Text>
          </View>
        ) : (
          <>
            {/* Missions en attente de sync réseau */}
            {pendingSync.length > 0 && (
              <>
                <View className="flex-row items-center gap-2 mb-3">
                  <Text className="text-xs font-semibold text-orange-700 uppercase tracking-wide">En attente de connexion</Text>
                  <Text className="text-lg">📡</Text>
                </View>
                <View className="gap-3 mb-8">
                  {pendingSync.map((m) => {
                    const prop = m.properties as any;
                    return (
                      <TouchableOpacity key={m.id} onPress={() => router.push(`/(provider)/mission/${m.id}`)}
                        className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4">
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 mr-3">
                            <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{prop?.internal_name}</Text>
                            <Text className="text-xs text-text-secondary">{prop?.city}</Text>
                          </View>
                          <View className="rounded-full px-3 py-1 bg-orange-100">
                            <Text className="text-xs font-medium text-orange-700">Sync en attente</Text>
                          </View>
                        </View>
                        <Text className="text-xs text-text-secondary">📅 {formatDate(m.scheduled_date)} · {String(m.scheduled_time).slice(0,5)}</Text>
                        <Text className="text-xs text-orange-600 mt-1">Sera marquée terminée dès que le réseau revient</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Missions actives */}
            {active.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">En cours</Text>
                <View className="gap-3 mb-8">
                  {active.map((m) => {
                    const st = STATUS_CONFIG[m.status];
                    const prop = m.properties as any;
                    return (
                      <TouchableOpacity key={m.id} onPress={() => router.push(`/(provider)/mission/${m.id}`)}
                        className="bg-white border border-border rounded-xl px-4 py-4">
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 mr-3">
                            <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{prop?.internal_name}</Text>
                            <Text className="text-xs text-text-secondary">{prop?.city}</Text>
                          </View>
                          <View className={`rounded-full px-3 py-1 ${st.bg}`}>
                            <Text className={`text-xs font-medium ${st.text}`}>{st.label}</Text>
                          </View>
                        </View>
                        <Text className="text-xs text-text-secondary">📅 {formatDate(m.scheduled_date)} · {String(m.scheduled_time).slice(0,5)}</Text>
                        <Text className="text-xs font-semibold text-primary mt-1">{Number(m.provider_payout).toFixed(2).replace('.', ',')}€</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Historique */}
            {history.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Historique</Text>
                <View className="gap-3">
                  {history.map((m) => {
                    const st = STATUS_CONFIG[m.status];
                    const prop = m.properties as any;
                    return (
                      <TouchableOpacity key={m.id} onPress={() => router.push(`/(provider)/mission/${m.id}`)}
                        className="bg-bg-light rounded-xl px-4 py-4">
                        <View className="flex-row items-start justify-between mb-1">
                          <Text className="text-sm font-medium text-text-primary flex-1 mr-3" numberOfLines={1}>{prop?.internal_name}</Text>
                          <View className={`rounded-full px-3 py-1 ${st.bg}`}>
                            <Text className={`text-xs font-medium ${st.text}`}>{st.label}</Text>
                          </View>
                        </View>
                        <Text className="text-xs text-text-secondary">{formatDate(m.scheduled_date)} · {Number(m.provider_payout).toFixed(2).replace('.', ',')}€</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
