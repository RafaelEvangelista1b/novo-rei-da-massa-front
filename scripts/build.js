const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'www');
const envPath = path.join(root, '.env.local');
const env = {};

if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
}

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';
const productsTable = env.SUPABASE_PRODUCTS_TABLE || 'produtos';

if (supabaseAnonKey.split('.').length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(supabaseAnonKey.split('.')[1], 'base64url').toString('utf8'));
    if (payload.role === 'service_role') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY nao pode ser enviada ao aplicativo cliente.');
    }
  } catch (error) {
    if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) throw error;
  }
}

const entries = ['index.html', 'cozinha.html', 'manifest.json', 'sw.js', 'assets', 'src'];
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) throw new Error(`Arquivo necessario ausente: ${entry}`);
  fs.cpSync(source, path.join(output, entry), { recursive: true });
}

const sdkSource = path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
if (!fs.existsSync(sdkSource)) throw new Error('SDK do Supabase ausente. Execute npm install.');
fs.mkdirSync(path.join(output, 'vendor'), { recursive: true });
fs.copyFileSync(sdkSource, path.join(output, 'vendor', 'supabase.js'));

const clientConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  productsTable,
};
fs.writeFileSync(
  path.join(output, 'supabase-config.js'),
  `window.REI_SUPABASE_CONFIG = ${JSON.stringify(clientConfig)};\n`,
);

console.log('Arquivos web e SDK do Supabase copiados para www/.');
console.log(supabaseUrl && supabaseAnonKey ? 'Configuracao Supabase incluida no build.' : 'Credenciais Supabase ausentes; configure .env.local antes de usar o Supabase.');
