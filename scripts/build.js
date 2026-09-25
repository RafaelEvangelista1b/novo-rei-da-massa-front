const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'www');
const entries = ['index.html', 'cozinha.html', 'manifest.json', 'sw.js', 'assets'];
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) throw new Error('Arquivo necessario ausente: ' + entry);
  fs.cpSync(source, path.join(output, entry), { recursive: true });
}
console.log('Arquivos web copiados para www/.');
