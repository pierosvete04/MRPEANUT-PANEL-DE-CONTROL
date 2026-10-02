// Actualizador del panel: baja de GitHub (rama main) los archivos del panel web.
//
// - Pregunta a la API de GitHub cuál es el último commit de main.
// - Si es distinto al que tiene, baja solo los archivos que cambiaron (compara el hash git de cada archivo),
//   los arma en una carpeta temporal, verifica cada uno y recién ahí reemplaza la carpeta del panel.
//   Si se corta internet a la mitad, el panel anterior sigue intacto.
// - El instalador trae una copia del panel (resources/panel) para que abra sin internet desde el primer día.
//   Se usa la más nueva de las dos.
const { app, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const OWNER = 'pierosvete04';
const REPO = 'MRPEANUT-PANEL-DE-CONTROL';
const RAMA = 'main';
// Archivos del repo que forman el panel (lo demás —escritorio/, supabase/, documentos— no se baja).
const ES_DEL_PANEL = p => /^(index\.html|app\.js|styles\.css|sw\.js|manifest\.webmanifest)$/.test(p) || /^(img|fonts)\//.test(p);

const incluido = () => app.isPackaged ? path.join(process.resourcesPath, 'panel') : path.join(__dirname, 'build', 'panel');
const descargado = () => path.join(app.getPath('userData'), 'panel');

function leerVersion(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')); } catch { return null; }
}
// La carpeta en uso: la descargada si es más nueva que la que vino en el instalador.
function carpetaActiva() {
  const d = leerVersion(descargado()); const i = leerVersion(incluido());
  if (d && fs.existsSync(path.join(descargado(), 'index.html')) && (!i || (d.fecha || '') >= (i.fecha || ''))) return descargado();
  return incluido();
}
function versionActiva() { return leerVersion(carpetaActiva()) || { sha: 'local', fecha: '' }; }
function descripcion() {
  const v = versionActiva();
  if (!v.sha || v.sha === 'local') return 'copia local';
  const f = v.fecha ? new Date(v.fecha).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  return `${v.sha.slice(0, 7)}${f ? ' del ' + f : ''}`;
}

const shaGit = buf => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
async function api(ruta) {
  const r = await net.fetch(`https://api.github.com/repos/${OWNER}/${REPO}${ruta}`, { headers: { 'User-Agent': 'MrPeanutPanel', Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
  return r.json();
}

let enCurso = null;
function buscar() { return enCurso ||= hacerBusqueda().finally(() => { enCurso = null; }); }

async function hacerBusqueda() {
  const ultimo = await api(`/commits/${RAMA}`);
  const sha = ultimo.sha; const fecha = ultimo.commit?.committer?.date || ultimo.commit?.author?.date || '';
  const actual = versionActiva();
  if (sha === actual.sha || (actual.fecha && fecha && fecha < actual.fecha)) return { nuevo: false };

  const arbol = await api(`/git/trees/${sha}?recursive=1`);
  const archivos = arbol.tree.filter(x => x.type === 'blob' && ES_DEL_PANEL(x.path));
  if (!archivos.some(x => x.path === 'index.html')) throw new Error('El repo no tiene index.html');

  const base = carpetaActiva();
  const tmp = path.join(app.getPath('userData'), 'panel-nuevo');
  await fs.promises.rm(tmp, { recursive: true, force: true });
  for (const a of archivos) {
    const destino = path.join(tmp, a.path);
    await fs.promises.mkdir(path.dirname(destino), { recursive: true });
    let datos = null;
    try { const local = await fs.promises.readFile(path.join(base, a.path)); if (shaGit(local) === a.sha) datos = local; } catch { /* no estaba */ }
    if (!datos) {
      const r = await net.fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${a.path.split('/').map(encodeURIComponent).join('/')}`);
      if (!r.ok) throw new Error(`No se pudo bajar ${a.path} (${r.status})`);
      datos = Buffer.from(await r.arrayBuffer());
      if (shaGit(datos) !== a.sha) throw new Error(`${a.path} llegó incompleto`);
    }
    await fs.promises.writeFile(destino, datos);
  }
  await fs.promises.writeFile(path.join(tmp, 'version.json'), JSON.stringify({ sha, fecha }, null, 1));

  // Cambio de carpeta: la vieja se aparta y se borra recién cuando la nueva está en su lugar.
  const viejo = path.join(app.getPath('userData'), 'panel-viejo');
  await fs.promises.rm(viejo, { recursive: true, force: true });
  if (fs.existsSync(descargado())) await fs.promises.rename(descargado(), viejo);
  await fs.promises.rename(tmp, descargado());
  await fs.promises.rm(viejo, { recursive: true, force: true });
  return { nuevo: true, sha, fecha };
}

module.exports = { carpetaActiva, descripcion, buscar };
