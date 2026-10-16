import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const h = React.createElement;
const client = window.reiSupabase;
const config = window.REI_SUPABASE_CONFIG || {};
const PRODUCTS = config.productsTable || 'produtos';
const CATEGORIES = config.categoriesTable || 'categorias';
const categoryColumn = config.productCategoryColumn || 'categoriaId';

function AdminApp() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('produtos');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!client) { setAuthReady(true); setError('Supabase não configurado. Gere o build com as variáveis de ambiente preenchidas.'); return; }
    let alive = true;
    client.auth.getSession().then(({ data, error: authError }) => {
      if (!alive) return;
      if (authError) setError(authError.message);
      setSession(data?.session || null);
      setAuthReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  async function loadAll(showSpinner = true) {
    if (!client) return;
    if (showSpinner) setLoading(true);
    setError('');
    const [p, c] = await Promise.all([
      client.from(PRODUCTS).select('*').order('id'),
      client.from(CATEGORIES).select('*').order('id'),
    ]);
    if (p.error || c.error) setError(`Falha ao carregar dados: ${(p.error || c.error).message}`);
    else { setProducts(p.data || []); setCategories(c.data || []); }
    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;
    loadAll();
    const channel = client.channel('admin-catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: PRODUCTS }, () => loadAll(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: CATEGORIES }, () => loadAll(false))
      .subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Sincronização ao vivo indisponível. Atualize a lista para buscar os dados novamente.'); });
    return () => { client.removeChannel(channel); };
  }, [session]);

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setError('');
    const { error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError) setError(`Não foi possível entrar: ${authError.message}`);
    setBusy(false);
  }

  async function save(event) {
    event.preventDefault(); const formElement = event.currentTarget; setBusy(true); setError(''); setNotice('');
    const form = new FormData(formElement);
    const isProduct = tab === 'produtos';
    const payload = isProduct
      ? { nome: String(form.get('nome')).trim(), preco: Number(form.get('preco')), descricao: String(form.get('descricao') || '').trim(), imagem: String(form.get('imagem') || '').trim() || 'logo.png', [products.some(p => Object.prototype.hasOwnProperty.call(p, 'categoria_id')) ? 'categoria_id' : categoryColumn]: form.get('categoria') }
      : { nome: String(form.get('nome')).trim() };
    const table = isProduct ? PRODUCTS : CATEGORIES;
    let result = editing
      ? await client.from(table).update(payload).eq('id', editing.id).select('id')
      : await client.from(table).insert(payload).select('id');
    if (result.error) setError(`Não foi possível salvar: ${result.error.message}`);
    else if (!result.data?.length) setError('Nenhum registro foi alterado. Verifique a política RLS e as permissões da conta.');
    else { setNotice(`${isProduct ? 'Produto' : 'Categoria'} salvo.`); setEditing(null); formElement.reset(); await loadAll(false); }
    setBusy(false);
  }

  async function removeRecord(row) {
    const type = tab === 'produtos' ? 'produto' : 'categoria';
    if (!window.confirm(`Excluir ${type} “${row.nome}”?`)) return;
    setBusy(true); setError(''); setNotice('');
    const { data, error: deleteError } = await client.from(tab === 'produtos' ? PRODUCTS : CATEGORIES).delete().eq('id', row.id).select('id');
    if (deleteError) setError(`Não foi possível excluir: ${deleteError.message}`);
    else if (!data?.length) setError('Nenhum registro foi excluído. Verifique a política RLS.');
    else { setNotice(`${type[0].toUpperCase()}${type.slice(1)} excluído.`); await loadAll(false); }
    setBusy(false);
  }

  if (!authReady) return h('main', { className: 'mx-auto max-w-xl p-8' }, 'Carregando sessão…');
  if (!client) return h('main', { className: 'mx-auto max-w-xl p-8' }, h('h1', { className: 'text-2xl font-bold' }, 'Painel Rei da Massa'), h(Alert, { text: error }));
  if (!session) return h('main', { className: 'mx-auto max-w-md p-6 sm:p-10' },
    h('a', { className: 'text-orange-800 underline', href: './cozinha.html' }, '← Voltar à cozinha'),
    h('h1', { className: 'my-6 text-3xl font-black' }, 'Acesso da gerência'),
    h('p', { className: 'mb-5 text-stone-600' }, 'Entre com uma conta autorizada no Supabase para gerenciar o cardápio.'),
    h('form', { onSubmit: signIn, className: 'space-y-4 rounded-2xl bg-white p-6 shadow' },
      h(Field, { label: 'E-mail', name: 'email', type: 'email', value: email, onChange: setEmail, required: true }),
      h(Field, { label: 'Senha', name: 'password', type: 'password', value: password, onChange: setPassword, required: true }),
      h(Alert, { text: error }), h('button', { disabled: busy, className: 'w-full rounded-xl bg-orange-700 p-3 font-bold text-white disabled:opacity-50' }, busy ? 'Entrando…' : 'Entrar')));

  const rows = tab === 'produtos' ? products : categories;
  return h('main', { className: 'mx-auto max-w-6xl p-4 sm:p-8' },
    h('header', { className: 'mb-6 flex flex-wrap items-center justify-between gap-3' },
      h('div', null, h('a', { className: 'text-sm text-orange-800 underline', href: './cozinha.html' }, '← Voltar à cozinha'), h('h1', { className: 'mt-2 text-3xl font-black' }, 'Gerenciar cardápio')),
      h('button', { className: 'rounded-lg border px-4 py-2', onClick: () => client.auth.signOut() }, 'Sair')),
    h('nav', { className: 'mb-5 flex gap-2' }, ['produtos', 'categorias'].map((key) => h('button', { key, onClick: () => { setTab(key); setEditing(null); setError(''); setNotice(''); }, className: `rounded-full px-5 py-2 font-bold ${tab === key ? 'bg-orange-700 text-white' : 'bg-white'}` }, key === 'produtos' ? 'Produtos' : 'Categorias'))),
    h('div', { className: 'grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]' },
      h('form', { key: `${tab}-${editing?.id || 'new'}`, onSubmit: save, className: 'h-fit space-y-4 rounded-2xl bg-white p-5 shadow' },
        h('h2', { className: 'text-xl font-bold' }, `${editing ? 'Editar' : 'Cadastrar'} ${tab === 'produtos' ? 'produto' : 'categoria'}`),
        h(Field, { label: 'Nome', name: 'nome', defaultValue: editing?.nome || '', required: true }),
        tab === 'produtos' ? h(React.Fragment, null,
          h('label', { className: 'block text-sm font-semibold' }, 'Categoria', h('select', { name: 'categoria', required: true, defaultValue: editing ? String(editing.categoriaId ?? editing.categoria_id ?? '') : '', className: 'mt-1 w-full rounded-lg border p-3' }, h('option', { value: '' }, 'Selecione'), categories.map(c => h('option', { key: c.id, value: c.id }, c.nome)))),
          h(Field, { label: 'Preço (R$)', name: 'preco', type: 'number', min: '0', step: '0.01', defaultValue: editing?.preco ?? '', required: true }),
          h(Field, { label: 'Imagem (nome ou URL)', name: 'imagem', defaultValue: editing?.imagem || '' }),
          h('label', { className: 'block text-sm font-semibold' }, 'Descrição', h('textarea', { name: 'descricao', rows: 3, defaultValue: editing?.descricao || '', className: 'mt-1 w-full rounded-lg border p-3' }))) : null,
        h(Alert, { text: error }), notice ? h('p', { role: 'status', className: 'text-sm text-green-800' }, notice) : null,
        h('div', { className: 'flex gap-2' }, h('button', { disabled: busy, className: 'flex-1 rounded-xl bg-orange-700 p-3 font-bold text-white disabled:opacity-50' }, busy ? 'Salvando…' : 'Salvar'), editing ? h('button', { type: 'button', onClick: () => setEditing(null), className: 'rounded-xl border px-4' }, 'Cancelar') : null)),
      h('section', { className: 'rounded-2xl bg-white p-5 shadow' }, h('div', { className: 'mb-4 flex items-center justify-between' }, h('h2', { className: 'text-xl font-bold' }, tab === 'produtos' ? 'Produtos' : 'Categorias'), h('button', { onClick: () => loadAll(), className: 'text-sm text-orange-800 underline' }, 'Atualizar')),
        loading ? h('p', null, 'Carregando…') : rows.length ? h('ul', { className: 'divide-y' }, rows.map(row => h('li', { key: row.id, className: 'flex items-center justify-between gap-3 py-3' }, h('div', null, h('strong', null, row.nome), tab === 'produtos' ? h('p', { className: 'text-sm text-stone-600' }, `${Number(row.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${categories.find(c => String(c.id) === String(row.categoriaId ?? row.categoria_id))?.nome || 'Sem categoria'}`) : null), h('div', { className: 'flex gap-2' }, h('button', { disabled: busy, onClick: () => { setEditing(row); setError(''); setNotice(''); }, className: 'rounded-lg border px-3 py-1' }, 'Editar'), h('button', { disabled: busy, onClick: () => removeRecord(row), className: 'rounded-lg border border-red-200 px-3 py-1 text-red-700' }, 'Excluir'))))) : h('p', { className: 'text-stone-600' }, 'Nenhum registro cadastrado.'))));
}

function Alert({ text }) { return text ? h('p', { role: 'alert', className: 'rounded-lg bg-red-50 p-3 text-sm text-red-800' }, text) : null; }
function Field(props) { const { label, onChange, ...input } = props; return h('label', { className: 'block text-sm font-semibold' }, label, h('input', { ...input, onChange: onChange ? e => onChange(e.target.value) : undefined, className: 'mt-1 w-full rounded-lg border p-3' })); }

createRoot(document.getElementById('react-admin-root')).render(h(AdminApp));
