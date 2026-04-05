import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRegisterStore } from '../../../stores/register-store';

export default function RegisterStep2() {
  const { setName } = useRegisterStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  function handleNext() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Veuillez renseigner votre prénom et nom.');
      return;
    }
    setName(firstName.trim(), lastName.trim());
    router.push('/(auth)/register/step-3');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-6 pb-8">
            <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
              <Text className="text-2xl text-text-primary">←</Text>
            </TouchableOpacity>

            <View className="flex-row gap-1 mb-8">
              <View className="flex-1 h-1 rounded-full bg-primary" />
              <View className="flex-1 h-1 rounded-full bg-primary" />
              <View className="flex-1 h-1 rounded-full bg-bg-light" />
            </View>

            <Text className="text-2xl font-bold text-text-primary mb-1">Votre identité</Text>
            <Text className="text-sm text-text-secondary mb-8">Étape 2 sur 3 — Prénom & Nom</Text>

            {error ? (
              <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Prénom</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="Jean"
                placeholderTextColor="#9CA3AF"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                autoFocus
              />
            </View>

            <View className="mb-8">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Nom</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="Dupont"
                placeholderTextColor="#9CA3AF"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
              />
            </View>

            <TouchableOpacity
              className="h-14 bg-primary rounded-btn items-center justify-center"
              onPress={handleNext}
            >
              <Text className="text-white text-base font-semibold">Continuer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
