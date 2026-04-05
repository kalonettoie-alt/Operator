import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/query-client';
import { useAdminPendingInterventions, useAdminActiveProviders } from '../../hooks/use-admin';

type StatusFilter = 'all' | 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Sans prestataire', bg: 'bg-orange-100', text: 'text-orange-700' },
  assigned:    { label: 'Assignée',         bg: 'bg-blue-100',   text: 'text-blue-700' },
  accepted:    { label: 'Acceptée',         bg: 'bg-indigo-100', text: 'text-indigo-700' },
  in_progress: { label: 'En cours',         bg: 'bg-primary/10', text: 'text-primary' },
  completed:   { label: 'Terminée',         bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:   { label: 'Annulée',          bg: 'bg-gray-100',   text: 'text-gray-500' },
};

const ZONE_LABELS: Record<string, string> = {
  '75': '75', '92': '92', '93': '93', '94': '94',
  '77': '77', '78': '78', '91': '91', '95': '95',
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function AdminInterventions() {
  const { data: interventions = [], isLoading, refetch } = useAdminPendingInterventions();
  const { data: providers = [] } = useAdminActiveProviders();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);

  const filtered = useMemo(() => {
    let list = interventions;
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => {
        const prop = i.properties as any;
        const client = i.profiles as any;
        return `${prop?.internal_name} ${prop?.city} ${client?.first_name} ${client?.last_name}`.toLowerCase().includes(q);
      });
    }
    return list;
  }, [interventions, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: interventions.length };
    for (const i of interventions) counts[i.status] = (counts[i.status] ?? 0) + 1;
    return counts;
  }, [interventions]);

  async function handleAssign(interventionId: string, providerId: string) {
    setAssigning(true);
    const { error } = await supabase.rpc('admin_assign_provider', {
      p_intervention_id: interventionId,
      p_provider_id: providerId,
    });
    setAssigning(false);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-interventions'] });
      setSelected(null);
    }
  }

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  const prop = selected?.properties as any;
  const client = selected?.profiles as any;
  const canAssign = ['pending', 'assigned'].includes(selected?.status);

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `Toutes (${statusCounts.all ?? 0})` },
    { key: 'pending', label: `Sans prestataire (${statusCounts.pending ?? 0})` },
    { key: 'assigned', label: `Assignées (${statusCounts.assigned ?? 0})` },
    { key: 'in_progress', label: `En cours (${statusCounts.in_progress ?? 0})` },
    { key: 'completed', label: `Terminées (${statusCounts.completed ?? 0})` },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor="#1A3A3A" />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text-primary">Missions</Text>
          <View className="w-11" />
        </View>

        {/* Recherche */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un logement, client..."
          placeholderTextColor="#9CA3AF"
          className="h-11 border border-border rounded-xl px-4 text-sm text-text-primary bg-bg-light mb-3"
        />

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          <View className="flex-row gap-2">
            {FILTERS.map((f) => (
              <TouchableOpacity key={f.key} onPress={() => setStatusFilter(f.key)}
                className={`px-4 py-2 rounded-lg border ${statusFilter === f.key ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <Text className={`text-xs font-medium ${statusFilter === f.key ? 'text-primary' : 'text-text-secondary'}`}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Liste */}
        {filtered.length === 0 ? (
          <Text className="text-sm text-text-secondary text-center mt-10">Aucune mission</Text>
        ) : (
          <View className="gap-3">
            {filtered.map((i) => {
              const p = i.properties as any;
              const st = STATUS_CONFIG[i.status] ?? STATUS_CONFIG.pending;
              return (
                <TouchableOpacity key={i.id} onPress={() => setSelected(i)}
                  className="bg-white border border-border rounded-xl px-4 py-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{p?.internal_name}</Text>
                      <Text className="text-xs text-text-secondary">{p?.city}</Text>
                    </View>
                    <View className={`rounded-full px-3 py-1 ${st.bg}`}>
                      <Text className={`text-xs font-medium ${st.text}`}>{st.label}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-text-secondary">
                    {formatDate(i.scheduled_date)} · {i.scheduled_time?.slice(0,5)}
                  </Text>
                  <Text className="text-xs font-semibold text-primary mt-1">
                    {Number(i.provider_payout ?? 0).toFixed(2).replace('.', ',')}€
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal détail + assignation */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10">
            <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />

            <Text className="text-lg font-bold text-text-primary mb-1">{prop?.internal_name}</Text>
            <Text className="text-sm text-text-secondary mb-1">{prop?.city}</Text>
            <Text className="text-sm text-text-secondary mb-1">
              {selected && formatDate(selected.scheduled_date)} · {selected?.scheduled_time?.slice(0,5)}
            </Text>
            {client && (
              <Text className="text-xs text-text-secondary mb-1">
                Client : {client.first_name} {client.last_name}
              </Text>
            )}
            {selected && (
              <View className={`self-start rounded-full px-3 py-1 mt-2 mb-4 ${STATUS_CONFIG[selected.status]?.bg ?? 'bg-gray-100'}`}>
                <Text className={`text-xs font-medium ${STATUS_CONFIG[selected.status]?.text ?? 'text-gray-500'}`}>
                  {STATUS_CONFIG[selected.status]?.label ?? selected.status}
                </Text>
              </View>
            )}

            {canAssign && (
              <>
                <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Assigner un prestataire
                </Text>
                <ScrollView style={{ maxHeight: 260 }}>
                  <View className="gap-2">
                    {providers.length === 0 ? (
                      <Text className="text-sm text-text-secondary">Aucun prestataire actif</Text>
                    ) : (
                      providers.map((p) => (
                        <TouchableOpacity key={p.id}
                          className={`rounded-xl border px-4 py-3 flex-row items-center justify-between ${selected?.provider_id === p.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                          onPress={() => handleAssign(selected.id, p.id)}
                          disabled={assigning}>
                          <View>
                            <Text className="text-sm font-medium text-text-primary">{p.first_name} {p.last_name}</Text>
                            <Text className="text-xs text-text-secondary">
                              {p.zones?.map((z: string) => ZONE_LABELS[z] ?? z).join(', ')}
                            </Text>
                          </View>
                          {assigning ? <ActivityIndicator size="small" color="#1A3A3A" /> : (
                            <Text className="text-xs text-primary font-semibold">Assigner →</Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </ScrollView>
              </>
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
