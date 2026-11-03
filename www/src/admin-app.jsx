import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccessDenied, GuestRoute, ProtectedRoute, SessionLoading } from './components/ProtectedRoute';

const client = window.reiSupabase;
const config = window.REI_SUPABASE_CONFIG || {};
const PRODUCTS = config.productsTable || 'produtos';
const CATEGORIES = config.categoriesTable || 'categorias';
const categoryColumn = config.productCategoryColumn || 'categoria_id';

function AuthApp() {
  const auth = useAuth();
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get('view') === 'signup' ? 'signup' : 'login');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (view === 'signup') params.set('view', 'signup');
    else params.delete('view');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [view]);

  useEffect(() => {
    if (!auth.isAdmin) return;
    const next = sessionStorage.getItem('rei.auth.returnTo');
    if (!next) return;
    sessionStorage.removeItem('rei.auth.returnTo');
    if (next === 'cozinha.html') window.location.replace('./cozinha.html');
  }, [auth.isAdmin]);

  if (auth.configError && !client) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-black">Rei da Massa</h1><Alert text={auth.configError} /></main>;
  if (auth.loading) return <SessionLoading />;
  if (auth.user) {
    return <ProtectedRoute onUnauthenticated={() => <GuestRoute><AuthPage view={view} setView={setView} /></GuestRoute>}><CatalogAdmin /></ProtectedRoute>;
  }
  return <GuestRoute><AuthPage view={view} setView={setView} /></GuestRoute>;
}

function AuthPage({ view, setView }) {
  const { configError } = useAuth();
  return <main className="mx-auto max-w-md px-5 py-8 sm:py-12">
    <a href="./index.html" className="text-sm font-semibold text-orange-800 underline">← Voltar ao cardápio</a>
    <div className="my-6 text-center">
      <img src="./assets/images/logo64.png" alt="" className="mx-auto mb-3 h-16 w-16 rounded-full" />
      <h1 className="text-3xl font-black text-stone-900">{view === 'login' ? 'Acesso da gerência' : 'Criar conta'}</h1>
      <p className="mt-2 text-stone-600">Rei da Massa</p>
    </div>
    {configError ? <Alert text={configError} /> : null}
    {view === 'signup' ? <SignUpForm setView={setView} /> : <LoginForm setView={setView} />}
    <p className="mt-6 text-center text-xs leading-5 text-stone-500">O cadastro cria uma conta comum. O acesso administrativo exige autorização de um administrador do Supabase.</p>
  </main>;
}

