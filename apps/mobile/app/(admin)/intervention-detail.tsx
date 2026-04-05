import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAdminInterventionDetail, useAdminInterventionPhotos } from '../../hooks/use-admin';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Sans prestataire', bg: 'bg-orange-100', text: 'text-orange-700' },
  assigned:    { label: 'Assignée',         bg: 'bg-blue-100',   text: 'text-blue-700' },
  accepted:    { label: 'Acceptée',         bg: 'bg-indigo-100', text: 'text-indigo-700' },
  in_progress: { label: 'En cours',         bg: 'bg-primary/10', text: 'text-primary' },
  completed:   { label: 'Terminée',         bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:   { label: 'Annulée',          bg: 'bg-gray-100',   text: 'text-gray-500' },
};

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function durationMinutes(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  if (diff < 0) return '—';
  const h = Math.floor(diff / 60);
  const m = Math.round(diff % 60);
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-xs text-text-secondary">{label}</Text>
      <Text className="text-xs font-medium text-text-primary">{value}</Text>
    </View>
  );
}

export default function AdminInterventionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: intervention, isLoading } = useAdminInterventionDetail(id ?? null);
  const { data: photos = [] } = useAdminInterventionPhotos(id ?? null);

  if (isLoading || !intervention) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  const prop = intervention.properties as any;
  const client = intervention.profiles as any;
  const provider = (intervention as any).provider as any;
  const st = STATUS_CONFIG[intervention.status] ?? STATUS_CONFIG.pending;
  const checklist: { id: string; label: string; done: boolean }[] = Array.isArray(intervention.checklist) ? intervention.checklist as any : [];
  const photosBefore = photos.filter((p) => p.type === 'before');
  const photosAfter = photos.filter((p) => p.type === 'after');
  const photosDamage = photos.filter((p) => p.type === 'damage');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6 w-11 h-11 justify-center">
          <Text className="text-2xl text-text-primary">←</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text className="text-xl font-bold text-text-primary mb-1">{prop?.internal_name}</Text>
        <Text className="text-sm text-text-secondary mb-1">{prop?.address}, {prop?.city} {prop?.postal_code}</Text>
        <Text className="text-sm text-text-secondary mb-3">{formatDate(intervention.scheduled_date)} · {intervention.scheduled_time?.slice(0, 5)}</Text>
        <View className={`self-start rounded-full px-3 py-1 mb-6 ${st.bg}`}>
          <Text className={`text-xs font-medium ${st.text}`}>{st.label}</Text>
        </View>

        {/* Financier */}
        <View className="bg-primary/5 rounded-xl px-4 py-3 mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-text-secondary">Prix client</Text>
            <Text className="text-sm font-bold text-text-primary">{Number(intervention.price).toFixed(2)}€</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-text-secondary">Payout prestataire</Text>
            <Text className="text-sm font-bold text-primary">{Number(intervention.provider_payout).toFixed(2)}€</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-text-secondary">Commission Deltom</Text>
            <Text className="text-sm font-bold text-green-700">{Number(intervention.deltom_commission).toFixed(2)}€</Text>
          </View>
        </View>

        {/* Client */}
        <View className="bg-bg-light rounded-xl px-4 py-3 mb-4">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Client</Text>
          <InfoRow label="Nom" value={client ? `${client.first_name} ${client.last_name}` : null} />
          <InfoRow label="Email" value={client?.email} />
          <InfoRow label="Téléphone" value={client?.phone} />
        </View>

        {/* Prestataire */}
        <View className="bg-bg-light rounded-xl px-4 py-3 mb-4">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Prestataire</Text>
          {provider ? (
            <>
              <InfoRow label="Nom" value={`${provider.first_name} ${provider.last_name}`} />
              <InfoRow label="Email" value={provider.email} />
              <InfoRow label="Téléphone" value={provider.phone} />
            </>
          ) : (
            <Text className="text-xs text-text-secondary italic">Non assigné</Text>
          )}
        </View>

        {/* Infos réservation */}
        <View className="bg-bg-light rounded-xl px-4 py-3 mb-4">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Réservation</Text>
          <InfoRow label="Voyageurs" value={intervention.guest_count} />
          <InfoRow label="Check-in même jour" value={intervention.same_day_checkin ? 'Oui' : null} />
          <InfoRow label="Lit bébé" value={intervention.baby_bed_requested ? 'Oui' : null} />
          <InfoRow label="Arrivée anticipée" value={intervention.early_checkin ? 'Oui' : null} />
          <InfoRow label="Départ tardif" value={intervention.late_checkout ? 'Oui' : null} />
          {intervention.notes && (
            <View className="mt-2">
              <Text className="text-xs text-text-secondary">Notes</Text>
              <Text className="text-xs text-text-primary mt-0.5">{intervention.notes}</Text>
            </View>
          )}
        </View>

        {/* Logement */}
        <View className="bg-bg-light rounded-xl px-4 py-3 mb-4">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Logement</Text>
          <InfoRow label="Type" value={prop?.property_type} />
          <InfoRow label="Offre" value={prop?.offer_type === 'operator' ? 'Opérateur' : 'City opérateur'} />
          <InfoRow label="Check-out" value={prop?.checkout_time || '10:00'} />
          <InfoRow label="Check-in" value={prop?.checkin_time || '16:00'} />
        </View>

        {/* Chronologie */}
        <View className="bg-bg-light rounded-xl px-4 py-3 mb-4">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Chronologie</Text>
          <InfoRow label="Assignée" value={formatDateTime(intervention.assigned_at)} />
          <InfoRow label="Démarrée" value={formatDateTime(intervention.started_at)} />
          <InfoRow label="Terminée" value={formatDateTime(intervention.completed_at)} />
          <InfoRow label="Durée intervention" value={durationMinutes(intervention.started_at, intervention.completed_at)} />
          {intervention.cancelled_at && (
            <>
              <InfoRow label="Annulée" value={formatDateTime(intervention.cancelled_at)} />
              <InfoRow label="Raison" value={intervention.cancellation_reason} />
            </>
          )}
        </View>

        {/* Note propriétaire */}
        {intervention.owner_reminder && (
          <View className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
            <Text className="text-xs font-semibold text-orange-800 mb-1">Note du propriétaire</Text>
            <Text className="text-xs text-orange-700">{intervention.owner_reminder}</Text>
          </View>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Checklist ({checklist.filter((c) => c.done).length}/{checklist.length})
            </Text>
            <View className="gap-2">
              {checklist.map((item) => (
                <View key={item.id} className={`flex-row items-center gap-3 rounded-xl px-4 py-2.5 border ${item.done ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                  <View className={`w-5 h-5 rounded border-2 items-center justify-center ${item.done ? 'border-green-500 bg-green-500' : 'border-border'}`}>
                    {item.done && <Text className="text-white text-xs font-bold">✓</Text>}
                  </View>
                  <Text className={`text-xs flex-1 ${item.done ? 'text-green-700' : 'text-text-primary'}`}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Photos avant */}
        {photosBefore.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Photos avant ({photosBefore.length})</Text>
            <View className="flex-row flex-wrap gap-2">
              {photosBefore.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={{ width: 100, height: 100 }} className="rounded-lg" resizeMode="cover" />
              ))}
            </View>
          </View>
        )}

        {/* Photos après */}
        {photosAfter.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Photos après ({photosAfter.length})</Text>
            <View className="flex-row flex-wrap gap-2">
              {photosAfter.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={{ width: 100, height: 100 }} className="rounded-lg" resizeMode="cover" />
              ))}
            </View>
          </View>
        )}

        {/* Dégâts */}
        {photosDamage.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">Dégâts signalés ({photosDamage.length})</Text>
            <View className="gap-3">
              {photosDamage.map((p) => (
                <View key={p.id} className="rounded-xl overflow-hidden border border-red-200">
                  <Image source={{ uri: p.url }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                  {p.label && (
                    <View className="bg-red-50 px-3 py-2">
                      <Text className="text-xs text-red-700">{p.label}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
