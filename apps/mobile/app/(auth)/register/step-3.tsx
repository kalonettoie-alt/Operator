import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useRegisterStore } from '../../../stores/register-store';

export default function RegisterStep3() {
  const { email, password, firstName, lastName, reset } = useRegisterStore();
  const [phone, setPhoneLocal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createAccount(phoneValue: string) {
    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phoneValue || null,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setError('Un compte existe déjà avec cet email.');
      } else if (signUpError.message.toLowerCase().includes('rate limit')) {
        setError('Trop de tentatives. Attendez quelques minutes et réessayez.');
      } else {
        setError(signUpError.message);
      }
      return;
    }

    reset();

    // Session disponible = confirmation email désactivée → dashboard direct
    if (data.session) {
      router.replace('/(client)/dashboard');
    } else {
      router.replace('/(auth)/register/step-4');
    }
  }

  async function handleFinish() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Numéro invalide — au moins 10 chiffres requis.');
      return;
    }
    await createAccount(phone.trim());
  }

  async function handleSkip() {
    await createAccount('');
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
              <View className="flex-1 h-1 rounded-full bg-primary" />
            </View>

            <Text className="text-2xl font-bold text-text-primary mb-1">Votre téléphone</Text>
            <Text className="text-sm text-text-secondary mb-8">Étape 3 sur 3 — Contact</Text>

            {error ? (
              <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-8">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Téléphone</Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="06 12 34 56 78"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhoneLocal}
                keyboardType="phone-pad"
                autoComplete="tel"
                autoFocus
              />
            </View>

            <TouchableOpacity
              className={`h-14 rounded-btn items-center justify-center mb-3 ${loading ? 'bg-text-muted' : 'bg-primary'}`}
              onPress={handleFinish}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">Terminer l'inscription</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="h-12 items-center justify-center"
              onPress={handleSkip}
              disabled={loading}
            >
              <Text className="text-sm text-text-secondary">Passer cette étape</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
