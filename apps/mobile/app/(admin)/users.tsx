import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/query-client';
import { useAdminPendingProviders, useAdminClients, useAdminProviderDocuments, useAdminClientProperties, useAdminProviderStats } from '../../hooks/use-admin';

const PROVIDER_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  active:    { label: 'Actif',       bg: 'bg-green-100',  text: 'text-green-700' },
  pending:   { label: 'En attente',  bg: 'bg-orange-100', text: 'text-orange-700' },
  suspended: { label: 'Suspendu',    bg: 'bg-red-100',    text: 'text-red-700' },
  null:      { label: 'Incomplet',   bg: 'bg-gray-100',   text: 'text-gray-500' },
};
const ZONE_LABELS: Record<string, string> = {
  '75': 'Paris', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne', '77': 'Seine-et-Marne', '78': 'Yvelines',
  '91': 'Essonne', '95': "Val-d'Oise",
};
const DOC_TYPE_LABELS: Record<string, string> = {
  id: "Pièce d'identité", kbis: 'KBIS / INSEE', insurance: 'Assurance RC Pro', rib: 'RIB', other: 'Autre',
};
const DOC_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'En attente', bg: 'bg-orange-100', text: 'text-orange-700' },
  approved: { label: 'Validé', bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { label: 'Refusé', bg: 'bg-red-100', text: 'text-red-700' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Clients ─── */
function ClientsView({ search }: { search: string }) {
  const { data: clients = [], isLoading, refetch } = useAdminClients();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sepa_active' | 'sepa_missing' | 'guest_link' | 'laundry'>('all');
  const [selected, setSelected] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const { data: properties = [], isLoading: propsLoading } = useAdminClientProperties(selected?.id ?? null);

  let list = clients;
  if (filter === 'sepa_active') list = list.filter((c) => c.sepa_mandate_active);
  else if (filter === 'sepa_missing') list = list.filter((c) => !c.sepa_mandate_active);
  else if (filter === 'guest_link') list = list.filter((c) => (c as any).has_guest_link);
  else if (filter === 'laundry') list = list.filter((c) => (c as any).has_laundry);
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q));
  }

  const filters = [
    { key: 'all' as const, label: 'Tous', count: clients.length },
    { key: 'sepa_active' as const, label: 'SEPA actif', count: clients.filter((c) => c.sepa_mandate_active).length },
    { key: 'sepa_missing' as const, label: 'SEPA manquant', count: clients.filter((c) => !c.sepa_mandate_active).length },
    { key: 'guest_link' as const, label: 'Page voyageur', count: clients.filter((c) => (c as any).has_guest_link).length },
    { key: 'laundry' as const, label: 'Blanchisserie', count: clients.filter((c) => (c as any).has_laundry).length },
  ];

  if (isLoading) return <ActivityIndicator color="#1A3A3A" style={{ marginTop: 40 }} />;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {filters.map((f) => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg border ${filter === f.key ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <Text className={`text-xs font-medium ${filter === f.key ? 'text-primary' : 'text-text-secondary'}`}>{f.label} ({f.count})</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {list.length === 0 ? (
        <Text className="text-sm text-text-secondary text-center" style={{ marginTop: 40 }}>Aucun client</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setSelected(c)} className="bg-white border border-border rounded-xl px-4 py-4">
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

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10" style={{ maxHeight: '80%' }}>
            <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />
            <Text className="text-lg font-bold text-text-primary mb-1">{selected?.first_name} {selected?.last_name}</Text>
            <Text className="text-sm text-text-secondary mb-1">{selected?.email}</Text>
            {selected?.phone && <Text className="text-sm text-text-secondary mb-1">{selected.phone}</Text>}
            <View className={`self-start rounded-full px-3 py-1 mt-1 mb-4 ${selected?.sepa_mandate_active ? 'bg-green-100' : 'bg-orange-100'}`}>
              <Text className={`text-xs font-medium ${selected?.sepa_mandate_active ? 'text-green-700' : 'text-orange-700'}`}>
                {selected?.sepa_mandate_active ? 'SEPA actif' : 'SEPA manquant'}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Logements ({properties.length})</Text>
            {propsLoading ? <ActivityIndicator color="#1A3A3A" /> : properties.length === 0 ? (
              <Text className="text-sm text-text-secondary">Aucun logement</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                <View style={{ gap: 8 }}>
                  {properties.map((p) => (
                    <TouchableOpacity key={p.id} onPress={() => setSelectedProperty(p)}
                      className={`rounded-xl border px-4 py-3 ${p.is_active ? 'border-border' : 'border-red-200 bg-red-50/50'}`}>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-sm font-medium text-text-primary flex-1 mr-2" numberOfLines={1}>{p.internal_name}</Text>
                        <Text className={`text-xs font-medium ${p.is_active ? 'text-green-700' : 'text-red-600'}`}>{p.is_active ? 'Actif' : 'Inactif'}</Text>
                      </View>
                      <Text className="text-xs text-text-secondary">{p.address}, {p.city} {p.postal_code}</Text>
                      <Text className="text-xs text-primary mt-1">Voir les détails →</Text>
                    </TouchableOpacity>
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

      {/* Modal détail logement */}
      <Modal visible={!!selectedProperty} transparent animationType="slide" onRequestClose={() => setSelectedProperty(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10" style={{ maxHeight: '90%' }}>
            <View className="w-10 h-1 rounded-full bg-border self-center mb-4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-lg font-bold text-text-primary mb-1">{selectedProperty?.internal_name}</Text>
              <Text className="text-sm text-text-secondary mb-1">{selectedProperty?.address}</Text>
              <Text className="text-sm text-text-secondary mb-4">{selectedProperty?.city} {selectedProperty?.postal_code}</Text>

              {/* Statut */}
              <View className="flex-row gap-2 mb-4">
                <View className={`rounded-full px-3 py-1 ${selectedProperty?.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Text className={`text-xs font-medium ${selectedProperty?.is_active ? 'text-green-700' : 'text-red-600'}`}>
                    {selectedProperty?.is_active ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
                {selectedProperty?.guest_link_enabled && (
                  <View className="rounded-full px-3 py-1 bg-blue-100">
                    <Text className="text-xs font-medium text-blue-700">Page voyageur</Text>
                  </View>
                )}
                {selectedProperty?.laundry_enabled && (
                  <View className="rounded-full px-3 py-1 bg-primary/10">
                    <Text className="text-xs font-medium text-primary">Blanchisserie</Text>
                  </View>
                )}
              </View>

              {/* Infos principales */}
              <View className="bg-bg-light rounded-xl px-4 py-3 mb-4 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-text-secondary">Type</Text>
                  <Text className="text-xs font-medium text-text-primary">{selectedProperty?.property_type}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-text-secondary">Offre</Text>
                  <Text className="text-xs font-medium text-text-primary">{selectedProperty?.offer_type === 'operator' ? 'Opérateur' : 'City opérateur'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-text-secondary">Prix de base</Text>
                  <Text className="text-xs font-medium text-text-primary">{selectedProperty?.base_price}€</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-text-secondary">Check-out</Text>
                  <Text className="text-xs font-medium text-text-primary">{selectedProperty?.checkout_time || '10:00'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-text-secondary">Check-in</Text>
                  <Text className="text-xs font-medium text-text-primary">{selectedProperty?.checkin_time || '16:00'}</Text>
                </View>
                {selectedProperty?.floor != null && (
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-text-secondary">Étage</Text>
                    <Text className="text-xs font-medium text-text-primary">{selectedProperty.floor === 0 ? 'RDC' : selectedProperty.floor}</Text>
                  </View>
                )}
              </View>

              {/* Couchages */}
              {(selectedProperty?.single_beds || selectedProperty?.double_beds || selectedProperty?.sofa_beds || selectedProperty?.baby_beds) && (
                <View className="bg-bg-light rounded-xl px-4 py-3 mb-4 gap-2">
                  <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Couchages</Text>
                  {selectedProperty.single_beds > 0 && <Text className="text-xs text-text-primary">{selectedProperty.single_beds} lit(s) simple(s)</Text>}
                  {selectedProperty.double_beds > 0 && <Text className="text-xs text-text-primary">{selectedProperty.double_beds} lit(s) double(s)</Text>}
                  {selectedProperty.sofa_beds > 0 && <Text className="text-xs text-text-primary">{selectedProperty.sofa_beds} canapé(s)-lit(s)</Text>}
                  {selectedProperty.baby_beds > 0 && <Text className="text-xs text-text-primary">{selectedProperty.baby_beds} lit(s) bébé</Text>}
                </View>
              )}

              {/* Équipements */}
              <View className="bg-bg-light rounded-xl px-4 py-3 mb-4 gap-2">
                <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Équipements</Text>
                <View className="flex-row flex-wrap gap-2">
                  {selectedProperty?.has_elevator && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Ascenseur</Text></View>}
                  {selectedProperty?.has_key_box && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Boîte à clés</Text></View>}
                  {selectedProperty?.has_spare_keys && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Clés de secours</Text></View>}
                  {selectedProperty?.parking && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Parking</Text></View>}
                  {selectedProperty?.balcony && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Balcon</Text></View>}
                  {selectedProperty?.jacuzzi && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Jacuzzi</Text></View>}
                  {selectedProperty?.pets_allowed && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Animaux acceptés</Text></View>}
                  {selectedProperty?.photo_report_enabled && <View className="bg-white border border-border rounded-lg px-3 py-1"><Text className="text-xs text-text-primary">Rapport photo</Text></View>}
                </View>
              </View>

              {/* Spécificités */}
              {selectedProperty?.specificities?.length > 0 && (
                <View className="bg-bg-light rounded-xl px-4 py-3 mb-4">
                  <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Spécificités</Text>
                  {selectedProperty.specificities.map((s: string, i: number) => (
                    <Text key={i} className="text-xs text-text-primary">• {s}</Text>
                  ))}
                </View>
              )}

              {/* Note propriétaire */}
              {selectedProperty?.owner_reminder && (
                <View className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-xs font-semibold text-orange-800 mb-1">Note du propriétaire</Text>
                  <Text className="text-xs text-orange-700">{selectedProperty.owner_reminder}</Text>
                </View>
              )}

              <TouchableOpacity className="h-12 items-center justify-center mt-2" onPress={() => setSelectedProperty(null)}>
                <Text className="text-sm text-primary font-medium">← Retour au client</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Prestataires ─── */
function ProvidersView({ search }: { search: string }) {
  const { data: providers = [], isLoading, refetch } = useAdminPendingProviders();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [selected, setSelected] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { data: documents = [], isLoading: docsLoading } = useAdminProviderDocuments(selected?.id ?? null);
  const { data: stats, isLoading: statsLoading } = useAdminProviderStats(selected?.id ?? null);

  let list = providers;
  if (filter === 'active') list = list.filter((p) => p.provider_status === 'active');
  else if (filter === 'pending') list = list.filter((p) => p.provider_status === 'pending' || p.provider_status === null);
  else if (filter === 'suspended') list = list.filter((p) => p.provider_status === 'suspended');
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((p) => `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(q));
  }

  const filters = [
    { key: 'all' as const, label: 'Tous', count: providers.length },
    { key: 'active' as const, label: 'Actifs', count: providers.filter((p) => p.provider_status === 'active').length },
    { key: 'pending' as const, label: 'A valider', count: providers.filter((p) => p.provider_status === 'pending' || p.provider_status === null).length },
    { key: 'suspended' as const, label: 'Suspendus', count: providers.filter((p) => p.provider_status === 'suspended').length },
  ];

  async function handleActivate(id: string) {
    setActionLoading(true);
    await supabase.rpc('admin_activate_provider', { p_provider_id: id });
    setActionLoading(false);
    queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
    setSelected(null);
  }
  async function handleSuspend(id: string) {
    setActionLoading(true);
    await supabase.from('profiles').update({ provider_status: 'suspended' }).eq('id', id);
    setActionLoading(false);
    queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
    setSelected(null);
  }
  async function handleValidateDoc(docId: string, approved: boolean) {
    if (!approved) {
      Alert.alert('Refuser le document', 'Confirmer le refus de ce document ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Refuser', style: 'destructive', onPress: async () => {
          await supabase.rpc('admin_validate_document', { p_document_id: docId, p_approved: false, p_rejection_reason: 'Document non conforme' });
          queryClient.invalidateQueries({ queryKey: ['admin-provider-documents', selected?.id] });
          queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
        }},
      ]);
      return;
    }
    await supabase.rpc('admin_validate_document', { p_document_id: docId, p_approved: true });
    queryClient.invalidateQueries({ queryKey: ['admin-provider-documents', selected?.id] });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
  }

  if (isLoading) return <ActivityIndicator color="#1A3A3A" style={{ marginTop: 40 }} />;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {filters.map((f) => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg border ${filter === f.key ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <Text className={`text-xs font-medium ${filter === f.key ? 'text-primary' : 'text-text-secondary'}`}>{f.label} ({f.count})</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {list.length === 0 ? (
        <Text className="text-sm text-text-secondary text-center" style={{ marginTop: 40 }}>Aucun prestataire</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((p) => {
            const st = PROVIDER_STATUS[p.provider_status ?? 'null'];
            return (
              <TouchableOpacity key={p.id} onPress={() => setSelected(p)} className="bg-white border border-border rounded-xl px-4 py-4">
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-semibold text-text-primary">{p.first_name} {p.last_name}</Text>
                    <Text className="text-xs text-text-secondary">{p.email}</Text>
                  </View>
                  <View className={`rounded-full px-3 py-1 ${st.bg}`}>
                    <Text className={`text-xs font-medium ${st.text}`}>{st.label}</Text>
                  </View>
                </View>
                {p.siret && <Text className="text-xs text-text-secondary">SIRET : {p.siret}</Text>}
                {(p.zones?.length ?? 0) > 0 && (
                  <Text className="text-xs text-text-secondary">{(p.zones ?? []).map((z: string) => ZONE_LABELS[z] ?? z).join(', ')}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10" style={{ maxHeight: '85%' }}>
            <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-bold text-text-primary mb-1">{selected?.first_name} {selected?.last_name}</Text>
              <Text className="text-sm text-text-secondary">{selected?.email}</Text>
              {selected?.phone && <Text className="text-sm text-text-secondary">{selected.phone}</Text>}
              {selected?.company_name && <Text className="text-sm text-text-secondary">{selected.company_name}</Text>}
              <Text className="text-xs text-text-secondary mb-4">Inscrit le {selected?.created_at ? formatDate(selected.created_at) : '—'}</Text>
              <View className="bg-bg-light rounded-xl px-4 py-3 mb-6 gap-1">
                {selected?.siret && <Text className="text-xs text-text-secondary">SIRET : {selected.siret}</Text>}
                {selected?.is_auto_entrepreneur !== undefined && (
                  <Text className="text-xs text-text-secondary">{selected.is_auto_entrepreneur ? 'Auto-entrepreneur' : 'Autre statut'}</Text>
                )}
                {selected?.zones?.length > 0 && (
                  <Text className="text-xs text-text-secondary">Zones : {selected.zones.map((z: string) => ZONE_LABELS[z] ?? z).join(', ')}</Text>
                )}
                {selected?.skills?.length > 0 && (
                  <Text className="text-xs text-text-secondary">Compétences : {selected.skills.join(', ')}</Text>
                )}
              </View>

              {/* Statistiques */}
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Statistiques</Text>
              {statsLoading || !stats ? <ActivityIndicator color="#1A3A3A" style={{ marginBottom: 16 }} /> : (
                <View className="mb-6">
                  {/* Note */}
                  <View className="bg-bg-light rounded-xl px-4 py-3 mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs text-text-secondary">Note voyageurs</Text>
                      <Text className="text-sm font-bold text-primary">
                        {stats.rating_count > 0 ? `${Number(stats.rating).toFixed(1)}/5` : 'Pas encore noté'}
                        {stats.rating_count > 0 && <Text className="text-xs font-normal text-text-secondary"> ({stats.rating_count} avis)</Text>}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs text-text-secondary">Taux d'acceptation</Text>
                      <Text className="text-sm font-bold text-text-primary">{stats.acceptance_rate}%</Text>
                    </View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs text-text-secondary">Temps moyen d'intervention</Text>
                      <Text className="text-sm font-bold text-text-primary">
                        {stats.avg_duration_minutes > 0 ? `${stats.avg_duration_minutes} min` : '—'}
                      </Text>
                    </View>
                  </View>
                  {/* Compteurs */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View className="flex-1 bg-primary/5 rounded-xl px-3 py-2 items-center">
                      <Text className="text-lg font-bold text-primary">{stats.completed_missions}</Text>
                      <Text className="text-[10px] text-text-secondary">Terminées</Text>
                    </View>
                    <View className="flex-1 bg-blue-50 rounded-xl px-3 py-2 items-center">
                      <Text className="text-lg font-bold text-blue-600">{stats.total_missions}</Text>
                      <Text className="text-[10px] text-text-secondary">Total missions</Text>
                    </View>
                    <View className="flex-1 bg-green-50 rounded-xl px-3 py-2 items-center">
                      <Text className="text-lg font-bold text-green-700">{Number(stats.total_earnings).toFixed(0)}€</Text>
                      <Text className="text-[10px] text-text-secondary">Revenus</Text>
                    </View>
                  </View>
                  {stats.member_since && (
                    <Text className="text-xs text-text-secondary text-center mt-2">
                      Membre depuis {new Date(stats.member_since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              )}

              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Documents ({documents.length})</Text>
              {docsLoading ? <ActivityIndicator color="#1A3A3A" style={{ marginBottom: 16 }} /> : documents.length === 0 ? (
                <Text className="text-xs text-text-secondary italic mb-6">Aucun document soumis</Text>
              ) : (
                <View style={{ gap: 12, marginBottom: 24 }}>
                  {documents.map((doc) => {
                    const dst = DOC_STATUS_CONFIG[doc.status ?? 'pending'];
                    return (
                      <View key={doc.id} className="border border-border rounded-xl px-4 py-3">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-sm font-medium text-text-primary">{DOC_TYPE_LABELS[doc.type] ?? doc.type}</Text>
                          <View className={`rounded-full px-3 py-1 ${dst.bg}`}>
                            <Text className={`text-xs font-medium ${dst.text}`}>{dst.label}</Text>
                          </View>
                        </View>
                        {doc.rejection_reason && <Text className="text-xs text-red-600 mb-2">Motif : {doc.rejection_reason}</Text>}
                        {doc.status === 'pending' && (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={{ flex: 1 }} className="h-10 rounded-lg bg-green-600 items-center justify-center" onPress={() => handleValidateDoc(doc.id, true)}>
                              <Text className="text-white text-xs font-semibold">Valider</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ flex: 1 }} className="h-10 rounded-lg bg-red-50 border border-red-300 items-center justify-center" onPress={() => handleValidateDoc(doc.id, false)}>
                              <Text className="text-red-700 text-xs font-semibold">Refuser</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {selected?.provider_status !== 'active' && (
                <TouchableOpacity
                  className={`h-14 rounded-btn items-center justify-center mb-3 ${actionLoading ? 'bg-text-muted' : 'bg-primary'}`}
                  onPress={() => handleActivate(selected.id)} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-semibold">Activer le compte</Text>}
                </TouchableOpacity>
              )}
              {selected?.provider_status === 'active' && (
                <TouchableOpacity className="h-14 rounded-btn items-center justify-center mb-3 bg-red-50 border border-danger"
                  onPress={() => handleSuspend(selected.id)} disabled={actionLoading}>
                  <Text className="text-danger text-base font-semibold">Suspendre</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity className="h-12 items-center justify-center" onPress={() => setSelected(null)}>
                <Text className="text-sm text-text-secondary">Fermer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Page principale ─── */
export default function AdminUsers() {
  const [userType, setUserType] = useState<'client' | 'provider'>('client');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
    // Attendre un peu que les refetch se lancent
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1A3A3A" />}
      >
        <Text className="text-2xl font-bold text-text-primary mb-4">Utilisateurs</Text>

        <View className="flex-row bg-bg-light rounded-xl p-1 mb-4">
          <TouchableOpacity
            onPress={() => { setUserType('client'); setSearch(''); }}
            className={`flex-1 py-2.5 rounded-lg items-center ${userType === 'client' ? 'bg-white' : ''}`}
            style={userType === 'client' ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}>
            <Text className={`text-sm font-medium ${userType === 'client' ? 'text-primary' : 'text-text-secondary'}`}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setUserType('provider'); setSearch(''); }}
            className={`flex-1 py-2.5 rounded-lg items-center ${userType === 'provider' ? 'bg-white' : ''}`}
            style={userType === 'provider' ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}>
            <Text className={`text-sm font-medium ${userType === 'provider' ? 'text-primary' : 'text-text-secondary'}`}>Prestataires</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un nom, email..."
          placeholderTextColor="#9CA3AF"
          className="h-11 border border-border rounded-xl px-4 text-sm text-text-primary bg-bg-light mb-3"
        />

        {userType === 'client' ? <ClientsView search={search} /> : <ProvidersView search={search} />}
      </ScrollView>
    </SafeAreaView>
  );
}
