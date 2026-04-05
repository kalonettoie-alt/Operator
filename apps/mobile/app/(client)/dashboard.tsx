import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useClientProfile, useClientProperties, useClientActiveInterventions } from '../../hooks/use-client-dashboard';


function StatusBadge({ status }: { status: string }) {
  if (status === 'in_progress') return (
    <View className="rounded-full px-2 py-0.5 bg-green-100">
      <Text className="text-xs font-medium text-green-800">En cours</Text>
    </View>
  );
  if (status === 'completed') return (
    <View className="rounded-full px-2 py-0.5 bg-gray-100">
      <Text className="text-xs font-medium text-gray-600">Terminée</Text>
    </View>
  );
  // pending, assigned, accepted → À venir
  return (
    <View className="rounded-full px-2 py-0.5 bg-blue-100">
      <Text className="text-xs font-medium text-blue-800">À venir</Text>
    </View>
  );
}

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  studio: 'Studio',
  T2: 'T2',
  T3: 'T3',
  'T4+': 'T4+',
};

export default function ClientDashboard() {
  const profile = useClientProfile();
  const properties = useClientProperties();
  const interventions = useClientActiveInterventions();

  const isRefreshing = profile.isFetching || properties.isFetching || interventions.isFetching;

  function refetchAll() {
    profile.refetch();
    properties.refetch();
    interventions.refetch();
  }

  const firstName = profile.data?.first_name ?? '';
  const sepaMandateActive = profile.data?.sepa_mandate_active ?? false;
  const propertyCount = properties.data?.length ?? 0;
  const activeCount = interventions.data?.length ?? 0;

  if (profile.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1A3A3A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <FlatList
        data={properties.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor="#1A3A3A" />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View className="bg-primary px-6 pt-6 pb-8">
              <Text className="text-white text-sm opacity-70 mb-1">Bonjour,</Text>
              <Text className="text-white text-2xl font-bold">
                {firstName || 'Bienvenue'}
              </Text>
            </View>

            {/* Bandeau IBAN manquant */}
            {!sepaMandateActive && (
              <TouchableOpacity
                className="mx-4 -mt-4 bg-orange-500 rounded-xl px-4 py-3 flex-row items-center justify-between"
                activeOpacity={0.8}
                onPress={() => router.push('/(client)/account')}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-white font-semibold text-sm">Mandat SEPA manquant</Text>
                  <Text className="text-white text-xs opacity-90 mt-0.5">
                    Ajoutez votre IBAN pour activer la synchronisation iCal
                  </Text>
                </View>
                <Text className="text-white text-lg">›</Text>
              </TouchableOpacity>
            )}

            {/* KPIs */}
            <View className="flex-row gap-3 px-4 mt-4 mb-4">
              <View className="flex-1 bg-white rounded-xl p-4">
                <Text className="text-3xl font-bold text-primary">{propertyCount}</Text>
                <Text className="text-xs text-text-secondary mt-1">
                  {propertyCount <= 1 ? 'Logement' : 'Logements'}
                </Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-4">
                <Text className="text-3xl font-bold text-primary">{activeCount}</Text>
                <Text className="text-xs text-text-secondary mt-1">
                  {activeCount <= 1 ? 'Intervention active' : 'Interventions actives'}
                </Text>
              </View>
            </View>

            {/* Interventions actives */}
            {activeCount > 0 && (
              <View className="px-4 mb-4">
                <Text className="text-base font-semibold text-text-primary mb-2">
                  Interventions récentes
                </Text>
                {interventions.data!.map((item) => {
                  const property = item.properties as { internal_name: string | null; city: string } | null;
                  return (
                    <View key={item.id} className="bg-white rounded-xl px-4 py-3 mb-2">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-sm font-medium text-text-primary flex-1 mr-2" numberOfLines={1}>
                          {property?.internal_name ?? property?.city ?? 'Logement'}
                        </Text>
                        <StatusBadge status={item.status} />
                      </View>
                      <Text className="text-xs text-text-secondary">
                        {new Date(item.scheduled_date).toLocaleDateString('fr-FR', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })}
                        {item.scheduled_time ? ` · ${item.scheduled_time.slice(0, 5)}` : ''}
                        {' · '}{item.price} €
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Titre liste logements */}
            <View className="flex-row items-center justify-between px-4 mb-2">
              <Text className="text-base font-semibold text-text-primary">Mes logements</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/properties')}>
                <Text className="text-sm text-primary font-medium">Voir tout</Text>
              </TouchableOpacity>
            </View>

            {properties.isLoading && (
              <View className="items-center py-6">
                <ActivityIndicator color="#1A3A3A" />
              </View>
            )}

            {!properties.isLoading && propertyCount === 0 && (
              <View className="mx-4 bg-white rounded-xl px-6 py-8 items-center mb-4">
                <Text className="text-4xl mb-3">🏠</Text>
                <Text className="text-base font-semibold text-text-primary mb-1">
                  Aucun logement
                </Text>
                <Text className="text-sm text-text-secondary text-center mb-4">
                  Ajoutez votre premier logement pour commencer
                </Text>
                <TouchableOpacity
                  className="bg-primary rounded-btn px-6 py-3"
                  onPress={() => router.push('/(client)/properties')}
                >
                  <Text className="text-white font-semibold text-sm">Ajouter un logement</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 bg-white rounded-xl px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                {item.internal_name ?? item.address}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                {PROPERTY_TYPE_LABEL[item.property_type]} · {item.city}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-primary">
                {(item.base_price / 100).toFixed(0)} €
              </Text>
              <View className={`mt-1 rounded-full px-2 py-0.5 ${item.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Text className={`text-xs ${item.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                  {item.is_active ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={<View className="h-6" />}
        contentContainerStyle={{ paddingBottom: 0 }}
      />
    </SafeAreaView>
  );
}
