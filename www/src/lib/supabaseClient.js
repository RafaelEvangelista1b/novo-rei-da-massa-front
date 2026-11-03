import { createClient } from '@supabase/supabase-js';
import { capacitorSessionStorage } from '../services/sessionStorage';

function initializeSupabase() {
  const config = window.REI_SUPABASE_CONFIG || {};

  if (!config.url || !config.anonKey) {
    window.reiSupabase = null;
    console.info('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.');
    return;
  }

  try {
    window.reiSupabase = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: capacitorSessionStorage,
        storageKey: 'supabase_session',
      },
    });
  } catch (error) {
    window.REI_SUPABASE_INIT_ERROR = error;
    window.reiSupabase = null;
    console.error('Configuracao Supabase invalida:', error);
  }
}

initializeSupabase();
