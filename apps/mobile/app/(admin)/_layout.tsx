import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../../stores/auth-store';
import { queryClient } from '../../lib/query-client';

export default function AdminLayout() {
  const { role, isLoading } = useAuthStore();
  if (isLoading) return <View className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#1A3A3A" /></View>;
  if (role !== 'admin') return <Redirect href="/(auth)/login" />;

  function handleTabPress() {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-interventions'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['admin-clients'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['admin-properties'], refetchType: 'active' });
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A3A3A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
        tabBarLabelStyle: { fontSize: 10 },
      }}
      screenListeners={{ tabPress: handleTabPress }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="users" options={{ title: 'Utilisateurs' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Planning' }} />
      <Tabs.Screen name="account" options={{ title: 'Compte' }} />
      <Tabs.Screen name="interventions" options={{ href: null }} />
      <Tabs.Screen name="intervention-detail" options={{ href: null }} />
      <Tabs.Screen name="create-mission" options={{ href: null }} />
      <Tabs.Screen name="providers" options={{ href: null }} />
      <Tabs.Screen name="clients" options={{ href: null }} />
      <Tabs.Screen name="properties" options={{ href: null }} />
    </Tabs>
  );
}
