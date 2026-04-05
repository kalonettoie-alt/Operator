import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminProperties } from '../../hooks/use-admin';

export default function AdminProperties() {
  const { data: properties = [], isLoading, refetch } = useAdminProperties();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const activeCount = properties.filter((p) => p.is_active).length;
  const inactiveCount = properties.length - activeCount;

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  const client = selected?.profiles as any;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor="#1A3A3A" />}
      >
        <Text className="text-2xl font-bold text-text-primary mb-2">Logements</Text>
        <Text className="text-xs text-text-secondary mb-6">{activeCount} actif{activeCount > 1 ? 's' : ''} · {inactiveCount} inactif{inactiveCount > 1 ? 's' : ''}</Text>

        {properties.length === 0 ? (
          <Text className="text-sm text-text-secondary text-center mt-20">Aucun logement</Text>
        ) : (
          <View className="gap-3">
            {properties.map((p) => {
              const owner = p.profiles as any;
              return (
                <TouchableOpacity key={p.id} onPress={() => setSelected(p)}
                  className={`bg-white border rounded-xl px-4 py-4 ${p.is_active ? 'border-border' : 'border-red-200'}`}>
                  <View className="flex-row items-start justify-between mb-1">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{p.internal_name}</Text>
                      <Text className="text-xs text-text-secondary">{p.city} {p.postal_code}</Text>
                    </View>
                    <View className={`rounded-full px-3 py-1 ${p.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Text className={`text-xs font-medium ${p.is_active ? 'text-green-700' : 'text-red-600'}`}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-text-secondary">{p.property_type} · {p.offer_type === 'operator' ? 'Opérateur' : 'City opérateur'}</Text>
                  {owner && (
                    <Text className="text-xs text-primary mt-1">{owner.first_name} {owner.last_name}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal détail logement */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10">
            <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />

            <Text className="text-lg font-bold text-text-primary mb-1">{selected?.internal_name}</Text>
            <Text className="text-sm text-text-secondary mb-1">{selected?.address}</Text>
            <Text className="text-sm text-text-secondary mb-3">{selected?.city} {selected?.postal_code}</Text>

            <View className="gap-3 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-text-secondary">Type</Text>
                <Text className="text-sm font-medium text-text-primary">{selected?.property_type}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-text-secondary">Offre</Text>
                <Text className="text-sm font-medium text-text-primary">{selected?.offer_type === 'operator' ? 'Opérateur' : 'City opérateur'}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-text-secondary">Statut</Text>
                <Text className={`text-sm font-medium ${selected?.is_active ? 'text-green-700' : 'text-red-600'}`}>
                  {selected?.is_active ? 'Actif' : 'Inactif'}
                </Text>
              </View>
              {client && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-text-secondary">Propriétaire</Text>
                  <Text className="text-sm font-medium text-primary">{client.first_name} {client.last_name}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity className="h-12 items-center justify-center mt-2" onPress={() => setSelected(null)}>
              <Text className="text-sm text-text-secondary">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
