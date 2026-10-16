import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, onUnauthenticated }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <main className="mx-auto max-w-xl p-8" role="status">Verificando sessão…</main>;
  if (!user) return onUnauthenticated ? onUnauthenticated() : null;
  if (!isAdmin) return <AccessDenied />;
  return children;
}

export function GuestRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) return <main className="mx-auto max-w-xl p-8" role="status">Verificando sessão…</main>;
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
