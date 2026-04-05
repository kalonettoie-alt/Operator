import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRegisterStore } from '../../../stores/register-store';

export default function RegisterStep1() {
  const { setCredentials } = useRegisterStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  function handleNext() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password || !confirm) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setCredentials(trimmedEmail, password);
    router.push('/(auth)/register/step-2');
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
              <View className="flex-1 h-1 rounded-full bg-bg-light" />
              <View className="flex-1 h-1 rounded-full bg-bg-light" />
            </View>

            <Text className="text-2xl font-bold text-text-primary mb-1">Créer un compte</Text>
            <Text className="text-sm text-text-secondary mb-8">Étape 1 sur 3 — Identifiants</Text>

            {error ? (
              <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Email</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="votre@email.fr"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Mot de passe</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="8 caractères minimum"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View className="mb-8">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Confirmer le mot de passe</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
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
