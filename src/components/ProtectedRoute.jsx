import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function SessionLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-orange-50 px-6" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-7 text-center shadow-sm">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-orange-200 border-t-orange-700" aria-hidden="true" />
      <p className="font-semibold text-stone-700">Verificando sua sessão…</p>
    </div>
  </main>;
}

export function ProtectedRoute({ children, onUnauthenticated }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <SessionLoading />;
  if (!user) return onUnauthenticated ? onUnauthenticated() : null;
  if (!isAdmin) return <AccessDenied />;
  return children;
}

export function GuestRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) return <SessionLoading />;
  if (isAdmin) return <main className="mx-auto max-w-xl p-8" role="status">Acesso autorizado. Abrindo painel…</main>;
  return children;
}

export function AccessDenied() {
  const { user, signOut } = useAuth();
  const [error, setError] = React.useState('');
  async function leave() {
    const { error: signOutError } = await signOut();
    if (signOutError) setError('Não foi possível encerrar a sessão. Tente novamente.');
  }
  return <main className="mx-auto max-w-md p-6 sm:p-10">
    <h1 className="text-2xl font-black">Acesso não autorizado</h1>
    <p className="my-4 text-stone-600">Esta conta está autenticada, mas não tem permissão de administrador.</p>
    {user?.email ? <p className="mb-4 text-sm">Conta: {user.email}</p> : null}
    {error ? <p role="alert" className="mb-3 text-red-700">{error}</p> : null}
    <button onClick={leave} className="rounded-xl bg-orange-700 px-5 py-3 font-bold text-white">Sair</button>
  </main>;
}
