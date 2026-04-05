import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

export default function ClientAccount() {
  const signOut = useAuthStore((s) => s.signOut);

  async function handleSignOut() {
    await supabase.auth.signOut();
    signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6 pt-8">
      <Text className="text-2xl font-bold text-text-primary mb-8">Mon compte</Text>

      <TouchableOpacity
        className="h-14 border border-danger rounded-btn items-center justify-center"
        onPress={handleSignOut}
      >
        <Text className="text-danger text-base font-semibold">Se déconnecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
