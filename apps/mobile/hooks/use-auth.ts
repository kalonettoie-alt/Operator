import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function useAuth() {
  const { setLoading } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') return;
        await resolveRole(session?.user?.id);
        setLoading(false);
      }
    );

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);
}

async function resolveRole(userId: string | undefined) {
  const { setUserId, setRole } = useAuthStore.getState();

  if (!userId) {
    setUserId(null);
    setRole(null);
    return;
  }

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  setUserId(userId);
  setRole(data?.role ?? null);
}
