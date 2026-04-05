import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useClientProfile } from '../../hooks/use-client-dashboard';
import { queryClient } from '../../lib/query-client';

export default function ProviderLayout() {
  const { role, isLoading } = useAuthStore();
  const { isLoading: profileLoading } = useClientProfile();

  if (isLoading || profileLoading) {
    return <View className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#1A3A3A" /></View>;
  }
  if (role !== 'provider') return <Redirect href="/(auth)/login" />;

  function handleTabPress() {
    queryClient.invalidateQueries({ queryKey: ['provider-missions'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['provider-dashboard'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['client-profile'], refetchType: 'active' });
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A3A3A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: { fontSize: 10 },
      }}
      screenListeners={{ tabPress: handleTabPress }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning' }} />
      <Tabs.Screen name="revenues" options={{ title: 'Revenus' }} />
      <Tabs.Screen name="account" options={{ title: 'Compte' }} />
      <Tabs.Screen name="mission/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
