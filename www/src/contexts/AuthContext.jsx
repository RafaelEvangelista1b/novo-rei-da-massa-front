import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext(null);

function getRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getConfirmationRedirectUrl() {
  return window.location.origin + window.location.pathname + '?confirmed=1';
}

export function AuthProvider({ children }) {
  const supabase = window.reiSupabase;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setConfigError('Supabase não está configurado. Confira as variáveis de ambiente e gere o build novamente.');
      setLoading(false);
      return undefined;
    }

    let active = true;
    let eventRevision = 0;
    let completingOAuth = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      eventRevision += 1;
      if (active) setSession(nextSession);
    });
    const initialRevision = eventRevision;
    let appListener;
    let browserListener;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (!url?.startsWith('com.pastel.reimassa://auth/callback')) return;
        completingOAuth = true;
        setAuthError('');
        try {
          const callback = new URL(url);
          const code = callback.searchParams.get('code');
          let result;
          if (code) {
            result = await supabase.auth.exchangeCodeForSession(code);
          } else {
            const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
            const access_token = fragment.get('access_token');
            const refresh_token = fragment.get('refresh_token');
            result = access_token && refresh_token
              ? await supabase.auth.setSession({ access_token, refresh_token })
              : { error: new Error('Resposta OAuth incompleta.') };
          }
          if (result?.error) setAuthError('Não foi possível concluir o acesso com Google. Tente novamente.');
        } catch {
          setAuthError('Não foi possível concluir o acesso com Google. Tente novamente.');
        } finally {
          await Browser.close().catch(() => {});
          setTimeout(() => { completingOAuth = false; }, 1000);
        }
      }).then(listener => {
        if (active) appListener = listener;
        else listener.remove();
      });
      Browser.addListener('browserFinished', () => {
        if (!completingOAuth && active) setAuthError('Autenticação com Google cancelada. Você pode tentar novamente.');
      }).then(listener => {
        if (active) browserListener = listener;
        else listener.remove();
      });
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setConfigError('Não foi possível recuperar a sessão. Entre novamente.');
      if (eventRevision === initialRevision) setSession(data?.session || null);
      setLoading(false);
    }).catch(() => {
      if (active) {
        setConfigError('Não foi possível verificar a sessão. Verifique sua conexão.');
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      appListener?.remove();
      browserListener?.remove();
    };
  }, [supabase]);

  const value = useMemo(() => ({
    user: session?.user || null,
    session,
    loading,
    configError,
    authError,
    clearAuthError: () => setAuthError(''),
    isAdmin: session?.user?.app_metadata?.role === 'admin',
    async signUp({ fullName, email, password }) {
      if (!supabase) return { data: null, error: new Error('Supabase não está configurado.') };
      setAuthError('');
      return supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: getConfirmationRedirectUrl(),
        },
      });
    },
    async signIn({ email, password }) {
      if (!supabase) return { data: null, error: new Error('Supabase não está configurado.') };
      setAuthError('');
      return supabase.auth.signInWithPassword({ email, password });
    },
    async signInWithGoogle() {
      if (!supabase) return { data: null, error: new Error('Supabase não está configurado.') };
      setAuthError('');
      const native = Capacitor.isNativePlatform();
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: native ? 'com.pastel.reimassa://auth/callback' : getRedirectUrl(),
          ...(native ? { skipBrowserRedirect: true } : {}),
        },
      });
      if (!result.error && native && result.data?.url) await Browser.open({ url: result.data.url });
      return result;
    },
    async signOut() {
      if (!supabase) return { error: new Error('Supabase não está configurado.') };
      const result = await supabase.auth.signOut({ scope: 'local' });
      if (!result.error) setSession(null);
      return result;
    },
  }), [supabase, session, loading, configError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  return context;
}
