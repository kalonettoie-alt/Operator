import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { usePropertyCreateStore } from '../../../../stores/property-create-store';
import { useAuthStore } from '../../../../stores/auth-store';
import { useClientProfile } from '../../../../hooks/use-client-dashboard';

export default function PropertyCreateStep7() {
  const store = usePropertyCreateStore();
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const { data: profile } = useClientProfile();

  const sepaActive = profile?.sepa_mandate_active === true;

  const [icalUrl, setIcalUrl] = useState('');
  const [icalPlatform, setIcalPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(withIcal: boolean) {
    if (!store.propertyType || !store.offerType) return;
    setLoading(true);
    setError('');

    try {
      // 1. Créer le logement (sans codes sensibles — chiffrés ensuite via Edge Function)
      const { data: propertyId, error: rpcError } = await supabase.rpc('client_create_property', {
        p_address: store.address,
        p_city: store.city,
        p_postal_code: store.postalCode,
        p_property_type: store.propertyType,
        p_offer_type: store.offerType,
        p_floor: store.floor ?? undefined,
        p_has_elevator: store.hasElevator,
        p_laundry_enabled: store.laundryEnabled,
        p_has_key_box: store.hasKeyBox,
        p_has_spare_keys: store.hasSparKeys,
        p_owner_reminder: store.ownerReminder || undefined,
        p_double_beds: store.doubleBeds,
        p_single_beds: store.singleBeds,
        p_sofa_beds: store.sofaBeds,
        p_baby_beds: store.babyBeds,
        p_balcony: store.balcony,
        p_parking: store.parking,
        p_pets_allowed: store.petsAllowed,
        p_jacuzzi: store.jacuzzi,
        p_checkin_time: store.checkinTime,
        p_checkout_time: store.checkoutTime,
        p_photo_report_enabled: store.photoReportEnabled,
        p_report_extras: store.reportExtras.length > 0 ? store.reportExtras : undefined,
        p_guest_link_enabled: store.guestLinkEnabled,
        p_consumables_kits: store.consumablesKits.length > 0 ? store.consumablesKits : undefined,
        p_latitude: store.latitude ?? undefined,
        p_longitude: store.longitude ?? undefined,
      });

      if (rpcError) throw rpcError;

      // 2. Chiffrer les codes d'accès côté Edge Function (AES-256-GCM)
      const hasSecrets = store.accessCode || store.wifiCode || (store.hasKeyBox && store.keyBoxCode);
      if (propertyId && hasSecrets) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/save-property-data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              propertyId,
              accessCode: store.accessCode || undefined,
              wifiCode: store.wifiCode || undefined,
              keyBoxCode: store.hasKeyBox ? store.keyBoxCode || undefined : undefined,
            }),
          }
        );
        if (!res.ok) {
          const body = await res.json() as { error?: string };
          const encErr = body?.error;
          throw new Error(encErr ?? 'Erreur chiffrement codes accès');
        }
      }

      // 3. iCal
      if (withIcal && icalUrl.trim() && propertyId) {
        const { error: icalError } = await supabase.rpc('client_add_ical_source', {
          p_property_id: propertyId,
          p_url: icalUrl.trim(),
          p_platform: icalPlatform.trim() || undefined,
        });
        if (icalError) throw icalError;
      }

      await queryClient.invalidateQueries({ queryKey: ['client-properties', userId] });
      store.reset();
      router.replace('/(client)/properties');
    } catch (e: any) {
      setError(e.message ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-6 pb-8">

            <TouchableOpacity onPress={() => router.replace('/(client)/properties/create/step-6')} className="mb-8 w-11 h-11 justify-center">
              <Text className="text-2xl text-text-primary">←</Text>
            </TouchableOpacity>

            <View className="flex-row gap-1 mb-8">
              {[1,2,3,4,5,6,7].map((i) => (
                <View key={i} className="flex-1 h-1 rounded-full bg-primary" />
              ))}
            </View>

            <Text className="text-2xl font-bold text-text-primary mb-1">Calendrier iCal</Text>
            <Text className="text-sm text-text-secondary mb-8">
              Étape 7 sur 7 — Synchronisation réservations
            </Text>

            {error ? (
              <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            {!sepaActive && (
              <View className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 flex-row gap-3">
                <Text className="text-xl">⚠️</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-orange-800 mb-0.5">Mandat SEPA requis pour l'iCal</Text>
                  <Text className="text-xs text-orange-700 leading-5">
                    Configurez-le depuis votre onglet Compte, puis revenez ajouter l'iCal.
                  </Text>
                </View>
              </View>
            )}

            <View className="bg-bg-light rounded-xl px-4 py-4 mb-6">
              <Text className="text-sm font-semibold text-text-primary mb-1">Comment obtenir l'URL iCal ?</Text>
              <Text className="text-xs text-text-secondary leading-5">
                Airbnb → Calendrier → Exporter le calendrier{'\n'}
                Booking → Propriété → Synchroniser le calendrier{'\n'}
                Abritel → Calendrier → Lien d'exportation
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Plateforme (optionnel)</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="Airbnb, Booking, Abritel..."
                placeholderTextColor="#9CA3AF"
                value={icalPlatform}
                onChangeText={setIcalPlatform}
                autoCapitalize="words"
                editable={sepaActive}
              />
            </View>

            <View className="mb-8">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">URL iCal</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="https://www.airbnb.fr/calendar/ical/..."
                placeholderTextColor="#9CA3AF"
                value={icalUrl}
                onChangeText={setIcalUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={sepaActive}
              />
            </View>

            <TouchableOpacity
              className={`h-14 rounded-btn items-center justify-center mb-3 ${(loading || !icalUrl.trim() || !sepaActive) ? 'bg-text-muted' : 'bg-primary'}`}
              onPress={() => handleCreate(true)}
              disabled={loading || !icalUrl.trim() || !sepaActive}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text className="text-white text-base font-semibold">Créer avec iCal</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="h-12 items-center justify-center"
              onPress={() => handleCreate(false)}
              disabled={loading}
            >
              <Text className="text-sm text-text-secondary">
                {sepaActive ? "Passer — ajouter l'iCal plus tard" : 'Créer le logement sans iCal'}
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