function LoginForm({ setView }) {
  const { signIn, signInWithGoogle, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(() => new URLSearchParams(window.location.search).get('confirmed') === '1' ? 'E-mail confirmado. Entre para continuar.' : '');

  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice(''); clearAuthError();
    try {
      const { error: authError } = await signIn({ email: email.trim(), password });
      if (authError) setError('Não foi possível entrar. Confira o e-mail e a senha e tente novamente.');
    } catch { setError('Falha de conexão ao entrar. Verifique a internet e tente novamente.'); }
    finally { setBusy(false); }
  }

  async function google() {
    if (busy) return;
    setBusy(true); setError(''); clearAuthError();
    try { const { error: authError } = await signInWithGoogle(); if (authError) setError('Não foi possível iniciar o acesso com Google. Tente novamente.'); }
    catch { setError('Falha de conexão ao iniciar o acesso com Google.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
    <form onSubmit={submit} className="space-y-4">
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
      <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={setPassword} required />
      <Alert text={error || authError} />
      {notice ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p> : null}
      <button disabled={busy} className="w-full rounded-xl bg-orange-700 p-3 font-bold text-white hover:bg-orange-800 disabled:opacity-50">{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
    <div className="my-5 flex items-center gap-3 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200" />ou<span className="h-px flex-1 bg-stone-200" /></div>
    <button type="button" onClick={google} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white p-3 font-semibold hover:bg-stone-50 disabled:opacity-50"><GoogleIcon />Entrar com Google</button>
    <p className="mt-5 text-center text-sm text-stone-600">Ainda não tem uma conta? <button onClick={() => setView('signup')} className="font-bold text-orange-800 underline">Cadastre-se</button></p>
  </section>;
}

function SignUpForm({ setView }) {
  const { signUp, signInWithGoogle, authError, clearAuthError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setError(''); setNotice(''); clearAuthError();
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (password.length < 8) { setError('Use uma senha com pelo menos 8 caracteres.'); return; }
    setBusy(true);
    try {
      const { data, error: authError } = await signUp({ fullName: fullName.trim(), email: email.trim(), password });
      if (authError) setError(authError.message || 'Não foi possível criar a conta.');
      else if (data?.session) setNotice('Conta criada. Se precisar de acesso ao painel, peça a um administrador para autorizar sua conta.');
      else setNotice('Cadastro recebido. Verifique seu e-mail para confirmar a conta antes de entrar.');
    } catch { setError('Falha de conexão ao criar a conta. Verifique a internet e tente novamente.'); }
    finally { setBusy(false); }
  }

  async function google() {
    if (busy) return;
    setBusy(true); setError(''); clearAuthError();
    try { const { error: authError } = await signInWithGoogle(); if (authError) setError('Não foi possível iniciar o cadastro com Google.'); }
    catch { setError('Falha de conexão ao iniciar o cadastro com Google.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome completo" autoComplete="name" value={fullName} onChange={setFullName} required />
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
      <Field label="Senha (mínimo 8 caracteres)" type="password" autoComplete="new-password" value={password} onChange={setPassword} minLength={8} required />
      <Field label="Confirme a senha" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} minLength={8} required />
      <Alert text={error || authError} />
      {notice ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p> : null}
      <button disabled={busy} className="w-full rounded-xl bg-orange-700 p-3 font-bold text-white hover:bg-orange-800 disabled:opacity-50">{busy ? 'Criando conta…' : 'Criar conta'}</button>
    </form>
    <div className="my-5 flex items-center gap-3 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200" />ou<span className="h-px flex-1 bg-stone-200" /></div>
    <button type="button" onClick={google} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white p-3 font-semibold hover:bg-stone-50 disabled:opacity-50"><GoogleIcon />Cadastrar com Google</button>
    <p className="mt-5 text-center text-sm text-stone-600">Já tem uma conta? <button onClick={() => setView('login')} className="font-bold text-orange-800 underline">Voltar ao login</button></p>
  </section>;
}

function CatalogAdmin() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState('produtos');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);

  async function loadAll(showSpinner = true) {
    if (!client) return;
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const [p, c] = await Promise.all([client.from(PRODUCTS).select('*').order('id'), client.from(CATEGORIES).select('*').order('id')]);
      if (p.error || c.error) setError(`Falha ao carregar dados: ${(p.error || c.error).message}`);
      else { setProducts(p.data || []); setCategories(c.data || []); }
    } catch { setError('Falha de conexão ao carregar o cardápio.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadAll();
    const channel = client.channel('admin-catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: PRODUCTS }, () => loadAll(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: CATEGORIES }, () => loadAll(false))
      .subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Sincronização ao vivo indisponível. Atualize a lista para buscar novamente.'); });
    return () => { client.removeChannel(channel); };
  }, []);

  async function save(event) {
    event.preventDefault(); if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const isProduct = tab === 'produtos';
    const payload = isProduct
      ? { nome: String(form.get('nome')).trim(), preco: Number(form.get('preco')), descricao: String(form.get('descricao') || '').trim(), imagem: String(form.get('imagem') || '').trim() || 'logo.png', [products.some(p => Object.prototype.hasOwnProperty.call(p, 'categoria_id')) ? 'categoria_id' : categoryColumn]: form.get('categoria') }
      : { nome: String(form.get('nome')).trim() };
    setBusy(true); setError(''); setNotice('');
    try {
      const table = isProduct ? PRODUCTS : CATEGORIES;
      const result = editing ? await client.from(table).update(payload).eq('id', editing.id).select('id') : await client.from(table).insert(payload).select('id');
      if (result.error) setError(`Não foi possível salvar: ${result.error.message}`);
      else if (!result.data?.length) setError('Nenhum registro foi alterado. Confira a política RLS e a autorização administrativa.');
      else { setNotice(`${isProduct ? 'Produto' : 'Categoria'} salvo.`); setEditing(null); formElement.reset(); await loadAll(false); }
    } catch { setError('Falha de conexão ao salvar. Tente novamente.'); }
    finally { setBusy(false); }
  }

  async function removeRecord(row) {
    const type = tab === 'produtos' ? 'produto' : 'categoria';
    if (!window.confirm(`Excluir ${type} “${row.nome}”?`) || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: deleteError } = await client.from(tab === 'produtos' ? PRODUCTS : CATEGORIES).delete().eq('id', row.id).select('id');
      if (deleteError) setError(`Não foi possível excluir: ${deleteError.message}`);
      else if (!data?.length) setError('Nenhum registro foi excluído. Confira a política RLS.');
      else { setNotice(`${type[0].toUpperCase()}${type.slice(1)} excluído.`); await loadAll(false); }
    } catch { setError('Falha de conexão ao excluir. Tente novamente.'); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try { const { error: signOutError } = await signOut(); if (signOutError) setError('Não foi possível encerrar a sessão. Tente novamente.'); }
    catch { setError('Falha de conexão ao encerrar a sessão.'); }
    finally { setBusy(false); }
  }

  const rows = tab === 'produtos' ? products : categories;
  const profile = user?.user_metadata || {};
  const displayName = profile.full_name || profile.name || user?.email || 'Administrador';
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><a className="text-sm text-orange-800 underline" href="./index.html">← Voltar ao cardápio</a><h1 className="mt-2 text-3xl font-black">Gerenciar cardápio</h1><a className="text-sm text-orange-800 underline" href="./cozinha.html">Abrir painel da cozinha</a></div>
      <div className="flex items-center gap-3">
        <img src={profile.avatar_url || './assets/images/logo64.png'} alt="" className="h-10 w-10 rounded-full object-cover" onError={event => { event.currentTarget.src = './assets/images/logo64.png'; }} />
        <div className="hidden text-sm sm:block"><strong>{displayName}</strong><div className="text-stone-600">{user?.email}</div></div>
        <button disabled={busy} onClick={logout} className="rounded-lg border px-4 py-2 disabled:opacity-50">Sair</button>
      </div>
    </header>
    <nav className="mb-5 flex gap-2">{['produtos', 'categorias'].map(key => <button key={key} onClick={() => { setTab(key); setEditing(null); setError(''); setNotice(''); }} className={`rounded-full px-5 py-2 font-bold ${tab === key ? 'bg-orange-700 text-white' : 'bg-white'}`}>{key === 'produtos' ? 'Produtos' : 'Categorias'}</button>)}</nav>
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
      <form key={`${tab}-${editing?.id || 'new'}`} onSubmit={save} className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow">
        <h2 className="text-xl font-bold">{editing ? 'Editar' : 'Cadastrar'} {tab === 'produtos' ? 'produto' : 'categoria'}</h2>
        <Field label="Nome" name="nome" defaultValue={editing?.nome || ''} required />
        {tab === 'produtos' ? <>
          <label className="block text-sm font-semibold">Categoria<select name="categoria" required defaultValue={editing ? String(editing.categoriaId ?? editing.categoria_id ?? '') : ''} className="mt-1 w-full rounded-lg border p-3"><option value="">Selecione</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          <Field label="Preço (R$)" name="preco" type="number" min="0" step="0.01" defaultValue={editing?.preco ?? ''} required />
          <Field label="Imagem (nome ou URL)" name="imagem" defaultValue={editing?.imagem || ''} />
          <label className="block text-sm font-semibold">Descrição<textarea name="descricao" rows="3" defaultValue={editing?.descricao || ''} className="mt-1 w-full rounded-lg border p-3" /></label>
        </> : null}
        <Alert text={error} />{notice ? <p role="status" className="text-sm text-green-800">{notice}</p> : null}
        <div className="flex gap-2"><button disabled={busy} className="flex-1 rounded-xl bg-orange-700 p-3 font-bold text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar'}</button>{editing ? <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4">Cancelar</button> : null}</div>
      </form>
      <section className="rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">{tab === 'produtos' ? 'Produtos' : 'Categorias'}</h2><button onClick={() => loadAll()} className="text-sm text-orange-800 underline">Atualizar</button></div>
        {loading ? <p role="status">Carregando…</p> : rows.length ? <ul className="divide-y">{rows.map(row => <li key={row.id} className="flex items-center justify-between gap-3 py-3"><div><strong>{row.nome}</strong>{tab === 'produtos' ? <p className="text-sm text-stone-600">{Number(row.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {categories.find(c => String(c.id) === String(row.categoriaId ?? row.categoria_id))?.nome || 'Sem categoria'}</p> : null}</div><div className="flex gap-2"><button disabled={busy} onClick={() => { setEditing(row); setError(''); setNotice(''); }} className="rounded-lg border px-3 py-1">Editar</button><button disabled={busy} onClick={() => removeRecord(row)} className="rounded-lg border border-red-200 px-3 py-1 text-red-700">Excluir</button></div></li>)}</ul> : <p className="text-stone-600">Nenhum registro cadastrado.</p>}
      </section>
    </div>
  </main>;
}

function Field({ label, onChange, ...input }) {
  return <label className="block text-sm font-semibold">{label}<input {...input} onChange={onChange ? event => onChange(event.target.value) : undefined} className="mt-1 w-full rounded-lg border p-3" /></label>;
}

function Alert({ text }) { return text ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{text}</p> : null; }
function GoogleIcon() { return <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.67 5.95c4.48-4.13 7.12-10.2 7.12-17.6Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.85l-7.67-5.95c-2.13 1.43-4.86 2.28-8.23 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>; }

createRoot(document.getElementById('react-admin-root')).render(<AuthProvider><AuthApp /></AuthProvider>);
