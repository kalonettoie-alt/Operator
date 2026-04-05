import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClientActiveInterventions } from '../../hooks/use-client-dashboard';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:     { label: 'À venir',  bg: 'bg-orange-100', text: 'text-orange-700' },
  assigned:    { label: 'À venir',  bg: 'bg-orange-100', text: 'text-orange-700' },
  accepted:    { label: 'À venir',  bg: 'bg-orange-100', text: 'text-orange-700' },
  in_progress: { label: 'En cours', bg: 'bg-primary/10', text: 'text-primary' },
  completed:   { label: 'Terminée', bg: 'bg-green-100',  text: 'text-green-700' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
}

function formatPrice(euros: number) {
  return Number(euros).toFixed(2).replace('.', ',') + '€';
}

export default function ClientInterventions() {
  const { data: interventions = [], isLoading, refetch, isRefetching } = useClientActiveInterventions();

  const upcoming = interventions.filter((i) => i.status !== 'completed');
  const past = interventions.filter((i) => i.status === 'completed');

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-text-secondary text-sm">Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A3A3A" />}
      >
        <Text className="text-2xl font-bold text-text-primary mb-6">Interventions</Text>

        {interventions.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <Text className="text-4xl mb-4">🏠</Text>
            <Text className="text-base font-semibold text-text-primary mb-2">Aucune intervention</Text>
            <Text className="text-sm text-text-secondary text-center">
              Les interventions apparaîtront ici une fois votre calendrier iCal synchronisé.
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">À venir</Text>
                <View className="gap-3 mb-6">
                  {upcoming.map((item) => {
                    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                    const prop = item.properties as { internal_name: string; city: string } | null;
                    return (
                      <View key={item.id} className="bg-white rounded-xl border border-border px-4 py-4">
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 mr-3">
                            <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                              {prop?.internal_name ?? '—'}
                            </Text>
                            <Text className="text-xs text-text-secondary">{prop?.city ?? ''}</Text>
                          </View>
                          <View className={`rounded-full px-3 py-1 ${status.bg}`}>
                            <Text className={`text-xs font-medium ${status.text}`}>{status.label}</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm">📅</Text>
                            <Text className="text-sm text-text-primary">{formatDate(item.scheduled_date)}</Text>
                            {item.scheduled_time ? (
                              <Text className="text-sm text-text-secondary">· {item.scheduled_time.slice(0, 5)}</Text>
                            ) : null}
                          </View>
                          <Text className="text-sm font-semibold text-text-primary">{formatPrice(item.price)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {past.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Terminées</Text>
                <View className="gap-3">
                  {past.map((item) => {
                    const prop = item.properties as { internal_name: string; city: string } | null;
                    return (
                      <View key={item.id} className="bg-bg-light rounded-xl px-4 py-4">
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 mr-3">
                            <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                              {prop?.internal_name ?? '—'}
                            </Text>
                            <Text className="text-xs text-text-secondary">{prop?.city ?? ''}</Text>
                          </View>
                          <View className="rounded-full px-3 py-1 bg-green-100">
                            <Text className="text-xs font-medium text-green-700">Terminée</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm">📅</Text>
                            <Text className="text-sm text-text-secondary">{formatDate(item.scheduled_date)}</Text>
                          </View>
                          <Text className="text-sm text-text-secondary">{formatPrice(item.price)}</Text>
                        </View>
                      </View>
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
