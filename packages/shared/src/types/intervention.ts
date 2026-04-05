import type { InterventionStatus } from '../constants/statuses';

export interface Intervention {
  id: string;
  property_id: string;
  reservation_id: string | null;
  provider_id: string | null;
  client_id: string;
  status: InterventionStatus;
  scheduled_date: string;
  scheduled_time: string;
  price: number;
  provider_payout: number;
  deltom_commission: number;
  checklist: ChecklistItem[];
  owner_reminder: string | null;
  photos_before: string[];
  photos_after: string[];
  photos_damage: string[];
  started_at: string | null;
  completed_at: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
}

export interface InterventionPhoto {
  id: string;
  intervention_id: string;
  url: string;
  type: 'before' | 'after' | 'specific' | 'damage';
  label: string | null;
  created_at: string;
}
