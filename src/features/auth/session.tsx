import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type SessionState = { session: Session | null; isLoading: boolean };

const SessionContext = createContext<SessionState>({ session: null, isLoading: true });

/** Holds the Supabase auth session and keeps it in sync. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState({ session: data.session, isLoading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, isLoading: false });
      // Never show one person's cached data to the next.
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

/** The signed-in user's id. Only call inside signed-in screens. */
export function useUserId(): string {
  const { session } = useSession();
  if (!session) throw new Error('useUserId called without a session');
  return session.user.id;
}
