import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function useClientProfile() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['client-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone, sepa_mandate_active, provider_status, siret, company_name, is_auto_entrepreneur, zones, skills, rating, rating_count, created_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useClientProperties() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['client-properties', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, internal_name, address, city, property_type, offer_type, base_price, is_active')
        .eq('client_id', userId!)
        .order('created_at', { ascending: false })
        .range(0, 19);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClientActiveInterventions() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['client-active-interventions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select('id, scheduled_date, scheduled_time, status, price, property_id, properties(internal_name, city)')
        .eq('client_id', userId!)
        .in('status', ['pending', 'assigned', 'accepted', 'in_progress', 'completed'])
        .order('scheduled_date', { ascending: true })
        .range(0, 19);
      if (error) throw error;
      return data ?? [];
    },
  });
}
