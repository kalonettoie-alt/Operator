import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useProviderMissions } from '../../hooks/use-provider-missions';

const DAYS_HEADER = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const STATUS_DOT: Record<string, string> = { assigned: 'bg-orange-400', accepted: 'bg-blue-400', in_progress: 'bg-primary', completed: 'bg-green-500' };
const STATUS_LABEL: Record<string, string> = { assigned: 'A accepter', accepted: 'Acceptée', in_progress: 'En cours', completed: 'Terminée' };

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getCalendarDays(year: number, month: number) {
  const f = new Date(year, month, 1).getDay(); const o = f===0?6:f-1; const n = new Date(year,month+1,0).getDate();
  const c: (number|null)[] = []; for(let i=0;i<o;i++) c.push(null); for(let i=1;i<=n;i++) c.push(i); return c;
}

export default function ProviderPlanning() {
  const { data: missions = [], isLoading, error, refetch } = useProviderMissions();
  const [refreshing, setRefreshing] = useState(false);
  const today = toDateStr(new Date());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  console.log('[provider-planning] missions:', missions.length, 'isLoading:', isLoading, 'error:', error?.message);

  const days = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const active = useMemo(() => missions.filter((m) => m.status !== 'cancelled'), [missions]);
  const countByDate = useMemo(() => { const m: Record<string,number> = {}; for(const i of active) m[i.scheduled_date]=(m[i.scheduled_date]??0)+1; return m; }, [active]);
  const dayMissions = useMemo(() => active.filter((m) => m.scheduled_date === selectedDate).sort((a,b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time))), [active, selectedDate]);
  const selFR = new Date(selectedDate+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});

  if (isLoading) return <SafeAreaView className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#1A3A3A" /></SafeAreaView>;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{paddingBottom:40}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRefreshing(true);await refetch();setRefreshing(false);}} tintColor="#1A3A3A"/>}>
        <View className="px-6 pt-6 mb-4">
          <Text className="text-2xl font-bold text-text-primary mb-4">Mon planning</Text>
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1)}else setViewMonth(m=>m-1)}} className="w-10 h-10 items-center justify-center"><Text className="text-xl text-text-primary">←</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>{setViewYear(new Date().getFullYear());setViewMonth(new Date().getMonth());setSelectedDate(today)}}><Text className="text-base font-semibold text-text-primary">{MONTHS_FR[viewMonth]} {viewYear}</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1)}else setViewMonth(m=>m+1)}} className="w-10 h-10 items-center justify-center"><Text className="text-xl text-text-primary">→</Text></TouchableOpacity>
          </View>
        </View>
        <View className="px-4 flex-row mb-2">{DAYS_HEADER.map(d=><View key={d} style={{width:'14.28%'}} className="items-center"><Text className="text-[10px] font-medium text-text-secondary">{d}</Text></View>)}</View>
        <View className="px-4 flex-row flex-wrap mb-6">
          {days.map((day,i)=>{
            if(!day) return <View key={`e${i}`} style={{width:'14.28%',height:56}}/>;
            const ds=`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const iT=ds===today,iS=ds===selectedDate,cnt=countByDate[ds]??0;
            return <TouchableOpacity key={i} onPress={()=>setSelectedDate(ds)} style={{width:'14.28%',height:56}} className="items-center justify-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center ${iS?'bg-primary':iT?'bg-primary/10':''}`}>
                <Text className={`text-sm ${iS?'text-white font-bold':iT?'text-primary font-semibold':'text-text-primary'}`}>{day}</Text>
                {cnt>0&&<Text className={`text-[8px] font-bold ${iS?'text-white/80':'text-primary'}`}>+{cnt}</Text>}
              </View>
            </TouchableOpacity>;
          })}
        </View>
        <View className="px-6">
          <Text className="text-sm font-semibold text-text-primary mb-1 capitalize">{selFR}</Text>
          <Text className="text-xs text-text-secondary mb-4">{dayMissions.length} mission{dayMissions.length>1?'s':''}</Text>
          {dayMissions.length===0?<View className="bg-bg-light rounded-xl px-4 py-6 items-center"><Text className="text-sm text-text-secondary">Pas de mission ce jour</Text></View>:
          <View className="gap-3">{dayMissions.map(m=>{const p=m.properties as any;return(
            <TouchableOpacity key={m.id} onPress={()=>router.push(`/(provider)/mission/${m.id}`)} className="bg-white border border-border rounded-xl px-4 py-3">
              <View className="flex-row items-center gap-3 mb-1"><View className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[m.status]??'bg-gray-300'}`}/><Text className="text-xs font-semibold text-text-primary w-12">{String(m.scheduled_time).slice(0,5)}</Text><View className="flex-1"><Text className="text-sm font-medium text-text-primary" numberOfLines={1}>{p?.internal_name}</Text></View></View>
              <View className="flex-row items-center justify-between"><Text className="text-xs text-text-secondary">{p?.city} · {STATUS_LABEL[m.status]??m.status}</Text><Text className="text-xs font-semibold text-primary">{Number(m.provider_payout).toFixed(0)}€</Text></View>
            </TouchableOpacity>);})}</View>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
