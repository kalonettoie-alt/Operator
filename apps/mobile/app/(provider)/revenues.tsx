import { useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProviderMissions } from '../../hooks/use-provider-missions';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
function formatDate(d: string) { return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'}); }

export default function ProviderRevenues() {
  const { data: missions = [], isLoading, error, refetch } = useProviderMissions();
  const [refreshing, setRefreshing] = useState(false);

  console.log('[provider-revenues] missions:', missions.length, 'isLoading:', isLoading, 'error:', error?.message);

  const completed = useMemo(() => missions.filter(m=>m.status==='completed').sort((a,b)=>b.scheduled_date.localeCompare(a.scheduled_date)), [missions]);
  const byMonth = useMemo(() => {
    const map: Record<string, typeof completed> = {};
    for(const m of completed){const k=m.scheduled_date.slice(0,7);if(!map[k])map[k]=[];map[k].push(m);}
    return Object.entries(map).sort(([a],[b])=>b.localeCompare(a));
  }, [completed]);
  const totalAll = completed.reduce((s,m)=>s+Number(m.provider_payout),0);
  const cm = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const thisMonth = completed.filter(m=>m.scheduled_date.startsWith(cm));
  const totalMonth = thisMonth.reduce((s,m)=>s+Number(m.provider_payout),0);

  if (isLoading) return <SafeAreaView className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#1A3A3A"/></SafeAreaView>;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{paddingHorizontal:24,paddingTop:24,paddingBottom:40}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRefreshing(true);await refetch();setRefreshing(false);}} tintColor="#1A3A3A"/>}>
        <Text className="text-2xl font-bold text-text-primary mb-6">Mes revenus</Text>
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-primary/5 rounded-xl px-4 py-4">
            <Text className="text-2xl font-bold text-primary">{totalMonth.toFixed(0)}€</Text>
            <Text className="text-[10px] text-text-secondary mt-0.5">Ce mois</Text>
            <Text className="text-[10px] text-text-secondary">{thisMonth.length} mission{thisMonth.length>1?'s':''}</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-xl px-4 py-4">
            <Text className="text-2xl font-bold text-green-700">{totalAll.toFixed(0)}€</Text>
            <Text className="text-[10px] text-text-secondary mt-0.5">Total</Text>
            <Text className="text-[10px] text-text-secondary">{completed.length} mission{completed.length>1?'s':''}</Text>
          </View>
        </View>
        {completed.length===0?<View className="bg-bg-light rounded-xl px-4 py-6 items-center"><Text className="text-sm text-text-secondary">Aucune mission terminée</Text></View>:
        byMonth.map(([mk,mm])=>{const[y,m]=mk.split('-');const t=mm.reduce((s,i)=>s+Number(i.provider_payout),0);return(
          <View key={mk} className="mb-6">
            <View className="flex-row items-center justify-between mb-3"><Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{MONTHS_FR[parseInt(m,10)-1]} {y}</Text><Text className="text-xs font-bold text-primary">{t.toFixed(0)}€</Text></View>
            <View className="gap-2">{mm.map(mi=>{const p=mi.properties as any;return(
              <View key={mi.id} className="bg-bg-light rounded-xl px-4 py-3 flex-row items-center justify-between">
                <View className="flex-1 mr-3"><Text className="text-sm font-medium text-text-primary" numberOfLines={1}>{p?.internal_name}</Text><Text className="text-xs text-text-secondary">{formatDate(mi.scheduled_date)} · {p?.city}</Text></View>
                <Text className="text-sm font-bold text-primary">{Number(mi.provider_payout).toFixed(2).replace('.',',')}€</Text>
              </View>);})}</View>
          </View>);})}
      </ScrollView>
    </SafeAreaView>
  );
}
