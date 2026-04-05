import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminClients, useAdminClientProperties } from '../../hooks/use-admin';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminClients() {
  const { data: clients = [], isLoading, refetch } = useAdminClients();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const { data: properties = [], isLoading: propsLoading } = useAdminClientProperties(selected?.id ?? null);

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor="#1A3A3A" />}
      >
        <Text className="text-2xl font-bold text-text-primary mb-2">Clients</Text>
        <Text className="text-xs text-text-secondary mb-6">{clients.length} client{clients.length > 1 ? 's' : ''}</Text>

        {clients.length === 0 ? (
          <Text className="text-sm text-text-secondary text-center mt-20">Aucun client</Text>
        ) : (
          <View className="gap-3">
            {clients.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setSelected(c)}
                className="bg-white border border-border rounded-xl px-4 py-4">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-semibold text-text-primary">{c.first_name} {c.last_name}</Text>
                  <View className={`rounded-full px-3 py-1 ${c.sepa_mandate_active ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <Text className={`text-xs font-medium ${c.sepa_mandate_active ? 'text-green-700' : 'text-orange-700'}`}>
                      {c.sepa_mandate_active ? 'SEPA actif' : 'SEPA manquant'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-text-secondary">{c.email}</Text>
                {c.phone && <Text className="text-xs text-text-secondary">{c.phone}</Text>}
                <Text className="text-xs text-text-secondary mt-1">Inscrit le {formatDate(c.created_at!)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal détail client */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10 max-h-4/5">
            <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />

            <Text className="text-lg font-bold text-text-primary mb-1">{selected?.first_name} {selected?.last_name}</Text>
            <Text className="text-sm text-text-secondary mb-1">{selected?.email}</Text>
            {selected?.phone && <Text className="text-sm text-text-secondary mb-1">{selected.phone}</Text>}
            <View className={`self-start rounded-full px-3 py-1 mt-1 mb-4 ${selected?.sepa_mandate_active ? 'bg-green-100' : 'bg-orange-100'}`}>
              <Text className={`text-xs font-medium ${selected?.sepa_mandate_active ? 'text-green-700' : 'text-orange-700'}`}>
                {selected?.sepa_mandate_active ? 'SEPA actif' : 'SEPA manquant'}
              </Text>
            </View>

            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Logements ({properties.length})
            </Text>

            {propsLoading ? (
              <ActivityIndicator color="#1A3A3A" />
            ) : properties.length === 0 ? (
              <Text className="text-sm text-text-secondary">Aucun logement</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                <View className="gap-2">
                  {properties.map((p) => (
                    <View key={p.id} className={`rounded-xl border px-4 py-3 ${p.is_active ? 'border-border' : 'border-red-200 bg-red-50/50'}`}>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-sm font-medium text-text-primary flex-1 mr-2" numberOfLines={1}>{p.internal_name}</Text>
                        <Text className={`text-xs font-medium ${p.is_active ? 'text-green-700' : 'text-red-600'}`}>
                          {p.is_active ? 'Actif' : 'Inactif'}
                        </Text>
                      </View>
                      <Text className="text-xs text-text-secondary">{p.address}, {p.city} {p.postal_code}</Text>
                      <Text className="text-xs text-text-secondary">{p.property_type} · {p.offer_type === 'operator' ? 'Opérateur' : 'City opérateur'}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity className="h-12 items-center justify-center mt-4" onPress={() => setSelected(null)}>
              <Text className="text-sm text-text-secondary">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
