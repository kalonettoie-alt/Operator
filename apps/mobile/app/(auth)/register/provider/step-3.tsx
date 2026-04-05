import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useProviderRegisterStore } from '../../../../stores/provider-register-store';

export default function ProviderRegisterStep3() {
  const { setSiret } = useProviderRegisterStore();
  const [siret, setSiretVal] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isAE, setIsAE] = useState(true);
  const [error, setError] = useState('');

  function handleNext() {
    const cleaned = siret.replace(/\s/g, '');
    if (cleaned.length !== 14 || !/^\d+$/.test(cleaned)) {
      setError('Le SIRET doit contenir 14 chiffres.');
      return;
    }
    setSiret(cleaned, companyName.trim(), isAE);
    router.push('/(auth)/register/provider/step-4');
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-6 pb-8">
            <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
              <Text className="text-2xl text-text-primary">←</Text>
            </TouchableOpacity>

            <View className="flex-row gap-1 mb-8">
              {[1,2,3,4,5].map((i) => (
                <View key={i} className={`flex-1 h-1 rounded-full ${i <= 3 ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </View>

            <Text className="text-2xl font-bold text-text-primary mb-1">Informations professionnelles</Text>
            <Text className="text-sm text-text-secondary mb-8">Étape 3 sur 5 — SIRET</Text>

            {error ? (
              <View className="bg-red-50 border border-danger rounded-input px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Numéro SIRET</Text>
              <TextInput className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="362 521 879 00034" placeholderTextColor="#9CA3AF"
                value={siret} onChangeText={setSiretVal} keyboardType="numeric" maxLength={17} />
              <Text className="text-xs text-text-secondary mt-1">14 chiffres, visible sur votre Kbis ou avis de situation INSEE</Text>
            </View>

            <View className="mb-6">
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Nom commercial (optionnel)</Text>
              <TextInput className="h-12 bg-bg-light rounded-input px-4 text-text-primary text-base"
                placeholder="Mon Entreprise" placeholderTextColor="#9CA3AF"
                value={companyName} onChangeText={setCompanyName} autoCapitalize="words" />
            </View>

            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Statut juridique</Text>
            <View className="gap-3 mb-8">
              {[
                { value: true, label: 'Auto-entrepreneur / Micro-entreprise', desc: 'Régime simplifié, facturation sans TVA' },
                { value: false, label: 'Autre (EURL, SASU, SARL…)', desc: 'Société ou régime réel' },
              ].map((opt) => (
                <TouchableOpacity key={String(opt.value)} onPress={() => setIsAE(opt.value)}
                  className={`rounded-xl border-2 px-4 py-3 flex-row items-start gap-3 ${isAE === opt.value ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <View className={`w-5 h-5 rounded-full border-2 mt-0.5 items-center justify-center ${isAE === opt.value ? 'border-primary' : 'border-border'}`}>
                    {isAE === opt.value && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold ${isAE === opt.value ? 'text-primary' : 'text-text-primary'}`}>{opt.label}</Text>
                    <Text className="text-xs text-text-secondary mt-0.5">{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity className="h-14 bg-primary rounded-btn items-center justify-center" onPress={handleNext}>
              <Text className="text-white text-base font-semibold">Continuer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
