const fs = require('node:fs');
const path = require('node:path');

const templateFile = path.join(__dirname, '..', 'node_modules', '@capacitor', 'cli', 'dist', 'util', 'template.js');
if (!fs.existsSync(templateFile)) process.exit(0);

const original = 'const tar_1 = tslib_1.__importDefault(require("tar"));';
const patched = 'const tar_1 = { default: require("tar") };';
const source = fs.readFileSync(templateFile, 'utf8');
if (source.includes(patched)) process.exit(0);
const previouslyPatched = 'const tar_1 = require("tar");';
if (source.includes(original)) fs.writeFileSync(templateFile, source.replace(original, patched));
else if (source.includes(previouslyPatched)) fs.writeFileSync(templateFile, source.replace(previouslyPatched, patched));
else throw new Error('Não foi possível aplicar a compatibilidade do tar à CLI do Capacitor.');
