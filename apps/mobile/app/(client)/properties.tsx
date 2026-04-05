import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useClientProperties } from '../../hooks/use-client-dashboard';

function SepaWarningBanner() {
  return (
    <View className="mt-3 bg-orange-50 rounded-lg px-3 py-3 flex-row items-start gap-2">
      <Text className="text-base">⚠️</Text>
      <View className="flex-1">
        <Text className="text-xs font-semibold text-orange-800 mb-0.5">
          Logement inactif — prise en charge impossible
        </Text>
        <Text className="text-xs text-orange-700 leading-4">
          Renseignez votre mandat SEPA pour activer ce logement et recevoir des prestations.
        </Text>
        <TouchableOpacity
          className="mt-2 self-start bg-orange-600 rounded-full px-3 py-1"
          onPress={() => router.push('/(client)/account')}
        >
          <Text className="text-xs text-white font-semibold">→ Renseigner l'IBAN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  studio: 'Studio', T2: 'T2', T3: 'T3', 'T4+': 'T4+',
};

const OFFER_TYPE_LABEL: Record<string, string> = {
  operator: 'Opérateur', city_operator: 'City Opérateur',
};

export default function ClientProperties() {
  const { data: properties, isLoading, isFetching, refetch } = useClientProperties();

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <FlatList
        data={properties ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#1A3A3A" />
        }
        ListHeaderComponent={
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
            <Text className="text-2xl font-bold text-text-primary">Mes logements</Text>
            <TouchableOpacity
              className="bg-primary rounded-btn px-4 py-2"
              onPress={() => router.push('/(client)/properties/create/step-1')}
            >
              <Text className="text-white text-sm font-semibold">+ Ajouter</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 bg-white rounded-xl px-4 py-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-base font-semibold text-text-primary" numberOfLines={1}>
                  {item.internal_name ?? item.address}
                </Text>
                <Text className="text-sm text-text-secondary mt-0.5">
                  {item.address}
                </Text>
              </View>
              <View className={`rounded-full px-2 py-0.5 ${item.is_active ? 'bg-green-100' : 'bg-orange-100'}`}>
                <Text className={`text-xs font-medium ${item.is_active ? 'text-green-700' : 'text-orange-700'}`}>
                  {item.is_active ? 'Actif' : 'En attente SEPA'}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="bg-bg-light rounded-full px-3 py-1">
                <Text className="text-xs text-text-secondary">
                  {PROPERTY_TYPE_LABEL[item.property_type]}
                </Text>
              </View>
              <View className="bg-bg-light rounded-full px-3 py-1">
                <Text className="text-xs text-text-secondary">
                  {OFFER_TYPE_LABEL[item.offer_type]}
                </Text>
              </View>
              <View className="bg-bg-light rounded-full px-3 py-1">
                <Text className="text-xs font-semibold text-primary">
                  {item.base_price} €
                </Text>
              </View>
            </View>
            {!item.is_active && <SepaWarningBanner />}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center px-6 py-16">
              <Text className="text-5xl mb-4">🏠</Text>
              <Text className="text-lg font-semibold text-text-primary mb-2">Aucun logement</Text>
              <Text className="text-sm text-text-secondary text-center mb-6">
                Ajoutez votre premier logement pour démarrer la gestion
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-btn px-6 py-3"
                onPress={() => router.push('/(client)/properties/create/step-1')}
              >
                <Text className="text-white font-semibold">Ajouter un logement</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center py-16">
              <ActivityIndicator color="#1A3A3A" />
            </View>
          )
        }
        ListFooterComponent={<View className="h-6" />}
      />
    </SafeAreaView>
  );
}
