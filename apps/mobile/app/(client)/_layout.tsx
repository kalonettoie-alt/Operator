import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../../stores/auth-store';

export default function ClientLayout() {
  const { role, isLoading } = useAuthStore();

if (isLoading) return <View className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#1A3A3A" /></View>;
  if (role !== 'client') return <Redirect href="/(auth)/login" />;

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
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="properties" options={{ title: 'Logements' }} />
      <Tabs.Screen name="interventions" options={{ title: 'Interventions' }} />
      <Tabs.Screen name="account" options={{ title: 'Compte' }} />
      <Tabs.Screen name="properties/create/step-1" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="properties/create/step-2" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="properties/create/step-3" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="properties/create/step-4" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="properties/create/step-5" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="properties/create/step-6" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="properties/create/step-7" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
