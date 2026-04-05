import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/query-client';
import { useAdminPendingProviders, useAdminProviderDocuments } from '../../hooks/use-admin';

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
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
  id: "Pièce d'identité",
  kbis: 'KBIS / INSEE',
  insurance: 'Assurance RC Pro',
  rib: 'RIB',
  other: 'Autre',
};

const DOC_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:  { label: 'En attente', bg: 'bg-orange-100', text: 'text-orange-700' },
  approved: { label: 'Validé',     bg: 'bg-green-100',  text: 'text-green-700' },
  rejected: { label: 'Refusé',     bg: 'bg-red-100',    text: 'text-red-700' },
};

export default function AdminProviders() {
  const { data: providers = [], isLoading, refetch } = useAdminPendingProviders();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { data: documents = [], isLoading: docsLoading } = useAdminProviderDocuments(selected?.id ?? null);

  async function handleActivate(providerId: string) {
    setActionLoading(true);
    const { error } = await supabase.rpc('admin_activate_provider', { p_provider_id: providerId });
    setActionLoading(false);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
      setSelected(null);
    }
  }

  async function handleSuspend(providerId: string) {
    setActionLoading(true);
    await supabase.from('profiles').update({ provider_status: 'suspended' }).eq('id', providerId);
    setActionLoading(false);
    queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
    setSelected(null);
  }

  async function handleValidateDoc(docId: string, approved: boolean) {
    if (!approved) {
      Alert.prompt(
        'Motif du refus',
        'Expliquez pourquoi le document est refusé',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Refuser',
            style: 'destructive',
            onPress: async (reason: string | undefined) => {
              await supabase.rpc('admin_validate_document', {
                p_document_id: docId,
                p_approved: false,
                p_rejection_reason: reason || 'Document non conforme',
              });
              queryClient.invalidateQueries({ queryKey: ['admin-provider-documents', selected?.id] });
              queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
            },
          },
        ],
        'plain-text'
      );
      return;
    }
    await supabase.rpc('admin_validate_document', {
      p_document_id: docId,
      p_approved: true,
    });
    queryClient.invalidateQueries({ queryKey: ['admin-provider-documents', selected?.id] });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
  }

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  const pendingCount = providers.filter((p) => p.provider_status === 'pending' || p.provider_status === null).length;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor="#1A3A3A" />}
      >
        <Text className="text-2xl font-bold text-text-primary mb-2">Prestataires</Text>
        <Text className="text-xs text-text-secondary mb-6">
          {providers.length} total · {pendingCount} en attente
        </Text>

        {providers.length === 0 ? (
          <Text className="text-sm text-text-secondary text-center mt-20">Aucun prestataire</Text>
        ) : (
          <View className="gap-3">
            {providers.map((p) => {
              const st = STATUS_LABEL[p.provider_status ?? 'null'];
              return (
                <TouchableOpacity key={p.id} onPress={() => setSelected(p)}
                  className="bg-white border border-border rounded-xl px-4 py-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-semibold text-text-primary">{p.first_name} {p.last_name}</Text>
                      <Text className="text-xs text-text-secondary">{p.email}</Text>
                      {p.siret && <Text className="text-xs text-text-secondary">SIRET : {p.siret}</Text>}
                    </View>
                    <View className={`rounded-full px-3 py-1 ${st.bg}`}>
                      <Text className={`text-xs font-medium ${st.text}`}>{st.label}</Text>
                    </View>
                  </View>
                  {(p.zones?.length ?? 0) > 0 && (
                    <Text className="text-xs text-text-secondary">
                      {(p.zones ?? []).map((z: string) => ZONE_LABELS[z] ?? z).join(', ')}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal détail */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10 max-h-5/6">
            <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-bold text-text-primary mb-1">
                {selected?.first_name} {selected?.last_name}
              </Text>
              <Text className="text-sm text-text-secondary mb-4">{selected?.email}</Text>

              <View className="bg-bg-light rounded-xl px-4 py-3 mb-6 gap-1">
                {selected?.siret && <Text className="text-xs text-text-secondary">SIRET : {selected.siret}</Text>}
                {selected?.is_auto_entrepreneur !== undefined && (
                  <Text className="text-xs text-text-secondary">
                    {selected.is_auto_entrepreneur ? 'Auto-entrepreneur' : 'Autre statut'}
                  </Text>
                )}
                {selected?.zones?.length > 0 && (
                  <Text className="text-xs text-text-secondary">
                    Zones : {selected.zones.map((z: string) => ZONE_LABELS[z] ?? z).join(', ')}
                  </Text>
                )}
                {selected?.skills?.length > 0 && (
                  <Text className="text-xs text-text-secondary">
                    Compétences : {selected.skills.join(', ')}
                  </Text>
                )}
              </View>

              {/* Documents */}
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Documents ({documents.length})
              </Text>
              {docsLoading ? (
                <ActivityIndicator color="#1A3A3A" className="mb-4" />
              ) : documents.length === 0 ? (
                <Text className="text-xs text-text-secondary italic mb-6">Aucun document soumis</Text>
              ) : (
                <View className="gap-3 mb-6">
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
                        {doc.rejection_reason && (
                          <Text className="text-xs text-red-600 mb-2">Motif : {doc.rejection_reason}</Text>
                        )}
                        {doc.status === 'pending' && (
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              className="flex-1 h-10 rounded-lg bg-green-600 items-center justify-center"
                              onPress={() => handleValidateDoc(doc.id, true)}>
                              <Text className="text-white text-xs font-semibold">Valider</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              className="flex-1 h-10 rounded-lg bg-red-50 border border-red-300 items-center justify-center"
                              onPress={() => handleValidateDoc(doc.id, false)}>
                              <Text className="text-red-700 text-xs font-semibold">Refuser</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Actions */}
              {selected?.provider_status !== 'active' && (
                <TouchableOpacity
                  className={`h-14 rounded-btn items-center justify-center mb-3 ${actionLoading ? 'bg-text-muted' : 'bg-primary'}`}
                  onPress={() => handleActivate(selected.id)}
                  disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#fff" /> : (
                    <Text className="text-white text-base font-semibold">Activer le compte</Text>
                  )}
                </TouchableOpacity>
              )}

              {selected?.provider_status === 'active' && (
                <TouchableOpacity
                  className="h-14 rounded-btn items-center justify-center mb-3 bg-red-50 border border-danger"
                  onPress={() => handleSuspend(selected.id)}
                  disabled={actionLoading}>
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
    </SafeAreaView>
  );
}
