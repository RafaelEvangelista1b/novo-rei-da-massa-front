(function initializeSupabase() {
  const config = window.REI_SUPABASE_CONFIG || {};

  if (!config.url || !config.anonKey) {
    window.reiSupabase = null;
    console.info('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.');
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    window.REI_SUPABASE_INIT_ERROR = new Error('SDK do Supabase nao foi carregado.');
    window.reiSupabase = null;
    console.error(window.REI_SUPABASE_INIT_ERROR.message);
    return;
  }

  try {
    window.reiSupabase = window.supabase.createClient(config.url, config.anonKey);
  } catch (error) {
    window.REI_SUPABASE_INIT_ERROR = error;
    window.reiSupabase = null;
    console.error('Configuracao Supabase invalida:', error);
  }
})();
