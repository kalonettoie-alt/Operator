import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

const MAX_ATTEMPTS = 5;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (role === 'client') router.replace('/(client)/dashboard');
    else if (role === 'provider') router.replace('/(provider)/dashboard');
    else if (role === 'admin') router.replace('/(admin)/dashboard');
  }, [role]);

  const blocked = attempts >= MAX_ATTEMPTS;

  async function handleLogin() {
    if (blocked) return;
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (authError) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setError('Trop de tentatives. Réinitialisez votre mot de passe.');
      } else {
        setError(`Email ou mot de passe incorrect. (${newAttempts}/${MAX_ATTEMPTS})`);
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-16 pb-8">
            {/* Logo */}
            <View className="mb-12">
              <Text className="text-4xl font-bold text-primary">Deltom</Text>
              <Text className="text-base text-text-secondary mt-1">
                Gestion opérationnelle
              </Text>
            </View>

            {/* Titre */}
            <Text className="text-2xl font-bold text-text-primary mb-8">
              Connexion
            </Text>

            {/* Erreur */}
            {error ? (
              <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View className="mb-4">
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
                editable={!blocked}
              />
            </View>

            {/* Mot de passe */}
            <View className="mb-2">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                Mot de passe
              </Text>
              <TextInput
                className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                editable={!blocked}
              />
            </View>

            {/* Mot de passe oublié */}
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity className="mb-8 self-end">
                <Text className="text-sm text-primary">Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </Link>

            {/* Bouton connexion */}
            <TouchableOpacity
              className={`h-14 rounded-btn items-center justify-center ${blocked || loading ? 'bg-text-muted' : 'bg-primary'}`}
              onPress={handleLogin}
              disabled={blocked || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Se connecter
                </Text>
              )}
            </TouchableOpacity>

            {/* Inscription client */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-text-secondary text-sm">Propriétaire ? </Text>
              <Link href="/(auth)/register/step-1" asChild>
                <TouchableOpacity>
                  <Text className="text-primary text-sm font-semibold">Créer un compte</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Inscription prestataire */}
            <View className="flex-row justify-center mt-3">
              <Text className="text-text-secondary text-sm">Prestataire indépendant ? </Text>
              <Link href="/(auth)/register/provider/step-1" asChild>
                <TouchableOpacity>
                  <Text className="text-primary text-sm font-semibold">Rejoindre Deltom</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
