import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAdminPendingInterventions } from '../../hooks/use-admin';

type FilterType = 'all' | 'property' | 'provider' | 'client';
type FilterValue = { type: FilterType; id: string | null; label: string };

const DAYS_HEADER = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const STATUS_DOT: Record<string, string> = {
  pending:     'bg-orange-400',
  assigned:    'bg-blue-400',
  accepted:    'bg-indigo-400',
  in_progress: 'bg-primary',
  completed:   'bg-green-500',
  cancelled:   'bg-gray-300',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Sans prestataire',
  assigned: 'Assignée',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  return cells;
}

export default function AdminCalendar() {
  const { data: interventions = [], isLoading, refetch } = useAdminPendingInterventions();
  const [refreshing, setRefreshing] = useState(false);
  const today = toDateStr(new Date());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [filter, setFilter] = useState<FilterValue>({ type: 'all', id: null, label: 'Tout' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterType>('all');

  const days = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Listes uniques pour les filtres
  const uniqueProperties = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of interventions) {
      const prop = i.properties as any;
      if (prop?.internal_name) map.set(i.property_id, prop.internal_name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [interventions]);

  const uniqueProviders = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of interventions) {
      if (i.provider_id) {
        const prov = (i as any).provider as any;
        const name = prov?.first_name ? `${prov.first_name} ${prov.last_name}` : i.provider_id.slice(0, 8);
        map.set(i.provider_id, name);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [interventions]);

  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of interventions) {
      const client = (i as any).profiles as any;
      if (client?.first_name) map.set(i.client_id, `${client.first_name} ${client.last_name}`);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [interventions]);

  // Exclure les annulées + appliquer le filtre
  const activeMissions = useMemo(() => {
    let list = interventions.filter((i) => i.status !== 'cancelled');
    if (filter.type === 'property' && filter.id) list = list.filter((i) => i.property_id === filter.id);
    else if (filter.type === 'provider' && filter.id) list = list.filter((i) => i.provider_id === filter.id);
    else if (filter.type === 'client' && filter.id) list = list.filter((i) => i.client_id === filter.id);
    return list;
  }, [interventions, filter]);

  // Compteur par date
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of activeMissions) {
      map[i.scheduled_date] = (map[i.scheduled_date] ?? 0) + 1;
    }
    return map;
  }, [activeMissions]);

  // Missions du jour sélectionné
  const dayMissions = useMemo(() => {
    return activeMissions
      .filter((i) => i.scheduled_date === selectedDate)
      .sort((a, b) => (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''));
  }, [activeMissions, selectedDate]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const selectedDateFR = new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor="#1A3A3A" />}
      >
        {/* Header */}
        <View className="px-6 pt-6 flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-text-primary">Planning</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/interventions')}
            className="px-4 py-2 rounded-lg border border-primary">
            <Text className="text-xs font-medium text-primary">Toutes les missions</Text>
          </TouchableOpacity>
        </View>

        {/* Filtre actif */}
        <View className="px-6 flex-row items-center gap-2 mb-4">
          <TouchableOpacity onPress={() => setShowFilterModal(true)}
            className={`flex-row items-center gap-2 px-4 py-2 rounded-lg border ${filter.type !== 'all' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <Text className={`text-xs font-medium ${filter.type !== 'all' ? 'text-primary' : 'text-text-secondary'}`}>
              {filter.type === 'all' ? 'Filtrer par...' : filter.label}
            </Text>
            <Text className="text-[10px] text-text-secondary">▼</Text>
          </TouchableOpacity>
          {filter.type !== 'all' && (
            <TouchableOpacity onPress={() => setFilter({ type: 'all', id: null, label: 'Tout' })}
              className="px-3 py-2 rounded-lg bg-red-50 border border-red-200">
              <Text className="text-xs text-red-600 font-medium">Effacer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation mois */}
        <View className="px-6 flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={prevMonth} className="w-10 h-10 items-center justify-center">
            <Text className="text-xl text-text-primary">←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setViewYear(new Date().getFullYear()); setViewMonth(new Date().getMonth()); setSelectedDate(today); }}>
            <Text className="text-base font-semibold text-text-primary">{MONTHS_FR[viewMonth]} {viewYear}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} className="w-10 h-10 items-center justify-center">
            <Text className="text-xl text-text-primary">→</Text>
          </TouchableOpacity>
        </View>

        {/* Jours header */}
        <View className="px-4 flex-row mb-2">
          {DAYS_HEADER.map((d) => (
            <View key={d} style={{ width: '14.28%' }} className="items-center">
              <Text className="text-[10px] font-medium text-text-secondary">{d}</Text>
            </View>
          ))}
        </View>

        {/* Grille calendrier */}
        <View className="px-4 flex-row flex-wrap mb-6">
          {days.map((day, i) => {
            if (day === null) return <View key={`e${i}`} style={{ width: '14.28%', height: 56 }} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const count = countByDate[dateStr] ?? 0;

            return (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedDate(dateStr)}
                style={{ width: '14.28%', height: 56 }}
                className="items-center justify-center">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isSelected ? 'bg-primary' : isToday ? 'bg-primary/10' : ''}`}>
                  <Text className={`text-sm ${isSelected ? 'text-white font-bold' : isToday ? 'text-primary font-semibold' : 'text-text-primary'}`}>{day}</Text>
                  {count > 0 && (
                    <Text className={`text-[8px] font-bold ${isSelected ? 'text-white/80' : 'text-primary'}`}>+{count}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Missions du jour sélectionné */}
        <View className="px-6">
          <Text className="text-sm font-semibold text-text-primary mb-1 capitalize">{selectedDateFR}</Text>
          <Text className="text-xs text-text-secondary mb-4">
            {dayMissions.length} intervention{dayMissions.length > 1 ? 's' : ''}
          </Text>

          {dayMissions.length === 0 ? (
            <View className="bg-bg-light rounded-xl px-4 py-6 items-center">
              <Text className="text-sm text-text-secondary">Aucune intervention ce jour</Text>
            </View>
          ) : (
            <View className="gap-3">
              {dayMissions.map((m) => {
                const prop = m.properties as any;
                const dot = STATUS_DOT[m.status] ?? 'bg-gray-300';
                const label = STATUS_LABEL[m.status] ?? m.status;
                return (
                  <TouchableOpacity key={m.id} onPress={() => router.push(`/(admin)/intervention-detail?id=${m.id}`)}
                    className="bg-white border border-border rounded-xl px-4 py-3">
                    <View className="flex-row items-center gap-3 mb-2">
                      <View className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                      <Text className="text-xs font-semibold text-text-primary w-12">{m.scheduled_time?.slice(0, 5)}</Text>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>{prop?.internal_name}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs text-text-secondary">{prop?.city} · {label}</Text>
                      <Text className="text-xs font-semibold text-primary">{Number(m.provider_payout ?? 0).toFixed(0)}€</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal filtre */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10" style={{ maxHeight: '70%' }}>
            <View className="w-10 h-1 rounded-full bg-border self-center mb-4" />
            <Text className="text-lg font-bold text-text-primary mb-4">Filtrer le planning</Text>

            {/* Tabs */}
            <View className="flex-row bg-bg-light rounded-xl p-1 mb-4">
              {([
                { key: 'property' as FilterType, label: 'Logement' },
                { key: 'provider' as FilterType, label: 'Prestataire' },
                { key: 'client' as FilterType, label: 'Client' },
              ]).map((t) => (
                <TouchableOpacity key={t.key} onPress={() => setFilterTab(t.key)}
                  className={`flex-1 py-2 rounded-lg items-center ${filterTab === t.key ? 'bg-white' : ''}`}
                  style={filterTab === t.key ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}>
                  <Text className={`text-xs font-medium ${filterTab === t.key ? 'text-primary' : 'text-text-secondary'}`}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              <View style={{ gap: 8 }}>
                {/* Tout */}
                <TouchableOpacity
                  onPress={() => { setFilter({ type: 'all', id: null, label: 'Tout' }); setShowFilterModal(false); }}
                  className={`border rounded-xl px-4 py-3 ${filter.type === 'all' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <Text className={`text-sm font-medium ${filter.type === 'all' ? 'text-primary' : 'text-text-secondary'}`}>Tout afficher</Text>
                </TouchableOpacity>

                {/* Logements */}
                {filterTab === 'property' && uniqueProperties.map((p) => (
                  <TouchableOpacity key={p.id}
                    onPress={() => { setFilter({ type: 'property', id: p.id, label: p.name }); setShowFilterModal(false); }}
                    className={`border rounded-xl px-4 py-3 ${filter.type === 'property' && filter.id === p.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <Text className={`text-sm font-medium ${filter.type === 'property' && filter.id === p.id ? 'text-primary' : 'text-text-primary'}`}>{p.name}</Text>
                  </TouchableOpacity>
                ))}

                {/* Prestataires */}
                {filterTab === 'provider' && uniqueProviders.map((p) => (
                  <TouchableOpacity key={p.id}
                    onPress={() => { setFilter({ type: 'provider', id: p.id, label: p.name }); setShowFilterModal(false); }}
                    className={`border rounded-xl px-4 py-3 ${filter.type === 'provider' && filter.id === p.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <Text className={`text-sm font-medium ${filter.type === 'provider' && filter.id === p.id ? 'text-primary' : 'text-text-primary'}`}>{p.name}</Text>
                  </TouchableOpacity>
                ))}

                {/* Clients */}
                {filterTab === 'client' && uniqueClients.map((c) => (
                  <TouchableOpacity key={c.id}
                    onPress={() => { setFilter({ type: 'client', id: c.id, label: c.name }); setShowFilterModal(false); }}
                    className={`border rounded-xl px-4 py-3 ${filter.type === 'client' && filter.id === c.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <Text className={`text-sm font-medium ${filter.type === 'client' && filter.id === c.id ? 'text-primary' : 'text-text-primary'}`}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity className="h-12 items-center justify-center mt-3" onPress={() => setShowFilterModal(false)}>
              <Text className="text-sm text-text-secondary">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
