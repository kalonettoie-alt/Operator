// Ce fichier est généré automatiquement par Supabase CLI.
// Commande : npx supabase gen types typescript --project-id ljcfvpooxndqndvklhln > types/database.ts
//
// Mis à jour manuellement pour refléter le schéma créé à l'étape 1.1.
// À régénérer avec la commande ci-dessus après chaque migration.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'admin' | 'client' | 'prestataire';
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'admin' | 'client' | 'prestataire';
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'admin' | 'client' | 'prestataire';
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'admin' | 'client' | 'prestataire';
    };
  };
};

// Types de commodité extraits du schéma
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserRole = Database['public']['Enums']['user_role'];
