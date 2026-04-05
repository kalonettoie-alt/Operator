import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email.trim()) {
      setError('Veuillez entrer votre email.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'deltom://reset-password' }
    );

    setLoading(false);

    if (resetError) {
      setError('Une erreur est survenue. Réessayez.');
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6 pt-16">
        <View className="items-center mt-16">
          <Text className="text-5xl mb-6">📧</Text>
          <Text className="text-2xl font-bold text-text-primary text-center mb-3">
            Email envoyé
          </Text>
          <Text className="text-base text-text-secondary text-center mb-8">
            Vérifiez votre boîte mail et suivez le lien pour réinitialiser votre mot de passe.
          </Text>
          <TouchableOpacity
            className="h-14 bg-primary rounded-btn items-center justify-center w-full"
            onPress={() => router.back()}
          >
            <Text className="text-white text-base font-semibold">Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-6 pb-8">
          {/* Retour */}
          <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
            <Text className="text-2xl text-text-primary">←</Text>
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-text-primary mb-2">
            Mot de passe oublié
          </Text>
          <Text className="text-base text-text-secondary mb-8">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </Text>

          {error ? (
            <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="mb-8">
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
              Email
            </Text>
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

          <TouchableOpacity
            className={`h-14 rounded-btn items-center justify-center ${loading ? 'bg-text-muted' : 'bg-primary'}`}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Envoyer le lien
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
