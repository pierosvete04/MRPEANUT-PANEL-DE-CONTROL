// Mr. Peanut · Panel de control — aplicación de escritorio (Windows).
//
// La ventana muestra el mismo panel web (index.html, app.js, styles.css…) servido desde
// la dirección fija mrp://panel/ para que los datos locales (IndexedDB) sigan siempre en el mismo lugar.
//
// Dos tipos de actualización:
//  1. El PANEL (HTML/JS/CSS): se baja solo desde GitHub (rama main) — ver actualizador.js.
//     Basta con subir cambios al repo para que todas las PCs los reciban.
//  2. El PROGRAMA (.exe): electron-updater revisa los Releases de GitHub y, si hay un instalador
//     nuevo, lo baja y lo instala al cerrar. Solo hace falta cuando cambia esta carpeta "escritorio".
const { app, BrowserWindow, protocol, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const panel = require('./actualizador');

protocol.registerSchemesAsPrivileged([
  { scheme: 'mrp', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};
const REVISAR_CADA = 30 * 60 * 1000; // 30 minutos

let win = null;
let avisada = null; // versión del panel que ya se ofreció recargar

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function abrirFuera(url) {
  if (/^(https?:|whatsapp:|mailto:|tel:)/i.test(url)) shell.openExternal(url);
}

function crearVentana() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, show: false,
    title: 'Mr. Peanut · Panel de control', backgroundColor: '#FBF6EA', autoHideMenuBar: true,
    icon: path.join(__dirname, 'logo-app.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: false },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.loadURL('mrp://panel/index.html');
  // WhatsApp, links y correos se abren fuera; las fotos de vouchers (blob:) en una ventanita.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:') || url.startsWith('mrp:')) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, width: 600, height: 800 } };
    abrirFuera(url); return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('mrp://')) { e.preventDefault(); abrirFuera(url); } });
  win.on('closed', () => { win = null; });
}

// Revisa GitHub. Si bajó una versión nueva del panel, pregunta si recargar ahora
// (si no, se usa sola al volver a abrir el programa).
async function revisarPanel(manual = false) {
  try {
    const r = await panel.buscar();
    if (!r.nuevo) return manual ? `El panel está al día (${panel.descripcion()}).` : null;
    if (win && avisada !== r.sha) {
      avisada = r.sha;
      const { response } = await dialog.showMessageBox(win, {
        type: 'info', buttons: ['Actualizar ahora', 'Más tarde'], defaultId: 0, cancelId: 1,
        title: 'Actualización del panel', message: 'Hay una nueva versión del panel de control',
        detail: `Se descargó desde GitHub (${panel.descripcion()}).\nAl actualizar se recarga la ventana. Tus datos no se pierden; si estabas llenando un pedido, guárdalo antes.\nSi eliges "Más tarde", se usará la próxima vez que abras el programa.`,
      });
      if (response === 0) win.webContents.reloadIgnoringCache();
    }
    return `Se descargó la versión ${panel.descripcion()}.`;
  } catch (e) {
    return manual ? `No se pudo revisar: ${e.message}` : null; // sin internet: se intenta de nuevo luego
  }
}

// ---- Actualización del programa (.exe) desde los Releases de GitHub.
// Se baja sola en segundo plano; al terminar pregunta si reiniciar ahora (si no, se instala al cerrar).
// El estado se le pasa al panel para mostrarlo en Sincronización.
let actualizador = null;
const estadoPrograma = { estado: 'sin_revisar', version: null, progreso: 0, error: null };
function avisarEstado(cambios) {
  Object.assign(estadoPrograma, cambios);
  if (win && !win.isDestroyed()) win.webContents.send('escritorio:estado', { ...estadoPrograma });
}
function prepararActualizador() {
  if (actualizador || !app.isPackaged) return actualizador;
  try {
    ({ autoUpdater: actualizador } = require('electron-updater'));
  } catch { return null; }
  actualizador.autoDownload = true;
  actualizador.autoInstallOnAppQuit = true;
  actualizador.on('checking-for-update', () => avisarEstado({ estado: 'buscando', error: null }));
  actualizador.on('update-not-available', () => avisarEstado({ estado: 'al_dia' }));
  actualizador.on('update-available', i => avisarEstado({ estado: 'descargando', version: i.version, progreso: 0 }));
  actualizador.on('download-progress', p => avisarEstado({ estado: 'descargando', progreso: Math.round(p.percent || 0) }));
  actualizador.on('error', e => avisarEstado({ estado: 'error', error: String(e?.message || e).slice(0, 200) }));
  actualizador.on('update-downloaded', async i => {
    avisarEstado({ estado: 'lista', version: i.version, progreso: 100 });
    if (!win) return;
    const { response } = await dialog.showMessageBox(win, {
      type: 'info', buttons: ['Reiniciar e instalar', 'Al cerrar el programa'], defaultId: 0, cancelId: 1,
      title: 'Actualización del programa', message: `Está lista la versión ${i.version} del programa`,
      detail: 'Al reiniciar se instala en unos segundos. Tus datos no se pierden; si estabas llenando un pedido, guárdalo antes.',
    });
    if (response === 0) actualizador.quitAndInstall();
  });
  return actualizador;
}
async function revisarPrograma() {
  const a = prepararActualizador();
  if (!a) return 'El programa se actualiza solo cuando está instalado.';
  if (estadoPrograma.estado === 'lista') { a.quitAndInstall(); return 'Instalando…'; }
  try {
    const r = await a.checkForUpdates();
    const nueva = r?.updateInfo?.version;
    return nueva && nueva !== app.getVersion() ? `Bajando el programa ${nueva}…` : `El programa está al día (v${app.getVersion()}).`;
  } catch (e) { return `No se pudo revisar el programa: ${String(e?.message || e).slice(0, 120)}`; }
}

ipcMain.handle('escritorio:version', () => ({ programa: app.getVersion(), panel: panel.descripcion(), estado: { ...estadoPrograma } }));
ipcMain.handle('escritorio:buscar', () => revisarPanel(true));
// Botón "Buscar actualizaciones del sistema": revisa el panel y el programa a la vez.
ipcMain.handle('escritorio:buscarSistema', async () => {
  const [p, g] = await Promise.all([revisarPanel(true), revisarPrograma()]);
  return { panel: p, programa: g, estado: { ...estadoPrograma }, version: { programa: app.getVersion(), panel: panel.descripcion() } };
});

app.whenReady().then(() => {
  protocol.handle('mrp', async req => {
    const dir = panel.carpetaActiva();
    let rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const ruta = path.normalize(path.join(dir, rel));
    if (!ruta.startsWith(path.normalize(dir))) return new Response('Prohibido', { status: 403 });
    try {
      const datos = await fs.promises.readFile(ruta);
      return new Response(datos, { headers: { 'Content-Type': TIPOS[path.extname(ruta).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' } });
    } catch {
      return new Response('No encontrado', { status: 404 });
    }
  });
  crearVentana();
  setTimeout(() => revisarPanel(false), 4000);
  setInterval(() => revisarPanel(false), REVISAR_CADA);
  setTimeout(() => { if (prepararActualizador()) actualizador.checkForUpdates().catch(() => {}); }, 8000);
  setInterval(() => { if (prepararActualizador() && estadoPrograma.estado !== 'lista') actualizador.checkForUpdates().catch(() => {}); }, 4 * REVISAR_CADA);
});

app.on('window-all-closed', () => app.quit());
