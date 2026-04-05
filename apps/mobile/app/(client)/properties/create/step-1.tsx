import { useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { usePropertyCreateStore } from '../../../../stores/property-create-store';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!;

export default function PropertyCreateStep1() {
  const { setAddress } = usePropertyCreateStore();
  const ref = useRef<any>(null);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-6">
          {/* Retour */}
          <TouchableOpacity onPress={() => router.replace('/(client)/properties')} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          {/* Barre de progression */}
          <View className="flex-row gap-1 mb-8">
            <View className="flex-1 h-1 rounded-full bg-primary" />
            <View className="flex-1 h-1 rounded-full bg-border" />
            <View className="flex-1 h-1 rounded-full bg-border" />
            <View className="flex-1 h-1 rounded-full bg-border" />
            <View className="flex-1 h-1 rounded-full bg-border" />
          </View>

          <Text className="text-2xl font-bold text-text-primary mb-1">Adresse du logement</Text>
          <Text className="text-sm text-text-secondary mb-8">Étape 1 sur 5 — Localisation</Text>

          <GooglePlacesAutocomplete
            ref={ref}
            placeholder="12 Rue de Rivoli, Paris..."
            fetchDetails
            onPress={(_data, details) => {
              if (!details) return;
              const { lat, lng } = details.geometry.location;
              const components = details.address_components;
              const city = components.find((c) => c.types.includes('locality'))?.long_name ?? '';
              const postalCode = components.find((c) => c.types.includes('postal_code'))?.long_name ?? '';
              setAddress(details.formatted_address, city, postalCode, lat, lng);
              router.replace('/(client)/properties/create/step-2');
            }}
            query={{
              key: GOOGLE_KEY,
              language: 'fr',
              components: 'country:fr',
            }}
            debounce={300}
            styles={{
              textInput: {
                height: 48,
                backgroundColor: '#F5F5F5',
                borderRadius: 10,
                paddingHorizontal: 16,
                fontSize: 15,
                color: '#1A1A1A',
              },
              listView: {
                backgroundColor: '#FFFFFF',
                borderRadius: 10,
                marginTop: 4,
              },
              row: {
                paddingHorizontal: 16,
                paddingVertical: 12,
              },
              description: {
                fontSize: 14,
                color: '#1A1A1A',
              },
              poweredContainer: { display: 'none' },
            }}
            enablePoweredByContainer={false}
            keepResultsAfterBlur={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
