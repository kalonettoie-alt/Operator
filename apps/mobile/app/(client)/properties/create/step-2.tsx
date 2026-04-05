import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePropertyCreateStore } from '../../../../stores/property-create-store';
import {
  calculatePrice, getLaundryExtra,
  OPERATOR_FEATURES, CITY_OPERATOR_FEATURES,
  type PropertyType, type OfferType,
} from '../../../../lib/pricing';

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'studio', label: 'Studio' },
  { value: 'T2', label: 'T2' },
  { value: 'T3', label: 'T3' },
  { value: 'T4+', label: 'T4+' },
];

export default function PropertyCreateStep2() {
  const { propertyType, offerType, laundryEnabled, setPropertyType, setOfferType, setLaundry } =
    usePropertyCreateStore();

  const canContinue = propertyType !== null && offerType !== null;

  const price = propertyType && offerType
    ? calculatePrice(propertyType, offerType, laundryEnabled)
    : null;

  const laundryExtra = propertyType ? getLaundryExtra(propertyType) : 0;
  const features = offerType === 'city_operator' ? CITY_OPERATOR_FEATURES : OPERATOR_FEATURES;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pt-6 pb-8">

          <TouchableOpacity onPress={() => router.replace('/(client)/properties/create/step-1')} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          <View className="flex-row gap-1 mb-8">
            <View className="flex-1 h-1 rounded-full bg-primary" />
            <View className="flex-1 h-1 rounded-full bg-primary" />
            <View className="flex-1 h-1 rounded-full bg-border" />
            <View className="flex-1 h-1 rounded-full bg-border" />
            <View className="flex-1 h-1 rounded-full bg-border" />
          </View>

          <Text className="text-2xl font-bold text-text-primary mb-1">Type de logement</Text>
          <Text className="text-sm text-text-secondary mb-6">Étape 2 sur 5 — Offre & tarification</Text>

          {/* Type de logement */}
          <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
            Superficie
          </Text>
          <View className="flex-row gap-2 mb-6">
            {PROPERTY_TYPES.map((t) => {
              const selected = propertyType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setPropertyType(t.value)}
                  className={`flex-1 h-12 rounded-xl border-2 items-center justify-center ${selected ? 'border-primary bg-primary' : 'border-border bg-bg-light'}`}
                >
                  <Text className={`text-base font-bold ${selected ? 'text-white' : 'text-text-primary'}`}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Offre Operator */}
          <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
            Offre
          </Text>

          {/* Card Operator */}
          <TouchableOpacity
            onPress={() => setOfferType('operator')}
            className={`rounded-xl border-2 p-4 mb-3 ${offerType === 'operator' ? 'border-primary' : 'border-border'}`}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${offerType === 'operator' ? 'border-primary' : 'border-border'}`}>
                  {offerType === 'operator' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </View>
                <Text className="text-base font-bold text-text-primary">Operator</Text>
                <View className="bg-bg-light rounded-full px-2 py-0.5">
                  <Text className="text-xs text-text-secondary">Nettoyage</Text>
                </View>
              </View>
              {propertyType && (
                <Text className="text-lg font-bold text-primary">
                  {calculatePrice(propertyType, 'operator', offerType === 'operator' ? laundryEnabled : false)}€
                </Text>
              )}
            </View>

            {OPERATOR_FEATURES.map((f) => (
              <View key={f} className="flex-row items-center gap-2 mb-1">
                <Text className="text-success text-xs">✓</Text>
                <Text className="text-sm text-text-secondary">{f}</Text>
              </View>
            ))}

            {/* Option blanchisserie */}
            {offerType === 'operator' && propertyType && (
              <View className="mt-3 pt-3 border-t border-border flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-medium text-text-primary">
                    + Blanchisserie
                  </Text>
                  <Text className="text-xs text-text-secondary">+{laundryExtra}€ par intervention</Text>
                </View>
                <Switch
                  value={laundryEnabled}
                  onValueChange={setLaundry}
                  trackColor={{ false: '#E5E7EB', true: '#1A3A3A' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Card City Operator */}
          <TouchableOpacity
            onPress={() => setOfferType('city_operator')}
            className={`rounded-xl border-2 p-4 mb-8 ${offerType === 'city_operator' ? 'border-primary' : 'border-border'}`}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${offerType === 'city_operator' ? 'border-primary' : 'border-border'}`}>
                  {offerType === 'city_operator' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </View>
                <Text className="text-base font-bold text-text-primary">City Operator</Text>
                <View className="bg-primary rounded-full px-2 py-0.5">
                  <Text className="text-xs text-white font-medium">Complet</Text>
                </View>
              </View>
              {propertyType && (
                <Text className="text-lg font-bold text-primary">
                  {calculatePrice(propertyType, 'city_operator', true)}€
                </Text>
              )}
            </View>

            {CITY_OPERATOR_FEATURES.map((f) => (
              <View key={f} className="flex-row items-center gap-2 mb-1">
                <Text className="text-success text-xs">✓</Text>
                <Text className="text-sm text-text-secondary">{f}</Text>
              </View>
            ))}

            <View className="mt-2 bg-green-50 rounded-lg px-3 py-2">
              <Text className="text-xs text-green-700 font-medium">Blanchisserie incluse</Text>
            </View>
          </TouchableOpacity>

          {/* Prix final */}
          {price !== null && (
            <View className="bg-primary rounded-xl px-5 py-4 mb-6 flex-row items-center justify-between">
              <Text className="text-white text-sm font-medium">Prix par intervention</Text>
              <Text className="text-white text-2xl font-bold">{price}€</Text>
            </View>
          )}

          <TouchableOpacity
            className={`h-14 rounded-btn items-center justify-center ${canContinue ? 'bg-primary' : 'bg-text-muted'}`}
            onPress={() => router.replace('/(client)/properties/create/step-3')}
            disabled={!canContinue}
          >
            <Text className="text-white text-base font-semibold">Continuer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
