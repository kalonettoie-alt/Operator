import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

export default function AdminAccount() {
  const { signOut, userId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Charger le profil au mount
  useState(() => {
    if (userId) {
      supabase.from('profiles').select('first_name, last_name, email, phone, role, created_at').eq('id', userId).single().then(({ data }) => {
        if (data) setProfile(data);
      });
    }
  });

  async function handleSignOut() {
    await supabase.auth.signOut();
    signOut();
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données personnelles seront supprimées. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation',
              'Dernière chance. Voulez-vous vraiment supprimer votre compte ?',
              [
                { text: 'Non', style: 'cancel' },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    const { error } = await supabase.rpc('delete_own_account' as any);
                    setLoading(false);
                    if (error) {
                      Alert.alert('Erreur', error.message);
                    } else {
                      await supabase.auth.signOut();
                      signOut();
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-text-primary mb-6">Mon compte</Text>

        {/* Profil */}
        <View className="bg-bg-light rounded-xl px-5 py-5 mb-6">
          <Text className="text-lg font-semibold text-text-primary mb-1">
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text className="text-sm text-text-secondary mb-1">{profile?.email}</Text>
          {profile?.phone && <Text className="text-sm text-text-secondary mb-1">{profile.phone}</Text>}
          <View className="flex-row items-center gap-2 mt-2">
            <View className="rounded-full px-3 py-1 bg-primary/10">
              <Text className="text-xs font-medium text-primary">Administrateur</Text>
            </View>
            {memberSince && (
              <Text className="text-xs text-text-secondary">Membre depuis {memberSince}</Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="gap-3">
          <TouchableOpacity onPress={handleSignOut}
            className="h-14 rounded-xl items-center justify-center border border-border">
            <Text className="text-base font-medium text-text-primary">Se déconnecter</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteAccount} disabled={loading}
            className="h-14 rounded-xl items-center justify-center bg-red-50 border border-red-200">
            {loading ? <ActivityIndicator color="#EF4444" /> : (
              <Text className="text-base font-medium text-red-600">Supprimer mon compte</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text className="text-xs text-text-muted text-center mt-10">Deltom v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
