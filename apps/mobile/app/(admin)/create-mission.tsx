import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/query-client';
import { useAdminProperties, useAdminActiveProviders } from '../../hooks/use-admin';

const DEFAULT_CHECKLIST = [
  { id: '1', label: 'Faire les lits', done: false },
  { id: '2', label: 'Nettoyer la salle de bain', done: false },
  { id: '3', label: "Passer l'aspirateur", done: false },
  { id: '4', label: 'Vider les poubelles', done: false },
  { id: '5', label: 'Nettoyer la cuisine', done: false },
];

const DAYS_HEADER = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateFR(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  return cells;
}

function generateTimeSlots(checkoutTime: string, checkinTime: string): string[] {
  const [startH, startM] = checkoutTime.split(':').map(Number);
  const [endH, endM] = checkinTime.split(':').map(Number);
  const startMin = startH * 60 + (startM || 0);
  const endMin = endH * 60 + (endM || 0);
  const slots: string[] = [];
  for (let m = startMin; m <= endMin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

// Mini calendrier inline
function MiniCalendar({ selected, onSelect, visible, onClose }: {
  selected: string;
  onSelect: (d: string) => void;
  visible: boolean;
  onClose: () => void;
}) {
  const today = toDateStr(new Date());
  const sel = selected || today;
  const [viewYear, setViewYear] = useState(parseInt(sel.slice(0, 4), 10));
  const [viewMonth, setViewMonth] = useState(parseInt(sel.slice(5, 7), 10) - 1);

  const days = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 justify-center items-center bg-black/40 px-6">
        <TouchableOpacity activeOpacity={1} className="bg-white rounded-2xl px-5 py-5 w-full">
          {/* Header mois */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={prevMonth} className="w-10 h-10 items-center justify-center">
              <Text className="text-lg text-text-primary">←</Text>
            </TouchableOpacity>
            <Text className="text-sm font-semibold text-text-primary">{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} className="w-10 h-10 items-center justify-center">
              <Text className="text-lg text-text-primary">→</Text>
            </TouchableOpacity>
          </View>

          {/* Jours header */}
          <View className="flex-row mb-2">
            {DAYS_HEADER.map((d) => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-[10px] text-text-secondary font-medium">{d}</Text>
              </View>
            ))}
          </View>

          {/* Grille */}
          <View className="flex-row flex-wrap">
            {days.map((day, i) => {
              if (day === null) return <View key={`e${i}`} style={{ width: '14.28%', height: 40 }} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === selected;
              const isToday = dateStr === today;
              const isPast = dateStr < today;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => { if (!isPast) { onSelect(dateStr); onClose(); } }}
                  disabled={isPast}
                  style={{ width: '14.28%', height: 40 }}
                  className="items-center justify-center">
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-primary' : isToday ? 'bg-primary/10' : ''}`}>
                    <Text className={`text-sm ${isSelected ? 'text-white font-bold' : isPast ? 'text-text-muted' : 'text-text-primary'}`}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function CreateMission() {
  const { data: properties = [] } = useAdminProperties();
  const { data: providers = [] } = useAdminActiveProviders();

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [date, setDate] = useState(toDateStr(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [ownerReminder, setOwnerReminder] = useState('');
  const [notes, setNotes] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [babyBed, setBabyBed] = useState(false);
  const [earlyCheckin, setEarlyCheckin] = useState(false);
  const [lateCheckout, setLateCheckout] = useState(false);
  const [sameDayCheckin, setSameDayCheckin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<'property' | 'details'>('property');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerFilter, setProviderFilter] = useState<'all' | 'zone'>('zone');

  const selectedProperty = properties.find((p) => p.id === propertyId) as any;
  const selectedProvider = providers.find((p) => p.id === providerId) as any;
  const propertyZone = selectedProperty ? (selectedProperty.postal_code as string)?.slice(0, 2) : null;
  const checkoutTime = selectedProperty?.checkout_time || '10:00';
  const checkinTime = selectedProperty?.checkin_time || '16:00';
  const timeSlots = useMemo(() => generateTimeSlots(checkoutTime, checkinTime), [checkoutTime, checkinTime]);

  const needsCustomTime = earlyCheckin || lateCheckout;

  async function handleCreate() {
    if (!propertyId) {
      Alert.alert('Erreur', 'Sélectionnez un logement.');
      return;
    }
    if (needsCustomTime && !time) {
      Alert.alert('Erreur', "Sélectionnez l'heure de l'intervention.");
      return;
    }
    setCreating(true);
    const { error } = await supabase.rpc('admin_create_intervention' as any, {
      p_property_id: propertyId,
      p_scheduled_date: date,
      p_scheduled_time: needsCustomTime ? time : null,
      p_provider_id: providerId,
      p_owner_reminder: ownerReminder.trim() || null,
      p_checklist: DEFAULT_CHECKLIST,
      p_guest_count: guestCount ? parseInt(guestCount, 10) : null,
      p_baby_bed_requested: babyBed,
      p_early_checkin: earlyCheckin,
      p_late_checkout: lateCheckout,
      p_same_day_checkin: sameDayCheckin,
      p_notes: notes.trim() || null,
    });
    setCreating(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-interventions'] });
    // Reset le formulaire
    setPropertyId(null);
    setProviderId(null);
    setDate(toDateStr(new Date()));
    setTime(null);
    setOwnerReminder('');
    setNotes('');
    setGuestCount('');
    setBabyBed(false);
    setEarlyCheckin(false);
    setLateCheckout(false);
    setSameDayCheckin(false);
    setStep('property');

    Alert.alert('Mission créée', 'La mission a été créée.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  // Étape 1 : choix du logement
  if (step === 'property') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
          <TouchableOpacity onPress={() => router.back()} className="mb-6 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text-primary mb-2">Nouvelle mission</Text>
          <Text className="text-sm text-text-secondary mb-6">Choisissez le logement</Text>
          {properties.filter((p) => p.is_active).length === 0 ? (
            <Text className="text-sm text-text-secondary text-center mt-10">Aucun logement actif</Text>
          ) : (
            <View className="gap-3">
              {properties.filter((p) => p.is_active).map((p) => {
                const owner = p.profiles as any;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => { setPropertyId(p.id); setStep('details'); }}
                    className="border border-border rounded-xl px-4 py-4">
                    <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{p.internal_name}</Text>
                    <Text className="text-xs text-text-secondary">{p.address}, {p.city} {p.postal_code}</Text>
                    <Text className="text-xs text-text-secondary mt-0.5">{p.property_type} · {p.offer_type === 'operator' ? 'Opérateur' : 'City opérateur'}</Text>
                    {owner && <Text className="text-xs text-primary mt-1">{owner.first_name} {owner.last_name}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Étape 2 : détails
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => setStep('property')} className="mb-6 w-11 h-11 justify-center">
          <Text className="text-2xl text-text-primary">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary mb-2">Nouvelle mission</Text>
        <Text className="text-sm text-text-secondary mb-6">Détails de l'intervention</Text>

        {/* Logement sélectionné */}
        <View className="bg-primary/5 rounded-xl px-4 py-3 mb-4">
          <Text className="text-sm font-semibold text-primary">{selectedProperty?.internal_name}</Text>
          <Text className="text-xs text-text-secondary">
            {selectedProperty?.city} · {selectedProperty?.property_type} · Départ {checkoutTime} / Arrivée {checkinTime}
          </Text>
        </View>

        {/* Date */}
        <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Date de l'intervention</Text>
        <TouchableOpacity
          onPress={() => setShowCalendar(true)}
          className="h-12 border border-border rounded-xl px-4 bg-bg-light mb-5 flex-row items-center justify-between">
          <Text className="text-sm text-text-primary">{formatDateFR(date)}</Text>
          <Text className="text-text-secondary">📅</Text>
        </TouchableOpacity>

        <MiniCalendar
          selected={date}
          onSelect={setDate}
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
        />

        {/* Infos réservation */}
        <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Informations réservation</Text>
        <View className="gap-3 mb-5">
          <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3">
            <Text className="text-sm text-text-primary">Nombre de voyageurs</Text>
            <TextInput
              value={guestCount}
              onChangeText={setGuestCount}
              placeholder="—"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              className="w-16 h-10 border border-border rounded-lg px-3 text-sm text-text-primary text-center bg-white"
            />
          </View>
          <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3">
            <Text className="text-sm text-text-primary">Check-in le même jour</Text>
            <Switch value={sameDayCheckin} onValueChange={setSameDayCheckin} trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }} thumbColor="#fff" />
          </View>
          <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3">
            <Text className="text-sm text-text-primary">Lit bébé demandé</Text>
            <Switch value={babyBed} onValueChange={setBabyBed} trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }} thumbColor="#fff" />
          </View>
          <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3">
            <Text className="text-sm text-text-primary">Arrivée anticipée</Text>
            <Switch value={earlyCheckin} onValueChange={(v) => { setEarlyCheckin(v); if (!v && !lateCheckout) setTime(null); }} trackColor={{ false: '#E5E7EB', true: '#F59E0B' }} thumbColor="#fff" />
          </View>
          <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3">
            <Text className="text-sm text-text-primary">Départ tardif</Text>
            <Switch value={lateCheckout} onValueChange={(v) => { setLateCheckout(v); if (!v && !earlyCheckin) setTime(null); }} trackColor={{ false: '#E5E7EB', true: '#F59E0B' }} thumbColor="#fff" />
          </View>

          {/* Heure — visible uniquement si arrivée anticipée ou départ tardif */}
          {(earlyCheckin || lateCheckout) && (
            <View className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <Text className="text-xs font-semibold text-orange-800 mb-2">
                Heure de l'intervention ({checkoutTime} – {checkinTime})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {timeSlots.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setTime(t)}
                      className={`px-3 py-2 rounded-lg border ${time === t ? 'border-primary bg-primary/5' : 'border-orange-300 bg-white'}`}>
                      <Text className={`text-xs font-medium ${time === t ? 'text-primary' : 'text-text-secondary'}`}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Notes réservation */}
        <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Notes sur la réservation</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Ex: Voyageurs avec animaux, arrivée tardive prévue..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          className="border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-bg-light mb-5"
          style={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        {/* Prestataire */}
        <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Prestataire (optionnel)</Text>
        <TouchableOpacity
          onPress={() => setShowProviderModal(true)}
          className="border border-border rounded-xl px-4 py-3 mb-5 flex-row items-center justify-between">
          {selectedProvider ? (
            <View>
              <Text className="text-sm font-medium text-primary">{selectedProvider.first_name} {selectedProvider.last_name}</Text>
              {selectedProvider.zones && <Text className="text-xs text-text-secondary">{(selectedProvider.zones as string[]).join(', ')}</Text>}
            </View>
          ) : (
            <Text className="text-sm text-text-secondary">Dispatch automatique</Text>
          )}
          <Text className="text-text-secondary">▼</Text>
        </TouchableOpacity>

        {/* Consigne prestataire */}
        <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Consigne pour le prestataire (optionnel)</Text>
        <TextInput
          value={ownerReminder}
          onChangeText={setOwnerReminder}
          placeholder="Ex: Laisser les serviettes sur le lit"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          className="border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-bg-light mb-6"
          style={{ minHeight: 60, textAlignVertical: 'top' }}
        />

        {/* Créer */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={creating}
          className={`h-14 rounded-xl items-center justify-center ${creating ? 'bg-text-muted' : 'bg-primary'}`}>
          {creating
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white text-base font-semibold">Créer la mission</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Modal sélection prestataire */}
      <Modal visible={showProviderModal} transparent animationType="slide" onRequestClose={() => setShowProviderModal(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10 max-h-4/5">
            <View className="w-10 h-1 rounded-full bg-border self-center mb-4" />
            <Text className="text-lg font-bold text-text-primary mb-3">Choisir un prestataire</Text>

            {/* Filtre */}
            <View className="flex-row gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setProviderFilter('zone')}
                className={`px-4 py-2 rounded-lg border ${providerFilter === 'zone' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <Text className={`text-xs font-medium ${providerFilter === 'zone' ? 'text-primary' : 'text-text-secondary'}`}>
                  Zone {propertyZone ?? ''} uniquement
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setProviderFilter('all')}
                className={`px-4 py-2 rounded-lg border ${providerFilter === 'all' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <Text className={`text-xs font-medium ${providerFilter === 'all' ? 'text-primary' : 'text-text-secondary'}`}>Tous</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View className="gap-2">
                {/* Dispatch auto */}
                <TouchableOpacity
                  onPress={() => { setProviderId(null); setShowProviderModal(false); }}
                  className={`border rounded-xl px-4 py-3 ${!providerId ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <Text className={`text-sm font-medium ${!providerId ? 'text-primary' : 'text-text-secondary'}`}>Dispatch automatique</Text>
                </TouchableOpacity>

                {providers
                  .filter((p) => {
                    if (providerFilter === 'all' || !propertyZone) return true;
                    return (p.zones as string[] | null)?.includes(propertyZone);
                  })
                  .map((p) => {
                    const inZone = propertyZone && (p.zones as string[] | null)?.includes(propertyZone);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => { setProviderId(p.id); setShowProviderModal(false); }}
                        className={`border rounded-xl px-4 py-3 flex-row items-center justify-between ${providerId === p.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <View>
                          <Text className={`text-sm font-medium ${providerId === p.id ? 'text-primary' : 'text-text-primary'}`}>
                            {p.first_name} {p.last_name}
                          </Text>
                          <Text className="text-xs text-text-secondary">
                            {(p.zones as string[] | null)?.join(', ')}
                            {inZone ? '' : ' · hors zone'}
                          </Text>
                        </View>
                        {providerId === p.id && <Text className="text-primary font-bold">✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </ScrollView>

            <TouchableOpacity className="h-12 items-center justify-center mt-3" onPress={() => setShowProviderModal(false)}>
              <Text className="text-sm text-text-secondary">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
