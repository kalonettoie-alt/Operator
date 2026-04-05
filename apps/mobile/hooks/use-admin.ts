import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type TodayMission = {
  id: string;
  scheduled_time: string;
  status: string;
  property_name: string;
  city: string;
  provider_name: string;
  provider_payout: number;
};

export type DashboardKPIs = {
  missions_month: number;
  missions_pending: number;
  new_clients_month: number;
  new_properties_month: number;
  active_subscriptions: number;
  providers_pending: number;
  dispatch_auto_enabled: boolean;
  early_checkin_requests: number;
  today_missions: TodayMission[];
};

export function useAdminDashboardKPIs() {
  return useQuery({
    queryKey: ['admin-dashboard-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_dashboard_kpis' as any);
      if (error) throw error;
      return data as DashboardKPIs;
    },
    staleTime: 1000 * 30,
  });
}

export function useAdminPendingProviders() {
  return useQuery({
    queryKey: ['admin-pending-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, siret, company_name, is_auto_entrepreneur, zones, skills, provider_status, created_at')
        .eq('role', 'provider')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminPendingInterventions() {
  return useQuery({
    queryKey: ['admin-pending-interventions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select('id, scheduled_date, scheduled_time, status, price, provider_payout, property_id, client_id, provider_id, properties(internal_name, city, postal_code), profiles!interventions_client_id_fkey(first_name, last_name), provider:profiles!interventions_provider_id_fkey(first_name, last_name)')
        .in('status', ['pending', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled'])
        .order('scheduled_date', { ascending: false })
        .range(0, 99);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminClients() {
  return useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, sepa_mandate_active, created_at, properties(guest_link_enabled, laundry_enabled, offer_type)')
        .eq('role', 'client')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c) => {
        const props = (c as any).properties ?? [];
        return {
          ...c,
          has_guest_link: props.some((p: any) => p.guest_link_enabled),
          has_laundry: props.some((p: any) => p.laundry_enabled),
          has_linen_rental: props.some((p: any) => p.offer_type === 'city_operator'),
        };
      });
    },
  });
}

export function useAdminClientProperties(clientId: string | null) {
  return useQuery({
    queryKey: ['admin-client-properties', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, internal_name, city, postal_code, property_type, offer_type, is_active, address, base_price, checkin_time, checkout_time, floor, has_elevator, has_key_box, has_spare_keys, guest_link_enabled, photo_report_enabled, laundry_enabled, parking, balcony, jacuzzi, pets_allowed, single_beds, double_beds, sofa_beds, baby_beds, specificities, consumables_kits, owner_reminder, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useAdminProperties() {
  return useQuery({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, internal_name, city, postal_code, property_type, offer_type, is_active, address, client_id, checkin_time, checkout_time, profiles!properties_client_id_fkey(first_name, last_name)')
        .order('created_at', { ascending: false })
        .range(0, 99);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminProviderDocuments(providerId: string | null) {
  return useQuery({
    queryKey: ['admin-provider-documents', providerId],
    queryFn: async () => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from('provider_documents')
        .select('id, type, status, storage_path, rejection_reason, created_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!providerId,
  });
}

export function useAdminProviderStats(providerId: string | null) {
  return useQuery({
    queryKey: ['admin-provider-stats', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const { data, error } = await supabase.rpc('admin_get_provider_stats' as any, { p_provider_id: providerId });
      if (error) throw error;
      return data as {
        total_missions: number;
        completed_missions: number;
        accepted_missions: number;
        refused_missions: number;
        assigned_missions: number;
        acceptance_rate: number;
        avg_duration_minutes: number;
        rating: number;
        rating_count: number;
        total_earnings: number;
        member_since: string;
      };
    },
    enabled: !!providerId,
  });
}

export function useAdminInterventionDetail(id: string | null) {
  return useQuery({
    queryKey: ['admin-intervention-detail', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          id, status, scheduled_date, scheduled_time, price, provider_payout, deltom_commission,
          checklist, owner_reminder, guest_count, baby_bed_requested, early_checkin, late_checkout, same_day_checkin,
          assigned_at, started_at, completed_at, cancelled_at, cancellation_reason, notes,
          property_id, client_id, provider_id,
          properties(internal_name, city, postal_code, address, property_type, offer_type, checkin_time, checkout_time),
          profiles!interventions_client_id_fkey(first_name, last_name, email, phone),
          provider:profiles!interventions_provider_id_fkey(first_name, last_name, email, phone)
        ` as any)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useAdminInterventionPhotos(interventionId: string | null) {
  return useQuery({
    queryKey: ['admin-intervention-photos', interventionId],
    enabled: !!interventionId,
    queryFn: async () => {
      if (!interventionId) return [];
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

export function useAdminActiveProviders() {
  return useQuery({
    queryKey: ['admin-active-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, zones, skills, rating')
        .eq('role', 'provider')
        .eq('provider_status', 'active')
        .order('first_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
