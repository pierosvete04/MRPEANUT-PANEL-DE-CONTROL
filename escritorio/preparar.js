// Antes de abrir o empaquetar: copia el panel web (carpeta de arriba) a build/panel,
// anota de qué commit es (version.json) y prepara el ícono del instalador.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const destino = path.join(__dirname, 'build', 'panel');
const ES_DEL_PANEL = p => /^(index\.html|app\.js|styles\.css|sw\.js|manifest\.webmanifest)$/.test(p) || /^(img|fonts)\//.test(p);

function copiar(rel) {
  const origen = path.join(raiz, rel);
  if (fs.statSync(origen).isDirectory()) { for (const h of fs.readdirSync(origen)) copiar(path.posix.join(rel, h)); return; }
  if (!ES_DEL_PANEL(rel)) return;
  fs.mkdirSync(path.dirname(path.join(destino, rel)), { recursive: true });
  fs.copyFileSync(origen, path.join(destino, rel));
}

fs.rmSync(destino, { recursive: true, force: true });
for (const rel of ['index.html', 'app.js', 'styles.css', 'sw.js', 'manifest.webmanifest', 'img', 'fonts']) copiar(rel);

let version = { sha: 'local', fecha: '' };
try {
  const sha = execSync('git rev-parse HEAD', { cwd: raiz }).toString().trim();
  const fecha = execSync('git log -1 --format=%cI', { cwd: raiz }).toString().trim();
  // Si hay cambios sin subir, la copia no corresponde exactamente a ese commit: el programa bajará el de GitHub.
  const sucio = execSync('git status --porcelain -- index.html app.js styles.css sw.js manifest.webmanifest img fonts', { cwd: raiz }).toString().trim();
  version = sucio ? { sha: 'local', fecha: '' } : { sha, fecha: new Date(fecha).toISOString() };
} catch { /* sin git */ }
fs.writeFileSync(path.join(destino, 'version.json'), JSON.stringify(version, null, 1));

// El ícono del programa (logo-app.png / logo-app.ico) sale del logo con personaje de BRANDING y está en esta carpeta.
console.log(`Panel copiado a build/panel (${version.sha === 'local' ? 'copia local' : version.sha.slice(0, 7)})`);
