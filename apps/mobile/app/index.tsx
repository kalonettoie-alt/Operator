import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/auth-store';

export default function Index() {
  const { role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1A3A3A" />
      </View>
    );
  }

  if (role === 'client') return <Redirect href="/(client)/dashboard" />;
  if (role === 'provider') return <Redirect href="/(provider)/dashboard" />;
  if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;

  return <Redirect href="/(auth)/login" />;
}
