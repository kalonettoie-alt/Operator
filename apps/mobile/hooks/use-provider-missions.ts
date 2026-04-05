import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function useProviderDashboard() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['provider-dashboard', userId],
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('provider_get_dashboard' as any);
      if (error) throw error;
      return data as {
        missions_today: { id: string; scheduled_time: string; status: string; property_name: string; city: string; provider_payout: number }[];
        missions_week: number;
        pending_accept: number;
        completed_month: number;
        earnings_month: number;
        earnings_total: number;
        rating: number;
        rating_count: number;
        next_mission: { id: string; scheduled_date: string; scheduled_time: string; property_name: string; city: string; status: string } | null;
      };
    },
  });
}

export function useProviderMissions() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['provider-missions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          id, status, scheduled_date, scheduled_time,
          price, provider_payout, checklist, owner_reminder,
          assigned_at, started_at, completed_at,
          property_id,
          properties(internal_name, city, postal_code, address, property_type, offer_type,
            checkout_time, checkin_time,
            profiles!properties_client_id_fkey(first_name, last_name, phone))
        `)
        .eq('provider_id', userId!)
        .in('status', ['assigned', 'accepted', 'in_progress', 'completed', 'cancelled'])
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProviderMissionDetail(id: string) {
  return useQuery({
    queryKey: ['provider-mission', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          id, status, scheduled_date, scheduled_time,
          price, provider_payout, checklist, owner_reminder,
          assigned_at, started_at, completed_at,
          property_id,
          properties(
            id, internal_name, city, postal_code, address,
            checkout_time, checkin_time, latitude, longitude,
            profiles!properties_client_id_fkey(first_name, last_name, phone)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProviderMissionPhotos(interventionId: string) {
  return useQuery({
    queryKey: ['provider-mission-photos', interventionId],
    enabled: !!interventionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_photos')
        .select('id, url, type, label, created_at')
        .eq('intervention_id', interventionId)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}
