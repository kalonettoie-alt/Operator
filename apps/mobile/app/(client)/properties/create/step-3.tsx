import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePropertyCreateStore } from '../../../../stores/property-create-store';


function Counter({ label, desc, value, onChange }: { label: string; desc: string; value: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-border">
      <View className="flex-1">
        <Text className="text-sm font-medium text-text-primary">{label}</Text>
        <Text className="text-xs text-text-secondary">{desc}</Text>
      </View>
      <View className="flex-row items-center gap-4">
        <TouchableOpacity
          onPress={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-full border-2 border-border items-center justify-center"
        >
          <Text className="text-lg font-bold text-text-primary leading-none">−</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-text-primary w-5 text-center">{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(value + 1)}
          className="w-9 h-9 rounded-full bg-primary items-center justify-center"
        >
          <Text className="text-lg font-bold text-white leading-none">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TimeSelector({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  function adjust(delta: number) {
    const hour = parseInt(value.split(':')[0], 10);
    const next = Math.max(6, Math.min(23, hour + delta));
    onChange(`${String(next).padStart(2, '0')}:00`);
  }
  return (
    <View>
      <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">{label}</Text>
      <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3">
        <TouchableOpacity onPress={() => adjust(-1)}
          className="w-10 h-10 rounded-full border-2 border-border items-center justify-center">
          <Text className="text-xl font-bold text-text-primary leading-none">−</Text>
        </TouchableOpacity>
        <Text className="text-3xl font-bold text-text-primary">{value}</Text>
        <TouchableOpacity onPress={() => adjust(1)}
          className="w-10 h-10 rounded-full bg-primary items-center justify-center">
          <Text className="text-xl font-bold text-white leading-none">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PropertyCreateStep3() {
  const store = usePropertyCreateStore();

  // Accès
  const [floor, setFloor] = useState(store.floor !== null ? String(store.floor) : '');
  const [hasElevator, setHasElevator] = useState(store.hasElevator);
  const [hasKeyBox, setHasKeyBox] = useState(store.hasKeyBox);
  const [keyBoxCode, setKeyBoxCode] = useState(store.keyBoxCode);
  const [hasSparKeys, setHasSparKeys] = useState(store.hasSparKeys);
  const [accessCode, setAccessCode] = useState(store.accessCode);
  const [wifiCode, setWifiCode] = useState(store.wifiCode);
  const [ownerReminder, setOwnerReminder] = useState(store.ownerReminder);
  // Capacité
  const [doubleBeds, setDoubleBeds] = useState(store.doubleBeds);
  const [singleBeds, setSingleBeds] = useState(store.singleBeds);
  const [sofaBeds, setSofaBeds] = useState(store.sofaBeds);
  const [babyBeds, setBabyBeds] = useState(store.babyBeds);
  // Équipements
  const [balcony, setBalcony] = useState(store.balcony);
  const [parking, setParking] = useState(store.parking);
  const [petsAllowed, setPetsAllowed] = useState(store.petsAllowed);
  const [jacuzzi, setJacuzzi] = useState(store.jacuzzi);
  // Horaires
  const [checkinTime, setCheckinTime] = useState(store.checkinTime);
  const [checkoutTime, setCheckoutTime] = useState(store.checkoutTime);

  function handleContinue() {
    store.setDetails({
      floor: floor.trim() ? parseInt(floor.trim(), 10) : null,
      hasElevator, hasKeyBox,
      keyBoxCode: hasKeyBox ? keyBoxCode.trim() : '',
      hasSparKeys, accessCode: accessCode.trim(),
      wifiCode: wifiCode.trim(), ownerReminder: ownerReminder.trim(),
      doubleBeds, singleBeds, sofaBeds, babyBeds,
      balcony, parking, petsAllowed, jacuzzi,
      checkinTime, checkoutTime,
    });
    router.replace('/(client)/properties/create/step-4');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-6 pb-8">

            <TouchableOpacity onPress={() => router.replace('/(client)/properties/create/step-2')} className="mb-8 w-11 h-11 justify-center">
              <Text className="text-2xl text-text-primary">←</Text>
            </TouchableOpacity>

            <View className="flex-row gap-1 mb-8">
              {[1,2,3,4,5].map((i) => (
                <View key={i} className={`flex-1 h-1 rounded-full ${i <= 3 ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </View>

            <Text className="text-2xl font-bold text-text-primary mb-1">Détails du logement</Text>
            <Text className="text-sm text-text-secondary mb-8">Étape 3 sur 5</Text>

            {/* ── ACCÈS ── */}
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Accès</Text>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Étage</Text>
                <TextInput
                  className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                  placeholder="3"
                  placeholderTextColor="#9CA3AF"
                  value={floor}
                  onChangeText={setFloor}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1 bg-bg-light rounded-input px-4 justify-center">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-text-primary">Ascenseur</Text>
                  <Switch value={hasElevator} onValueChange={setHasElevator}
                    trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }} thumbColor="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Boîte à clé */}
            <View className="bg-bg-light rounded-xl mb-3 overflow-hidden">
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-row items-center gap-3">
                  <Text className="text-xl">🔑</Text>
                  <View>
                    <Text className="text-sm font-medium text-text-primary">Boîte à clé</Text>
                    <Text className="text-xs text-text-secondary">Accès via coffre sécurisé</Text>
                  </View>
                </View>
                <Switch value={hasKeyBox} onValueChange={(v) => { setHasKeyBox(v); if (!v) setKeyBoxCode(''); }}
                  trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }} thumbColor="#FFFFFF" />
              </View>
              {hasKeyBox && (
                <View className="px-4 pb-3 border-t border-border">
                  <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-3 mb-1">Code de la boîte</Text>
                  <TextInput
                    className="h-12 bg-white rounded-input px-4 text-text-primary text-base"
                    placeholder="1234 ou A#56"
                    placeholderTextColor="#9CA3AF"
                    value={keyBoxCode}
                    onChangeText={setKeyBoxCode}
                    autoCapitalize="none"
                    autoFocus
                  />
                  <Text className="text-xs text-text-secondary mt-1">Chiffré AES-256</Text>
                </View>
              )}
            </View>

            {/* Double des clés */}
            <View className="flex-row items-center justify-between bg-bg-light rounded-xl px-4 py-3 mb-4">
              <View className="flex-row items-center gap-3 flex-1 mr-3">
                <Text className="text-xl">🗝</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-text-primary">Double confié à Deltom</Text>
                  <Text className="text-xs text-text-secondary mt-0.5">Conservé en sécurité pour les interventions</Text>
                </View>
              </View>
              <Switch value={hasSparKeys} onValueChange={setHasSparKeys}
                trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }} thumbColor="#FFFFFF" />
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Code d'accès / Interphone</Text>
              <TextInput className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="A1234 ou digicode 5678" placeholderTextColor="#9CA3AF"
                value={accessCode} onChangeText={setAccessCode} autoCapitalize="none" />
              <Text className="text-xs text-text-secondary mt-1">Chiffré AES-256</Text>
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Mot de passe WiFi</Text>
              <TextInput className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="MonWifi2024!" placeholderTextColor="#9CA3AF"
                value={wifiCode} onChangeText={setWifiCode} autoCapitalize="none" autoCorrect={false} />
            </View>

            <View className="mb-8">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Note pour le prestataire</Text>
              <TextInput className="bg-bg-light rounded-input px-4 py-3 text-text-primary text-base"
                placeholder="Ex: Sonner à l'interphone Dupont, boîte n°4..."
                placeholderTextColor="#9CA3AF" value={ownerReminder} onChangeText={setOwnerReminder}
                multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
            </View>

            {/* ── CAPACITÉ ── */}
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Capacité de couchage</Text>
            <View className="bg-bg-light rounded-xl px-4 mb-8">
              <Counter label="Double" desc="Lit deux places" value={doubleBeds} onChange={setDoubleBeds} />
              <Counter label="Simple" desc="Lit une place" value={singleBeds} onChange={setSingleBeds} />
              <Counter label="Canapé-lit" desc="Salon / Studio" value={sofaBeds} onChange={setSofaBeds} />
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-text-primary">Bébé</Text>
                  <Text className="text-xs text-text-secondary">Lit parapluie</Text>
                </View>
                <View className="flex-row items-center gap-4">
                  <TouchableOpacity onPress={() => setBabyBeds(Math.max(0, babyBeds - 1))}
                    className="w-9 h-9 rounded-full border-2 border-border items-center justify-center">
                    <Text className="text-lg font-bold text-text-primary leading-none">−</Text>
                  </TouchableOpacity>
                  <Text className="text-base font-bold text-text-primary w-5 text-center">{babyBeds}</Text>
                  <TouchableOpacity onPress={() => setBabyBeds(babyBeds + 1)}
                    className="w-9 h-9 rounded-full bg-primary items-center justify-center">
                    <Text className="text-lg font-bold text-white leading-none">+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── ÉQUIPEMENTS ── */}
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Équipements</Text>
            <View className="bg-bg-light rounded-xl px-4 mb-8">
              {[
                { label: 'Balcon', emoji: '🌿', value: balcony, set: setBalcony },
                { label: 'Parking', emoji: '🚗', value: parking, set: setParking },
                { label: 'Animaux autorisés', emoji: '🐾', value: petsAllowed, set: setPetsAllowed },
                { label: 'Jacuzzi', emoji: '🛁', value: jacuzzi, set: setJacuzzi },
              ].map((item, i, arr) => (
                <View key={item.label} className={`flex-row items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-lg">{item.emoji}</Text>
                    <Text className="text-sm font-medium text-text-primary">{item.label}</Text>
                  </View>
                  <Switch value={item.value} onValueChange={item.set}
                    trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }} thumbColor="#FFFFFF" />
                </View>
              ))}
            </View>

            {/* ── HORAIRES ── */}
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-4">Horaires</Text>
            <View className="mb-4">
              <TimeSelector label="Heure d'arrivée (check-in)" value={checkinTime} onChange={setCheckinTime} />
            </View>
            <View className="mb-8">
              <TimeSelector label="Heure de départ (check-out)" value={checkoutTime} onChange={setCheckoutTime} />
            </View>

            <TouchableOpacity className="h-14 rounded-btn items-center justify-center bg-primary" onPress={handleContinue}>
              <Text className="text-white text-base font-semibold">Continuer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
