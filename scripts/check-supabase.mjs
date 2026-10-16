import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const raw of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const products = env.SUPABASE_PRODUCTS_TABLE || 'produtos';
const categories = env.SUPABASE_CATEGORIES_TABLE || 'categorias';
const configuredCategoryColumn = env.SUPABASE_PRODUCT_CATEGORY_COLUMN || 'categoriaId';
if (!url || !key) {
  console.error('FAIL: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente.');
  process.exit(1);
}

if (key.split('.').length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    if (payload.role === 'service_role') {
      console.error('FAIL: a chave configurada possui role service_role.');
      process.exit(1);
    }
  } catch (error) {
    if (error.message.includes('service_role')) throw error;
  }
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let failed = false;
async function checkColumns(table, columns, label, countFailure = true) {
  const { error } = await client.from(table).select(columns.join(',')).limit(0);
  console.log(`${label}: ${error ? `FAIL (${error.code || 'query error'})` : 'PASS'}`);
  if (error && countFailure) failed = true;
  return !error;
}

await checkColumns(categories, ['id', 'nome'], 'Schema categorias');
const productBase = ['id', 'nome', 'preco', 'descricao', 'imagem'];
const camelCase = await checkColumns(products, [...productBase, 'categoriaId'], 'Schema produtos com categoriaId', false);
const snakeCase = await checkColumns(products, [...productBase, 'categoria_id'], 'Schema produtos com categoria_id', false);
const detectedColumn = snakeCase ? 'categoria_id' : camelCase ? 'categoriaId' : null;
if (!detectedColumn) {
  console.log('Schema de produtos: FAIL (campos esperados ausentes ou sem permissão)');
  failed = true;
} else if (detectedColumn !== configuredCategoryColumn) {
  console.log(`Configuração da categoria: FAIL (configurada=${configuredCategoryColumn}; encontrada=${detectedColumn})`);
  failed = true;
} else if (detectedColumn) console.log('Configuração da categoria: PASS');

try {
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } });
  const enabled = !error && typeof data?.url === 'string' && data.url.length > 0;
  console.log(`Google OAuth provider: ${enabled ? 'PASS (provider habilitado)' : 'FAIL (não habilitado ou configuração pendente)'}`);
  if (!enabled) failed = true;
} catch {
  console.log('Google OAuth provider: FAIL (não habilitado ou configuração pendente)');
  failed = true;
}

const realtime = await new Promise((resolve) => {
  let settled = false;
  let timer;
  let channel;
  const finish = (status) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve(status);
  };
  timer = setTimeout(() => finish('FAIL (timeout)'), 12000);
  channel = client.channel('readonly-audit-check')
    .on('postgres_changes', { event: '*', schema: 'public', table: products }, () => {})
    .on('postgres_changes', { event: '*', schema: 'public', table: categories }, () => {})
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') finish('PASS');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') finish(`FAIL (${status})`);
    });
});
console.log(`Realtime subscription: ${realtime}`);
if (!realtime.startsWith('PASS')) failed = true;
await client.removeAllChannels();
client.realtime.disconnect();
process.exitCode = failed ? 1 : 0;
