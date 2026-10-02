'use strict';
/* ==========================================================================
   Mr. Peanut · Panel de control
   Todo se guarda primero en esta computadora (IndexedDB), así funciona sin
   internet. Si hay conexión y el panel está conectado a Supabase, cada cambio
   se sube solo y también se bajan los cambios hechos desde otro equipo.
   Un solo panel para consumidores (B2C, con Club Mr. Peanut) y empresas (B2B).
   ========================================================================== */

// ------------------------------------------------------------------ reglas
const SABORES = [
  { id: 'mani', nombre: 'Maní' },
  { id: 'chocomani', nombre: 'Chocomaní' },
  { id: 'crunchy', nombre: 'Crunchy' },
  { id: 'almendra', nombre: 'Almendra' },
];
const NIVELES = { oficial: 'Oficial', vip: 'VIP', leyenda: 'Leyenda Peanut' };
const NIVEL_CLASE = { oficial: 'of', vip: 'vip', leyenda: 'ley' };
const ENTREGA = { por_preparar: 'Por preparar', preparado: 'Listo para enviar', en_camino: 'En camino', entregado: 'Entregado' };
const PAGO = { pendiente: 'Pendiente de pago', parcial: 'Pago parcial', pagado: 'Pagado', anulado: 'Cancelado' };
// Estado del pedido que se elige en una sola lista: la entrega + "Cancelado" (pedido anulado).
const ESTADO_PED = { ...ENTREGA, cancelado: 'Cancelado' };
const estadoPed = p => p.anulado ? 'cancelado' : (p.estado_entrega || 'por_preparar');
const selectEstado = (valor, onchange, extra = '') => `<select class="sel-estado e-${valor}" onchange="${onchange}" onclick="event.stopPropagation()" aria-label="Estado del pedido" ${extra}>
  ${Object.entries(ESTADO_PED).map(([k, t]) => `<option value="${k}" ${valor === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
const MODALIDAD = { anticipado: 'Paga antes', contra_entrega: 'Contra entrega', credito: 'Crédito' };
const METODOS = ['Yape', 'Plin', 'Transferencia', 'Efectivo', 'Tarjeta'];
const NEGOCIOS = ['Tienda / bodega', 'Restaurante', 'Cafetería', 'Gimnasio', 'Distribuidor', 'Otro'];
const REDES = { ig_historia: 'Historia de Instagram', ig_post: 'Post de Instagram', tiktok: 'TikTok', google: 'Reseña en Google', facebook: 'Facebook', otro: 'Otro' };
const COURIERS_BASE = ['InDriver', 'Uber', 'Entrega propia'];
const DISTRITOS = {
  'Lima Metropolitana': ['Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María',
    'La Molina', 'La Victoria', 'Lima (Cercado)', 'Lince', 'Los Olivos', 'Lurigancho-Chosica', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre',
    'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis',
    'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'],
  'Callao': ['Bellavista', 'Callao', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla'],
};
const OTRO_DISTRITO = 'Provincia (fuera de Lima)';
const esCorreo = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
const IGV = 0.18;

// Variables del Club Mr. Peanut (programa de fidelización, septiembre 2026).
// Se pueden cambiar desde la pestaña "Club Mr. Peanut".
const CLUB_BASE = {
  vip_sellos: 5,              // desde 5 sellos pasa a VIP...
  vip_min_compras: 3,         // ...si al menos 3 son por compras propias
  leyenda_sellos: 50,         // desde 50 sellos: Leyenda Peanut
  regalo_cada: 10,            // cada 10 sellos, 1 mantequilla de regalo
  desc_referido: 3,           // S/ de descuento al amigo en su primer pack
  dias_pausa: 60,             // sin compras en 60 días: nivel en pausa
  tope_leyenda_semana: 2,     // máximo de packs Leyenda por semana
  resenas_mes: 1,             // historias/reseñas que suman sello por mes
  resena_requiere_pedido: 1,  // 1 = la historia/reseña debe ser de un pedido entregado (1 por pedido)
};

// Costo de producción por frasco de 150 g (Centro de costos, septiembre 2026). Se edita en Productos.
const COSTOS_BASE = { mani: 5.8, chocomani: 5.9, crunchy: 5.9, almendra: 11 };
const MARGEN_MINIMO = 50; // % · regla del centro de costos: ninguna promoción baja de 50% de margen
const PRODUCTOS_INICIALES = [
  { id: 'MP-MANI-150', nombre: 'Mantequilla de Maní Mr. Peanut 150 g', sabor: 'mani', precio: 23, costo: COSTOS_BASE.mani, orden: 1, imagen_local: 'img/productos/mani.jpg',
    descripcion: 'La clásica. Hecha solo con maní tostado y molido: sin azúcar añadida, sin sal y sin conservantes. Textura cremosa y sabor intenso a maní de verdad. 100% maní tostado, fuente natural de proteína y fibra. Frasco de vidrio de 150 g. Contiene maní.' },
  { id: 'MP-CHOCO-150', nombre: 'Mantequilla Chocomaní Mr. Peanut 150 g', sabor: 'chocomani', precio: 23.5, costo: COSTOS_BASE.chocomani, orden: 2, imagen_local: 'img/productos/chocomani.jpg',
    descripcion: 'El antojo saludable. Nuestra mantequilla de maní con chocolate: cremosa e intensa. Ideal para panqueques, waffles, frutas, avena o postres. Frasco de vidrio de 150 g. Contiene maní.' },
  { id: 'MP-CRUNCHY-150', nombre: 'Mantequilla de Maní Crunchy Mr. Peanut 150 g', sabor: 'crunchy', precio: 23.5, costo: COSTOS_BASE.crunchy, orden: 3, imagen_local: 'img/productos/crunchy.jpg',
    descripcion: 'Para los que aman sentir el maní. Mantequilla de maní cremosa con trocitos de maní tostado que crujen en cada bocado. Frasco de vidrio de 150 g. Contiene maní.' },
  { id: 'MP-ALMENDRA-150', nombre: 'Mantequilla de Almendra Mr. Peanut 150 g', sabor: 'almendra', precio: 25, costo: COSTOS_BASE.almendra, orden: 4, imagen_local: 'img/productos/almendra.jpg',
    descripcion: 'La premium. Elaborada solo con almendra tostada, sin azúcar añadida, sin sal y sin conservantes. Suave, ligeramente dulce y con sabor tostado. 23 g de proteína por cada 100 g. Sin octógonos. Frasco de vidrio de 150 g. Contiene almendra.' },
];
const txtPack = (n, max) => `Elige ${n} mantequillas del catálogo (Maní, Chocomaní, Crunchy o Almendra) a precio de pack. Puedes repetir sabor. Máximo ${max} de almendra. Frascos de vidrio de 150 g. Precio de promoción del mes, no acumulable con otras promociones.`;
const PACKS_INICIALES = [
  { id: 'PACK-2', nombre: 'Arma tu Pack x2', frascos: 2, tipo: 'mixto', max_almendra: 1, precio_oficial: 42, precio_vip: 38, precio_leyenda: 35, orden: 1, en_catalogo: true, descripcion: txtPack(2, 1) },
  { id: 'PACK-3', nombre: 'Arma tu Pack x3', frascos: 3, tipo: 'mixto', max_almendra: 1, precio_oficial: 51, precio_vip: 48, precio_leyenda: 45, orden: 2, en_catalogo: true, descripcion: txtPack(3, 1) },
  { id: 'PACK-4', nombre: 'Arma tu Pack x4', frascos: 4, tipo: 'mixto', max_almendra: 2, precio_oficial: 64, precio_vip: 62, precio_leyenda: 60, orden: 3, en_catalogo: true, descripcion: txtPack(4, 2) },
  { id: 'PACK-5', nombre: 'Arma tu Pack x5', frascos: 5, tipo: 'mixto', max_almendra: 2, precio_oficial: null, precio_vip: 78, precio_leyenda: 75, orden: 4, en_catalogo: false, descripcion: txtPack(5, 2) + ' Exclusivo para clientes VIP y Leyenda.' },
  { id: 'PACK-ALM-2', nombre: 'Pack Almendra x2', frascos: 2, tipo: 'almendra', max_almendra: 2, precio_oficial: 46, precio_vip: 44, precio_leyenda: 42, orden: 5, en_catalogo: true, descripcion: '2 mantequillas de almendra de 150 g a precio de pack. No acumulable con otras promociones.' },
  { id: 'PACK-ALM-4', nombre: 'Pack Almendra x4', frascos: 4, tipo: 'almendra', max_almendra: 4, precio_oficial: 88, precio_vip: 84, precio_leyenda: 80, orden: 6, en_catalogo: true, descripcion: '4 mantequillas de almendra de 150 g a precio de pack. Para no quedarte sin tu favorita. No acumulable con otras promociones.' },
];

// Proyecto de Supabase del negocio (la clave publicable es pública; los datos los protege RLS + tabla equipo).
const SUPABASE_PROYECTO = { url: 'https://ymvfbpckxegnssvjsrzt.supabase.co', anon: 'sb_publishable_qvH1KaskwMres5BpjTCTPg_7sDvlsAD' };

// Columnas que existen en Supabase (lo demás es solo local, p. ej. _demo o _img_pendiente).
const COLUMNAS = {
  productos: ['id', 'nombre', 'sabor', 'descripcion', 'precio', 'costo', 'disponible', 'en_catalogo', 'imagen_url', 'orden', 'creado_en', 'updated_at', 'eliminado'],
  packs: ['id', 'nombre', 'frascos', 'tipo', 'max_almendra', 'precio_oficial', 'precio_vip', 'precio_leyenda', 'descripcion', 'activo', 'en_catalogo', 'imagen_url', 'orden', 'creado_en', 'updated_at', 'eliminado'],
  clientes: ['id', 'tipo_cliente', 'codigo', 'nombre', 'apellido', 'razon_social', 'ruc', 'contacto', 'tipo_negocio', 'celular', 'correo', 'regalo_agendado', 'direccion', 'distrito', 'direccion_envio', 'referencia', 'referido_por', 'nivel_manual', 'notas', 'creado_en', 'updated_at', 'eliminado'],
  pedidos: ['id', 'numero', 'canal', 'cliente_id', 'fecha', 'fecha_entrega', 'estado_entrega', 'estado_pago', 'anulado', 'modalidad_pago', 'fecha_vencimiento', 'nivel_precio', 'items', 'subtotal', 'descuento', 'descuento_referido', 'descuento_motivo', 'envio', 'envio_asumido', 'costo', 'igv', 'total', 'pagos', 'metodo_pago', 'courier', 'comprobante', 'guia', 'direccion_envio', 'referido_por', 'notas', 'entregado_en', 'creado_en', 'updated_at', 'eliminado'],
  sellos_extra: ['id', 'cliente_id', 'tipo', 'cantidad', 'pedido_id', 'red', 'link', 'nota', 'fecha', 'creado_en', 'updated_at', 'eliminado'],
  movimientos_stock: ['id', 'producto_id', 'tipo', 'cantidad', 'lote', 'fecha', 'vence', 'motivo', 'nota', 'creado_en', 'updated_at', 'eliminado'],
};
const TABLAS = Object.keys(COLUMNAS);

// ------------------------------------------------------------------ utilidades
const $ = s => document.querySelector(s);
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round((+n || 0) * 100) / 100;
const soles = n => { n = r2(n); return 'S/' + (n % 1 ? n.toFixed(2) : n.toFixed(0)); };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const soloDigitos = s => String(s || '').replace(/\D/g, '');
const celNorm = s => soloDigitos(s).slice(-9);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const isoLocal = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const hoy = () => isoLocal(new Date());
const sumarDias = (f, n) => isoLocal(new Date(new Date(f + 'T12:00:00').getTime() + n * 86400000));
const aFecha = s => s ? new Date(String(s).length === 10 ? s + 'T12:00:00' : s) : null;
const diasEntre = (a, b = new Date()) => Math.floor((b - a) / 86400000);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fechaCorta = s => { const d = aFecha(s); return d ? `${d.getDate()} ${MESES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}` : '—'; };
const fechaLarga = s => { const d = aFecha(s); return d ? `${DIAS_L[d.getDay()]} ${d.getDate()} de ${MESES_L[d.getMonth()]}` : ''; };
const nombreSabor = id => SABORES.find(s => s.id === id)?.nombre || id;
const esEmpresa = c => c?.tipo_cliente === 'empresa';
const nombreCliente = c => !c ? '(cliente borrado)' : esEmpresa(c) ? (c.nombre || c.razon_social || '') : `${c.nombre || ''} ${c.apellido || ''}`.trim();
const saludo = c => !c ? '' : esEmpresa(c) ? (String(c.contacto || '').split(/\s+/)[0] || c.nombre) : c.nombre;
function selectDistrito(valor, onchange) {
  const todos = Object.values(DISTRITOS).flat();
  const extra = valor && !todos.includes(valor) && valor !== OTRO_DISTRITO ? `<option selected>${h(valor)}</option>` : '';
  return `<select onchange="${onchange}"><option value="">Elige el distrito…</option>${extra}
    ${Object.entries(DISTRITOS).map(([g, ds]) => `<optgroup label="${g}">${ds.map(d => `<option ${d === valor ? 'selected' : ''}>${d}</option>`).join('')}</optgroup>`).join('')}
    <option ${valor === OTRO_DISTRITO ? 'selected' : ''}>${OTRO_DISTRITO}</option></select>`;
}
const ic = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const tagNivel = (n, extra = '') => `<span class="tag ${NIVEL_CLASE[n]}">${NIVELES[n]}${extra}</span>`;
const tagCanal = c => c === 'b2b' ? '<span class="tag b2b">B2B</span>' : '<span class="tag b2c">B2C</span>';
const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;
const numeroWa = cel => { let d = soloDigitos(cel); if (d.length === 9) d = '51' + d; return d; };
const waLink = (cel, txt) => `https://wa.me/${numeroWa(cel)}${txt ? '?text=' + encodeURIComponent(txt) : ''}`;

// Abre WhatsApp de escritorio, WhatsApp Web o deja elegir (según Sincronización → WhatsApp).
function abrirWhatsApp(cel, texto) {
  const n = numeroWa(cel); const t = encodeURIComponent(texto || '');
  if (n.length < 11) return toast('El cliente no tiene un celular válido.');
  const modo = CFG.wa_modo || 'app';
  const url = modo === 'web' ? `https://web.whatsapp.com/send?phone=${n}&text=${t}`
    : modo === 'app' ? `whatsapp://send?phone=${n}&text=${t}` : `https://wa.me/${n}?text=${t}`;
  const a = document.createElement('a'); a.href = url;
  if (modo !== 'app') { a.target = '_blank'; a.rel = 'noopener'; }
  a.click();
}

// Aviso que se queda en pantalla (con botones) hasta que lo cierres: se usa cuando un cliente gana su regalo.
function avisoRegalo(c, e) {
  let caja = $('#avisos-fijos');
  if (!caja) { caja = document.createElement('div'); caja.id = 'avisos-fijos'; document.body.appendChild(caja); }
  caja.querySelector(`[data-cli="${c.id}"]`)?.remove();
  const d = document.createElement('div'); d.className = 'aviso-fijo'; d.dataset.cli = c.id;
  d.innerHTML = `<div class="af-ic">${ic('regalo')}</div><div style="flex:1"><b>¡${h(nombreCliente(c))} llegó a ${e.regalosGanados * CLUB.regalo_cada} sellos!</b>
    <span>Ganó 1 mantequilla de regalo del sabor que quiera. Avísale y agéndala para su próximo pedido.</span>
    <div class="fila"><button class="btn mini wa" onclick="NOTI.avisar('${c.id}')">${ic('wa')} Avisarle por WhatsApp</button>
    ${c.regalo_agendado ? '' : `<button class="btn mini" onclick="NOTI.agendar('${c.id}');this.closest('.aviso-fijo').remove()">Agendar para su próxima compra</button>`}</div></div>
    <button class="af-x" onclick="this.closest('.aviso-fijo').remove()" aria-label="Cerrar">✕</button>`;
  caja.appendChild(d);
}
function toast(msg, ms = 3200) {
  let caja = $('#toasts');
  if (!caja) { caja = document.createElement('div'); caja.id = 'toasts'; document.body.appendChild(caja); }
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  caja.appendChild(t); setTimeout(() => t.remove(), ms);
}
function descargar(nombre, contenido, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo }));
  a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copiado.'); }
  catch { prompt('Copia el texto:', txt); }
}

// ------------------------------------------------------------------ base de datos local
let db;
const D = {};                 // tabla -> Map(id -> registro)
let CFG = {};                 // configuración local
const COLA = new Set();       // cambios que faltan subir ("tabla:id")
const IMG = {};               // "carpeta/id" -> URL de la foto guardada localmente
let CLUB = { ...CLUB_BASE };

function abrirDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('mrpeanut-panel', 2);
    r.onupgradeneeded = () => {
      const d = r.result; const crear = (n, k) => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: k }); };
      TABLAS.forEach(t => crear(t, 'id'));
      crear('cola', 'clave'); crear('imagenes', 'clave'); crear('config', 'clave');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx(store, modo, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(store, modo); let out;
    const req = fn(t.objectStore(store));
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
  });
}
const idb = {
  all: s => tx(s, 'readonly', st => st.getAll()),
  get: (s, k) => tx(s, 'readonly', st => st.get(k)),
  put: (s, v) => tx(s, 'readwrite', st => st.put(v)),
  del: (s, k) => tx(s, 'readwrite', st => st.delete(k)),
  putMany: (s, vs) => tx(s, 'readwrite', st => { vs.forEach(v => st.put(v)); }),
  delMany: (s, ks) => tx(s, 'readwrite', st => { ks.forEach(k => st.delete(k)); }),
};
const lista = t => [...D[t].values()].filter(r => !r.eliminado);
const guardarConfig = () => idb.put('config', { clave: 'cfg', ...CFG });
const couriers = () => CFG.couriers?.length ? CFG.couriers : COURIERS_BASE;

async function guardar(tabla, rec) {
  const ahora = new Date().toISOString();
  rec.updated_at = ahora;
  if (!rec.creado_en) rec.creado_en = ahora;
  if (rec.eliminado == null) rec.eliminado = false;
  D[tabla].set(rec.id, rec);
  await idb.put(tabla, rec);
  if (!rec._demo) { const clave = `${tabla}:${rec.id}`; COLA.add(clave); await idb.put('cola', { clave, tabla, id: rec.id }); }
  invalidar(); pintarEstado(); programarSync(); setTimeout(pintarCampana, 0);
  return rec;
}
async function eliminar(tabla, id) {
  const r = D[tabla].get(id); if (!r) return;
  r.eliminado = true; await guardar(tabla, r);
}

// Pedidos de la primera versión (un solo "estado") -> pago y entrega separados.
function migrarPedido(p) {
  if (p.estado_entrega) return false;
  const e = p.estado || 'pendiente';
  p.canal = p.canal || 'b2c';
  p.anulado = e === 'anulado';
  p.estado_entrega = e === 'entregado' ? 'entregado' : 'por_preparar';
  p.modalidad_pago = 'anticipado';
  p.pagos = (e === 'pagado' || e === 'entregado') ? [{ id: uid(), fecha: p.fecha, monto: p.total, metodo: p.metodo_pago || 'Yape', referencia: '' }] : [];
  p.courier = null; p.comprobante = null; p.guia = null; p.igv = 0;
  delete p.estado;
  p.estado_pago = estadoPago(p);
  return true;
}

// Valores de fábrica: llevan una fecha antigua y no entran a la cola de subida.
const FECHA_SEMILLA = '2000-01-01T00:00:00.000Z';
const esSemilla = r => String(r?.updated_at || '').startsWith('2000-01-01');
async function sembrar(tabla, rec) {
  Object.assign(rec, { creado_en: new Date().toISOString(), updated_at: FECHA_SEMILLA, eliminado: false });
  D[tabla].set(rec.id, rec); await idb.put(tabla, rec);
}
async function iniciarDatos() {
  db = await abrirDB();
  for (const t of TABLAS) D[t] = new Map((await idb.all(t)).map(r => [r.id, r]));
  CFG = (await idb.get('config', 'cfg')) || {};
  delete CFG.clave;
  CLUB = { ...CLUB_BASE, ...(CFG.club || {}) };
  (await idb.all('cola')).forEach(c => COLA.add(c.clave));
  for (const im of await idb.all('imagenes')) IMG[im.clave] = URL.createObjectURL(im.blob);
  if (!CFG.sembrado) {
    for (const p of PRODUCTOS_INICIALES) await sembrar('productos', { disponible: true, en_catalogo: true, imagen_url: '', _img_pendiente: true, ...p });
    for (const p of PACKS_INICIALES) await sembrar('packs', { activo: true, imagen_url: '', imagen_local: 'img/productos/pack.jpg', _img_pendiente: true, ...p });
    CFG.sembrado = true; await guardarConfig();
  }
  for (const p of [...D.productos.values()]) if (p.costo == null && COSTOS_BASE[p.sabor] != null) { p.costo = COSTOS_BASE[p.sabor]; esSemilla(p) ? await idb.put('productos', p) : await guardar('productos', p); }
  for (const c of [...D.clientes.values()]) if (!c.tipo_cliente) { c.tipo_cliente = 'persona'; c._demo ? await idb.put('clientes', c) : await guardar('clientes', c); }
  for (const p of [...D.pedidos.values()]) if (migrarPedido(p)) { p._demo ? await idb.put('pedidos', p) : await guardar('pedidos', p); }
}

const fotoDe = (tabla, r) => IMG[`${tabla}/${r.id}`] || r.imagen_url || r.imagen_local || 'img/productos/pack.jpg';
const productoDeSabor = sabor => lista('productos').find(p => p.sabor === sabor);
const precioSuelto = sabor => +(productoDeSabor(sabor)?.precio || 0);
const packsActivos = () => lista('packs').filter(p => p.activo !== false).sort((a, b) => (a.orden || 0) - (b.orden || 0));
const precioPack = (pack, nivel) => { const v = pack?.['precio_' + nivel]; return v == null || v === '' ? null : +v; };

// ------------------------------------------------------------------ costos y margen
// Cada pedido guarda el costo de lo que llevó (costo_unit en cada ítem y `costo` total), así el
// margen de un pedido viejo no cambia si luego cambias el costo del producto.
const costoSabor = sabor => { const c = productoDeSabor(sabor)?.costo; return c != null && c !== '' ? +c : (COSTOS_BASE[sabor] || 0); };
const costoProducto = id => { const p = D.productos.get(id); return p ? (p.costo != null && p.costo !== '' ? +p.costo : (COSTOS_BASE[p.sabor] || 0)) : 0; };
const pct = n => (Math.round(n * 10) / 10).toLocaleString('es-PE') + '%';
const margenDe = (precio, costo) => precio > 0 ? (precio - costo) / precio * 100 : 0;
const claseMargen = m => m >= MARGEN_MINIMO ? 'm-ok' : m >= 30 ? 'm-medio' : 'm-bajo';
function costoItem(i) {
  if (i.tipo === 'pack') return i.costo != null ? +i.costo : Object.entries(i.sabores || {}).reduce((a, [s, n]) => a + n * costoSabor(s), 0);
  const u = i.costo_unit != null ? +i.costo_unit : i.tipo === 'linea' ? (i.producto_id ? costoProducto(i.producto_id) : 0) : costoSabor(i.sabor);
  return u * (i.tipo === 'regalo' ? 1 : (+i.cantidad || 0));
}
// Rentabilidad de un pedido: lo que entra (sin IGV) menos mantequillas, regalos y lo que pagas al courier.
function rentabilidad(p) {
  const items = p.items || [];
  const costoProd = r2(items.filter(i => i.tipo !== 'regalo').reduce((a, i) => a + costoItem(i), 0));
  const costoRegalo = r2(items.filter(i => i.tipo === 'regalo').reduce((a, i) => a + costoItem(i), 0));
  const courier = +p.courier?.costo || 0;
  const envio = +p.envio || 0;
  const ingreso = r2((+p.total || 0) - (+p.igv || 0));
  const ventaProd = r2(ingreso - envio);
  const ganancia = r2(ingreso - costoProd - costoRegalo - courier);
  // precio de lista: todos los frascos a precio suelto (B2C) o las líneas tal cual (B2B)
  const lista_ = r2(items.reduce((a, i) => a + (i.tipo === 'pack' ? Object.entries(i.sabores || {}).reduce((b, [s, n]) => b + n * precioSuelto(s), 0)
    : i.tipo === 'suelto' ? (+i.cantidad || 0) * (i.precio_unit ?? precioSuelto(i.sabor)) : i.tipo === 'linea' ? (+i.cantidad || 0) * (+i.precio_unit || 0) : 0), 0));
  const frascos = items.reduce((a, i) => a + (i.tipo === 'pack' ? Object.values(i.sabores || {}).reduce((b, n) => b + n, 0) : i.tipo === 'regalo' ? 1 : (+i.cantidad || 0)), 0);
  return { ingreso, ventaProd, envio, courier, deliveryNeto: r2(envio - courier), costoProd, costoRegalo, costo: r2(costoProd + costoRegalo), ganancia,
    margen: ingreso > 0 ? ganancia / ingreso * 100 : 0, lista: lista_, frascos };
}
// Margen de un pack con la mezcla más cara y la más barata de sabores.
function margenPack(pk, precio) {
  if (precio == null) return null;
  const n = +pk.frascos || 0;
  if (pk.tipo === 'almendra') { const c = n * costoSabor('almendra'); return { min: margenDe(precio, c), max: margenDe(precio, c) }; }
  const otros = SABORES.filter(s => s.id !== 'almendra').map(s => costoSabor(s.id));
  const alm = Math.min(+pk.max_almendra || 0, n);
  const caro = alm * costoSabor('almendra') + (n - alm) * Math.max(...otros);
  const barato = n * Math.min(...otros, costoSabor('almendra'));
  return { min: margenDe(precio, caro), max: margenDe(precio, barato) };
}

// ------------------------------------------------------------------ pagos y estados del pedido
const pagadoDe = p => r2((p.pagos || []).reduce((a, x) => a + (+x.monto || 0), 0));
const saldoDe = p => p.anulado ? 0 : Math.max(0, r2((+p.total || 0) - pagadoDe(p)));
function estadoPago(p) {
  if (p.anulado) return 'anulado';
  const pg = pagadoDe(p);
  if (pg >= (+p.total || 0) - 0.009) return 'pagado';
  return pg > 0 ? 'parcial' : 'pendiente';
}
const esVenta = p => !p.anulado && !p.eliminado && (pagadoDe(p) > 0 || p.estado_entrega === 'entregado');
const vencido = p => p.modalidad_pago === 'credito' && saldoDe(p) > 0 && p.fecha_vencimiento && p.fecha_vencimiento < hoy();
const metodosDe = p => [...new Set((p.pagos || []).map(x => x.metodo))].join(' + ');

// ------------------------------------------------------------------ Club: sellos, niveles y regalos
let CACHE = null; let INV = null;
const invalidar = () => { CACHE = null; INV = null; };
const tienePack = p => (p.items || []).some(i => i.tipo === 'pack');
const fechaSello = p => p.entregado_en || p.fecha;
// Un pedido suma sello cuando es B2C, tiene pack, está pagado y entregado.
const daSello = p => p.canal !== 'b2b' && !p.anulado && tienePack(p) && estadoPago(p) === 'pagado' && p.estado_entrega === 'entregado';

function frascosDe(p) {
  const out = { vendidos: {}, regalo: {} };
  for (const i of p.items || []) {
    if (i.tipo === 'pack') for (const [s, n] of Object.entries(i.sabores || {})) out.vendidos[s] = (out.vendidos[s] || 0) + n;
    if (i.tipo === 'suelto') out.vendidos[i.sabor] = (out.vendidos[i.sabor] || 0) + (i.cantidad || 0);
    if (i.tipo === 'linea') { const s = D.productos.get(i.producto_id)?.sabor; if (s) out.vendidos[s] = (out.vendidos[s] || 0) + (+i.cantidad || 0); }
    if (i.tipo === 'regalo') out.regalo[i.sabor] = (out.regalo[i.sabor] || 0) + 1;
  }
  return out;
}

function club() {
  if (CACHE) return CACHE;
  const est = {};
  const clientes = lista('clientes');
  const pedidos = lista('pedidos').filter(p => !p.anulado);
  for (const c of clientes) est[c.id] = {
    compras: 0, amigos: 0, resenas: 0, ajustes: 0, total: 0, pedidos: [], ventas: [], gasto: 0, saldo: 0, ganancia: 0, ingreso: 0,
    sabores: {}, packs: {}, regalosUsados: 0, amigosLista: [], ultima: null, primera: null, fechasSello: [],
  };
  for (const p of pedidos) {
    const e = est[p.cliente_id]; if (!e) continue;
    e.pedidos.push(p);
    e.saldo = r2(e.saldo + saldoDe(p));
    const f = frascosDe(p);
    e.regalosUsados += Object.values(f.regalo).reduce((a, b) => a + b, 0);
    if (esVenta(p)) {
      e.ventas.push(p); e.gasto += +p.total || 0;
      const R = rentabilidad(p); e.ganancia += R.ganancia; e.ingreso += R.ingreso;
      for (const [s, n] of Object.entries(f.vendidos)) e.sabores[s] = (e.sabores[s] || 0) + n;
      for (const i of p.items || []) {
        const k = i.tipo === 'pack' ? i.nombre : i.tipo === 'suelto' ? 'Frascos sueltos' : i.tipo === 'linea' ? i.nombre : null;
        if (k) e.packs[k] = (e.packs[k] || 0) + (i.tipo === 'pack' ? 1 : +i.cantidad || 0);
      }
      const d = aFecha(p.fecha);
      if (!e.ultima || d > e.ultima) e.ultima = d;
      if (!e.primera || d < e.primera) e.primera = d;
    }
    if (daSello(p)) { e.compras++; e.fechasSello.push(String(fechaSello(p)).slice(0, 10)); }
  }
  // referidos: +1 sello al que refirió cuando el amigo recibe (y paga) su primer pack
  for (const c of clientes) {
    if (!c.referido_por || !est[c.referido_por]) continue;
    const e = est[c.referido_por];
    const compro = est[c.id].pedidos.filter(daSello).sort((a, b) => fechaSello(a) < fechaSello(b) ? -1 : 1)[0];
    e.amigosLista.push({ cliente: c, pedido: compro || null });
    if (compro) { e.amigos++; e.fechasSello.push(String(fechaSello(compro)).slice(0, 10)); }
  }
  for (const s of lista('sellos_extra')) {
    const e = est[s.cliente_id]; if (!e) continue;
    if (s.tipo === 'resena') e.resenas += +s.cantidad || 1; else e.ajustes += +s.cantidad || 0;
    for (let i = 0; i < (+s.cantidad || 0); i++) e.fechasSello.push(String(s.fecha).slice(0, 10));
  }
  for (const c of clientes) {
    const e = est[c.id];
    e.total = Math.max(0, e.compras + e.amigos + e.resenas + e.ajustes);
    e.nivelAuto = e.total >= CLUB.leyenda_sellos ? 'leyenda' : (e.total >= CLUB.vip_sellos && e.compras >= CLUB.vip_min_compras ? 'vip' : 'oficial');
    e.manual = !!c.nivel_manual;
    e.nivel = c.nivel_manual || e.nivelAuto;
    e.dias = e.ultima ? diasEntre(e.ultima) : null;
    e.pausa = !esEmpresa(c) && e.nivel !== 'oficial' && e.dias != null && e.dias > CLUB.dias_pausa;
    e.regalosGanados = Math.floor(e.total / CLUB.regalo_cada);
    e.regalosPend = Math.max(0, e.regalosGanados - e.regalosUsados);
    e.fechasSello.sort();
    e.regaloFecha = e.regalosGanados ? (e.fechasSello[e.regalosGanados * CLUB.regalo_cada - 1] || e.fechasSello[e.fechasSello.length - 1] || null) : null;
    const fechas = e.ventas.map(p => aFecha(p.fecha)).sort((a, b) => a - b);
    e.frecuencia = fechas.length > 1 ? Math.round(diasEntre(fechas[0], fechas[fechas.length - 1]) / (fechas.length - 1)) : null;
    e.proxima = e.frecuencia && e.ultima ? new Date(+e.ultima + e.frecuencia * 86400000) : null;
    e.favorito = Object.entries(e.sabores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    e.margen = e.ingreso ? e.ganancia / e.ingreso * 100 : 0;
    e.faltaVip = e.nivelAuto === 'oficial' ? Math.max(CLUB.vip_sellos - e.total, CLUB.vip_min_compras - e.compras, 0) : 0;
  }
  CACHE = est;
  return est;
}
const statsDe = id => club()[id] || null;
// Nivel con el que se cobra: si está en pausa, se cobra oficial hasta su siguiente pedido.
const nivelParaCobrar = id => { const e = statsDe(id); return !e ? 'oficial' : (e.pausa ? 'oficial' : e.nivel); };

function siguienteMeta(e) {
  const m = [];
  if (e.nivelAuto === 'oficial') {
    if (e.compras < CLUB.vip_min_compras && e.total >= CLUB.vip_sellos) m.push(`le faltan ${plural(CLUB.vip_min_compras - e.compras, 'compra')} propias para VIP`);
    else m.push(`le ${e.faltaVip === 1 ? 'falta' : 'faltan'} ${plural(e.faltaVip, 'sello')} para VIP`);
  } else if (e.nivelAuto === 'vip') m.push(`le faltan ${plural(CLUB.leyenda_sellos - e.total, 'sello')} para Leyenda`);
  const r = CLUB.regalo_cada - (e.total % CLUB.regalo_cada);
  m.push(`${plural(r, 'sello')} para su próximo regalo`);
  return m.join(' · ');
}

// Historias y reseñas: el encargado las registra a mano y suman 1 sello.
function puedeResena(cid, pedidoId) {
  const mes = hoy().slice(0, 7);
  const delMes = lista('sellos_extra').filter(s => s.cliente_id === cid && s.tipo === 'resena' && String(s.fecha).startsWith(mes)).length;
  if (CLUB.resenas_mes > 0 && delMes >= CLUB.resenas_mes) return `Ya sumó ${plural(delMes, 'historia/reseña', 'historias/reseñas')} este mes (máximo ${CLUB.resenas_mes}).`;
  if (CLUB.resena_requiere_pedido && !pedidoId) return 'Elige de qué pedido entregado es la historia o reseña.';
  if (pedidoId && lista('sellos_extra').some(s => s.tipo === 'resena' && s.pedido_id === pedidoId)) return 'Ese pedido ya tiene su historia/reseña (1 por pedido).';
  return null;
}
const pedidosParaResena = cid => {
  const usados = new Set(lista('sellos_extra').filter(s => s.tipo === 'resena').map(s => s.pedido_id));
  return lista('pedidos').filter(p => p.cliente_id === cid && !p.anulado && p.estado_entrega === 'entregado' && !usados.has(p.id)).sort((a, b) => b.fecha.localeCompare(a.fecha));
};
async function registrarResena(cid, { red, link, pedido_id, nota }) {
  const err = puedeResena(cid, pedido_id); if (err) return err;
  const antes = { ...statsDe(cid) };
  const rec = { id: uid(), cliente_id: cid, tipo: 'resena', cantidad: 1, pedido_id: pedido_id || null, red, link: link || '', nota: nota || '', fecha: hoy() };
  if (D.clientes.get(cid)?._demo) rec._demo = true;
  await guardar('sellos_extra', rec);
  anunciarCambios(cid, antes);
  return null;
}

// Código de referido: PEANUT-NOMBRE (si se repite, + inicial del apellido, luego un número).
// Solo letras sin tilde, números y guiones, para que se pueda dictar y copiar sin errores.
const limpiarCodigo = v => norm(v).toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
// Los clientes de prueba ya borrados no reservan su código (PEANUT-ANDREA queda libre para uno real).
const reservaCodigo = c => !(c.eliminado && fuePrueba('clientes', c.id));
const codigoUsado = (cod, excluirId) => [...D.clientes.values()].some(c => c.id !== excluirId && reservaCodigo(c) && c.codigo && c.codigo === cod);
function generarCodigo(nombre, apellido, excluirId) {
  const usados = new Set([...D.clientes.values()].filter(c => c.id !== excluirId && reservaCodigo(c)).map(c => c.codigo));
  const limpio = s => norm(s).toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
  const base = 'PEANUT-' + (limpio(nombre).split(/\s+/)[0] || 'AMIGO');
  if (!usados.has(base)) return base;
  const b2 = base + (limpio(apellido)[0] || '');
  if (b2 !== base && !usados.has(b2)) return b2;
  let n = 2; while (usados.has(base + n)) n++;
  return base + n;
}
function buscarClientes(q, limite = 8, tipo = null) {
  const t = norm(q); const d = soloDigitos(q);
  if (!t) return [];
  return lista('clientes').filter(c => (!tipo || (c.tipo_cliente || 'persona') === tipo) && (() => {
    const txt = norm(`${c.nombre} ${c.apellido} ${c.codigo} ${c.distrito} ${c.razon_social} ${c.contacto} ${c.ruc} ${c.correo}`);
    return t.split(/\s+/).every(p => txt.includes(p)) || (d.length >= 3 && (soloDigitos(c.celular).includes(d) || soloDigitos(c.ruc).includes(d)));
  })()).slice(0, limite);
}
const clientePorCelular = (cel, excluir) => { const n = celNorm(cel); return n.length === 9 ? lista('clientes').find(c => c.id !== excluir && celNorm(c.celular) === n) : null; };

// ------------------------------------------------------------------ páginas de detalle
// Crear/editar pedido, cliente, producto o pack se abre como una página dentro del panel
// (no como ventana flotante). "Volver" regresa a la pestaña donde estabas.
function pagina(html) {
  document.querySelectorAll('.vista').forEach(s => s.classList.remove('activa'));
  const pg = $('#v-pagina');
  pg.innerHTML = `<div class="pagina">${html}</div>`;
  pg.classList.add('activa');
  window.scrollTo(0, 0);
}
function volver() {
  const pg = $('#v-pagina'); pg.innerHTML = ''; pg.classList.remove('activa');
  $('#v-' + UI.vista).classList.add('activa');
  render(); window.scrollTo(0, 0);
}
const cabPagina = (t, extra = '') => `<div class="modal-cab"><button class="btn mini" onclick="volver()">← Volver</button><h2>${t}</h2>${extra}</div>`;

// ------------------------------------------------------------------ navegación
const UI = {
  vista: 'inicio',
  ped: { filtro: 'atender', canal: 'todos', q: '', mes: hoy().slice(0, 7) },
  cli: { q: '', nivel: 'todos', tipo: 'persona', orden: 'reciente' },
  club: 'resumen', ajustes: 'conexion',
  ana: { periodo: '90', canal: 'todos', cliente: '', riesgo: 'todos' },
};
const ORDEN_VISTAS = ['inicio', 'pedidos', 'clientes', 'analisis', 'club', 'productos', 'inventario', 'ajustes'];
const VISTAS = { inicio: () => renderInicio(), pedidos: () => renderPedidos(), clientes: () => renderClientes(), analisis: () => renderAnalisis(), club: () => renderClub(), productos: () => renderProductos(), inventario: () => renderInventario(), ajustes: () => renderAjustes() };
// La pestaña (y la subpágina de Club / Sincronización) se recuerda: al recargar vuelves al mismo lugar.
function recordarVista() {
  const h_ = '#' + UI.vista + (UI.vista === 'club' && UI.club !== 'resumen' ? '/' + UI.club : UI.vista === 'ajustes' && UI.ajustes !== 'conexion' ? '/' + UI.ajustes : '');
  if (location.hash !== h_) history.replaceState(null, '', h_);
  try { localStorage.setItem('mrp_vista', h_); } catch { }
}
function vistaGuardada() {
  let h_ = location.hash;
  if (!h_) try { h_ = localStorage.getItem('mrp_vista') || ''; } catch { }
  const [v, sub] = h_.replace('#', '').split('/');
  if (!VISTAS[v]) return null;
  if (v === 'club' && ['resumen', 'actividad', 'variables'].includes(sub)) UI.club = sub;
  if (v === 'ajustes' && ['conexion', 'negocio', 'datos'].includes(sub)) UI.ajustes = sub;
  return v;
}
function ir(v) {
  UI.vista = v; recordarVista();
  $('#v-pagina').innerHTML = '';
  document.querySelectorAll('nav.tabs [data-vista]').forEach(b => b.classList.toggle('activo', b.dataset.vista === v));
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('activa', s.id === 'v-' + v));
  cerrarMas(); acomodarMenu();
  render(); window.scrollTo(0, 0);
}
const render = () => { VISTAS[UI.vista](); pintarCampana(); };

// Menú que se achica: las pestañas que no entran pasan al botón "Más" (sin barra de scroll).
function acomodarMenu() {
  const lista = $('#tabs-lista'), caja = $('#tabs-mas'), menu = $('#menu-mas');
  if (!lista) return;
  [...lista.children, ...menu.children].sort((a, b) => ORDEN_VISTAS.indexOf(a.dataset.vista) - ORDEN_VISTAS.indexOf(b.dataset.vista)).forEach(b => lista.appendChild(b));
  caja.classList.add('oculto');
  if (lista.scrollWidth <= lista.clientWidth + 1) { $('#btn-mas').classList.remove('activo'); return; }
  caja.classList.remove('oculto');
  while (lista.scrollWidth > lista.clientWidth + 1 && lista.children.length > 1) menu.prepend(lista.lastElementChild);
  $('#btn-mas').classList.toggle('activo', !!menu.querySelector('.activo'));
}
function cerrarMas() { $('#menu-mas')?.classList.remove('abierto'); $('#btn-mas')?.setAttribute('aria-expanded', 'false'); }

// En celular las tablas se muestran como tarjetas: cada celda lleva el nombre de su columna.
function etiquetarTablas(root) {
  (root || document).querySelectorAll('table').forEach(t => {
    const ths = [...t.querySelectorAll(':scope > thead th')].map(th => th.textContent.trim());
    if (!ths.length) return;
    t.classList.add('resp');
    t.querySelectorAll(':scope > tbody > tr').forEach(tr => [...tr.children].forEach((td, i) => {
      if (td.hasAttribute('data-label')) return;
      td.setAttribute('data-label', ths[i] || '');
      if (td.childNodes.length > 1 && !td.classList.contains('vacio')) { const c = document.createElement('div'); c.className = 'celda'; c.append(...td.childNodes); td.append(c); }
    }));
  });
}

// ==================================================================== MENSAJES DE WHATSAPP
function detalleTexto(p) {
  return (p.items || []).map(i => {
    if (i.tipo === 'pack') return `• ${i.nombre}: ${Object.entries(i.sabores || {}).filter(([, n]) => n).map(([k, n]) => `${n} ${nombreSabor(k)}`).join(', ')} — ${soles(i.precio)}`;
    if (i.tipo === 'suelto') return `• ${i.cantidad} ${nombreSabor(i.sabor)} suelto — ${soles(i.cantidad * i.precio_unit)}`;
    if (i.tipo === 'linea') return `• ${i.cantidad} × ${i.nombre} — ${soles(i.cantidad * i.precio_unit)}`;
    return `• 🎁 Regalo del Club: 1 ${nombreSabor(i.sabor)}`;
  }).join('\n');
}

// Etapa del pedido -> mensaje que se sugiere al tocar WhatsApp.
function faseSugerida(p) {
  if (p.anulado) return 'confirmar';
  const sal = saldoDe(p), pg = pagadoDe(p);
  if (p.estado_entrega === 'entregado') return sal > 0 ? 'cobro' : 'gracias';
  if (p.estado_entrega === 'en_camino') return 'en_camino';
  if (p.estado_entrega === 'preparado') return 'listo';
  if (vencido(p)) return 'cobro';
  if (sal > 0 && pg > 0 && p.modalidad_pago === 'anticipado') return 'saldo';
  if (sal === 0 && pg > 0) return 'pago_recibido';
  return 'confirmar';
}

function plantillas(p, c) {
  const b2b = p.canal === 'b2b';
  const nombre = saludo(c) || '';
  const dir = p.direccion_envio || c?.direccion_envio || c?.direccion || '';
  const sal = saldoDe(p); const pg = pagadoDe(p);
  const datosPago = CFG.datos_pago ? `Puedes pagar por ${CFG.datos_pago}.` : 'Puedes pagar por Yape o Plin.';
  const cuando = p.fecha_entrega ? ` el ${fechaLarga(p.fecha_entrega)}` : '';
  const cobroCE = sal > 0 && p.modalidad_pago === 'contra_entrega' ? `Al recibirlo pagas *${soles(sal)}* (Yape, Plin o efectivo).\n` : '';
  const docs = [p.comprobante?.numero ? `${p.comprobante.tipo === 'factura' ? 'Factura' : 'Boleta'}: ${p.comprobante.numero}` : null,
    b2b && p.guia?.numero ? `Guía de remisión: ${p.guia.numero}` : null].filter(Boolean).join('\n');
  const cabeza = b2b ? `Hola ${nombre} 👋 Te saluda Mr. Peanut 🥜` : `¡Hola ${nombre}! 👋 Te saluda Mr. Peanut 🥜`;
  const lineaPago = p.modalidad_pago === 'contra_entrega' ? `Pagas *${soles(p.total)}* al recibir tu pedido.`
    : p.modalidad_pago === 'credito' ? `Crédito: vence el ${fechaCorta(p.fecha_vencimiento)}.` : `${datosPago} Envíanos la captura y lo preparamos.`;
  const cour = p.courier || {};
  const courierTxt = cour.conductor || cour.empresa ? `Lo lleva ${[cour.conductor, cour.empresa && `(${cour.empresa}${cour.placa ? ', placa ' + cour.placa : ''})`].filter(Boolean).join(' ')}${cour.celular ? ` · cel. ${cour.celular}` : ''}.\n${cour.seguimiento ? `Síguelo aquí: ${cour.seguimiento}\n` : ''}` : '';
  let club = '';
  if (!b2b && c && !esEmpresa(c) && D.clientes.get(c.id)) {
    const e = statsDe(c.id);
    if (e) club = `Llevas *${plural(e.total, 'sello')}* en tu tarjeta Mr. Peanut (${NIVELES[e.nivel]}).\n${e.regalosPend ? `🎁 ¡Ganaste ${e.regalosPend === 1 ? 'una mantequilla' : plural(e.regalosPend, 'mantequilla')} de regalo del sabor que quieras para tu próximo pedido!\n` : `Te ${CLUB.regalo_cada - (e.total % CLUB.regalo_cada) === 1 ? 'falta 1 sello' : `faltan ${CLUB.regalo_cada - (e.total % CLUB.regalo_cada)} sellos`} para tu mantequilla de regalo.\n`}Tu código para amigos: *${c.codigo}* (tu amigo paga S/${CLUB.desc_referido} menos en su primer pack y tú ganas un sello).\n`;
  }
  const T = {
    confirmar: { t: 'Confirmar pedido', x: `${cabeza}\nRegistramos tu pedido *${p.numero || ''}*:\n${detalleTexto(p)}\n${+p.envio ? `• Envío — ${soles(p.envio)}\n` : ''}\n*Total: ${soles(p.total)}*${b2b ? ' (incluye IGV)' : ''}\n${lineaPago}\n\nEntrega en: ${dir}${cuando}\n¿Nos confirmas que todo está correcto?` },
    pago_recibido: { t: 'Pago recibido', x: `${cabeza}\n¡Gracias! 🙌 Recibimos tu pago de *${soles(pg)}*.\nYa estamos preparando tu pedido *${p.numero}*.${docs ? '\n' + docs : ''}` },
    saldo: { t: 'Falta un saldo', x: `${cabeza}\nRecibimos *${soles(pg)}* de tu pedido *${p.numero}*. Queda un saldo de *${soles(sal)}*.\n${datosPago} ¡Gracias!` },
    listo: { t: 'Pedido listo', x: `${cabeza}\n¡Tu pedido *${p.numero}* ya está listo! 🥜\nTe lo llevamos a ${dir}${cuando}.\n${cobroCE}¿Nos confirmas que estarás para recibirlo?` },
    en_camino: { t: 'En camino', x: `${cabeza}\n¡Tu pedido *${p.numero}* ya va en camino! 🛵\n${courierTxt}Llega a: ${dir}\n${cobroCE}` },
    gracias: { t: b2b ? 'Entrega confirmada' : 'Pedido entregado + gracias', x: b2b
      ? `${cabeza}\nConfirmamos la entrega del pedido *${p.numero}* para ${c?.nombre || ''}.${docs ? '\n' + docs : ''}\n¡Muchas gracias por confiar en Mr. Peanut!`
      : `${cabeza}\nTu pedido *${p.numero}* ya fue entregado ✅ ¡Muchas gracias por tu compra!\n\n${club}📸 Si subes una historia o reseña con tu Mr. Peanut y nos etiquetas, te sumamos un sello extra.` },
    cobro: { t: 'Recordar pago', x: `${cabeza}\nTe recordamos el saldo pendiente de *${soles(sal)}* del pedido *${p.numero}*${p.fecha_vencimiento ? ` (vence el ${fechaCorta(p.fecha_vencimiento)})` : ''}.\n${datosPago} ¡Gracias!` },
  };
  return T;
}

// ==================================================================== NOTIFICACIONES
// Se calculan de los datos (no se guardan): regalos ganados, entregas de hoy, créditos vencidos y stock bajo.
function notificaciones() {
  const C = club(); const out = []; const hoyS = hoy();
  for (const c of lista('clientes')) {
    if (esEmpresa(c)) continue; const e = C[c.id]; if (!e.regalosPend) continue;
    out.push({ id: `regalo:${c.id}:${e.regalosGanados}`, icono: 'regalo', fecha: e.regaloFecha || hoyS,
      titulo: c.regalo_agendado ? `Regalo agendado: ${nombreCliente(c)}` : `${nombreCliente(c)} llegó a ${e.regalosGanados * CLUB.regalo_cada} sellos`,
      texto: c.regalo_agendado ? 'Su mantequilla de regalo se agrega sola en su próxima compra.' : `Le toca 1 mantequilla de regalo${e.favorito ? ` (le gusta la de ${nombreSabor(e.favorito)})` : ''}. Agéndala para su próxima compra.`,
      acciones: c.regalo_agendado ? [['Nuevo pedido', `NOTI.pedido('${c.id}')`], ['Avisarle', `NOTI.avisar('${c.id}')`]]
        : [['Agendar para su próxima compra', `NOTI.agendar('${c.id}')`], ['Avisarle por WhatsApp', `NOTI.avisar('${c.id}')`]] });
  }
  for (const p of lista('pedidos')) {
    if (p.anulado) continue;
    const c = D.clientes.get(p.cliente_id);
    if (vencido(p)) out.push({ id: `vence:${p.id}`, icono: 'dinero', fecha: p.fecha_vencimiento, titulo: `Crédito vencido: ${p.numero}`, texto: `${nombreCliente(c)} debe ${soles(saldoDe(p))}.`, acciones: [['Abrir pedido', `NOTI.abrir('${p.id}')`]] });
    if (p.estado_entrega !== 'entregado' && p.fecha_entrega && p.fecha_entrega <= hoyS) out.push({ id: `entrega:${p.id}:${p.fecha_entrega}`, icono: 'camion', fecha: p.fecha_entrega,
      titulo: p.fecha_entrega === hoyS ? `Entregar hoy: ${p.numero}` : `Entrega atrasada: ${p.numero}`, texto: `${nombreCliente(c)} · ${p.direccion_envio || ''}`, acciones: [['Abrir pedido', `NOTI.abrir('${p.id}')`]] });
  }
  for (const pr of lista('productos')) if (stockDe(pr.id) <= stockMin(pr.id)) out.push({ id: `stock:${pr.id}:${hoyS.slice(0, 7)}`, icono: 'alerta', fecha: hoyS, titulo: `Stock bajo: ${nombreSabor(pr.sabor)}`, texto: `Quedan ${stockDe(pr.id)} frascos (mínimo ${stockMin(pr.id)}).`, acciones: [['Registrar entrada', `NOTI.entrada('${pr.id}')`]] });
  return out.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}
const NOTI = {
  leidas: () => CFG.notif_leidas || {},
  noLeidas: () => notificaciones().filter(n => !NOTI.leidas()[n.id]),
  async marcar(ids) { CFG.notif_leidas = { ...NOTI.leidas(), ...Object.fromEntries(ids.map(i => [i, 1])) }; await guardarConfig(); pintarCampana(); if (UI.vista === 'inicio' && !$('#v-pagina').innerHTML) renderInicio(); },
  async agendar(cid) {
    const c = D.clientes.get(cid); if (!c) return;
    c.regalo_agendado = true; await guardar('clientes', c);
    await NOTI.marcar(notificaciones().filter(n => n.id.startsWith(`regalo:${cid}:`)).map(n => n.id));
    toast(`Regalo agendado: se agrega solo en la próxima compra de ${c.nombre}.`);
    if ($('#v-pagina').innerHTML && CF?.id === cid) CLI.abrir(cid); else if (!$('#v-pagina').innerHTML) render();
  },
  avisar(cid) {
    const c = D.clientes.get(cid); const e = statsDe(cid);
    abrirWhatsApp(c.celular, `¡Hola ${c.nombre}! 👋 Te saluda Mr. Peanut 🥜\nTe cuento que ya llegaste a tus *${e.regalosGanados * CLUB.regalo_cada} sellos* en tu tarjeta Mr. Peanut 🎉, así que *te regalamos una mantequilla del sabor que tú quieras* en tu próximo pedido 🎁\n¿Cuál te gustaría: Maní, Chocomaní, Crunchy o Almendra?`);
  },
  pedido(cid) { cerrarNotif(); PF.abrir(null, cid); },
  abrir(pid) { cerrarNotif(); PF.abrir(pid); },
  entrada(pid) { cerrarNotif(); INVF.abrir('entrada', pid); },
};
function itemNotif(n, leida) {
  return `<div class="notif ${leida ? 'leida' : ''}">${ic(n.icono)}<div class="cuerpo"><b>${h(n.titulo)}</b><span>${h(n.texto)}</span>
    <small>${fechaCorta(n.fecha)}</small><div class="fila">${n.acciones.map(([t, f]) => `<button class="btn mini" onclick="${f}">${t}</button>`).join('')}
    ${leida ? '' : `<button class="btn mini" onclick="NOTI.marcar(['${n.id}'])" title="Marcar como leída">Listo</button>`}</div></div></div>`;
}
function pintarCampana() {
  const lista = notificaciones(); const leidas = NOTI.leidas();
  const nuevas = lista.filter(n => !leidas[n.id]);
  const b = $('#notif-n'); if (b) { b.textContent = nuevas.length; b.classList.toggle('oculto', !nuevas.length); }
  const panel = $('#panel-notif'); if (!panel || !panel.classList.contains('abierto')) return;
  panel.innerHTML = `<div class="notif-cab"><b>Notificaciones</b>${nuevas.length ? `<button class="btn mini" onclick="NOTI.marcar(${h(JSON.stringify(nuevas.map(n => n.id)))})">Marcar todas como leídas</button>` : ''}</div>
    ${lista.length ? [...nuevas, ...lista.filter(n => leidas[n.id])].slice(0, 30).map(n => itemNotif(n, !!leidas[n.id])).join('') : '<p class="suave" style="padding:10px">No hay notificaciones.</p>'}`;
}
function cerrarNotif() { $('#panel-notif')?.classList.remove('abierto'); }

// ==================================================================== INICIO (dashboard)
function renderInicio() {
  const C = club(); const inv = inventario();
  const activos = lista('pedidos').filter(p => !p.anulado);
  const hoyS = hoy(); const mes = hoyS.slice(0, 7); const d = new Date();
  const mesAnt = isoLocal(new Date(d.getFullYear(), d.getMonth() - 1, 15)).slice(0, 7);
  const ventas = f => activos.filter(p => esVenta(p) && f(p));
  const suma = arr => arr.reduce((a, p) => a + (+p.total || 0), 0);
  const vHoy = ventas(p => p.fecha === hoyS), vMes = ventas(p => p.fecha?.startsWith(mes));
  const vAnt = suma(ventas(p => p.fecha?.startsWith(mesAnt) && +p.fecha.slice(8) <= d.getDate()));
  const cambio = vAnt ? Math.round((suma(vMes) / vAnt - 1) * 100) : null;
  const porCobrar = activos.filter(p => saldoDe(p) > 0); const vencidos = porCobrar.filter(vencido);
  const porEntregar = activos.filter(p => p.estado_entrega !== 'entregado');
  const clientesActivos = lista('clientes').filter(c => C[c.id].dias != null && C[c.id].dias <= 60).length;
  const en30 = sumarDias(hoyS, 30);
  const bajos = lista('productos').filter(p => stockDe(p.id) <= stockMin(p.id));
  const porVencer = Object.values(inv.lotes).filter(L => L.queda > 0 && L.vence && L.vence <= en30);
  const regalos = lista('clientes').filter(c => !esEmpresa(c) && C[c.id].regalosPend);
  const cercaVip = lista('clientes').filter(c => !esEmpresa(c) && C[c.id].nivelAuto === 'oficial' && !c.nivel_manual && C[c.id].faltaVip > 0 && C[c.id].faltaVip <= 2);
  const dormidos = lista('clientes').filter(c => { const e = C[c.id]; return e.ultima && (e.dias >= 30 || (e.frecuencia && e.dias > e.frecuencia + 3)); });
  const sinDoc = activos.filter(p => esVenta(p) && !p.comprobante?.numero);
  const orden = { en_camino: 0, preparado: 1, por_preparar: 2 };
  const agenda = [...porEntregar].sort((a, b) => orden[a.estado_entrega] - orden[b.estado_entrega] || (a.fecha_entrega || '9').localeCompare(b.fecha_entrega || '9') || a.fecha.localeCompare(b.fecha)).slice(0, 8);
  const dias14 = Array.from({ length: 14 }, (_, i) => sumarDias(hoyS, i - 13));
  const porDia = dias14.map(f => [f, suma(ventas(p => p.fecha === f))]); const maxDia = Math.max(1, ...porDia.map(x => x[1]));
  const sab = {}; vMes.forEach(p => Object.entries(frascosDe(p).vendidos).forEach(([k, n]) => { sab[k] = (sab[k] || 0) + n; }));
  const canal = { B2C: suma(vMes.filter(p => p.canal !== 'b2b')), B2B: suma(vMes.filter(p => p.canal === 'b2b')) };
  const alertas = [
    [bajos.length, 'alerta', `Productos con stock bajo${bajos.length ? ': ' + bajos.map(p => nombreSabor(p.sabor)).join(', ') : ''}`, "ir('inventario')"],
    [porVencer.length, 'calendario', 'Lotes que vencen en 30 días', "ir('inventario')"],
    [vencidos.length, 'dinero', 'Créditos B2B vencidos', "UI.ped.filtro='cobrar';UI.ped.canal='b2b';ir('pedidos')"],
    [sinDoc.length, 'pedidos', 'Ventas sin boleta o factura', "UI.ped.filtro='documento';UI.ped.canal='todos';ir('pedidos')"],
    [regalos.length, 'regalo', 'Clientes con regalo del Club por entregar', "ir('club')"],
    [cercaVip.length, 'estrella', 'Clientes a 1 o 2 sellos del VIP', "ir('club')"],
    [dormidos.length, 'reloj', 'Clientes que no están comprando', "ir('analisis')"],
  ].filter(a => a[0] > 0);
  const kpi = (icono, t, v, em, onclick) => `<div class="kpi clic" onclick="${onclick}" role="button" tabindex="0"><small>${ic(icono)} ${t}</small><b class="num">${v}</b><em>${em}</em></div>`;
  $('#v-inicio').innerHTML = `
    <div class="hola">
      <div><h2>¡Hola! Hoy es ${fechaLarga(hoyS)}</h2>
        <p>${plural(porEntregar.length, 'pedido')} por entregar · ${soles(porCobrar.reduce((a, p) => a + saldoDe(p), 0))} por cobrar</p></div>
      <div class="acciones">
        <button class="btn prim" onclick="PF.abrir()">${ic('mas-circ')} Nuevo pedido</button>
        <button class="btn" onclick="INVF.abrir('entrada')">${ic('inventario')} Entrada de stock</button>
        <button class="btn" onclick="ir('club')">${ic('camara')} Registrar historia</button>
      </div>
    </div>
    ${(() => { const nuevas = NOTI.noLeidas().slice(0, 4); return nuevas.length ? `<div class="card" style="margin-bottom:16px"><h3>${ic('campana')} Notificaciones <small class="suave">(${NOTI.noLeidas().length} nuevas)</small></h3><div class="notif-grid">${nuevas.map(n => itemNotif(n, false)).join('')}</div></div>` : ''; })()}
    <div class="kpis">
      ${kpi('dinero', 'Ventas de hoy', soles(suma(vHoy)), plural(vHoy.length, 'pedido'), "UI.ped.filtro='todos';ir('pedidos')")}
      ${kpi('analisis', 'Ventas del mes', soles(suma(vMes)), cambio == null ? plural(vMes.length, 'pedido') : `<b style="color:${cambio >= 0 ? 'var(--ok)' : 'var(--error)'}">${cambio >= 0 ? '▲' : '▼'} ${Math.abs(cambio)}%</b> vs. mismo día del mes pasado`, "ir('analisis')")}
      ${kpi('dinero', 'Por cobrar', soles(porCobrar.reduce((a, p) => a + saldoDe(p), 0)), `${plural(porCobrar.length, 'pedido')}${vencidos.length ? ` · <b style="color:var(--error)">${vencidos.length} vencido${vencidos.length === 1 ? '' : 's'}</b>` : ''}`, "UI.ped.filtro='cobrar';UI.ped.canal='todos';ir('pedidos')")}
      ${kpi('camion', 'Por entregar', porEntregar.length, `${porEntregar.filter(p => p.estado_entrega === 'preparado').length} listos · ${porEntregar.filter(p => p.estado_entrega === 'en_camino').length} en camino`, "UI.ped.filtro='entregar';UI.ped.canal='todos';ir('pedidos')")}
      ${kpi('clientes', 'Clientes activos', clientesActivos, 'compraron en los últimos 60 días', "ir('clientes')")}
      ${kpi('inventario', 'Frascos en stock', lista('productos').reduce((a, p) => a + Math.max(0, stockDe(p.id)), 0), bajos.length ? `<b style="color:var(--error)">${bajos.length} bajo el mínimo</b>` : 'todo sobre el mínimo', "ir('inventario')")}
    </div>
    <div class="grid g2">
      <div class="card"><h3>${ic('camion')} Entregas pendientes</h3>
        ${agenda.length ? `<div class="lista-hoy">${agenda.map(p => { const c = D.clientes.get(p.cliente_id); return `<div class="item">
          <span class="tag ${p.estado_entrega === 'en_camino' ? 'parcial' : p.estado_entrega === 'preparado' ? 'pagado' : 'pendiente'}">${ENTREGA[p.estado_entrega]}</span>
          <div style="flex:1;min-width:160px"><a href="#" onclick="PF.abrir('${p.id}');return false"><b>${h(p.numero)}</b></a> · ${h(nombreCliente(c))} ${tagCanal(p.canal)}<br>
            <small>${p.fecha_entrega ? `entrega ${fechaCorta(p.fecha_entrega)} · ` : ''}${h(p.direccion_envio || '')}</small></div>
          <b class="num">${soles(p.total)}</b>${saldoDe(p) > 0 ? `<small class="falta">debe ${soles(saldoDe(p))}</small>` : ''}
          <button class="btn mini wa" onclick="PED.whatsapp('${p.id}')" title="${h(plantillas(p, c)[faseSugerida(p)].t)}">${ic('wa')}</button></div>`; }).join('')}</div>
          ${porEntregar.length > agenda.length ? `<p style="margin:8px 0 0"><a href="#" onclick="UI.ped.filtro='entregar';ir('pedidos');return false">Ver los ${porEntregar.length}</a></p>` : ''}`
          : '<p class="suave">No hay entregas pendientes.</p>'}
      </div>
      <div class="card"><h3>${ic('alerta')} Para revisar</h3>
        ${alertas.length ? alertas.map(([n, icono, t, onclick]) => `<button class="alerta-item" onclick="${onclick}">${ic(icono)} <span>${h(t)}</span><span class="n">${n}</span></button>`).join('') : '<p class="suave">Todo en orden.</p>'}
      </div>
    </div>
    <div class="grid g3" style="margin-top:16px">
      <div class="card"><h3>Ventas de los últimos 14 días</h3><div class="columnas">${porDia.map(([f, v]) => `<div class="col" title="${fechaCorta(f)}: ${soles(v)}"><span style="height:${(v / maxDia) * 140}px;${f === hoyS ? 'background:var(--negro)' : ''}"></span>${+f.slice(8)}</div>`).join('')}</div></div>
      <div class="card"><h3>Sabores vendidos este mes</h3>${barras(SABORES.map(s => [s.nombre, sab[s.id] || 0, COLOR_SABOR[s.id]]).sort((a, b) => b[1] - a[1]), v => `${v} fr.`)}</div>
      <div class="card"><h3>Ventas del mes por canal</h3>${barras(Object.entries(canal), v => soles(v))}</div>
    </div>`;
}

// ==================================================================== PEDIDOS
function resumenItems(p) {
  return (p.items || []).map(i => {
    if (i.tipo === 'pack') return `<b>${h(i.nombre)}</b>: ${h(Object.entries(i.sabores || {}).filter(([, n]) => n).map(([k, n]) => `${n} ${nombreSabor(k)}`).join(', '))}`;
    if (i.tipo === 'suelto') return `${i.cantidad} ${h(nombreSabor(i.sabor))} suelto`;
    if (i.tipo === 'linea') return `${i.cantidad} × ${h(i.nombre)}`;
    if (i.tipo === 'regalo') return `${ic('regalo')} 1 ${h(nombreSabor(i.sabor))}`;
    return '';
  }).join(' · ');
}
function tagPago(p) {
  if (p.anulado) return '<span class="tag anulado">Cancelado</span>';
  const ep = estadoPago(p); const sal = saldoDe(p);
  const sub = p.modalidad_pago === 'contra_entrega' ? 'contra entrega' : p.modalidad_pago === 'credito' ? `vence ${fechaCorta(p.fecha_vencimiento)}` : '';
  if (ep === 'pagado') return `<span class="tag entregado">Pagado</span>${metodosDe(p) ? `<br><small>${h(metodosDe(p))}</small>` : ''}`;
  return `<span class="tag ${vencido(p) ? 'anulado' : ep === 'parcial' ? 'parcial' : 'pendiente'}">${vencido(p) ? 'Vencido' : ep === 'parcial' ? 'Parcial' : 'Pendiente'} · ${soles(sal)}</span>${sub ? `<br><small>${sub}</small>` : ''}`;
}
function tagDoc(p) {
  if (p.anulado) return '';
  const c = p.comprobante?.numero ? `<span class="codigo" style="font-size:12px">${h(p.comprobante.numero)}</span>` : `<small class="falta">sin ${p.canal === 'b2b' ? 'comprobante' : 'boleta'}</small>`;
  const g = p.canal === 'b2b' ? (p.guia?.numero ? `<br><small>GR ${h(p.guia.numero)}</small>` : '<br><small class="falta">sin guía</small>') : '';
  return c + g;
}

const FILTROS_PED = {
  atender: ['Por atender', p => !p.anulado && (p.estado_entrega !== 'entregado' || saldoDe(p) > 0)],
  cobrar: ['Pendientes de pago', p => !p.anulado && saldoDe(p) > 0],
  entregar: ['Por entregar', p => !p.anulado && p.estado_entrega !== 'entregado'],
  documento: ['Sin boleta / factura', p => !p.anulado && !p.comprobante?.numero],
  cerrados: ['Entregados y pagados', p => !p.anulado && p.estado_entrega === 'entregado' && saldoDe(p) === 0],
  anulados: ['Cancelados', p => p.anulado],
  todos: ['Todos', () => true],
};

const iniciales = c => { const n = nombreCliente(c).split(/\s+/).filter(Boolean); return h(((n[0]?.[0] || '?') + (n[1]?.[0] || '')).toUpperCase()); };
const avatar = (c, nivel) => `<span class="avatar ${esEmpresa(c) ? 'emp' : NIVEL_CLASE[nivel] || 'of'}" aria-hidden="true">${iniciales(c)}</span>`;
const nombreMes = m => { const [y, n] = m.split('-'); return `${MESES_L[+n - 1]} ${y}`; };
const chipCodigo = cod => cod ? `<button type="button" class="chip-cod" title="Copiar código" onclick="event.stopPropagation();copiar('${h(cod)}')">${h(cod)}${ic('copiar')}</button>` : '';

function renderPedidos() {
  const f = UI.ped;
  const todos = lista('pedidos').sort((a, b) => (b.fecha + (b.numero || '')).localeCompare(a.fecha + (a.numero || '')));
  const delCanal = todos.filter(p => f.canal === 'todos' || (p.canal || 'b2c') === f.canal);
  const mesActual = hoy().slice(0, 7);
  const delMes = delCanal.filter(p => p.fecha?.startsWith(mesActual) && esVenta(p));
  const ventaMes = delMes.reduce((a, p) => a + (+p.total || 0), 0);
  const rMes = delMes.map(rentabilidad);
  const ganMes = rMes.reduce((a, r) => a + r.ganancia, 0); const ingMes = rMes.reduce((a, r) => a + r.ingreso, 0);
  const porCobrar = delCanal.filter(p => !p.anulado && saldoDe(p) > 0);
  const vencidos = porCobrar.filter(vencido);
  const porEntregar = delCanal.filter(p => !p.anulado && p.estado_entrega !== 'entregado');
  const deHoy = delCanal.filter(p => p.fecha === hoy());
  const meses = [...new Set([mesActual, ...todos.map(p => String(p.fecha || '').slice(0, 7)).filter(Boolean)])].sort().reverse();
  let ps = delCanal.filter(FILTROS_PED[f.filtro][1]);
  if (f.mes) ps = ps.filter(p => p.fecha?.startsWith(f.mes));
  if (f.q) {
    const q = norm(f.q);
    ps = ps.filter(p => { const c = D.clientes.get(p.cliente_id); return norm(`${p.numero} ${nombreCliente(c)} ${c?.celular} ${c?.codigo} ${c?.ruc} ${p.comprobante?.numero} ${p.guia?.numero}`).includes(q); });
  }
  const hayFiltro = f.canal !== 'todos' || f.filtro !== 'atender' || f.mes !== mesActual || f.q;
  const totalLista = ps.filter(p => !p.anulado).reduce((a, p) => a + (+p.total || 0), 0);
  const C = club();
  const kpi = (filtro, icono, titulo, valor, sub, extra = '') => `<button type="button" class="kpi clic ${f.filtro === filtro ? 'sel' : ''}" onclick="UI.ped.filtro='${filtro}';renderPedidos()"><small>${ic(icono)} ${titulo}</small><b class="num">${valor}</b><em>${sub}</em>${extra}</button>`;
  $('#v-pedidos').innerHTML = `
    <div class="cab-vista">
      <div><h2>Pedidos</h2><span class="suave">Consumidores (B2C) y empresas (B2B). El pago y la entrega se siguen por separado.</span></div>
      <div class="der"><button class="btn prim" onclick="PF.abrir()">${ic('mas-circ')} Nuevo pedido</button></div>
    </div>
    <div class="kpis">
      <div class="kpi"><small>${ic('dinero')} Ventas de ${MESES_L[new Date().getMonth()]}</small><b class="num">${soles(ventaMes)}</b>
        <em>${plural(delMes.length, 'pedido')}${ingMes ? ` · ganancia <b class="${claseMargen(ganMes / ingMes * 100)}-txt">${soles(ganMes)}</b> (${pct(ganMes / ingMes * 100)})` : ''}</em></div>
      ${kpi('cobrar', 'alerta', 'Por cobrar', soles(porCobrar.reduce((a, p) => a + saldoDe(p), 0)), `${plural(porCobrar.length, 'pedido')}${vencidos.length ? ` · <b style="color:var(--error)">${vencidos.length} vencido${vencidos.length === 1 ? '' : 's'}</b>` : ''}`)}
      ${kpi('entregar', 'camion', 'Por entregar', porEntregar.length, `${porEntregar.filter(p => p.estado_entrega === 'preparado').length} listos · ${porEntregar.filter(p => p.estado_entrega === 'en_camino').length} en camino`)}
      <div class="kpi"><small>${ic('calendario')} Pedidos de hoy</small><b class="num">${deHoy.length}</b><em>${fechaLarga(hoy())}${deHoy.length ? ` · ${soles(deHoy.filter(p => !p.anulado).reduce((a, p) => a + (+p.total || 0), 0))}` : ''}</em></div>
    </div>
    <div class="card">
      <div class="filtros">
        <div class="campo"><label>Tipo de pedido</label><select onchange="UI.ped.canal=this.value;renderPedidos()">
          ${[['todos', 'B2C y B2B'], ['b2c', 'Consumidor (B2C)'], ['b2b', 'Empresa (B2B)']].map(([k, t]) => `<option value="${k}" ${f.canal === k ? 'selected' : ''}>${t} (${todos.filter(p => k === 'todos' || (p.canal || 'b2c') === k).length})</option>`).join('')}</select></div>
        <div class="campo"><label>Estado</label><select onchange="UI.ped.filtro=this.value;renderPedidos()">
          ${Object.entries(FILTROS_PED).map(([k, [t, fn]]) => `<option value="${k}" ${f.filtro === k ? 'selected' : ''}>${t} (${delCanal.filter(fn).length})</option>`).join('')}</select></div>
        <div class="campo"><label>Mes</label><select onchange="UI.ped.mes=this.value;renderPedidos()">
          <option value="">Todos los meses</option>${meses.map(m => `<option value="${m}" ${f.mes === m ? 'selected' : ''}>${nombreMes(m)}${m === mesActual ? ' (este mes)' : ''}</option>`).join('')}</select></div>
        <div class="campo buscar"><label>Buscar</label><input type="search" placeholder="Código, cliente, celular, RUC, boleta…" value="${h(f.q)}" oninput="UI.ped.q=this.value;renderPedidosLuego()" id="ped-q"></div>
      </div>
      <div class="barra-lista"><span><b>${plural(ps.length, 'pedido')}</b>${ps.length ? ` · ${soles(totalLista)}` : ''}</span>
        ${hayFiltro ? `<button class="btn mini" onclick="UI.ped={filtro:'atender',canal:'todos',q:'',mes:hoy().slice(0,7)};renderPedidos()">Quitar filtros</button>` : ''}</div>
      <div class="tabla-wrap"><table class="tabla-ped">
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Detalle</th><th class="der">Total</th><th class="der">Ganancia</th><th>Pago</th><th>Estado</th><th>Comprobante</th><th></th></tr></thead>
        <tbody>${ps.length ? ps.map(p => {
          const c = D.clientes.get(p.cliente_id); const e = C[p.cliente_id]; const R = rentabilidad(p);
          return `<tr class="clic ${p.anulado ? 'anulada' : ''}" onclick="PF.abrir('${p.id}')" title="Ver el detalle del pedido">
            <td><b class="num-ped">${h(p.numero)}</b> ${tagCanal(p.canal)}
              <br><small>${fechaCorta(p.fecha)}${p.fecha_entrega ? ` · entrega ${fechaCorta(p.fecha_entrega)}` : ''}</small></td>
            <td><div class="cli-celda">${avatar(c, e?.nivel)}<div><b>${h(nombreCliente(c))}</b>${esPrueba('pedidos', p.id) ? ' <span class="tag prueba">prueba</span>' : ''}<br>
              ${p.canal === 'b2b' ? `<small>${h(c?.tipo_negocio || '')}</small>` : `${tagNivel(p.nivel_precio || 'oficial')} ${e?.regalosPend ? `<span class="tag regalo" title="Tiene regalo del Club">${ic('regalo')}</span>` : ''}`}</div></div></td>
            <td class="det">${resumenItems(p)}${p.envio_asumido ? ' <span class="tag gratis">envío gratis</span>' : ''}</td>
            <td class="der num"><b>${soles(p.total)}</b></td>
            <td class="der num">${p.anulado ? '<small class="suave">—</small>' : `<b class="${claseMargen(R.margen)}-txt" title="Venta ${soles(R.ingreso)} − costo ${soles(R.costo)}${R.courier ? ` − courier ${soles(R.courier)}` : ''}">${soles(R.ganancia)}</b><br><small class="${claseMargen(R.margen)}-txt">${pct(R.margen)} margen</small>`}</td>
            <td>${tagPago(p)}</td>
            <td>${selectEstado(estadoPed(p), `PED.estado('${p.id}',this.value,this)`)}
              ${!p.anulado && p.courier?.empresa ? `<br><small>${h(p.courier.empresa)}${p.courier.conductor ? ' · ' + h(p.courier.conductor) : ''}</small>` : ''}</td>
            <td>${tagDoc(p)}</td>
            <td class="der acciones-fila">
              ${p.anulado ? '' : `<button class="btn mini wa solo-ic" onclick="event.stopPropagation();PED.whatsapp('${p.id}')" title="WhatsApp: ${h(plantillas(p, c)[faseSugerida(p)].t)}" aria-label="Enviar WhatsApp">${ic('wa')}</button>`}
              <button class="btn mini peligro solo-ic" onclick="event.stopPropagation();PED.eliminar('${p.id}')" title="Eliminar pedido" aria-label="Eliminar pedido">${ic('basura')}</button>
            </td></tr>`;
        }).join('') : `<tr><td colspan="9" class="vacio"><div class="vacio-caja">${ic('pedidos', 'g')}<b>${todos.length ? 'No hay pedidos con este filtro' : 'Todavía no hay pedidos'}</b>
          <span>${todos.length ? 'Prueba con otro estado o mes.' : 'Registra el primero y aquí verás su pago, entrega y margen.'}</span>
          ${todos.length ? (hayFiltro ? `<button class="btn mini" onclick="UI.ped={filtro:'todos',canal:'todos',q:'',mes:''};renderPedidos()">Ver todos los pedidos</button>` : '') : `<button class="btn prim" onclick="PF.abrir()">${ic('mas-circ')} Nuevo pedido</button>`}</div></td></tr>`}</tbody>
      </table></div>
    </div>`;
}
let _tPed;
function renderPedidosLuego() { clearTimeout(_tPed); _tPed = setTimeout(() => { renderPedidos(); const i = $('#ped-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); }

// Cambia el estado (por preparar → … → entregado, o cancelado) y lo guarda al instante.
// Sellos, stock y referidos se recalculan solos a partir de los pedidos.
async function aplicarEstado(p, nuevo, { preguntar = true } = {}) {
  if (!p || estadoPed(p) === nuevo) return false;
  if (preguntar && nuevo === 'cancelado' && !confirm(`¿Cancelar el pedido ${p.numero}? Deja de contar como venta, los frascos vuelven al stock y, si tenía sello, el cliente lo pierde.`)) return false;
  const snaps = snapshotClub(p);
  if (nuevo === 'cancelado') p.anulado = true;
  else {
    p.anulado = false; p.estado_entrega = nuevo;
    p.entregado_en = nuevo === 'entregado' ? (p.entregado_en || new Date().toISOString()) : null;
  }
  p.estado_pago = estadoPago(p);
  await guardar('pedidos', p);
  anunciarSnaps(snaps);
  if (nuevo === 'entregado' && saldoDe(p) > 0) toast(`Entregado, pero falta cobrar ${soles(saldoDe(p))}.`, 4500);
  else toast(`${p.numero}: ${ESTADO_PED[nuevo]}.`);
  return true;
}
async function eliminarPedido(p, { preguntar = true } = {}) {
  if (!p) return false;
  if (preguntar && !confirm(`¿Eliminar el pedido ${p.numero}?\n\nSe borra de las ventas, los frascos vuelven al stock y se quitan los sellos, el regalo usado y el referido que haya generado. No se puede deshacer.`)) return false;
  const snaps = snapshotClub(p);
  for (const s of lista('sellos_extra').filter(s => s.pedido_id === p.id)) await eliminar('sellos_extra', s.id); // historia ligada a este pedido
  await eliminar('pedidos', p.id);
  anunciarSnaps(snaps);
  toast(`Pedido ${p.numero} eliminado.`);
  return true;
}

const PED = {
  async estado(id, nuevo, sel) {
    const ok = await aplicarEstado(D.pedidos.get(id), nuevo);
    if (!ok && sel) sel.value = estadoPed(D.pedidos.get(id));
    render();
  },
  async eliminar(id) { if (await eliminarPedido(D.pedidos.get(id))) render(); },
  whatsapp(id) {
    const p = D.pedidos.get(id); const c = D.clientes.get(p.cliente_id);
    abrirWhatsApp(c?.celular, plantillas(p, c)[faseSugerida(p)].x);
  },
};

// Guarda los sellos antes de un cambio para avisar después qué ganó cada uno.
function snapshotClub(p) {
  const C = club(); const out = [];
  if (p.canal === 'b2b') return out;
  const cli = D.clientes.get(p.cliente_id);
  out.push([p.cliente_id, { ...(C[p.cliente_id] || { total: 0, regalosGanados: 0, nivel: 'oficial' }) }, false]);
  if (cli?.referido_por) out.push([cli.referido_por, { ...(C[cli.referido_por] || {}) }, true]);
  return out;
}
const anunciarSnaps = snaps => snaps.forEach(([id, antes, ref]) => anunciarCambios(id, antes, ref));

function anunciarCambios(cid, antes, esReferente = false) {
  const e = statsDe(cid); const c = D.clientes.get(cid); if (!e || !antes || !c || esEmpresa(c)) return;
  const msgs = [];
  if (e.total > (antes.total || 0)) msgs.push(`+${e.total - (antes.total || 0)} sello para ${c.nombre}${esReferente ? ' (su amigo recibió su pedido)' : ''} · total ${e.total}`);
  if (e.total < (antes.total || 0)) msgs.push(`${c.nombre}: se descontó ${antes.total - e.total} sello (total ${e.total})`);
  if (e.nivel !== antes.nivel && e.total > (antes.total || 0)) msgs.push(`¡${c.nombre} ahora es ${NIVELES[e.nivel]}!`);
  msgs.forEach(m => toast(m, 4500));
  if (e.regalosGanados > (antes.regalosGanados || 0)) avisoRegalo(c, e);
}

function nuevoNumero(fecha, canal) {
  const pre = (canal === 'b2b' ? 'E-' : 'P-') + fecha.slice(2).replace(/-/g, '') + '-';
  let n = 1; const usados = new Set([...D.pedidos.values()].map(p => p.numero));
  while (usados.has(pre + String(n).padStart(2, '0'))) n++;
  return pre + String(n).padStart(2, '0');
}

// ------------------------------------------------------------------ página del pedido
let F = null;
const clienteVacio = tipo => ({ tipo_cliente: tipo || 'persona', nombre: '', apellido: '', razon_social: '', ruc: '', contacto: '', tipo_negocio: '', celular: '', correo: '', direccion: '', distrito: '', direccion_envio: '', referencia: '', referido_por: null, _mismaDir: true });
const courierVacio = () => ({ empresa: '', conductor: '', celular: '', placa: '', costo: '', seguimiento: '' });

const PF = {
  abrir(id, clienteId, canal) {
    const p = id ? structuredClone(D.pedidos.get(id)) : null;
    const sueltos = Object.fromEntries(SABORES.map(s => [s.id, 0]));
    if (p) {
      (p.items || []).filter(i => i.tipo === 'suelto').forEach(i => { sueltos[i.sabor] = i.cantidad; });
      F = {
        ...p, canal: p.canal || 'b2c', _modo: 'sel', _q: '', _nuevo: clienteVacio(p.canal === 'b2b' ? 'empresa' : 'persona'), _refQ: '',
        packs: (p.items || []).filter(i => i.tipo === 'pack'), sueltos,
        lineas: (p.items || []).filter(i => i.tipo === 'linea'),
        regalos: (p.items || []).filter(i => i.tipo === 'regalo').map(i => i.sabor),
        _regalosOrig: (p.items || []).filter(i => i.tipo === 'regalo').length,
        _descRef: +p.descuento_referido > 0, _otroDesc: r2((+p.descuento || 0) - (+p.descuento_referido || 0)), _actDir: false,
        pagos: p.pagos || [], courier: { ...courierVacio(), ...(p.courier || {}) },
        comprobante: { tipo: p.canal === 'b2b' ? 'factura' : 'boleta', numero: '', fecha: '', ...(p.comprobante || {}) },
        guia: { numero: '', fecha: '', ...(p.guia || {}) },
      };
    } else {
      const cli = clienteId ? D.clientes.get(clienteId) : null;
      const cn = canal || (esEmpresa(cli) ? 'b2b' : 'b2c');
      F = {
        id: null, canal: cn, cliente_id: clienteId || null, _modo: clienteId ? 'sel' : 'buscar', _q: '', _nuevo: clienteVacio(cn === 'b2b' ? 'empresa' : 'persona'), _refQ: '',
        nivel_precio: 'oficial', packs: [], sueltos, lineas: [], regalos: [], _regalosOrig: 0, envio: 0, envio_asumido: false, _otroDesc: 0, descuento_motivo: '', _descRef: true,
        fecha: hoy(), fecha_entrega: '', direccion_envio: '', notas: '', _actDir: true,
        estado_entrega: 'por_preparar', anulado: false, modalidad_pago: 'anticipado', fecha_vencimiento: '', pagos: [],
        courier: courierVacio(), comprobante: { tipo: cn === 'b2b' ? 'factura' : 'boleta', numero: '', fecha: '' }, guia: { numero: '', fecha: '' },
      };
      if (clienteId) PF.fijarCliente(clienteId, false);
    }
    F._waEdit = false; F._waClave = null;
    PF.pintarPagina();
  },
  pintarPagina() {
    const b2b = F.canal === 'b2b';
    const estadoCab = `<div class="estado-cab"><label>Estado${F.id ? ' <small>(se guarda al elegir)</small>' : ''}</label>${selectEstado(estadoPed(F), 'PF.estado(this.value)', 'id="pf-estado"')}</div>`;
    pagina(`${cabPagina(F.id ? `Pedido <span class="codigo codigo-g">${h(F.numero)}</span> ${tagCanal(F.canal)}` : `Nuevo pedido <span class="codigo codigo-g" title="Código que tendrá el pedido">${h(nuevoNumero(F.fecha, F.canal))}</span>`, estadoCab)}
      ${F.id ? '' : `<div class="campo" style="max-width:520px;margin:-4px 0 14px"><label>Tipo de pedido</label><div class="seg"><button class="${!b2b ? 'activo' : ''}" onclick="PF.canal('b2c')">${ic('clientes')} Consumidor (B2C)</button><button class="${b2b ? 'activo' : ''}" onclick="PF.canal('b2b')">${ic('productos')} Empresa (B2B)</button></div></div>`}
      <div class="pedido-grid">
        <div>
          <div class="paso card"><h3><span class="n">1</span> ${b2b ? 'Empresa' : 'Cliente'}</h3><div id="pf-cliente"></div></div>
          <div class="paso card"><h3><span class="n">2</span> ${b2b ? 'Productos' : 'Mantequillas'}</h3><div id="pf-items"></div></div>
          <div class="paso card"><h3><span class="n">3</span> Entrega</h3><div id="pf-entrega"></div></div>
          <div class="paso card"><h3><span class="n">4</span> Pago</h3><div id="pf-pago"></div></div>
          <div class="paso card"><h3><span class="n">5</span> ${b2b ? 'Comprobante y guía de remisión' : 'Boleta'}</h3><div id="pf-doc"></div></div>
          <div class="paso card" id="pf-wa"></div>
        </div>
        <div class="resumen">
          <div class="card" id="pf-resumen"></div>
        </div>
      </div>
      <div class="modal-pie">
        ${F.id ? `<button class="btn peligro" onclick="PF.eliminar()" style="margin-right:auto">${ic('basura')} Eliminar pedido</button>` : ''}
        <button class="btn" onclick="volver()">Salir sin guardar</button>
        <button class="btn prim" onclick="PF.guardar()">Guardar pedido</button>
      </div>`);
    PF.pintarCliente(); PF.pintarItems(); PF.pintarEntrega(); PF.pintarPago(); PF.pintarDoc(); PF.pintarResumen();
    if (F._modo === 'buscar') setTimeout(() => $('#pf-q')?.focus(), 50);
  },
  canal(c) {
    if (F.canal === c) return;
    const hayItems = F.packs.length || F.lineas.length || Object.values(F.sueltos).some(Boolean);
    if (hayItems && !confirm('Al cambiar entre B2C y B2B se borran los productos elegidos. ¿Continuar?')) return;
    PF.abrir(null, null, c);
  },

  cliente() { return F._modo === 'sel' ? D.clientes.get(F.cliente_id) : null; },
  clienteParaMensaje() {
    if (F._modo === 'sel') return PF.cliente();
    const n = F._nuevo; return { ...n, nombre: n.nombre, direccion_envio: n._mismaDir ? n.direccion : n.direccion_envio };
  },
  fijarCliente(id, pintar = true) {
    const c = D.clientes.get(id); if (!c) return;
    F.cliente_id = id; F._modo = 'sel';
    F.nivel_precio = F.canal === 'b2b' ? 'oficial' : nivelParaCobrar(id);
    F.direccion_envio = c.direccion_envio || c.direccion || '';
    PF.recalcularPrecios();
    const e = statsDe(id);
    if (!F.id && F.canal !== 'b2b' && c.regalo_agendado && e?.regalosPend && !F.regalos.length) { F.regalos.push(e.favorito || 'mani'); toast(`Se agregó el regalo agendado de ${c.nombre}.`); }
    if (pintar) { PF.pintarCliente(); PF.pintarItems(); PF.pintarResumen(); }
  },
  nuevo() {
    F._modo = 'nuevo'; F.cliente_id = null; F.nivel_precio = 'oficial';
    const q = F._q.trim(); const n = F._nuevo;
    if (soloDigitos(q).length >= 6 && soloDigitos(q).length === q.replace(/\s/g, '').length) {
      if (F.canal === 'b2b' && soloDigitos(q).length === 11) n.ruc = q; else n.celular = q;
    } else if (q) {
      if (F.canal === 'b2b') n.nombre = q;
      else { const [a, ...b] = q.split(/\s+/); n.nombre = a; n.apellido = b.join(' '); }
    }
    PF.recalcularPrecios(); PF.pintarCliente(); PF.pintarItems(); PF.pintarResumen();
    setTimeout(() => $('#pf-n-nombre')?.focus(), 30);
  },
  cambiar() { F._modo = 'buscar'; F.cliente_id = null; F._q = ''; PF.pintarCliente(); PF.pintarResumen(); setTimeout(() => $('#pf-q')?.focus(), 30); },
  buscar(q) {
    F._q = q; const tipo = F.canal === 'b2b' ? 'empresa' : 'persona';
    const res = buscarClientes(q, 8, tipo); const C = club();
    $('#pf-sug').innerHTML = q.trim() ? `<div class="sugerencias">
      ${res.map(c => `<button onclick="PF.fijarCliente('${c.id}')"><b>${h(nombreCliente(c))}</b> <small>${h(c.celular)} · ${h(esEmpresa(c) ? (c.ruc ? 'RUC ' + c.ruc : c.tipo_negocio || '') : c.distrito || '')}</small> <span style="margin-left:auto">${esEmpresa(c) ? '' : tagNivel(C[c.id].nivel)}</span></button>`).join('')}
      <button onclick="PF.nuevo()" style="color:var(--caramelo);font-weight:900">＋ Registrar “${h(q)}” como ${tipo === 'empresa' ? 'empresa nueva' : 'cliente nuevo'}</button></div>` : '';
  },
  setN(k, v) {
    F._nuevo[k] = v;
    if (k === 'direccion' && F._nuevo._mismaDir) { F._nuevo.direccion_envio = v; const el = $('#pf-n-envio'); if (el) el.value = v; }
    if (k === 'celular') { const dup = clientePorCelular(v); $('#pf-dup').innerHTML = dup ? `<div class="aviso alerta" style="margin-top:8px">Ese celular ya es de <b>${h(nombreCliente(dup))}</b>. <a href="#" onclick="PF.fijarCliente('${dup.id}');return false">Usar ese cliente</a></div>` : ''; }
    if (k === 'nombre' || k === 'contacto') PF.pintarWA();
  },
  buscarRef(q) {
    F._refQ = q;
    const excl = F._modo === 'sel' ? F.cliente_id : null;
    const res = buscarClientes(q, 6, 'persona').filter(c => c.id !== excl);
    const porCodigo = lista('clientes').find(c => c.codigo && norm(c.codigo) === norm(q) && c.id !== excl);
    const todos = porCodigo && !res.includes(porCodigo) ? [porCodigo, ...res] : res;
    $('#pf-ref-sug').innerHTML = q.trim() ? `<div class="sugerencias">${todos.length ? todos.map(c => `<button onclick="PF.fijarRef('${c.id}')"><b>${h(nombreCliente(c))}</b> <span class="codigo">${h(c.codigo)}</span></button>`).join('') : '<div style="padding:10px" class="suave">No hay clientes con ese nombre o código.</div>'}</div>` : '';
  },
  async fijarRef(id) {
    if (F._modo === 'nuevo') F._nuevo.referido_por = id;
    else { const c = PF.cliente(); c.referido_por = id; await guardar('clientes', c); }
    F._refQ = ''; PF.pintarCliente(); PF.pintarResumen();
  },
  async quitarRef() {
    if (F._modo === 'nuevo') F._nuevo.referido_por = null;
    else { const c = PF.cliente(); c.referido_por = null; await guardar('clientes', c); }
    PF.pintarCliente(); PF.pintarResumen();
  },
  esPrimerPedido() {
    if (F._modo === 'nuevo') return true;
    if (F._modo !== 'sel') return false;
    return !lista('pedidos').some(p => p.cliente_id === F.cliente_id && p.id !== F.id && !p.anulado);
  },
  referente() {
    if (F.canal === 'b2b') return null;
    const id = F._modo === 'nuevo' ? F._nuevo.referido_por : PF.cliente()?.referido_por;
    return id ? D.clientes.get(id) : null;
  },

  // Avisos del cliente que siempre se ven en el pedido (regalo, referido, VIP, pausa).
  avisosCliente(c, e) {
    const out = [];
    if (esEmpresa(c)) return '';
    if (e.regalosPend) {
      const faltan = e.regalosPend - F.regalos.length;
      out.push(['regalo', `<b>Le toca ${plural(e.regalosPend, 'mantequilla')} de regalo</b>${e.regaloFecha ? ` (llegó a ${e.regalosGanados * CLUB.regalo_cada} sellos el ${fechaCorta(e.regaloFecha)})` : ''}${c.regalo_agendado ? ' · <b>agendado para esta compra</b>' : ''}.
        ${faltan > 0 ? `<button class="btn mini" onclick="PF.agregarRegalo(true)">${ic('regalo')} Agregar al pedido</button>` : ' Ya está en este pedido.'}`]);
    }
    const r = c.referido_por ? D.clientes.get(c.referido_por) : null;
    if (r && PF.esPrimerPedido()) out.push(['amigos', `Viene referido por <b>${h(nombreCliente(r))}</b> <span class="codigo">${h(r.codigo)}</span>: paga S/${CLUB.desc_referido} menos en su primer pack y ${h(r.nombre)} gana 1 sello cuando este pedido quede pagado y entregado.`]);
    else if (r) out.push(['amigos', `Referido por ${h(nombreCliente(r))} (el descuento ya se usó en su primer pedido).`]);
    if (e.nivelAuto === 'oficial' && !c.nivel_manual && e.faltaVip === 1 && e.compras + 1 >= CLUB.vip_min_compras) out.push(['estrella', 'Con este pedido (con pack, pagado y entregado) <b>pasa a VIP</b>.']);
    if (e.total > 0 && (e.total + 1) % CLUB.regalo_cada === 0) out.push(['regalo', `Con este pedido completa <b>${e.total + 1} sellos</b> y gana una mantequilla de regalo.`]);
    if (e.pausa) out.push(['pausa', `Sin compras hace ${e.dias} días: su nivel está en pausa y este pedido se cobra a precio oficial (puedes cambiarlo abajo).`]);
    return out.length ? `<div class="avisos-cliente">${out.map(([i, t]) => `<div class="aviso-cli">${ic(i)}<span>${t}</span></div>`).join('')}</div>` : '';
  },

  pintarCliente() {
    const el = $('#pf-cliente'); if (!el) return;
    const b2b = F.canal === 'b2b';
    const bloqueRef = () => {
      if (b2b) return '';
      if (!PF.esPrimerPedido()) return '';
      const r = PF.referente();
      if (r && F._modo === 'sel') return ''; // ya se muestra en los avisos del cliente
      return `<div class="campo" style="margin-top:12px"><label>¿Viene referido por un amigo? (código PEANUT-… o nombre)</label>
        ${r ? `<div class="aviso info">Referido por <b>${h(nombreCliente(r))}</b> <span class="codigo">${h(r.codigo)}</span> · ${h(r.nombre)} gana +1 sello cuando este pedido se pague y entregue. <a href="#" onclick="PF.quitarRef();return false">Quitar</a></div>`
          : `<input type="search" placeholder="Ej.: PEANUT-ANDREA" value="${h(F._refQ)}" oninput="PF.buscarRef(this.value)"><div id="pf-ref-sug"></div>`}</div>`;
    };
    const inp = (k, t, extra = '', full = false) => `<div class="campo" ${full ? 'style="grid-column:1/-1"' : ''}><label>${t}</label><input type="text" ${k === 'nombre' ? 'id="pf-n-nombre"' : ''} value="${h(F._nuevo[k])}" oninput="PF.setN('${k}',this.value)" ${extra}></div>`;
    if (F._modo === 'buscar') {
      el.innerHTML = `<div class="campo"><label>${b2b ? 'Busca por nombre, RUC, contacto o celular' : 'Busca por celular, nombre o código'}</label>
        <input type="search" id="pf-q" placeholder="${b2b ? 'Ej.: Café Central o 20601234567' : 'Ej.: 987654321 o Andrea'}" value="${h(F._q)}" oninput="PF.buscar(this.value)" autocomplete="off"></div>
        <div id="pf-sug"></div>
        <button class="btn" style="margin-top:10px" onclick="PF.nuevo()">＋ ${b2b ? 'Empresa nueva' : 'Cliente nuevo'}</button>`;
      if (F._q) PF.buscar(F._q);
    } else if (F._modo === 'nuevo') {
      const n = F._nuevo;
      const envio = `<div class="campo" style="grid-column:1/-1"><label>Dirección de envío *</label>
            <label class="check" style="font-weight:600"><input type="checkbox" ${n._mismaDir ? 'checked' : ''} onchange="F._nuevo._mismaDir=this.checked;if(this.checked){F._nuevo.direccion_envio=F._nuevo.direccion;}PF.pintarCliente()"> Es la misma dirección</label>
            <input type="text" id="pf-n-envio" value="${h(n.direccion_envio)}" oninput="PF.setN('direccion_envio',this.value)" ${n._mismaDir ? 'disabled' : ''}></div>`;
      el.innerHTML = `<div class="aviso info" style="margin-bottom:12px">${b2b ? 'Empresa nueva' : 'Cliente nuevo'}: se guarda en <b>Clientes</b> junto con el pedido. <a href="#" onclick="PF.cambiar();return false">Buscar uno existente</a></div>
        <div class="grid g2">${b2b ? `
          ${inp('nombre', 'Nombre comercial *')}${inp('razon_social', 'Razón social')}
          ${inp('ruc', 'RUC (obligatorio para factura)', 'inputmode="numeric" maxlength="11"')}
          <div class="campo"><label>Tipo de negocio *</label><select onchange="PF.setN('tipo_negocio',this.value)"><option value="">Elige…</option>${NEGOCIOS.map(x => `<option ${n.tipo_negocio === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          ${inp('contacto', 'Persona de contacto *')}${inp('celular', 'Celular *', 'inputmode="tel"')}` : `
          ${inp('nombre', 'Nombre *')}${inp('apellido', 'Apellido *')}${inp('celular', 'Celular *', 'inputmode="tel" placeholder="9 dígitos"')}`}
          <div class="campo"><label>Distrito *</label>${selectDistrito(n.distrito, "PF.setN('distrito',this.value)")}</div>
          <div class="campo"><label>Correo</label><input type="email" value="${h(n.correo)}" oninput="PF.setN('correo',this.value)" placeholder="nombre@correo.com" autocomplete="off"></div>
          ${inp('direccion', 'Dirección *', '', true)}${envio}${inp('referencia', 'Referencia de la dirección', 'placeholder="Ej.: frente al parque"', true)}
        </div><div id="pf-dup"></div>${bloqueRef()}`;
      PF.setN('celular', n.celular);
    } else {
      const c = PF.cliente(); const e = statsDe(c.id);
      el.innerHTML = `<div class="cliente-sel">
          <div style="flex:1"><b style="font-size:18px">${h(nombreCliente(c))}</b> ${b2b ? `<span class="tag b2b">${h(c.tipo_negocio || 'Empresa')}</span>` : `${tagNivel(e.nivel, e.manual ? ' · fijado' : '')} ${e.pausa ? '<span class="tag pausa">en pausa</span>' : ''}`}<br>
          <span class="suave">${b2b ? `${c.razon_social ? h(c.razon_social) + ' · ' : ''}${c.ruc ? 'RUC ' + h(c.ruc) : '<span class="falta">sin RUC</span>'} · contacto ${h(c.contacto || '—')} · ${h(c.celular)}`
            : `${h(c.celular)} · ${plural(e.total, 'sello')} · ${plural(e.ventas.length, 'compra')} · código <span class="codigo">${h(c.codigo)}</span>`}</span>
          ${(() => { const otros = r2(e.pedidos.filter(x => x.id !== F.id).reduce((a, x) => a + saldoDe(x), 0)); return otros > 0 ? `<br><span class="tag pendiente">Debe ${soles(otros)} de otros pedidos</span>` : ''; })()}
</div>
          ${F.id ? '' : `<button class="btn mini" onclick="PF.cambiar()">Cambiar</button>`}
        </div>
        <div class="campo" style="margin-top:12px"><label>Dirección de envío de este pedido *</label>
          <input type="text" value="${h(F.direccion_envio)}" oninput="F.direccion_envio=this.value"></div>
        ${F.id ? '' : `<label class="check" style="margin-top:6px;font-weight:600"><input type="checkbox" ${F._actDir ? 'checked' : ''} onchange="F._actDir=this.checked"> Guardarla también en la ficha del cliente</label>`}
        ${bloqueRef()}`;
      el.insertAdjacentHTML('afterbegin', PF.avisosCliente(c, e));
    }
    PF.pintarWA();
  },

  // ---- productos
  recalcularPrecios() {
    for (const it of F.packs) { const pk = D.packs.get(it.pack_id); const pr = precioPack(pk, F.nivel_precio); if (pr != null) it.precio = pr; }
  },
  nivel(n) { F.nivel_precio = n; PF.recalcularPrecios(); PF.pintarItems(); PF.pintarResumen(); },
  agregarPack(id) {
    const pk = D.packs.get(id); const pr = precioPack(pk, F.nivel_precio);
    if (pr == null) return toast(`${pk.nombre} no está disponible para el precio ${NIVELES[F.nivel_precio]}.`);
    const sabores = Object.fromEntries(SABORES.map(s => [s.id, 0]));
    if (pk.tipo === 'almendra') sabores.almendra = pk.frascos;
    F.packs.push({ tipo: 'pack', pack_id: pk.id, nombre: pk.nombre, frascos: pk.frascos, tipo_pack: pk.tipo, max_almendra: pk.max_almendra, precio: pr, sabores });
    PF.pintarItems(); PF.pintarResumen();
  },
  quitarPack(i) { F.packs.splice(i, 1); PF.pintarItems(); PF.pintarResumen(); },
  sabor(i, s, d) {
    const it = F.packs[i]; const suma = Object.values(it.sabores).reduce((a, b) => a + b, 0);
    if (d > 0 && suma >= it.frascos) return toast(`Este pack ya tiene sus ${it.frascos} mantequillas. Baja otro sabor primero.`);
    if (d > 0 && s === 'almendra' && (it.sabores.almendra || 0) >= it.max_almendra) return toast(`Máximo ${it.max_almendra} de almendra en este pack. Si quiere más, usa un Pack Almendra.`);
    it.sabores[s] = Math.max(0, (it.sabores[s] || 0) + d);
    PF.pintarItems(); PF.pintarResumen();
  },
  suelto(s, d) { F.sueltos[s] = Math.max(0, (F.sueltos[s] || 0) + d); PF.pintarItems(); PF.pintarResumen(); },
  regalosDisponibles() {
    if (F._modo !== 'sel' || F.canal === 'b2b') return 0;
    return (statsDe(F.cliente_id)?.regalosPend || 0) + (F._regalosOrig || 0);
  },
  agregarRegalo(desdeAviso) { F.regalos.push(statsDe(F.cliente_id)?.favorito || 'mani'); PF.pintarItems(); PF.pintarResumen(); if (desdeAviso) { PF.pintarCliente(); toast('Regalo agregado. Elige el sabor en “Regalo del Club”.'); } },
  regalo(i, s) { F.regalos[i] = s; PF.pintarResumen(); },
  quitarRegalo(i) { F.regalos.splice(i, 1); PF.pintarItems(); PF.pintarResumen(); },
  // B2B: líneas con cantidad y precio unitario (con IGV)
  agregarLinea(prodId) {
    const pr = prodId ? D.productos.get(prodId) : null;
    F.lineas.push({ tipo: 'linea', producto_id: pr?.id || null, nombre: pr ? pr.nombre : '', cantidad: 1, precio_unit: pr ? +pr.precio : 0 });
    PF.pintarItems(); PF.pintarResumen();
    if (!pr) setTimeout(() => document.querySelectorAll('.lin-nombre')[F.lineas.length - 1]?.focus(), 30);
  },
  lin(i, k, v) {
    const l = F.lineas[i]; l[k] = k === 'nombre' ? v : Math.max(0, +v || 0);
    const s = $(`#lin-sub-${i}`); if (s && k !== 'costo_unit') s.firstChild.textContent = soles(l.cantidad * l.precio_unit);
    PF.pintarResumen();
  },
  quitarLinea(i) { F.lineas.splice(i, 1); PF.pintarItems(); PF.pintarResumen(); },

  pintarItems() {
    const el = $('#pf-items'); if (!el) return;
    const stepper = (fn, v) => `<span class="stepper"><button type="button" onclick="${fn}(-1)">−</button><span>${v}</span><button type="button" onclick="${fn}(1)">+</button></span>`;
    if (F.canal === 'b2b') {
      el.innerHTML = `<div class="packs-botones">${lista('productos').sort((a, b) => (a.orden || 0) - (b.orden || 0)).map(p => `<button class="pack-btn" onclick="PF.agregarLinea('${p.id}')">＋ ${h(nombreSabor(p.sabor))} 150 g</button>`).join('')}
          <button class="pack-btn" onclick="PF.agregarLinea()">＋ Otro producto <small>ej. balde 4 kg</small></button></div>
        ${F.lineas.length ? `<div class="lin-cab"><span>Producto</span><span>Cant.</span><span>Precio unit. (con IGV)</span><span class="der">Subtotal</span><span></span></div>` : '<p class="suave">Agrega los productos. El precio se escribe por pedido (incluye IGV).</p>'}
        ${F.lineas.map((l, i) => `<div class="lin-fila">
          <input type="text" class="lin-nombre" value="${h(l.nombre)}" placeholder="Descripción" oninput="PF.lin(${i},'nombre',this.value)">
          <input type="number" min="1" step="1" value="${l.cantidad}" oninput="PF.lin(${i},'cantidad',this.value)">
          <input type="number" min="0" step="0.1" value="${l.precio_unit}" oninput="PF.lin(${i},'precio_unit',this.value)">
          <b class="der num" id="lin-sub-${i}">${soles(l.cantidad * l.precio_unit)}${l.producto_id ? `<small class="lin-costo">costo ${soles(costoProducto(l.producto_id))} c/u</small>` : `<input type="number" min="0" step="0.1" class="lin-costo-in" value="${+l.costo_unit || ''}" placeholder="costo c/u" title="Costo por unidad" oninput="PF.lin(${i},'costo_unit',this.value)">`}</b>
          <button class="btn mini peligro" onclick="PF.quitarLinea(${i})">Quitar</button></div>`).join('')}`;
      return;
    }
    const e = F._modo === 'sel' ? statsDe(F.cliente_id) : null;
    const nivelCli = e ? e.nivel : 'oficial';
    const regDisp = PF.regalosDisponibles();
    el.innerHTML = `
      <div class="fila" style="margin-bottom:12px"><b>Precio:</b>
        <div class="chips">${Object.keys(NIVELES).map(n => `<button class="chip ${F.nivel_precio === n ? 'activo' : ''}" onclick="PF.nivel('${n}')">${NIVELES[n]}</button>`).join('')}</div>
        ${F.nivel_precio !== nivelCli && e ? `<small>El nivel del cliente es <b>${NIVELES[nivelCli]}</b>.</small>` : ''}
      </div>
      <div class="packs-botones">${packsActivos().map(pk => { const pr = precioPack(pk, F.nivel_precio); return `
        <button class="pack-btn" ${pr == null ? 'disabled style="opacity:.4"' : ''} title="${pk.tipo === 'almendra' ? 'Solo almendra' : `Máx. ${pk.max_almendra} de almendra`}" onclick="PF.agregarPack('${pk.id}')">＋ ${h(pk.nombre.replace('Arma tu ', ''))} <b>${pr == null ? '—' : soles(pr)}</b></button>`; }).join('')}
        <button class="pack-btn suelto-btn ${F._verSueltos ? 'activo' : ''}" onclick="F._verSueltos=!F._verSueltos;PF.pintarItems()">${F._verSueltos ? '▾' : '＋'} Frascos sueltos${Object.values(F.sueltos).some(Boolean) ? ` <b>(${Object.values(F.sueltos).reduce((x, y) => x + y, 0)})</b>` : ''}</button>
        ${regDisp > F.regalos.length ? `<button class="pack-btn regalo-btn" onclick="PF.agregarRegalo()">${ic('regalo')} Regalo del Club</button>` : ''}</div>
      ${F.packs.map((it, i) => {
        const suma = Object.values(it.sabores).reduce((a, b) => a + b, 0);
        const ok = suma === it.frascos;
        return `<div class="item-fila ${ok ? '' : 'malo'}">
          <div class="if-nom"><b>${h(it.nombre.replace('Arma tu ', ''))}</b><small class="${ok ? 'suave' : 'falta'}">${suma}/${it.frascos}${it.tipo_pack !== 'almendra' ? ` · máx. ${it.max_almendra} alm.` : ''}</small></div>
          ${it.tipo_pack === 'almendra' ? `<div class="if-sab suave">${it.frascos} de almendra</div>` :
            `<div class="if-sab">${SABORES.map(s => `<span class="mini-sab"><i class="col-sabor-${s.id}"></i>${s.nombre}${stepper(`PF.sabor.bind(null,${i},'${s.id}')`, it.sabores[s.id] || 0)}</span>`).join('')}</div>`}
          <b class="if-precio num">${soles(it.precio)}</b>
          <button class="btn mini peligro solo-ic" onclick="PF.quitarPack(${i})" title="Quitar" aria-label="Quitar">${ic('basura')}</button>
        </div>`;
      }).join('')}
      ${F._verSueltos || Object.values(F.sueltos).some(Boolean) ? `<div class="item-fila sueltos">
          <div class="if-nom"><b>Sueltos</b><small class="suave">no suman sello</small></div>
          <div class="if-sab">${SABORES.map(s => `<span class="mini-sab"><i class="col-sabor-${s.id}"></i>${s.nombre} <small>${soles(precioSuelto(s.id))}</small>${stepper(`PF.suelto.bind(null,'${s.id}')`, F.sueltos[s.id] || 0)}</span>`).join('')}</div>
          <b class="if-precio num">${soles(SABORES.reduce((a, s) => a + (F.sueltos[s.id] || 0) * precioSuelto(s.id), 0))}</b>
        </div>` : ''}
      ${F.regalos.map((sb, i) => `<div class="item-fila regalo">
          <div class="if-nom"><b>${ic('regalo')} Regalo</b><small class="suave">del Club</small></div>
          <div class="if-sab"><select style="width:auto" onchange="PF.regalo(${i},this.value)">${SABORES.map(x => `<option value="${x.id}" ${x.id === sb ? 'selected' : ''}>${x.nombre}</option>`).join('')}</select></div>
          <b class="if-precio num">S/0</b>
          <button class="btn mini peligro solo-ic" onclick="PF.quitarRegalo(${i})" title="Quitar" aria-label="Quitar">${ic('basura')}</button>
        </div>`).join('')}
      ${!F.packs.length && !Object.values(F.sueltos).some(Boolean) && !F.regalos.length ? '<p class="suave" style="margin:10px 0 0">Elige un pack o abre “Frascos sueltos”.</p>' : ''}`;
  },

  // ---- entrega
  // Estado del pedido (lista en la cabecera). Si el pedido ya existe, se guarda al instante
  // solo el estado; lo demás que estés editando sigue esperando "Guardar pedido".
  async estado(k) {
    const sel = $('#pf-estado');
    if (F.id) {
      const p = D.pedidos.get(F.id);
      if (!(await aplicarEstado(p, k))) { if (sel) sel.value = estadoPed(F); return; }
      F.anulado = p.anulado; F.estado_entrega = p.estado_entrega; F.entregado_en = p.entregado_en;
    } else {
      F.anulado = k === 'cancelado';
      if (k !== 'cancelado') { F.estado_entrega = k; F.entregado_en = k === 'entregado' ? new Date().toISOString() : null; }
    }
    if (sel) sel.className = `sel-estado e-${estadoPed(F)}`;
    PF.pintarResumen();
  },
  async eliminar() { if (await eliminarPedido(D.pedidos.get(F.id))) volver(); },
  cour(k, v) {
    if (k === 'empresa' && v === '__otro') { F.courier._otro = true; F.courier.empresa = ''; PF.pintarEntrega(); setTimeout(() => $('#pf-cour-otro')?.focus(), 30); return; }
    if (k === 'empresa' && !F.courier._otroTxt) F.courier._otro = false;
    F.courier[k] = v; if (k === 'empresa' && !F.courier._otroTxt) PF.pintarEntrega(); if (k === 'costo') PF.pintarResumen(); else PF.pintarWA();
  },
  courOtro(v) { F.courier._otroTxt = true; PF.cour('empresa', v); F.courier._otroTxt = false; },
  async guardarCourier() {
    const n = String(F.courier.empresa || '').trim(); if (!n) return toast('Escribe el nombre del courier.');
    if (!couriers().some(x => norm(x) === norm(n))) { CFG.couriers = [...couriers(), n]; await guardarConfig(); }
    F.courier._otro = false; F.courier.empresa = n; PF.pintarEntrega(); toast(`${n} quedó en la lista de couriers.`);
  },
  asumeEnvio(v) {
    F.envio_asumido = v;
    if (v) { F._envioAntes = F.envio; F.envio = 0; } else if (!F.envio) F.envio = +F._envioAntes || +F.courier.costo || 0;
    PF.pintarEntrega(); PF.pintarResumen(); PF.pintarPago();
  },
  pintarEntrega() {
    const el = $('#pf-entrega'); if (!el) return;
    const c = F.courier;
    const lista_ = [...new Set([...couriers(), c._otro ? '' : c.empresa].filter(Boolean))];
    el.innerHTML = `<div class="grid g2">
        <div class="campo"><label>Fecha del pedido</label><input type="date" value="${h(F.fecha)}" onchange="F.fecha=this.value;PF.pintarPago()"></div>
        <div class="campo"><label>Fecha de entrega</label><input type="date" value="${h(F.fecha_entrega || '')}" onchange="F.fecha_entrega=this.value;PF.pintarWA()"></div>
        <div class="campo" style="grid-column:1/-1"><label>Notas de entrega</label><input type="text" value="${h(F.notas || '')}" oninput="F.notas=this.value" placeholder="Ej.: dejar en portería"></div>
      </div>
      <div class="caja-delivery">
        <div class="campo"><label>¿Quién paga el delivery?</label><div class="seg"><button class="${!F.envio_asumido ? 'activo' : ''}" onclick="PF.asumeEnvio(false)">${ic('clientes')} El cliente</button><button class="${F.envio_asumido ? 'activo' : ''}" onclick="PF.asumeEnvio(true)">${ic('regalo')} Mr. Peanut (envío gratis)</button></div></div>
        <div class="grid g2" style="margin-top:10px">
          <div class="campo"><label>Lo que pagas al courier (S/)</label><input type="number" min="0" step="0.5" value="${h(c.costo)}" placeholder="0" oninput="PF.cour('costo',this.value)"></div>
          ${F.envio_asumido ? `<div class="campo"><label>Envío cobrado al cliente</label><input type="text" value="S/0 · envío gratis" disabled></div>`
            : `<div class="campo"><label>Envío cobrado al cliente (S/)</label><input type="number" min="0" step="0.5" value="${+F.envio || 0}" oninput="F.envio=+this.value||0;PF.pintarResumen();PF.pintarPagoSaldo()"></div>`}
        </div>
        <small class="suave">${F.envio_asumido ? 'El costo del courier sale de tu ganancia: lo ves en <b>Rentabilidad</b>.' : 'Si cobras menos de lo que pagas al courier, la diferencia sale de tu ganancia.'}</small>
      </div>
      <p style="margin:14px 0 6px"><b>Courier</b> <small class="suave">opcional · la lista se edita en Sincronización</small></p>
      <div class="grid g3">
        <div class="campo"><label>Empresa</label><select onchange="PF.cour('empresa',this.value)"><option value="">—</option>${lista_.map(x => `<option ${!c._otro && c.empresa === x ? 'selected' : ''}>${h(x)}</option>`).join('')}<option value="__otro" ${c._otro ? 'selected' : ''}>Otro…</option></select>
          ${c._otro ? `<input type="text" id="pf-cour-otro" style="margin-top:6px" placeholder="Nombre del courier" value="${h(c.empresa)}" oninput="PF.courOtro(this.value)">
          <button type="button" class="btn mini" style="margin-top:6px" onclick="PF.guardarCourier()">＋ Guardar en la lista</button>` : ''}</div>
        <div class="campo"><label>Conductor</label><input type="text" value="${h(c.conductor)}" oninput="PF.cour('conductor',this.value)"></div>
        <div class="campo"><label>Celular del conductor</label><input type="tel" value="${h(c.celular)}" oninput="PF.cour('celular',this.value)"></div>
        <div class="campo"><label>Placa</label><input type="text" value="${h(c.placa)}" oninput="PF.cour('placa',this.value.toUpperCase())"></div>
        <div class="campo"><label>Link o código de seguimiento</label><input type="text" value="${h(c.seguimiento)}" oninput="PF.cour('seguimiento',this.value)"></div>
      </div>`;
    PF.pintarWA();
  },

  // ---- pago
  modalidad(m) {
    F.modalidad_pago = m;
    if (m === 'credito' && !F.fecha_vencimiento) F.fecha_vencimiento = sumarDias(F.fecha, +CFG.dias_credito || 15);
    if (m !== 'credito') F.fecha_vencimiento = '';
    PF.pintarPago(); PF.pintarResumen();
  },
  pintarPago() {
    const el = $('#pf-pago'); if (!el) return;
    const t = PF.totales(); const pg = pagadoDe(F); const sal = Math.max(0, r2(t.total - pg));
    const mods = F.canal === 'b2b' ? MODALIDAD : { anticipado: MODALIDAD.anticipado, contra_entrega: MODALIDAD.contra_entrega };
    el.innerHTML = `<div class="seg">${Object.entries(mods).map(([k, x]) => `<button class="${F.modalidad_pago === k ? 'activo' : ''}" onclick="PF.modalidad('${k}')">${x}</button>`).join('')}</div>
      <p class="suave" style="margin:8px 0 0">${F.modalidad_pago === 'anticipado' ? 'El cliente envía su pago (Yape, Plin, transferencia) antes del envío.' : F.modalidad_pago === 'contra_entrega' ? 'Se cobra al entregar. Registra el pago cuando el cliente o el courier te lo pasen.' : 'La empresa paga después de recibir.'}</p>
      ${F.modalidad_pago === 'credito' ? `<div class="grid g2" style="margin-top:10px"><div class="campo"><label>Vence el</label><input type="date" value="${h(F.fecha_vencimiento)}" onchange="F.fecha_vencimiento=this.value;PF.pintarResumen()"></div></div>` : ''}
      <div class="grid g2" style="margin-top:12px">
        <div class="campo"><label>Otro descuento (S/)</label><input type="number" min="0" step="0.5" value="${+F._otroDesc || 0}" oninput="F._otroDesc=+this.value||0;PF.pintarResumen();PF.pintarPagoSaldo()"></div>
        <div class="campo"><label>Motivo del descuento</label><input type="text" value="${h(F.descuento_motivo || '')}" oninput="F.descuento_motivo=this.value" placeholder="Ej.: cortesía por demora"></div>
      </div>
      <p style="margin:16px 0 6px"><b>Pagos recibidos</b> <span id="pf-saldo">${PF.textoSaldo(t.total, pg)}</span></p>
      ${F.pagos.length ? `<table><thead><tr><th>Fecha</th><th>Método</th><th>Referencia</th><th class="der">Monto</th><th>Voucher</th><th></th></tr></thead><tbody>
        ${F.pagos.map((x, i) => `<tr><td>${fechaCorta(x.fecha)}</td><td>${h(x.metodo)}</td><td>${h(x.referencia || '')}</td><td class="der num">${soles(x.monto)}</td>
          <td>${x.tiene_foto ? `<button class="btn mini" onclick="verVoucher('${x.id}','${h(x.foto_path || '')}')">Ver</button>` : '<small class="suave">—</small>'}</td>
          <td class="der"><button class="btn mini peligro" onclick="PF.quitarPago(${i})">Quitar</button></td></tr>`).join('')}</tbody></table>` : ''}
      <div class="pago-nuevo">
        <div class="campo"><label>Fecha</label><input type="date" id="pg-fecha" value="${hoy()}"></div>
        <div class="campo"><label>Monto (S/)</label><input type="number" id="pg-monto" min="0" step="0.1" value="${sal || ''}"></div>
        <div class="campo"><label>Método</label><select id="pg-metodo" onchange="document.getElementById('pg-foto-lbl').textContent=this.value==='Efectivo'?'Voucher (opcional)':'Voucher *'">${METODOS.map(m => `<option>${m}</option>`).join('')}</select></div>
        <div class="campo"><label>N.° de operación</label><input type="text" id="pg-ref" placeholder="opcional"></div>
        <div class="campo"><label id="pg-foto-lbl">Voucher *</label><input type="file" id="pg-foto" accept="image/*"></div>
        <button class="btn oscuro" onclick="PF.agregarPago()">＋ Registrar pago</button>
      </div>`;
  },
  textoSaldo(total, pg) {
    const sal = Math.max(0, r2(total - pg));
    return sal <= 0 && total > 0 ? '<span class="tag entregado">Pagado completo</span>' : pg > 0 ? `<span class="tag parcial">Pagó ${soles(pg)} · falta ${soles(sal)}</span>` : `<span class="tag pendiente">Falta ${soles(sal)}</span>`;
  },
  pintarPagoSaldo() { const el = $('#pf-saldo'); if (el) el.innerHTML = PF.textoSaldo(PF.totales().total, pagadoDe(F)); },
  async agregarPago() {
    const monto = r2($('#pg-monto').value); const metodo = $('#pg-metodo').value; const file = $('#pg-foto').files?.[0];
    if (!(monto > 0)) return toast('Escribe el monto del pago.');
    if (metodo !== 'Efectivo' && !file) return toast(`Adjunta la captura del voucher (${metodo}). Solo el efectivo va sin voucher.`, 4500);
    const x = { id: uid(), fecha: $('#pg-fecha').value || hoy(), monto, metodo, referencia: $('#pg-ref').value.trim(), tiene_foto: !!file };
    if (file) {
      const blob = await redimensionar(file, 1400);
      await idb.put('imagenes', { clave: `pagos/${x.id}`, blob });
      IMG[`pagos/${x.id}`] = URL.createObjectURL(blob);
      x._foto_pendiente = true;
    }
    F.pagos.push(x);
    if (pagadoDe(F) > PF.totales().total + 0.009) toast('Ojo: lo pagado supera el total del pedido.', 4500);
    PF.pintarPago(); PF.pintarResumen();
  },
  quitarPago(i) { if (!confirm('¿Quitar este pago?')) return; F.pagos.splice(i, 1); PF.pintarPago(); PF.pintarResumen(); },

  // ---- comprobante
  pintarDoc() {
    const el = $('#pf-doc'); if (!el) return;
    const b2b = F.canal === 'b2b'; const cp = F.comprobante; const g = F.guia;
    el.innerHTML = `<div class="grid g3">
        ${b2b ? `<div class="campo"><label>Tipo</label><select onchange="F.comprobante.tipo=this.value;PF.pintarDoc()"><option value="factura" ${cp.tipo === 'factura' ? 'selected' : ''}>Factura</option><option value="boleta" ${cp.tipo === 'boleta' ? 'selected' : ''}>Boleta</option></select></div>` : ''}
        <div class="campo"><label>${b2b ? 'Serie y número' : 'Código de boleta'}</label><input type="text" value="${h(cp.numero)}" placeholder="${cp.tipo === 'factura' ? 'F001-00000123' : 'B001-00000123'}" oninput="F.comprobante.numero=this.value.toUpperCase().trim();PF.pintarWA()"></div>
        <div class="campo"><label>Fecha de emisión</label><input type="date" value="${h(cp.fecha)}" onchange="F.comprobante.fecha=this.value"></div>
      </div>
      ${b2b ? `<div class="grid g3" style="margin-top:10px">
        <div class="campo"><label>Guía de remisión</label><input type="text" value="${h(g.numero)}" placeholder="T001-00000045" oninput="F.guia.numero=this.value.toUpperCase().trim();PF.pintarWA()"></div>
        <div class="campo"><label>Fecha de la guía</label><input type="date" value="${h(g.fecha)}" onchange="F.guia.fecha=this.value"></div></div>
        ${cp.tipo === 'factura' ? `<p class="suave" style="margin-bottom:0">Para factura, la empresa necesita RUC.</p>` : ''}` : '<p class="suave" style="margin-bottom:0">Si todavía no emites la boleta, déjalo vacío: el pedido aparece en el filtro “Sin boleta / factura”.</p>'}`;
  },

  totales() {
    if (F.canal === 'b2b') {
      const subtotal = r2(F.lineas.reduce((a, l) => a + (+l.cantidad || 0) * (+l.precio_unit || 0), 0));
      const otro = Math.max(0, +F._otroDesc || 0);
      const descuento = r2(Math.min(subtotal, otro));
      const envio = F.envio_asumido ? 0 : +F.envio || 0;
      const gravado = subtotal - descuento + envio;
      return { subtotal, ref: 0, otro, descuento, elegibleRef: false, envio, total: r2(gravado), igv: r2(gravado - gravado / (1 + IGV)) };
    }
    const packs = F.packs.reduce((a, it) => a + (+it.precio || 0), 0);
    const sueltos = SABORES.reduce((a, s) => a + (F.sueltos[s.id] || 0) * precioSuelto(s.id), 0);
    const subtotal = r2(packs + sueltos);
    const elegibleRef = !!PF.referente() && PF.esPrimerPedido() && F.packs.length > 0;
    const ref = elegibleRef && F._descRef ? Math.min(CLUB.desc_referido, subtotal) : 0;
    const otro = Math.max(0, +F._otroDesc || 0);
    const descuento = r2(Math.min(subtotal, ref + otro));
    const envio = F.envio_asumido ? 0 : +F.envio || 0;
    return { subtotal, ref, otro, descuento, elegibleRef, envio, total: r2(subtotal - descuento + envio), igv: 0 };
  },

  pintarResumen() {
    const el = $('#pf-resumen'); if (!el) return;
    const t = PF.totales(); const b2b = F.canal === 'b2b';
    const lineas = b2b ? F.lineas.map(l => [`${l.cantidad} × ${h(l.nombre || 'producto')}`, soles(l.cantidad * l.precio_unit)]) : [
      ...F.packs.map(it => [`${h(it.nombre)}<br><small>${Object.entries(it.sabores).filter(([, n]) => n).map(([k, n]) => `${n} ${nombreSabor(k)}`).join(', ') || 'elige sabores'}</small>`, soles(it.precio)]),
      ...SABORES.filter(s => F.sueltos[s.id]).map(s => [`${F.sueltos[s.id]} ${s.nombre} suelto`, soles(F.sueltos[s.id] * precioSuelto(s.id))]),
      ...F.regalos.map(s => [`${ic('regalo')} 1 ${nombreSabor(s)} (regalo)`, 'S/0']),
    ];
    const pg = pagadoDe(F); const sal = Math.max(0, r2(t.total - pg));
    let sellos = '';
    if (!b2b) {
      const cli = F._modo === 'sel' ? PF.cliente() : null; const e = cli ? statsDe(cli.id) : null; const ref = PF.referente();
      const ya = F.id && daSello(D.pedidos.get(F.id));
      sellos = F.packs.length ? `<div class="aviso ok" style="margin-top:12px">Cuando esté <b>pagado y entregado</b>: +1 sello para ${h(cli ? cli.nombre : (F._nuevo.nombre || 'el cliente'))}${e ? ` (tendrá ${e.total + (ya ? 0 : 1)})` : ''}${ref && PF.esPrimerPedido() ? `<br>+1 sello para ${h(ref.nombre)} por referido` : ''}</div>`
        : `<div class="aviso alerta" style="margin-top:12px">Sin pack no suma sello (los frascos sueltos no cuentan).</div>`;
    }
    const avisos = PF.avisos();
    el.innerHTML = `<h3>Resumen</h3>
      ${lineas.length ? lineas.map(([a, b]) => `<div class="fila-r"><span>${a}</span><b class="num">${b}</b></div>`).join('') : '<p class="suave">Agrega productos.</p>'}
      <hr class="sep" style="margin:8px 0">
      <div class="fila-r"><span>Subtotal</span><b class="num">${soles(t.subtotal)}</b></div>
      ${t.elegibleRef ? `<div class="fila-r"><label class="check" style="font-weight:700"><input type="checkbox" ${F._descRef ? 'checked' : ''} onchange="F._descRef=this.checked;PF.pintarResumen()"> Descuento referido (1.er pack)</label><b class="num">−${soles(CLUB.desc_referido)}</b></div>` : ''}
      ${t.otro ? `<div class="fila-r"><span>Otro descuento</span><b class="num">−${soles(t.otro)}</b></div>` : ''}
      ${t.envio ? `<div class="fila-r"><span>Envío</span><b class="num">${soles(t.envio)}</b></div>` : F.envio_asumido ? `<div class="fila-r"><span>Envío</span><b class="num" style="color:var(--ok)">Gratis</b></div>` : ''}
      <div class="fila-r total"><span>Total</span><span class="num">${soles(t.total)}</span></div>
      ${b2b ? `<div class="fila-r"><small>Op. gravada</small><small class="num">${soles(t.total - t.igv)}</small></div><div class="fila-r"><small>IGV 18%</small><small class="num">${soles(t.igv)}</small></div>` : ''}
      <div class="fila-r" style="margin-top:6px"><span>Pagado</span><b class="num">${soles(pg)}</b></div>
      <div class="fila-r"><span>${F.modalidad_pago === 'credito' && F.fecha_vencimiento ? `Saldo (vence ${fechaCorta(F.fecha_vencimiento)})` : 'Saldo'}</span><b class="num" style="color:${sal > 0 ? 'var(--error)' : 'var(--ok)'}">${soles(sal)}</b></div>
      ${sellos}
      ${PF.bloqueMargen(t)}
      ${F.id && inventario().asign[F.id]?.length ? `<p class="suave" style="margin:10px 0 0;font-size:13px"><b>Lotes:</b> ${inventario().asign[F.id].map(a => `${a.n} ${h(nombreSabor(D.productos.get(a.prod)?.sabor))} (${h(a.lote)})`).join(' · ')}</p>` : ''}
      ${avisos.length ? `<div class="lista-avisos" style="margin-top:10px">${avisos.map(a => `<div class="aviso ${a[0]}">${a[1]}</div>`).join('')}</div>` : ''}
      <div id="pf-errores"></div>`;
    PF.pintarPagoSaldo(); PF.pintarWA();
  },

  // Rentabilidad en vivo: cómo afectan los descuentos, los regalos y el delivery a lo que ganas.
  bloqueMargen(t) {
    const items = PF.items(); if (!items.length) return '';
    const R = rentabilidad({ items, total: t.total, igv: t.igv, envio: t.envio, courier: F.courier });
    const b2b = F.canal === 'b2b';
    const descLista = b2b ? 0 : r2(R.lista - t.subtotal);
    const fila = (a, b, cls = '') => `<div class="fila-r ${cls}"><span>${a}</span><b class="num">${b}</b></div>`;
    const ancho = Math.max(0, Math.min(100, R.margen));
    return `<div class="rentab">
      <div class="rentab-cab"><b>${ic('dinero')} Rentabilidad</b><span class="margen-pill ${claseMargen(R.margen)}">margen ${pct(R.margen)}</span></div>
      <div class="margen-riel"><span class="${claseMargen(R.margen)}" style="width:${ancho}%"></span><i style="left:${MARGEN_MINIMO}%" title="Mínimo ${MARGEN_MINIMO}%"></i></div>
      ${!b2b && descLista > 0 ? fila(`Precio de lista <small>(${plural(R.frascos - F.regalos.length, 'frasco')} sueltos)</small>`, soles(R.lista)) + fila('Ahorro por pack / nivel', '−' + soles(descLista), 'rojo') : ''}
      ${t.descuento ? fila(t.ref && t.otro ? 'Descuentos (referido + otro)' : t.ref ? 'Descuento referido' : 'Otro descuento', '−' + soles(t.descuento), 'rojo') : ''}
      ${fila(b2b ? 'Venta de productos sin IGV' : 'Venta de productos', soles(R.ventaProd))}
      ${fila('Costo de mantequillas', '−' + soles(R.costoProd), 'rojo')}
      ${R.costoRegalo ? fila('Regalos del Club (costo)', '−' + soles(R.costoRegalo), 'rojo') : ''}
      ${R.envio || R.courier ? fila(`Delivery <small>(cobras ${soles(R.envio)} · pagas ${soles(R.courier)})</small>`, (R.deliveryNeto < 0 ? '−' : '+') + soles(Math.abs(R.deliveryNeto)), R.deliveryNeto < 0 ? 'rojo' : '') : ''}
      <div class="fila-r ganancia"><span>Ganancia</span><b class="num">${soles(R.ganancia)}</b></div>
      ${R.margen < MARGEN_MINIMO && R.ingreso > 0 ? `<small class="${R.margen < 30 ? 'falta' : 'suave'}">Margen por debajo del ${MARGEN_MINIMO}% que pide el centro de costos.</small>` : ''}
      ${b2b && F.lineas.some(l => !l.producto_id && l.nombre.trim() && !(+l.costo_unit > 0)) ? `<small class="suave">Las líneas “Otro producto” sin costo cuentan como S/0: escribe su costo para ver el margen real.</small>` : ''}
    </div>`;
  },

  avisos() {
    const out = [];
    if (F.canal !== 'b2b' && F._modo === 'sel' && F.nivel_precio === 'leyenda') {
      const hace7 = new Date(Date.now() - 7 * 86400000);
      const previos = lista('pedidos').filter(p => p.cliente_id === F.cliente_id && p.id !== F.id && !p.anulado && p.nivel_precio === 'leyenda' && aFecha(p.fecha) >= hace7)
        .reduce((a, p) => a + (p.items || []).filter(i => i.tipo === 'pack').length, 0);
      if (previos + F.packs.length > CLUB.tope_leyenda_semana) out.push(['alerta', `Con este pedido lleva ${previos + F.packs.length} packs Leyenda en 7 días (el tope es ${CLUB.tope_leyenda_semana}).`]);
    }
    if (F.canal !== 'b2b' && F._modo === 'sel') {
      const nc = statsDe(F.cliente_id).nivel; const orden = ['oficial', 'vip', 'leyenda'];
      if (orden.indexOf(F.nivel_precio) > orden.indexOf(nc)) out.push(['alerta', `Estás cobrando precio ${NIVELES[F.nivel_precio]} a un cliente ${NIVELES[nc]}.`]);
    }
    for (const [pid, n] of Object.entries(consumoPedido({ canal: F.canal, items: PF.items() }))) {
      const antes = F.id && !D.pedidos.get(F.id)?.anulado ? (consumoPedido(D.pedidos.get(F.id))[pid] || 0) : 0;
      const hay = stockDe(pid) + antes;
      if (n > hay) out.push(['alerta', `Stock insuficiente de ${h(nombreSabor(D.productos.get(pid)?.sabor))}: pides ${n} y hay ${Math.max(0, hay)}. Registra la entrada en Inventario.`]);
    }
    if (F.estado_entrega === 'entregado' && F.canal !== 'b2b' && pagadoDe(F) < PF.totales().total - 0.009) out.push(['alerta', 'Está entregado pero falta el pago: el sello se suma cuando se complete el pago.']);
    return out;
  },

  // ---- WhatsApp según la etapa
  pedidoVirtual() {
    const t = PF.totales();
    return { ...F, numero: F.numero || '(nuevo)', items: PF.items(), total: t.total, subtotal: t.subtotal, anulado: !!F.anulado };
  },
  pintarWA() {
    const el = $('#pf-wa'); if (!el) return;
    const c = PF.clienteParaMensaje();
    if (!c || !(c.celular)) { el.innerHTML = `<h3>WhatsApp</h3><p class="suave">Elige o registra al cliente para preparar el mensaje.</p>`; return; }
    const p = PF.pedidoVirtual(); const T = plantillas(p, c);
    const sug = faseSugerida(p);
    if (!F._waClave || !F._waEdit) F._waClave = F._waClave && F._waEdit ? F._waClave : (F._waFijada || sug);
    const clave = F._waClave;
    const txt = F._waEdit && F._waTxt != null ? F._waTxt : T[clave].x;
    el.innerHTML = `<h3>WhatsApp</h3>
      <div class="campo"><label>Mensaje ${clave === sug ? '<small class="suave">(sugerido para esta etapa)</small>' : ''}</label>
        <select onchange="F._waFijada=this.value;F._waClave=this.value;F._waEdit=false;PF.pintarWA()">${Object.entries(T).map(([k, v]) => `<option value="${k}" ${k === clave ? 'selected' : ''}>${v.t}${k === sug ? ' ★' : ''}</option>`).join('')}</select></div>
      <textarea id="pf-wa-txt" style="min-height:190px;margin-top:8px;font-size:14px" oninput="F._waEdit=true;F._waTxt=this.value">${h(txt)}</textarea>
      <div class="fila" style="margin-top:8px">
        <button class="btn wa" onclick="PF.enviarWA()">${ic('wa')} Guardar y abrir WhatsApp</button>
        <button class="btn mini" onclick="copiar(document.getElementById('pf-wa-txt').value)">Copiar</button>
        ${F._waEdit ? `<button class="btn mini" onclick="F._waEdit=false;F._waTxt=null;PF.pintarWA()">Restaurar</button>` : ''}
      </div>
      <small class="suave">Se abre ${CFG.wa_modo === 'web' ? 'WhatsApp Web' : CFG.wa_modo === 'elegir' ? 'WhatsApp (tú eliges la app o la web)' : 'WhatsApp de escritorio'} con el mensaje listo. Cámbialo en Sincronización.</small>`;
  },
  async enviarWA() {
    const editado = F._waEdit ? $('#pf-wa-txt').value : null; const clave = F._waClave;
    const rec = await PF.guardar({ quedarse: true }); if (!rec) return;
    const c = D.clientes.get(rec.cliente_id);
    abrirWhatsApp(c.celular, editado ?? plantillas(rec, c)[clave || faseSugerida(rec)].x);
  },

  items() {
    if (F.canal === 'b2b') return F.lineas.filter(l => l.nombre.trim() || l.producto_id).map(l => ({ tipo: 'linea', producto_id: l.producto_id, nombre: l.nombre.trim(), cantidad: +l.cantidad || 0, precio_unit: +l.precio_unit || 0,
      costo_unit: l.producto_id ? costoProducto(l.producto_id) : r2(+l.costo_unit || 0) }));
    return [
      ...F.packs.map(it => { const sabores = Object.fromEntries(Object.entries(it.sabores).filter(([, n]) => n));
        return { tipo: 'pack', pack_id: it.pack_id, nombre: it.nombre, frascos: it.frascos, tipo_pack: it.tipo_pack, max_almendra: it.max_almendra, precio: it.precio, sabores,
          costo: r2(Object.entries(sabores).reduce((a, [s, n]) => a + n * costoSabor(s), 0)) }; }),
      ...SABORES.filter(s => F.sueltos[s.id]).map(s => ({ tipo: 'suelto', sabor: s.id, cantidad: F.sueltos[s.id], precio_unit: precioSuelto(s.id), costo_unit: costoSabor(s.id) })),
      ...F.regalos.map(s => ({ tipo: 'regalo', sabor: s, precio: 0, costo_unit: costoSabor(s) })),
    ];
  },

  errores() {
    const err = []; const b2b = F.canal === 'b2b';
    if (F._modo === 'buscar') err.push(b2b ? 'Elige una empresa o registra una nueva.' : 'Elige un cliente o registra uno nuevo.');
    if (F._modo === 'nuevo') {
      const n = F._nuevo;
      if (!n.nombre.trim()) err.push(b2b ? 'Falta el nombre comercial.' : 'Falta el nombre.');
      if (!b2b && !n.apellido.trim()) err.push('Falta el apellido.');
      if (b2b && !n.tipo_negocio) err.push('Elige el tipo de negocio.');
      if (b2b && !n.contacto.trim()) err.push('Falta la persona de contacto.');
      if (b2b && n.ruc && soloDigitos(n.ruc).length !== 11) err.push('El RUC debe tener 11 dígitos.');
      if (celNorm(n.celular).length !== 9) err.push('El celular debe tener 9 dígitos.');
      else if (clientePorCelular(n.celular)) err.push('Ese celular ya está registrado: usa el cliente existente.');
      if (!n.distrito) err.push('Elige el distrito.');
      if (n.correo.trim() && !esCorreo(n.correo)) err.push('El correo no es válido.');
      if (!n.direccion.trim()) err.push('Falta la dirección.');
      if (!(n._mismaDir ? n.direccion : n.direccion_envio).trim()) err.push('Falta la dirección de envío.');
    }
    if (F._modo === 'sel' && !String(F.direccion_envio || '').trim()) err.push('Falta la dirección de envío.');
    if (b2b) {
      const ls = PF.items();
      if (!ls.length) err.push('El pedido no tiene productos.');
      ls.forEach((l, i) => { if (!l.nombre) err.push(`Línea ${i + 1}: falta la descripción.`); if (!(l.cantidad > 0)) err.push(`${l.nombre || 'Línea ' + (i + 1)}: falta la cantidad.`); if (!(l.precio_unit > 0)) err.push(`${l.nombre || 'Línea ' + (i + 1)}: falta el precio.`); });
      if (F.comprobante.tipo === 'factura' && F.comprobante.numero) {
        const ruc = F._modo === 'nuevo' ? F._nuevo.ruc : PF.cliente()?.ruc;
        if (soloDigitos(ruc).length !== 11) err.push('Para registrar una factura, la empresa necesita RUC (11 dígitos). Agrégalo en su ficha.');
      }
      if (F.modalidad_pago === 'credito' && !F.fecha_vencimiento) err.push('Pon la fecha de vencimiento del crédito.');
    } else {
      const sueltos = Object.values(F.sueltos).reduce((a, b) => a + b, 0);
      if (!F.packs.length && !sueltos && !F.regalos.length) err.push('El pedido no tiene mantequillas.');
      F.packs.forEach(it => {
        const suma = Object.values(it.sabores).reduce((a, b) => a + b, 0);
        if (suma !== it.frascos) err.push(`${it.nombre}: elige ${it.frascos} sabores (van ${suma}).`);
        if (it.tipo_pack !== 'almendra' && (it.sabores.almendra || 0) > it.max_almendra) err.push(`${it.nombre}: máximo ${it.max_almendra} de almendra.`);
      });
      if (F.regalos.length > PF.regalosDisponibles()) err.push('Tiene más regalos de los que ganó.');
    }
    if (!F.fecha) err.push('Falta la fecha del pedido.');
    return err;
  },

  async guardar({ quedarse = false } = {}) {
    const err = PF.errores();
    if (err.length) { $('#pf-errores').innerHTML = `<div class="aviso error" style="margin-top:10px">${err.map(h).join('<br>')}</div>`; $('#pf-errores').scrollIntoView({ block: 'nearest' }); toast('Revisa lo que falta en el resumen.'); return null; }
    const b2b = F.canal === 'b2b';
    let cid = F.cliente_id;
    if (F._modo === 'nuevo') {
      const n = F._nuevo;
      const c = {
        id: uid(), tipo_cliente: b2b ? 'empresa' : 'persona', nombre: n.nombre.trim(), apellido: b2b ? '' : n.apellido.trim(), celular: celNorm(n.celular), correo: n.correo.trim().toLowerCase(), distrito: n.distrito,
        razon_social: n.razon_social.trim(), ruc: soloDigitos(n.ruc), contacto: n.contacto.trim(), tipo_negocio: n.tipo_negocio,
        direccion: n.direccion.trim(), direccion_envio: (n._mismaDir ? n.direccion : n.direccion_envio).trim(), referencia: n.referencia.trim(),
        referido_por: b2b ? null : (n.referido_por || null), nivel_manual: null, notas: '',
      };
      c.codigo = b2b ? '' : generarCodigo(c.nombre, c.apellido, c.id);
      await guardar('clientes', c); cid = c.id; F.direccion_envio = c.direccion_envio;
      F.cliente_id = cid; F._modo = 'sel';
    } else if (F._actDir && !F.id) {
      const c = D.clientes.get(cid);
      if (c.direccion_envio !== F.direccion_envio.trim()) { c.direccion_envio = F.direccion_envio.trim(); await guardar('clientes', c); }
    }
    const cli = D.clientes.get(cid);
    const t = PF.totales();
    const previo = F.id ? D.pedidos.get(F.id) : null;
    const snaps = snapshotClub({ canal: F.canal, cliente_id: cid });
    const pagos = F.pagos.map(x => ({ ...x }));
    const rec = {
      ...(previo || {}),
      id: F.id || uid(), numero: F.numero || nuevoNumero(F.fecha, F.canal), canal: F.canal, cliente_id: cid, fecha: F.fecha, fecha_entrega: F.fecha_entrega || null,
      estado_entrega: F.estado_entrega, anulado: !!F.anulado, modalidad_pago: F.modalidad_pago, fecha_vencimiento: F.modalidad_pago === 'credito' ? F.fecha_vencimiento : null,
      nivel_precio: b2b ? null : F.nivel_precio, items: PF.items(), subtotal: t.subtotal, descuento: t.descuento, descuento_referido: t.ref,
      descuento_motivo: F.descuento_motivo || '', envio: t.envio, envio_asumido: !!F.envio_asumido, igv: t.igv, total: t.total, pagos,
      courier: (() => { const { _otro, _otroTxt, ...cour } = F.courier; return Object.values(cour).some(v => String(v || '').trim()) ? cour : null; })(),
      comprobante: F.comprobante.numero ? { ...F.comprobante } : null,
      guia: b2b && F.guia.numero ? { ...F.guia } : null,
      direccion_envio: String(F.direccion_envio || '').trim(), referido_por: t.ref ? cli.referido_por : (previo?.referido_por || null), notas: F.notas || '',
      entregado_en: F.estado_entrega === 'entregado' ? (F.entregado_en || previo?.entregado_en || new Date().toISOString()) : null,
    };
    rec.estado_pago = estadoPago(rec);
    rec.metodo_pago = metodosDe(rec);
    rec.costo = rentabilidad(rec).costo;
    if (cli._demo) rec._demo = true;
    await guardar('pedidos', rec);
    if (cli.regalo_agendado && (statsDe(cid)?.regalosPend || 0) === 0) { cli.regalo_agendado = false; await guardar('clientes', cli); }
    toast(`Pedido ${rec.numero} guardado${navigator.onLine && CFG.supabase ? '' : ' en esta PC'}.`);
    anunciarSnaps(snaps);
    if (quedarse) { PF.abrir(rec.id); return rec; }
    volver();
    return rec;
  },
};

// Voucher de un pago: primero la copia local; si no está, se baja de Supabase (bucket privado).
async function verVoucher(pagoId, ruta) {
  const local = IMG[`pagos/${pagoId}`];
  if (local) return window.open(local, '_blank');
  if (!ruta || !conectado()) return toast('El voucher está en otra computadora y todavía no se sincroniza.');
  try {
    const r = await fetch(`${CFG.supabase.url}/storage/v1/object/comprobantes/${ruta}`, { headers: await cabeceras() });
    if (!r.ok) throw new Error();
    window.open(URL.createObjectURL(await r.blob()), '_blank');
  } catch { toast('No se pudo abrir el voucher.'); }
}

// ==================================================================== CLIENTES
function renderClientes() {
  const f = UI.cli; const C = club();
  let cs = lista('clientes');
  const conteo = { persona: 0, empresa: 0 };
  cs.forEach(c => { conteo[esEmpresa(c) ? 'empresa' : 'persona']++; });
  const delTipo = cs.filter(c => (c.tipo_cliente || 'persona') === f.tipo);
  const k = { activos: 0, regalo: 0, deuda: 0, deudaN: 0, gasto: 0, ganancia: 0 };
  delTipo.forEach(c => { const e = C[c.id]; if (e.dias != null && e.dias <= CLUB.dias_pausa) k.activos++; if (e.regalosPend && !esEmpresa(c)) k.regalo++; if (e.saldo > 0) { k.deuda += e.saldo; k.deudaN++; } k.gasto += e.gasto; k.ganancia += e.ganancia; });
  cs = delTipo;
  if (f.nivel === 'deuda') cs = cs.filter(c => C[c.id].saldo > 0);
  else if (f.nivel !== 'todos') cs = cs.filter(c => !esEmpresa(c) && C[c.id].nivel === f.nivel);
  if (f.q) { const ids = new Set(buscarClientes(f.q, 9999).map(c => c.id)); cs = cs.filter(c => ids.has(c.id)); }
  const ord = {
    reciente: (a, b) => (C[b.id].ultima || new Date(b.creado_en)) - (C[a.id].ultima || new Date(a.creado_en)),
    sellos: (a, b) => C[b.id].total - C[a.id].total,
    gasto: (a, b) => C[b.id].gasto - C[a.id].gasto,
    ganancia: (a, b) => C[b.id].ganancia - C[a.id].ganancia,
    nombre: (a, b) => nombreCliente(a).localeCompare(nombreCliente(b)),
  };
  cs.sort(ord[f.orden] || ord.reciente);
  const emp = f.tipo === 'empresa';
  const nivOpc = { persona: [['todos', 'Todos los niveles'], ['oficial', 'Oficial'], ['vip', 'VIP'], ['leyenda', 'Leyenda Peanut'], ['deuda', 'Con saldo pendiente']], empresa: [['todos', 'Todas'], ['deuda', 'Con saldo pendiente']] }[f.tipo];
  const mg = k.gasto ? k.ganancia / k.gasto * 100 : 0;
  $('#v-clientes').innerHTML = `
    <div class="cab-vista">
      <div><h2>Clientes</h2><span class="suave">${emp ? 'Empresas que compran por mayor (B2B).' : 'Personas con su tarjeta del Club y su código para referir amigos.'}</span></div>
      <div class="der"><button class="btn" onclick="CLI.exportar()">${ic('descargar')} Exportar CSV</button><button class="btn prim" onclick="CLI.abrir(null, UI.cli.tipo)">${ic('mas-circ')} ${emp ? 'Nueva empresa' : 'Nuevo cliente'}</button></div>
    </div>
    <div class="kpis">
      <div class="kpi"><small>${ic(emp ? 'productos' : 'clientes')} ${emp ? 'Empresas' : 'Clientes'}</small><b class="num">${delTipo.length}</b><em>${k.activos} compraron en los últimos ${CLUB.dias_pausa} días</em></div>
      <div class="kpi"><small>${ic('dinero')} Ganancia que dejan</small><b class="num">${soles(k.ganancia)}</b><em>de ${soles(k.gasto)} en ventas${k.gasto ? ` · <span class="${claseMargen(mg)}-txt">${pct(mg)}</span>` : ''}</em></div>
      <button type="button" class="kpi clic ${f.nivel === 'deuda' ? 'sel' : ''}" onclick="UI.cli.nivel=UI.cli.nivel==='deuda'?'todos':'deuda';renderClientes()"><small>${ic('alerta')} Con saldo pendiente</small><b class="num">${soles(k.deuda)}</b><em>${plural(k.deudaN, emp ? 'empresa' : 'cliente')}</em></button>
      ${emp ? '' : `<div class="kpi"><small>${ic('regalo')} Regalos por entregar</small><b class="num">${k.regalo}</b><em>${k.regalo ? 'agéndalos desde la campana' : 'nadie tiene regalo pendiente'}</em></div>`}
    </div>
    <div class="card">
      <div class="filtros">
        <div class="campo"><label>Tipo de cliente</label><select onchange="UI.cli.tipo=this.value;UI.cli.nivel='todos';if(this.value==='empresa'&&UI.cli.orden==='sellos')UI.cli.orden='reciente';renderClientes()">
          ${[['persona', 'Personas'], ['empresa', 'Empresas']].map(([x, t]) => `<option value="${x}" ${f.tipo === x ? 'selected' : ''}>${t} (${conteo[x]})</option>`).join('')}</select></div>
        <div class="campo"><label>${emp ? 'Estado' : 'Nivel'}</label><select onchange="UI.cli.nivel=this.value;renderClientes()">
          ${nivOpc.map(([x, t]) => `<option value="${x}" ${f.nivel === x ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="campo"><label>Ordenar por</label><select onchange="UI.cli.orden=this.value;renderClientes()">
          ${[['reciente', 'Compra más reciente'], ['sellos', 'Más sellos'], ['gasto', 'Más gasto'], ['ganancia', 'Más ganancia'], ['nombre', 'Nombre A-Z']].filter(([x]) => !(emp && x === 'sellos')).map(([x, t]) => `<option value="${x}" ${f.orden === x ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="campo buscar"><label>Buscar</label><input type="search" id="cli-q" placeholder="Nombre, celular, ${emp ? 'RUC' : 'código PEANUT-…'} o distrito" value="${h(f.q)}" oninput="UI.cli.q=this.value;renderClientesLuego()"></div>
      </div>
      <div class="barra-lista"><span><b>${plural(cs.length, emp ? 'empresa' : 'cliente')}</b></span>
        ${f.nivel !== 'todos' || f.q ? `<button class="btn mini" onclick="UI.cli.nivel='todos';UI.cli.q='';renderClientes()">Quitar filtros</button>` : ''}</div>
      <div class="tabla-wrap"><table class="tabla-cli">
        <thead><tr><th>${emp ? 'Empresa' : 'Cliente'}</th><th>Contacto</th><th>${emp ? 'Negocio' : 'Club'}</th><th class="cen">Compras</th><th class="der">Gasto</th><th class="der">Debe</th><th>Última compra</th><th></th></tr></thead>
        <tbody>${cs.length ? cs.map(c => { const e = C[c.id]; const em = esEmpresa(c);
          const enCiclo = e.total % CLUB.regalo_cada;
          return `<tr class="clic" onclick="CLI.abrir('${c.id}')">
          <td><div class="cli-celda">${avatar(c, e.nivel)}<div><b>${h(nombreCliente(c))}</b>${c._demo ? ' <small>(ejemplo)</small>' : ''}${esPrueba('clientes', c.id) ? ' <span class="tag prueba">prueba</span>' : ''}<br>
            ${em ? `<small>${c.ruc ? 'RUC ' + h(c.ruc) : '<span class="falta">sin RUC</span>'}${c.contacto ? ' · ' + h(c.contacto) : ''}</small>` : chipCodigo(c.codigo)}</div></div></td>
          <td><span class="num">${h(c.celular)}</span><br><small>${h(c.distrito || '—')}</small></td>
          <td>${em ? `<span class="tag b2b">${h(c.tipo_negocio || 'Empresa')}</span>` : `${tagNivel(e.nivel, e.manual ? ' · fijado' : '')} ${e.pausa ? '<span class="tag pausa">pausa</span>' : ''}
            <div class="mini-sellos" title="${plural(e.total, 'sello')} · ${CLUB.regalo_cada - enCiclo} para el próximo regalo"><span style="width:${(e.total > 0 && enCiclo === 0 ? 1 : enCiclo / CLUB.regalo_cada) * 100}%"></span></div>
            <small>${plural(e.total, 'sello')}${e.regalosPend ? ` · <b style="color:var(--caramelo)">${ic('regalo')} regalo</b>` : ''}</small>`}</td>
          <td class="cen num"><b>${e.ventas.length}</b></td>
          <td class="der num">${soles(e.gasto)}${e.gasto ? `<br><small class="${claseMargen(e.margen)}-txt">gana ${soles(e.ganancia)}</small>` : ''}</td>
          <td class="der num">${e.saldo > 0 ? `<b style="color:var(--error)">${soles(e.saldo)}</b>` : '<small class="suave">—</small>'}</td>
          <td>${e.ultima ? `${fechaCorta(e.ultima.toISOString())}<br><small>hace ${plural(e.dias, 'día')}</small>` : '<small>sin compras</small>'}</td>
          <td class="der acciones-fila"><button class="btn mini wa solo-ic" title="Abrir WhatsApp" aria-label="WhatsApp" onclick="event.stopPropagation();abrirWhatsApp('${h(c.celular)}','')">${ic('wa')}</button>
            <button class="btn mini" title="Nuevo pedido para este cliente" onclick="event.stopPropagation();PF.abrir(null,'${c.id}')">${ic('mas-circ')} Pedido</button></td></tr>`; }).join('')
          : `<tr><td colspan="8" class="vacio"><div class="vacio-caja">${ic('clientes', 'g')}<b>${delTipo.length ? 'No hay clientes con este filtro' : emp ? 'Todavía no hay empresas' : 'Todavía no hay clientes'}</b>
            ${delTipo.length ? '' : `<button class="btn prim" onclick="CLI.abrir(null, UI.cli.tipo)">${ic('mas-circ')} ${emp ? 'Nueva empresa' : 'Nuevo cliente'}</button>`}</div></td></tr>`}</tbody>
      </table></div>
    </div>`;
}
let _tCli;
function renderClientesLuego() { clearTimeout(_tCli); _tCli = setTimeout(() => { renderClientes(); const i = $('#cli-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); }

// Tarjeta del Club: cada 10 sellos se completa una tarjeta (= 1 regalo) y empieza otra.
// Muestra el total acumulado, las tarjetas completas y los sellos que están por llegar
// (pedidos con pack que aún no están pagados y entregados).
function tarjetaSellos(e) {
  const N = CLUB.regalo_cada;
  const enCiclo = e.total % N;
  const llenos = e.total > 0 && enCiclo === 0 ? N : enCiclo;
  const completas = Math.floor(e.total / N) - (e.total > 0 && enCiclo === 0 ? 1 : 0);
  const porLlegar = e.pedidos.filter(p => p.canal !== 'b2b' && tienePack(p) && !daSello(p));
  const motivo = p => { const falta = [estadoPago(p) !== 'pagado' ? 'pago' : null, p.estado_entrega !== 'entregado' ? 'entrega' : null].filter(Boolean); return `falta ${falta.join(' y ')}`; };
  const nPend = Math.min(porLlegar.length, N - llenos);
  return `<div class="tarjeta"><div class="tt"><b>Tarjeta Mr. Peanut${completas ? ` n.° ${completas + 1}` : ''}</b><span><b class="tt-total">${e.total}</b> ${e.total === 1 ? 'sello' : 'sellos'} acumulados</span></div>
    <div class="sellos">${Array.from({ length: N }, (_, i) => i < llenos
      ? `<div class="sello lleno"><img src="img/sello.png" alt=""></div>`
      : i < llenos + nPend ? `<div class="sello pend" title="Llega cuando el pedido esté pagado y entregado">${ic('reloj')}</div>`
      : `<div class="sello">${i + 1 === N ? ic('regalo', 'g') : i + 1}</div>`).join('')}</div>
    <div class="tt-pie">
      ${completas ? `<span>${ic('regalo')} ${plural(completas, 'tarjeta completa', 'tarjetas completas')} (${completas * N} sellos) · ${e.regalosUsados ? `${plural(e.regalosUsados, 'regalo usado', 'regalos usados')}` : 'regalo sin usar'}</span>` : ''}
      <span>${llenos === N ? '¡Tarjeta llena: le toca su regalo!' : `Le ${N - llenos === 1 ? 'falta 1 sello' : `faltan ${N - llenos} sellos`} para su regalo`}</span>
      ${porLlegar.length ? `<span class="tt-pend">${ic('reloj')} ${plural(porLlegar.length, 'sello')} por llegar: ${porLlegar.map(p => `<a href="#" onclick="PF.abrir('${p.id}');return false">${h(p.numero)}</a> (${motivo(p)})`).join(', ')}</span>` : ''}
    </div></div>`;
}

let CF = null; // cliente abierto en su página
const CLI = {
  abrir(id, tipo) {
    const nuevo = !id;
    CF = nuevo ? { id: uid(), ...clienteVacio(tipo || 'persona'), nivel_manual: null, notas: '', codigo: '' } : structuredClone(D.clientes.get(id));
    if (!CF) return;
    if (!CF.tipo_cliente) CF.tipo_cliente = 'persona';
    CF._mismaDir = nuevo || !CF.direccion_envio || CF.direccion_envio === CF.direccion;
    CLI.pintar(nuevo);
  },
  pintar(nuevo) {
    const emp = esEmpresa(CF); const id = CF.id;
    const e = nuevo ? null : statsDe(id);
    const ref = CF.referido_por ? D.clientes.get(CF.referido_por) : null;
    const campo = (k, t, tipo = 'text', full = false) => `<div class="campo" ${full ? 'style="grid-column:1/-1"' : ''}><label>${t}</label><input type="${tipo}" value="${h(CF[k] || '')}" oninput="CF['${k}']=this.value${k === 'nombre' || k === 'apellido' ? ';CLI.prevCod()' : ''}"></div>`;
    const datos = `<div class="card">
        ${nuevo ? `<div class="chips" style="margin-bottom:12px"><button class="chip ${!emp ? 'activo' : ''}" onclick="CF.tipo_cliente='persona';CLI.pintar(true)">Persona</button><button class="chip ${emp ? 'activo' : ''}" onclick="CF.tipo_cliente='empresa';CLI.pintar(true)">Empresa</button></div>` : ''}
        <div class="grid g2">${emp ? `
          ${campo('nombre', 'Nombre comercial *')}${campo('razon_social', 'Razón social')}${campo('ruc', 'RUC')}
          <div class="campo"><label>Tipo de negocio *</label><select onchange="CF.tipo_negocio=this.value"><option value="">Elige…</option>${NEGOCIOS.map(x => `<option ${CF.tipo_negocio === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          ${campo('contacto', 'Persona de contacto *')}${campo('celular', 'Celular *', 'tel')}` : `
          ${campo('nombre', 'Nombre *')}${campo('apellido', 'Apellido *')}${campo('celular', 'Celular *', 'tel')}`}
          <div class="campo"><label>Distrito *</label>${selectDistrito(CF.distrito, 'CF.distrito=this.value')}</div>
          <div class="campo"><label>Correo</label><input type="email" value="${h(CF.correo || '')}" oninput="CF.correo=this.value" placeholder="nombre@correo.com"></div>
          <div class="campo" style="grid-column:1/-1"><label>Dirección *</label><input type="text" value="${h(CF.direccion || '')}" oninput="CF.direccion=this.value;if(CF._mismaDir){CF.direccion_envio=this.value;}"></div>
          <div class="campo" style="grid-column:1/-1"><label>Dirección de envío</label>
            <label class="check" style="font-weight:600"><input type="checkbox" ${CF._mismaDir ? 'checked' : ''} onchange="CF._mismaDir=this.checked;if(this.checked){CF.direccion_envio=CF.direccion;}CLI.pintar(${nuevo})"> Es la misma dirección</label>
            ${CF._mismaDir ? '' : `<input type="text" value="${h(CF.direccion_envio || '')}" oninput="CF.direccion_envio=this.value" placeholder="Dirección donde se entregan los pedidos">`}</div>
          ${campo('referencia', 'Referencia', 'text', true)}
          ${emp ? '' : CLI.campoReferido()}
          ${emp ? '' : `<div class="campo"><label>Código de referido ${nuevo ? '<small class="suave">(se crea solo con el nombre)</small>' : ''}</label>
            <div class="cod-campo"><input type="text" id="cf-cod" value="${h(CF.codigo)}" placeholder="${h(CLI.codigoFinal())}" autocomplete="off" spellcheck="false"
              oninput="CF.codigo=this.value;CLI.prevCod()"><button type="button" class="btn mini" title="Copiar código" onclick="copiar(CLI.codigoFinal())">${ic('copiar')} Copiar</button></div>
            <small class="suave" id="cf-cod-info">${CLI.infoCodigo()}</small></div>
          <div class="campo"><label>Nivel</label><select onchange="CF.nivel_manual=this.value||null">
            <option value="">Automático por sellos${e ? ` (${NIVELES[e.nivelAuto]})` : ''}</option>
            ${Object.entries(NIVELES).map(([k, t]) => `<option value="${k}" ${CF.nivel_manual === k ? 'selected' : ''}>Fijar: ${t}</option>`).join('')}</select></div>`}
          <div class="campo" style="grid-column:1/-1"><label>Notas</label><textarea oninput="CF.notas=this.value">${h(CF.notas || '')}</textarea></div>
        </div>
        ${ref ? `<p class="suave" style="margin:10px 0 0">Llegó referido por <a href="#" onclick="CLI.abrir('${ref.id}');return false">${h(nombreCliente(ref))}</a>.</p>` : ''}
        ${!nuevo && !emp && e.regalosPend ? `<div class="aviso-cli" style="margin-top:12px">${ic('regalo')}<span>Le toca ${plural(e.regalosPend, 'mantequilla')} de regalo.
          ${CF.regalo_agendado ? '<b>Agendado para su próxima compra.</b>' : `<button class="btn mini" onclick="NOTI.agendar('${id}')">Agendar para su próxima compra</button>`}</span></div>` : ''}
      </div>`;
    const lado = nuevo ? '' : emp ? `<div class="card"><h3>${ic('dinero')} Cobranza</h3>
        ${e.saldo > 0 ? `<p style="margin-top:0">Tiene <b style="color:var(--error)">${soles(e.saldo)}</b> pendiente en ${plural(e.pedidos.filter(p => saldoDe(p) > 0).length, 'pedido')}.</p>
          <button class="btn mini wa" onclick="CLI.recordarPago()">${ic('wa')} Recordar pago por WhatsApp</button>` : '<p class="suave" style="margin:0">No tiene saldos pendientes.</p>'}
      </div>` : `<div>
        ${tarjetaSellos(e)}
        <div class="card" style="margin-top:12px">
          <div class="fila" style="justify-content:space-between"><span>${tagNivel(e.nivel, e.manual ? ' · fijado' : '')} ${e.pausa ? `<span class="tag pausa">en pausa (${e.dias} d sin comprar)</span>` : ''}</span>
            ${e.regalosPend ? `<span class="tag regalo">${ic('regalo')} ${plural(e.regalosPend, 'regalo')} por usar</span>` : ''}</div>
          <p style="margin:10px 0 6px"><b>${e.compras}</b> por compras · <b>${e.amigos}</b> por amigos · <b>${e.resenas}</b> por historias/reseñas${e.ajustes ? ` · <b>${e.ajustes > 0 ? '+' : ''}${e.ajustes}</b> ajustes` : ''}</p>
          <p class="suave" style="margin:0 0 10px">${siguienteMeta(e)}</p>
          <div class="fila"><button class="btn mini" onclick="CLI.formExtra('resena')">${ic('camara')} Historia o reseña</button><button class="btn mini" onclick="CLI.formExtra('ajuste')">Ajustar sellos</button>
            <button class="btn mini wa" onclick="abrirWhatsApp(CF.celular, CLI.textoTarjeta())">Enviar tarjeta por WhatsApp</button></div>
          <div id="cf-extra"></div>
        </div>
      </div>`;
    const cab = nuevo ? '' : `<div class="ficha-cab card">
        ${avatar(CF, e.nivel)}
        <div class="ficha-id"><h2>${h(nombreCliente(CF))}</h2>
          <div class="fila">${emp ? `<span class="tag b2b">${h(CF.tipo_negocio || 'Empresa')}</span>` : tagNivel(e.nivel, e.manual ? ' · fijado' : '')} ${e.pausa ? `<span class="tag pausa">en pausa · ${e.dias} d sin comprar</span>` : ''}
            <span class="suave">${h(CF.celular)} · ${h(CF.distrito || '')}${CF.creado_en ? ` · cliente desde ${fechaCorta(CF.creado_en)}` : ''}</span></div></div>
        ${emp ? '' : `<div class="ficha-cod"><small>Código para referir amigos</small><button type="button" class="cod-grande" onclick="copiar(CLI.codigoFinal())" title="Copiar código">${h(CF.codigo)}${ic('copiar')}</button>
          <button type="button" class="btn mini" onclick="copiar(CLI.textoCodigo())">Copiar mensaje para compartir</button></div>`}
      </div>
      <div class="kpis">
        <div class="kpi"><small>Compras</small><b class="num">${e.ventas.length}</b><em>${e.frecuencia ? `cada ~${e.frecuencia} días` : e.ventas.length ? 'una sola compra' : 'todavía no compra'}</em></div>
        <div class="kpi"><small>Gasto total</small><b class="num">${soles(e.gasto)}</b><em>ticket promedio ${soles(e.ventas.length ? e.gasto / e.ventas.length : 0)}</em></div>
        <div class="kpi"><small>Ganancia que deja</small><b class="num">${soles(e.ganancia)}</b><em>${e.gasto ? `<span class="${claseMargen(e.margen)}-txt">margen ${pct(e.margen)}</span>` : '—'}</em></div>
        <div class="kpi"><small>Debe</small><b class="num" style="color:${e.saldo > 0 ? 'var(--error)' : 'inherit'}">${soles(e.saldo)}</b><em>${e.pedidos.filter(vencido).length ? `<span class="falta">${e.pedidos.filter(vencido).length} vencido(s)</span>` : e.ultima ? `última compra hace ${plural(e.dias, 'día')}` : ''}</em></div>
      </div>`;
    pagina(`${cabPagina(nuevo ? (emp ? 'Nueva empresa' : 'Nuevo cliente') : (emp ? 'Ficha de la empresa' : 'Ficha del cliente'))}
      ${cab}
      <div class="grid ${nuevo ? '' : 'g2'}">${datos}${lado}</div>
      ${nuevo ? '' : CLI.historial(e, emp)}
      <div class="modal-pie">
        ${nuevo ? '' : `<button class="btn peligro" style="margin-right:auto" onclick="CLI.borrar()">Eliminar</button>
        <button class="btn wa" onclick="abrirWhatsApp(CF.celular,'')">WhatsApp</button>
        <button class="btn oscuro" onclick="CLI.guardar(true)">Guardar y crear pedido</button>`}
        <button class="btn" onclick="volver()">Volver</button>
        <button class="btn prim" onclick="CLI.guardar(false)">Guardar</button>
      </div>`);
  },
  historial(e, emp) {
    const ps = [...e.pedidos, ...lista('pedidos').filter(p => p.cliente_id === CF.id && p.anulado)].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const extras = lista('sellos_extra').filter(s => s.cliente_id === CF.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const tablaPed = `<div class="card"><h3>Pedidos (${ps.length})</h3>
        ${ps.length ? `<div class="tabla-wrap"><table><thead><tr><th>N.°</th><th>Fecha</th><th>Detalle</th><th class="der">Total</th><th class="der">Ganancia</th><th>Pago</th><th>Estado</th><th>Comprobante</th></tr></thead><tbody>
          ${ps.map(p => { const R = rentabilidad(p); return `<tr class="clic" onclick="PF.abrir('${p.id}')"><td>${h(p.numero)}</td><td>${fechaCorta(p.fecha)}</td><td style="font-size:14px">${resumenItems(p)}</td><td class="der num">${soles(p.total)}</td>
            <td class="der num">${p.anulado ? '—' : `<b class="${claseMargen(R.margen)}-txt">${soles(R.ganancia)}</b><br><small class="${claseMargen(R.margen)}-txt">${pct(R.margen)}</small>`}</td><td>${tagPago(p)}</td><td><span class="sel-estado e-${estadoPed(p)}" style="display:inline-block">${ESTADO_PED[estadoPed(p)]}</span></td><td>${tagDoc(p)}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<p class="suave">Todavía no tiene pedidos.</p>'}</div>`;
    if (emp) return `<div style="margin-top:16px">${tablaPed}</div>`;
    return `<div class="grid g2" style="margin-top:16px">${tablaPed}
      <div>
        <div class="card"><h3>Amigos que refirió (${e.amigosLista.length})</h3>
          ${e.amigosLista.length ? e.amigosLista.map(a => `<div class="fila" style="padding:5px 0;border-bottom:1px solid #f3ecdc"><a href="#" onclick="CLI.abrir('${a.cliente.id}');return false">${h(nombreCliente(a.cliente))}</a>
            <span style="margin-left:auto">${a.pedido ? `<span class="tag entregado">+1 sello · ${fechaCorta(fechaSello(a.pedido))}</span>` : '<span class="tag pendiente">aún no recibe su pedido</span>'}</span></div>`).join('')
            : `<p class="suave">Aún no refiere a nadie. Su código es <span class="codigo">${h(CF.codigo)}</span>.</p>`}
        </div>
        <div class="card" style="margin-top:12px"><h3>Historias, reseñas y ajustes</h3>
          ${extras.length ? extras.map(s => `<div class="fila" style="padding:5px 0;border-bottom:1px solid #f3ecdc"><span>${s.tipo === 'resena' ? `${ic('camara')} ${h(REDES[s.red] || 'Reseña')}` : `${ic('estrella')} Ajuste`} <b>${s.cantidad > 0 ? '+' : ''}${s.cantidad}</b> · ${fechaCorta(s.fecha)}${s.link ? ` · <a href="${h(s.link)}" target="_blank" rel="noopener">ver</a>` : ''}${s.nota ? ` · <small>${h(s.nota)}</small>` : ''}</span>
            <button class="btn mini peligro" style="margin-left:auto" onclick="CLI.borrarExtra('${s.id}')">Quitar</button></div>`).join('') : '<p class="suave">Sin historias, reseñas ni ajustes.</p>'}
        </div>
      </div></div>`;
  },
  // Código final: el que escribiste (limpio) o el que se generará al guardar.
  codigoFinal() { return limpiarCodigo(CF.codigo) || generarCodigo(CF.nombre, CF.apellido, CF.id); },
  infoCodigo() {
    const escrito = limpiarCodigo(CF.codigo);
    if (escrito && codigoUsado(escrito, CF.id)) return `<span class="falta">${h(escrito)} ya lo usa otro cliente.</span>`;
    if (escrito && escrito !== String(CF.codigo).trim()) return `Se guardará como <b>${h(escrito)}</b> (sin tildes ni espacios).`;
    if (!escrito) return `Se guardará como <b>${h(CLI.codigoFinal())}</b>.`;
    return 'Tu amigo lo dicta al comprar y paga menos en su primer pack.';
  },
  prevCod() {
    const i = $('#cf-cod'); if (i) i.placeholder = CLI.codigoFinal();
    const x = $('#cf-cod-info'); if (x) x.innerHTML = CLI.infoCodigo();
  },
  textoCodigo() {
    return `¡Hola! Te comparto mi código de Mr. Peanut 🥜: *${CLI.codigoFinal()}*
Díctalo cuando hagas tu pedido por WhatsApp y pagas S/${CLUB.desc_referido} menos en tu primer pack.`;
  },
  // Referido por: se conecta antes de su primer pedido, así el descuento se aplica solo.
  campoReferido() {
    const tienePedidos = lista('pedidos').some(p => p.cliente_id === CF.id && !p.anulado);
    const r = CF.referido_por ? D.clientes.get(CF.referido_por) : null;
    const opciones = lista('clientes').filter(c => !esEmpresa(c) && c.id !== CF.id && c.codigo).sort((a, b) => nombreCliente(a).localeCompare(nombreCliente(b)));
    return `<div class="campo" style="grid-column:1/-1"><label>Referido por (código o nombre del amigo)</label>
      <div class="fila"><input type="search" list="cf-refs" style="flex:1;min-width:200px" value="${h(r ? `${r.codigo} · ${nombreCliente(r)}` : '')}" placeholder="Ej.: PEANUT-ANDREA" onchange="CLI.setRef(this.value)" ${tienePedidos ? 'disabled' : ''}>
        ${r && !tienePedidos ? `<button class="btn mini" onclick="CLI.setRef('')">Quitar</button>` : ''}</div>
      <datalist id="cf-refs">${opciones.map(c => `<option value="${h(`${c.codigo} · ${nombreCliente(c)}`)}"></option>`).join('')}</datalist>
      <small class="suave">${tienePedidos ? 'Ya tiene pedidos: el referido solo se asigna antes de su primera compra.' : `Si viene referido, en su primer pedido con pack paga S/${CLUB.desc_referido} menos y su amigo gana 1 sello.`}</small></div>`;
  },
  setRef(v) {
    const t = norm(String(v).split('·')[0]);
    if (!t) { CF.referido_por = null; return CLI.pintar(!D.clientes.get(CF.id)); }
    const r = lista('clientes').find(c => !esEmpresa(c) && c.id !== CF.id && (norm(c.codigo) === t || norm(nombreCliente(c)) === t));
    if (!r) { toast('No encontré ese código. Elige uno de la lista.'); return CLI.pintar(!D.clientes.get(CF.id)); }
    CF.referido_por = r.id; CLI.pintar(!D.clientes.get(CF.id));
  },
  formExtra(tipo) {
    const el = $('#cf-extra');
    if (tipo === 'resena') {
      const peds = pedidosParaResena(CF.id);
      const bloqueo = puedeResena(CF.id, CLUB.resena_requiere_pedido ? (peds[0]?.id || null) : 'x');
      if (bloqueo && !bloqueo.startsWith('Elige')) { el.innerHTML = `<div class="aviso alerta" style="margin-top:10px">${h(bloqueo)}</div>`; return; }
      if (CLUB.resena_requiere_pedido && !peds.length) { el.innerHTML = `<div class="aviso alerta" style="margin-top:10px">No tiene pedidos entregados sin historia/reseña (1 por pedido).</div>`; return; }
      el.innerHTML = `<div class="aviso info" style="margin-top:10px"><div class="grid g2">
        <div class="campo"><label>¿Dónde la publicó?</label><select id="cf-red">${Object.entries(REDES).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
        <div class="campo"><label>Pedido ${CLUB.resena_requiere_pedido ? '*' : '(opcional)'}</label><select id="cf-ped">${CLUB.resena_requiere_pedido ? '' : '<option value="">—</option>'}${peds.map(p => `<option value="${p.id}">${h(p.numero)} · ${fechaCorta(p.fecha)}</option>`).join('')}</select></div>
        <div class="campo" style="grid-column:1/-1"><label>Link o nota (ej. @usuario, captura guardada)</label><input type="text" id="cf-link"></div></div>
        <button class="btn prim mini" style="margin-top:8px" onclick="CLI.guardarResena()">Sumar +1 sello</button></div>`;
    } else {
      el.innerHTML = `<div class="aviso info" style="margin-top:10px">
        <div class="grid g2"><div class="campo"><label>Sellos (+ suma, − resta)</label><input type="number" id="cf-cant" value="1" step="1"></div>
        <div class="campo"><label>Motivo</label><input type="text" id="cf-nota" placeholder="Ej.: sellos de la tarjeta de papel"></div></div>
        <button class="btn prim mini" style="margin-top:8px" onclick="CLI.guardarAjuste()">Guardar ajuste</button></div>`;
    }
  },
  async guardarResena() {
    const link = $('#cf-link').value.trim();
    const err = await registrarResena(CF.id, { red: $('#cf-red').value, pedido_id: $('#cf-ped').value || null, link: /^https?:/.test(link) ? link : '', nota: /^https?:/.test(link) ? '' : link });
    if (err) return toast(err, 4500);
    CLI.abrir(CF.id);
  },
  async guardarAjuste() {
    const antes = { ...statsDe(CF.id) };
    const cant = parseInt($('#cf-cant').value, 10) || 0; if (!cant) return;
    const rec = { id: uid(), cliente_id: CF.id, tipo: 'ajuste', cantidad: cant, pedido_id: null, red: null, link: '', nota: $('#cf-nota').value || '', fecha: hoy() };
    if (D.clientes.get(CF.id)?._demo) rec._demo = true;
    await guardar('sellos_extra', rec);
    anunciarCambios(CF.id, antes); CLI.abrir(CF.id);
  },
  async borrarExtra(id) { if (!confirm('¿Quitar este sello?')) return; await eliminar('sellos_extra', id); CLI.abrir(CF.id); },
  textoTarjeta() {
    const e = statsDe(CF.id);
    const enCiclo = e.total % CLUB.regalo_cada; const llenos = e.total > 0 && enCiclo === 0 ? CLUB.regalo_cada : enCiclo;
    return `*Tu tarjeta Mr. Peanut* 🥜\n${'🟠'.repeat(llenos)}${'⚪'.repeat(CLUB.regalo_cada - llenos)}\n\n${CF.nombre}, llevas *${plural(e.total, 'sello')}* · nivel *${NIVELES[e.nivel]}*.\n${e.regalosPend ? `🎁 Tienes ${plural(e.regalosPend, 'mantequilla')} de regalo para tu próxima compra.\n` : ''}Tu código para amigos: *${CF.codigo}* (tu amigo paga S/${CLUB.desc_referido} menos en su primer pack y tú ganas un sello).\n📸 Sube una historia o reseña con tu Mr. Peanut y te sumamos un sello.`;
  },
  recordarPago() {
    const e = statsDe(CF.id);
    const pend = e.pedidos.filter(p => saldoDe(p) > 0);
    const txt = `Hola ${saludo(CF)} 👋 Te escribe Mr. Peanut 🥜\nTe compartimos el saldo pendiente:\n${pend.map(p => `• ${p.numero} (${fechaCorta(p.fecha)})${p.comprobante?.numero ? ' · ' + p.comprobante.numero : ''} — ${soles(saldoDe(p))}${p.fecha_vencimiento ? `, vence ${fechaCorta(p.fecha_vencimiento)}` : ''}`).join('\n')}\n*Total: ${soles(e.saldo)}*\n${CFG.datos_pago ? `Puedes pagar por ${CFG.datos_pago}. ` : ''}¡Gracias!`;
    abrirWhatsApp(CF.celular, txt);
  },
  async guardar(conPedido) {
    const err = []; const emp = esEmpresa(CF);
    if (!String(CF.nombre).trim()) err.push(emp ? 'Falta el nombre comercial.' : 'Falta el nombre.');
    if (!emp && !String(CF.apellido).trim()) err.push('Falta el apellido.');
    if (emp && !CF.tipo_negocio) err.push('Elige el tipo de negocio.');
    if (emp && !String(CF.contacto || '').trim()) err.push('Falta la persona de contacto.');
    if (emp && CF.ruc && soloDigitos(CF.ruc).length !== 11) err.push('El RUC debe tener 11 dígitos.');
    if (celNorm(CF.celular).length !== 9) err.push('El celular debe tener 9 dígitos.');
    else { const dup = clientePorCelular(CF.celular, CF.id); if (dup) err.push(`Ese celular ya es de ${nombreCliente(dup)}.`); }
    if (!CF.distrito) err.push('Elige el distrito.');
    if (String(CF.correo || '').trim() && !esCorreo(CF.correo)) err.push('El correo no es válido.');
    if (!String(CF.direccion).trim()) err.push('Falta la dirección.');
    const codigo = limpiarCodigo(CF.codigo);
    if (!emp && codigo && codigoUsado(codigo, CF.id)) err.push(`El código ${codigo} ya lo usa otro cliente.`);
    if (err.length) return alert(err.join('\n'));
    const previo = D.clientes.get(CF.id);
    const rec = { ...(previo || {}), ...CF };
    delete rec._mismaDir;
    rec.celular = celNorm(rec.celular);
    rec.ruc = soloDigitos(rec.ruc);
    ['nombre', 'apellido', 'direccion', 'direccion_envio', 'distrito', 'referencia', 'razon_social', 'contacto'].forEach(k => { rec[k] = String(rec[k] || '').trim(); });
    rec.correo = String(rec.correo || '').trim().toLowerCase();
    if (CF._mismaDir || !rec.direccion_envio) rec.direccion_envio = rec.direccion;
    rec.codigo = emp ? '' : (codigo || generarCodigo(rec.nombre, rec.apellido, rec.id));
    if (emp) { rec.nivel_manual = null; rec.referido_por = null; }
    await guardar('clientes', rec);
    toast('Cliente guardado.');
    if (conPedido) PF.abrir(null, rec.id); else volver();
  },
  async borrar() {
    const n = lista('pedidos').filter(p => p.cliente_id === CF.id).length;
    if (!confirm(`¿Eliminar a ${nombreCliente(CF)}?${n ? ` Tiene ${plural(n, 'pedido')}; los pedidos se conservan.` : ''}`)) return;
    await eliminar('clientes', CF.id); volver();
  },
  exportar() {
    const C = club();
    const filas = [['tipo', 'codigo', 'nombre', 'apellido', 'razon_social', 'ruc', 'contacto', 'tipo_negocio', 'celular', 'correo', 'distrito', 'direccion', 'direccion_envio', 'nivel', 'sellos', 'compras', 'gasto', 'debe', 'sabor_favorito', 'ultima_compra', 'regalos_pendientes']];
    lista('clientes').forEach(c => { const e = C[c.id]; const emp = esEmpresa(c); filas.push([emp ? 'empresa' : 'persona', c.codigo, c.nombre, c.apellido, c.razon_social, c.ruc, c.contacto, c.tipo_negocio, c.celular, c.correo, c.distrito, c.direccion, c.direccion_envio, emp ? '' : NIVELES[e.nivel], emp ? '' : e.total, e.ventas.length, r2(e.gasto), r2(e.saldo), e.favorito ? nombreSabor(e.favorito) : '', e.ultima ? e.ultima.toISOString().slice(0, 10) : '', emp ? '' : e.regalosPend]); });
    descargar(`clientes-mrpeanut-${hoy()}.csv`, '﻿' + aCSV(filas), 'text/csv;charset=utf-8');
  },
};
const aCSV = filas => filas.map(f => f.map(v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');

// ==================================================================== ANÁLISIS
function barras(pares, fmt = v => v) {
  const max = Math.max(1, ...pares.map(p => p[1]));
  return pares.length ? `<div class="barras">${pares.map(([k, v, color]) => `<div class="barra"><span>${k}</span><div class="riel"><span style="width:${(v / max) * 100}%;${color ? `background:${color}` : ''}"></span></div><b>${fmt(v)}</b></div>`).join('')}</div>` : '<p class="suave">Sin datos en este periodo.</p>';
}
const COLOR_SABOR = { mani: '#C55903', chocomani: '#5a3319', crunchy: '#02C6FB', almendra: '#d9a86a' };

function renderAnalisis() {
  const f = UI.ana; const C = club();
  const desde = f.periodo === 'todo' ? null : new Date(Date.now() - (+f.periodo) * 86400000);
  const enCanal = p => f.canal === 'todos' || (p.canal || 'b2c') === f.canal;
  const ventas = lista('pedidos').filter(p => esVenta(p) && enCanal(p) && (!desde || aFecha(p.fecha) >= desde));
  const total = ventas.reduce((a, p) => a + (+p.total || 0), 0);
  const porCli = {}; ventas.forEach(p => { (porCli[p.cliente_id] ||= []).push(p); });
  const nCli = Object.keys(porCli).length;
  const recompra = Object.values(porCli).filter(v => v.length > 1).length;
  const nuevos = Object.keys(porCli).filter(id => { const e = C[id]; return e && e.primera && (!desde || e.primera >= desde); }).length;
  const sab = {}; const reg = {}; let frascos = 0; const packs = {};
  ventas.forEach(p => {
    const fr = frascosDe(p);
    Object.entries(fr.vendidos).forEach(([k, v]) => { sab[k] = (sab[k] || 0) + v; frascos += v; });
    Object.entries(fr.regalo).forEach(([k, v]) => { reg[k] = (reg[k] || 0) + v; });
    (p.items || []).forEach(i => {
      if (i.tipo === 'pack') packs[i.nombre] = (packs[i.nombre] || 0) + 1;
      if (i.tipo === 'suelto') packs['Sueltos (frascos)'] = (packs['Sueltos (frascos)'] || 0) + i.cantidad;
      if (i.tipo === 'linea') packs['B2B: ' + i.nombre] = (packs['B2B: ' + i.nombre] || 0) + (+i.cantidad || 0);
    });
  });
  const meses = []; const d0 = new Date(); d0.setDate(1);
  for (let i = 5; i >= 0; i--) { const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1); meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  const porMes = meses.map(m => [m, lista('pedidos').filter(p => esVenta(p) && enCanal(p) && p.fecha?.startsWith(m)).reduce((a, p) => a + (+p.total || 0), 0)]);
  const maxMes = Math.max(1, ...porMes.map(x => x[1]));
  const distritos = {}; ventas.forEach(p => { const d = D.clientes.get(p.cliente_id)?.distrito || 'Sin distrito'; distritos[d] = (distritos[d] || 0) + 1; });
  const canales = { B2C: 0, B2B: 0 }; lista('pedidos').filter(p => esVenta(p) && (!desde || aFecha(p.fecha) >= desde)).forEach(p => { canales[p.canal === 'b2b' ? 'B2B' : 'B2C'] += +p.total || 0; });
  const top = Object.entries(porCli).map(([id, ps]) => [id, ps.reduce((a, p) => a + (+p.total || 0), 0), ps.length]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  // Clientes que no están comprando. Dos variables (editables aquí mismo):
  //  · frecuencia esperada: si no tiene historial, se espera que vuelva a comprar en estos días;
  //  · ya no compra: pasado este umbral de días sin comprar, se considera cliente perdido.
  const V = variablesAnalisis();
  const delTipo = lista('clientes').filter(c => f.canal === 'todos' || (f.canal === 'b2b') === esEmpresa(c)).map(c => [c, C[c.id]]).filter(([, e]) => e.ultima);
  const esperado = e => e.frecuencia || V.frecuencia;
  const estadoCompra = e => e.dias > V.ya_no_compra ? 'perdido' : e.dias > esperado(e) + 3 ? 'atrasado' : 'al_dia';
  const conFrec = delTipo.filter(([, e]) => e.frecuencia);
  const frecProm = conFrec.length ? Math.round(conFrec.reduce((a, [, e]) => a + e.frecuencia, 0) / conFrec.length) : null;
  const nPerdidos = delTipo.filter(([, e]) => estadoCompra(e) === 'perdido').length;
  const nAtrasados = delTipo.filter(([, e]) => estadoCompra(e) === 'atrasado').length;
  const riesgo = delTipo.filter(([, e]) => estadoCompra(e) !== 'al_dia' && (f.riesgo === 'todos' || estadoCompra(e) === f.riesgo))
    .map(([c, e]) => [c, e, e.dias - esperado(e)])
    .sort((a, b) => b[2] - a[2]);
  const clientesOrden = lista('clientes').sort((a, b) => nombreCliente(a).localeCompare(nombreCliente(b)));

  $('#v-analisis').innerHTML = `
    <div class="cab-vista">
      <div><h2>Análisis de clientes</h2><span class="suave">Quién compra, qué compra y cuándo volverá a comprar. Cuenta los pedidos pagados o entregados.</span></div>
    </div>
    <div class="filtros" style="max-width:560px">
      <div class="campo"><label>Tipo de cliente</label><select onchange="UI.ana.canal=this.value;renderAnalisis()">${[['todos', 'B2C y B2B'], ['b2c', 'Consumidores (B2C)'], ['b2b', 'Empresas (B2B)']].map(([k, t]) => `<option value="${k}" ${f.canal === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="campo"><label>Periodo</label><select onchange="UI.ana.periodo=this.value;renderAnalisis()">${[['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['180', 'Últimos 6 meses'], ['365', 'Último año'], ['todo', 'Todo']].map(([k, t]) => `<option value="${k}" ${f.periodo === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    </div>
    <div class="kpis">
      <div class="kpi"><small>Ventas</small><b class="num">${soles(total)}</b><em>${plural(ventas.length, 'pedido')}</em></div>
      <div class="kpi"><small>Ticket promedio</small><b class="num">${soles(ventas.length ? total / ventas.length : 0)}</b><em>por pedido</em></div>
      <div class="kpi"><small>Clientes que compraron</small><b class="num">${nCli}</b><em>${nuevos} nuevos en el periodo</em></div>
      <div class="kpi"><small>Recompra</small><b class="num">${nCli ? Math.round(recompra / nCli * 100) : 0}%</b><em>${recompra} compraron 2 veces o más</em></div>
      <div class="kpi"><small>Frascos vendidos</small><b class="num">${frascos}</b><em>+${Object.values(reg).reduce((a, b) => a + b, 0)} de regalo</em></div>
    </div>
    <div class="kpis">
      <div class="kpi"><small>${ic('calendario')} Frecuencia de compra</small><b class="num">${frecProm ? `${frecProm} d` : '—'}</b><em>${frecProm ? `promedio entre compras (${plural(conFrec.length, 'cliente')} con 2+ compras)` : 'hace falta clientes con 2+ compras'}</em></div>
      <button type="button" class="kpi clic ${f.riesgo === 'atrasado' ? 'sel' : ''}" onclick="UI.ana.riesgo=UI.ana.riesgo==='atrasado'?'todos':'atrasado';renderAnalisis()"><small>${ic('reloj')} Atrasados</small><b class="num" style="color:var(--alerta)">${nAtrasados}</b><em>pasaron su frecuencia de compra</em></button>
      <button type="button" class="kpi clic ${f.riesgo === 'perdido' ? 'sel' : ''}" onclick="UI.ana.riesgo=UI.ana.riesgo==='perdido'?'todos':'perdido';renderAnalisis()"><small>${ic('alerta')} Ya no compran</small><b class="num" style="color:var(--error)">${nPerdidos}</b><em>más de ${V.ya_no_compra} días sin comprar</em></button>
      <div class="kpi var-kpi"><small>Variables</small>
        <label>Frecuencia esperada <input type="number" min="1" value="${V.frecuencia}" onchange="ANAV.set('frecuencia',this.value)"> días</label>
        <label>Ya no compra después de <input type="number" min="1" value="${V.ya_no_compra}" onchange="ANAV.set('ya_no_compra',this.value)"> días</label></div>
    </div>
    <div class="grid g3">
      <div class="card"><h3>Sabores más vendidos</h3>${barras(SABORES.map(s => [s.nombre, sab[s.id] || 0, COLOR_SABOR[s.id]]).sort((a, b) => b[1] - a[1]), v => `${v} fr.`)}</div>
      <div class="card"><h3>Qué compran</h3>${barras(Object.entries(packs).sort((a, b) => b[1] - a[1]).slice(0, 8), v => `${v}`)}</div>
      <div class="card"><h3>Ventas por mes</h3><div class="columnas">${porMes.map(([m, v]) => `<div class="col"><b>${v ? soles(v) : ''}</b><span style="height:${(v / maxMes) * 130}px"></span>${MESES[+m.slice(5) - 1]}</div>`).join('')}</div></div>
    </div>
    <div style="margin-top:16px">
      <div class="card"><h3>${ic('estrella')} Mejores clientes</h3>
        ${top.length ? `<table><thead><tr><th>Cliente</th><th>Nivel / tipo</th><th class="cen">Pedidos</th><th class="der">Gasto</th><th>Favorito</th></tr></thead><tbody>
        ${top.map(([id, g, n]) => { const c = D.clientes.get(id); const e = C[id]; return `<tr class="clic" onclick="UI.ana.cliente='${id}';renderAnalisis();document.getElementById('ana-cli').scrollIntoView({behavior:'smooth'})"><td><b>${h(nombreCliente(c))}</b></td><td>${esEmpresa(c) ? `<span class="tag b2b">${h(c.tipo_negocio || 'Empresa')}</span>` : e ? tagNivel(e.nivel) : ''}</td><td class="cen">${n}</td><td class="der num">${soles(g)}</td><td>${e?.favorito ? nombreSabor(e.favorito) : '—'}</td></tr>`; }).join('')}
        </tbody></table>` : '<p class="suave">Sin ventas en este periodo.</p>'}</div>
    </div>
    <div class="card" style="margin-top:16px"><div class="fila" style="margin-bottom:6px"><h3 style="margin:0">${ic('reloj')} Clientes que no están comprando <small class="suave">(${riesgo.length})</small></h3>
      <select style="width:auto;margin-left:auto" onchange="UI.ana.riesgo=this.value;renderAnalisis()">${[['todos', 'Atrasados y los que ya no compran'], ['atrasado', 'Solo atrasados'], ['perdido', 'Solo los que ya no compran']].map(([k, t]) => `<option value="${k}" ${f.riesgo === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <p class="suave" style="margin-top:0"><b>Atrasado</b>: pasó los días con los que suele comprar (o ${V.frecuencia} días si compró una sola vez). <b>Ya no compra</b>: más de ${V.ya_no_compra} días sin comprar. A los ${CLUB.dias_pausa} días, su nivel del Club queda en pausa.</p>
      ${riesgo.length ? `<div class="tabla-wrap"><table><thead><tr><th>Cliente</th><th>Nivel</th><th class="cen">Días sin comprar</th><th class="cen">Suele comprar cada</th><th class="cen">Atraso</th><th>Estado</th><th></th></tr></thead><tbody>
      ${riesgo.slice(0, 25).map(([c, e, atraso]) => `<tr><td><a href="#" onclick="CLI.abrir('${c.id}');return false"><b>${h(nombreCliente(c))}</b></a><br><small>le gusta ${e.favorito ? nombreSabor(e.favorito) : '—'}</small></td>
        <td>${esEmpresa(c) ? '<span class="tag b2b">Empresa</span>' : tagNivel(e.nivel)}</td>
        <td class="cen"><b style="color:${e.dias > CLUB.dias_pausa ? 'var(--error)' : 'var(--alerta)'}">${e.dias} d</b></td>
        <td class="cen">${e.frecuencia ? `${e.frecuencia} d` : `<small>1 compra · se espera ${V.frecuencia} d</small>`}</td>
        <td class="cen">${atraso > 0 ? `<b>+${atraso} d</b>` : '—'}</td>
        <td>${estadoCompra(e) === 'perdido' ? '<span class="tag anulado">Ya no compra</span>' : '<span class="tag pendiente">Atrasado</span>'}${e.pausa ? ` <span class="tag pausa">${ic('pausa')} pausa</span>` : ''}</td>
        <td class="der"><button class="btn mini wa" onclick="abrirWhatsApp('${h(c.celular)}', ${h(JSON.stringify(`¡Hola ${saludo(c)}! 🥜 Te extrañamos en Mr. Peanut. ¿Te preparamos tu ${e.favorito ? 'mantequilla de ' + nombreSabor(e.favorito) : 'pedido'} de siempre?${esEmpresa(c) ? '' : ` Llevas ${plural(e.total, 'sello')} en tu tarjeta.`}`))})">${ic('wa')} Escribirle</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="suave">Todos están comprando a su ritmo.</p>'}
    </div>
    <div class="grid g3" style="margin-top:16px">
      <div class="card"><h3>Pedidos por distrito</h3>${barras(Object.entries(distritos).sort((a, b) => b[1] - a[1]).slice(0, 8), v => `${v}`)}</div>
      <div class="card"><h3>Ventas B2C vs B2B</h3>${barras(Object.entries(canales), v => soles(v))}</div>
      <div class="card"><h3>Clientes por nivel</h3>${barras(Object.keys(NIVELES).map(n => [NIVELES[n], lista('clientes').filter(c => !esEmpresa(c) && C[c.id].nivel === n).length, n === 'oficial' ? '#51D4FD' : n === 'vip' ? '#F7C03D' : '#0B0B0B']), v => `${v}`)}</div>
    </div>
    <div class="card" style="margin-top:16px" id="ana-cli">
      <div class="fila" style="margin-bottom:10px"><h3 style="margin:0">Análisis por cliente</h3>
        <select style="width:320px;margin-left:auto" onchange="UI.ana.cliente=this.value;renderAnalisis()"><option value="">Elige un cliente…</option>
        ${clientesOrden.map(c => `<option value="${c.id}" ${UI.ana.cliente === c.id ? 'selected' : ''}>${h(nombreCliente(c))}${esEmpresa(c) ? ' (empresa)' : ''} · ${h(c.celular)}</option>`).join('')}</select></div>
      ${UI.ana.cliente && D.clientes.get(UI.ana.cliente) ? analisisCliente(UI.ana.cliente) : '<p class="suave">Elige un cliente para ver sus sabores favoritos, qué más compra, cada cuánto compra y qué hacer con él.</p>'}
    </div>`;
}

const VARIABLES_ANALISIS = { frecuencia: 30, ya_no_compra: 90 };
const variablesAnalisis = () => ({ ...VARIABLES_ANALISIS, ...(CFG.analisis || {}) });
const ANAV = { async set(k, v) { CFG.analisis = { ...variablesAnalisis(), [k]: Math.max(1, parseInt(v, 10) || VARIABLES_ANALISIS[k]) }; await guardarConfig(); renderAnalisis(); } };

function analisisCliente(id) {
  const c = D.clientes.get(id); const e = statsDe(id); const emp = esEmpresa(c);
  const totalFr = Object.values(e.sabores).reduce((a, b) => a + b, 0);
  const combos = {};
  e.ventas.forEach(p => (p.items || []).filter(i => i.tipo === 'pack').forEach(i => {
    const k = Object.entries(i.sabores || {}).filter(([, n]) => n).map(([s, n]) => `${n} ${nombreSabor(s)}`).join(' + ');
    combos[k] = (combos[k] || 0) + 1;
  }));
  const acciones = [];
  if (e.saldo > 0) acciones.push(`${ic('dinero')} Debe ${soles(e.saldo)}${e.pedidos.some(vencido) ? ' (hay pedidos vencidos)' : ''}.`);
  if (!emp && e.regalosPend) acciones.push(`${ic('regalo')} Tiene ${plural(e.regalosPend, 'regalo')} por usar: recuérdaselo y agrégalo en su próximo pedido.`);
  if (e.pausa) acciones.push(`${ic('pausa')} Su nivel ${NIVELES[e.nivel]} está en pausa (${e.dias} días sin comprar). Escríbele para reactivarlo.`);
  else if (e.proxima && e.proxima < new Date()) acciones.push(`${ic('calendario')} Suele comprar cada ~${e.frecuencia} días y ya pasó la fecha: buen momento para escribirle.`);
  if (!emp && e.nivelAuto === 'oficial' && e.faltaVip && e.faltaVip <= 2) acciones.push(`${ic('estrella')} Está a ${plural(e.faltaVip, 'sello')} del VIP: con su próximo pedido, un amigo o una historia sube de nivel.`);
  if (!emp && !e.amigos && e.compras >= 2) acciones.push(`${ic('amigos')} Todavía no ha referido a nadie: comparte su código ${c.codigo}.`);
  if (totalFr && (e.sabores.almendra || 0) === 0) acciones.push(`${ic('hoja')} Nunca ha probado la almendra: ofrécela en su próximo pedido.`);
  return `<div class="grid g4" style="margin-bottom:14px">
      <div class="kpi"><small>${emp ? 'Tipo' : 'Nivel'}</small><b style="font-size:20px">${emp ? `<span class="tag b2b">${h(c.tipo_negocio || 'Empresa')}</span>` : tagNivel(e.nivel)}</b><em>${emp ? (c.ruc ? 'RUC ' + h(c.ruc) : 'sin RUC') : `${plural(e.total, 'sello')} · ${siguienteMeta(e)}`}</em></div>
      <div class="kpi"><small>Gasto total</small><b class="num">${soles(e.gasto)}</b><em>${plural(e.ventas.length, 'compra')} · ticket ${soles(e.ventas.length ? e.gasto / e.ventas.length : 0)}</em></div>
      <div class="kpi"><small>Frecuencia</small><b class="num">${e.frecuencia ? `${e.frecuencia} d` : '—'}</b><em>${e.proxima ? `próxima compra ≈ ${fechaCorta(e.proxima.toISOString())}` : 'necesita 2 compras para estimar'}</em></div>
      <div class="kpi"><small>Última compra</small><b class="num">${e.ultima ? `${e.dias} d` : '—'}</b><em>${e.ultima ? fechaCorta(e.ultima.toISOString()) : 'sin compras'} · cliente desde ${fechaCorta((e.primera && e.primera < new Date(c.creado_en) ? e.primera : new Date(c.creado_en)).toISOString())}</em></div>
    </div>
    <div class="grid g3">
      <div><h3>Sus sabores</h3>${barras(SABORES.map(s => [s.nombre, e.sabores[s.id] || 0, COLOR_SABOR[s.id]]).sort((a, b) => b[1] - a[1]), v => totalFr ? `${v} · ${Math.round(v / totalFr * 100)}%` : v)}</div>
      <div><h3>Qué más compra</h3>${barras(Object.entries(e.packs).sort((a, b) => b[1] - a[1]), v => `${v}`)}
        ${Object.keys(combos).length ? `<p style="margin:12px 0 4px"><b>Combinaciones que repite</b></p>${Object.entries(combos).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `<div style="font-size:14.5px">${h(k)} <small>× ${v}</small></div>`).join('')}` : ''}</div>
      <div><h3>Qué hacer</h3>${acciones.length ? `<div class="lista-avisos">${acciones.map(a => `<div class="aviso info">${a}</div>`).join('')}</div>` : '<p class="suave">Todo al día con este cliente.</p>'}
        <p style="margin-top:12px"><button class="btn mini" onclick="CLI.abrir('${id}')">Abrir ficha</button> <button class="btn mini prim" onclick="PF.abrir(null,'${id}')">Nuevo pedido</button></p></div>
    </div>`;
}

// ==================================================================== CLUB
const VARIABLES_CLUB = [
  ['vip_sellos', 'Sellos para ser VIP', 'Desde este número de sellos el cliente pasa a VIP.'],
  ['vip_min_compras', 'Compras propias mínimas para VIP', 'Evita llegar al VIP solo con amigos e historias.'],
  ['leyenda_sellos', 'Sellos para ser Leyenda Peanut', 'Nivel con el mejor precio.'],
  ['regalo_cada', 'Regalo cada (sellos)', 'Cada tantos sellos gana 1 mantequilla del sabor que quiera.'],
  ['desc_referido', 'Descuento al amigo referido (S/)', 'Se aplica en el primer pack del amigo.'],
  ['dias_pausa', 'Días sin comprar para pausa', 'Pasado este tiempo, su siguiente pedido se cobra a precio oficial.'],
  ['tope_leyenda_semana', 'Tope de packs Leyenda por semana', 'Solo avisa; no bloquea.'],
  ['resenas_mes', 'Historias/reseñas que suman sello por mes', '0 = sin límite.'],
  ['resena_requiere_pedido', 'La historia debe ser de un pedido entregado', '1 = sí (1 por pedido) · 0 = no hace falta pedido.'],
];

function renderClub() {
  const C = club(); const cs = lista('clientes').filter(c => !esEmpresa(c));
  const sub = UI.club;
  const conNivel = n => cs.filter(c => C[c.id].nivel === n).length;
  const regalos = cs.filter(c => C[c.id].regalosPend).sort((a, b) => C[b.id].regalosPend - C[a.id].regalosPend);
  // movimientos de sellos: [fecha, cliente, texto, origen]
  const mov = [];
  lista('pedidos').filter(daSello).forEach(p => mov.push([fechaSello(p), p.cliente_id, `+1 · pedido ${p.numero}`, 'compra']));
  cs.forEach(c => { const a = C[c.referido_por]?.amigosLista.find(x => x.cliente.id === c.id); if (a?.pedido) mov.push([fechaSello(a.pedido), c.referido_por, `+1 · referido ${nombreCliente(c)}`, 'amigo']); });
  lista('sellos_extra').forEach(s => mov.push([s.fecha, s.cliente_id, `${s.cantidad > 0 ? '+' : ''}${s.cantidad} · ${s.tipo === 'resena' ? (REDES[s.red] || 'reseña').toLowerCase() : 'ajuste' + (s.nota ? ': ' + s.nota : '')}`, s.tipo === 'resena' ? 'historia' : 'ajuste']));
  mov.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  const mes = hoy().slice(0, 7);
  const sellosMes = mov.filter(m => String(m[0]).startsWith(mes)).length;
  const fila = (c, der) => `<div class="fila" style="padding:7px 0;border-bottom:1px solid #f3ecdc;cursor:pointer" onclick="CLI.abrir('${c.id}')" title="Ver ficha"><b>${h(nombreCliente(c))}</b> ${tagNivel(C[c.id].nivel)}<span style="margin-left:auto;text-align:right">${der}</span></div>`;
  const vacio = t => `<p class="suave">${t}</p>`;
  const lineaMov = ([f, cid, t]) => { const c = D.clientes.get(cid); return c ? `<div style="padding:5px 0;border-bottom:1px solid #f3ecdc;font-size:14.5px"><b>${h(nombreCliente(c))}</b> ${h(t)} <small class="suave">· ${fechaCorta(f)}</small></div>` : ''; };
  const tabs = [['resumen', 'analisis', 'Dashboard'], ['actividad', 'camara', 'Registrar actividad'], ['variables', 'hoja', 'Variables del Club']];
  let cuerpo = '';
  if (sub === 'resumen') {
    const cercaVip = cs.filter(c => C[c.id].nivelAuto === 'oficial' && !c.nivel_manual && C[c.id].faltaVip > 0 && C[c.id].faltaVip <= 2).sort((a, b) => C[a.id].faltaVip - C[b.id].faltaVip);
    const cercaLey = cs.filter(c => C[c.id].nivelAuto === 'vip' && C[c.id].total >= CLUB.leyenda_sellos - 10).sort((a, b) => C[b.id].total - C[a.id].total);
    const pausa = cs.filter(c => C[c.id].pausa).sort((a, b) => C[b.id].dias - C[a.id].dias);
    const referidores = cs.filter(c => C[c.id].amigosLista.length).sort((a, b) => C[b.id].amigos - C[a.id].amigos || C[b.id].amigosLista.length - C[a.id].amigosLista.length).slice(0, 8);
    const miembros = cs.filter(c => C[c.id].total > 0);
    const origen = k => mov.filter(m => m[3] === k).length;
    const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return isoLocal(d).slice(0, 7); });
    cuerpo = `
    <div class="kpis">
      <div class="kpi"><small>Oficial</small><b>${conNivel('oficial')}</b><em>1 a ${CLUB.vip_sellos - 1} sellos</em></div>
      <div class="kpi"><small>VIP</small><b>${conNivel('vip')}</b><em>${CLUB.vip_sellos} a ${CLUB.leyenda_sellos - 1} sellos</em></div>
      <div class="kpi"><small>Leyenda Peanut</small><b>${conNivel('leyenda')}</b><em>${CLUB.leyenda_sellos}+ sellos</em></div>
      <div class="kpi"><small>${ic('regalo')} Regalos por entregar</small><b>${regalos.reduce((a, c) => a + C[c.id].regalosPend, 0)}</b><em>${plural(regalos.length, 'cliente')}</em></div>
      <div class="kpi"><small>Sellos este mes</small><b>${sellosMes}</b><em>${plural(miembros.length, 'miembro')} con sellos</em></div>
    </div>
    <div class="grid g3">
      <div class="card"><h3>Sellos por mes</h3>${barras(meses.map(m => [nombreMes(m).split(' ')[0].slice(0, 3), mov.filter(x => String(x[0]).startsWith(m)).length]))}</div>
      <div class="card"><h3>De dónde vienen los sellos</h3>${barras([['Compras', origen('compra')], ['Amigos referidos', origen('amigo')], ['Historias y reseñas', origen('historia')], ['Ajustes', origen('ajuste')]].filter(x => x[1]))}</div>
      <div class="card"><h3>Clientes por nivel</h3>${barras([['Oficial', conNivel('oficial')], ['VIP', conNivel('vip')], ['Leyenda', conNivel('leyenda')]])}</div>
      <div class="card"><h3>${ic('regalo')} Regalos por entregar</h3>${regalos.length ? regalos.map(c => fila(c, `<b>${C[c.id].regalosPend}</b> <button class="btn mini" onclick="event.stopPropagation();PF.abrir(null,'${c.id}')">Pedido</button>`)).join('') : vacio('Nadie tiene regalos pendientes.')}</div>
      <div class="card"><h3>${ic('estrella')} A punto de ser VIP</h3>${cercaVip.length ? cercaVip.map(c => fila(c, `<small>${siguienteMeta(C[c.id]).split(' · ')[0]}</small>`)).join('') : vacio('Nadie está a 1 o 2 sellos del VIP.')}</div>
      <div class="card"><h3>${ic('amigos')} Los que más refieren</h3>${referidores.length ? referidores.map(c => fila(c, `<b>${C[c.id].amigos}</b> <small>con compra${C[c.id].amigosLista.length > C[c.id].amigos ? ` · ${C[c.id].amigosLista.length - C[c.id].amigos} en espera` : ''}</small>`)).join('') : vacio('Todavía no hay referidos.')}</div>
      <div class="card"><h3>${ic('corona')} Cerca de Leyenda</h3>${cercaLey.length ? cercaLey.map(c => fila(c, `<b>${C[c.id].total}</b> / ${CLUB.leyenda_sellos}`)).join('') : vacio('Nadie está a menos de 10 sellos de Leyenda.')}</div>
      <div class="card"><h3>${ic('pausa')} Nivel en pausa</h3>${pausa.length ? pausa.slice(0, 8).map(c => fila(c, `<small>hace ${plural(C[c.id].dias, 'día')}</small>`)).join('') : vacio(`Nadie lleva más de ${CLUB.dias_pausa} días sin comprar.`)}</div>
      <div class="card"><h3>Últimos sellos</h3>${mov.length ? mov.slice(0, 10).map(lineaMov).join('') : vacio('Aún no hay sellos.')}</div>
    </div>`;
  } else if (sub === 'actividad') {
    const historias = lista('sellos_extra').filter(s => s.tipo === 'resena').sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 15);
    cuerpo = `
    <div class="card" style="margin-bottom:16px"><h3>${ic('camara')} Registrar historia o reseña</h3>
      <p class="suave" style="margin-top:-6px">Cuando un cliente sube una historia o reseña hablando del producto, la registras aquí y se le suma 1 sello${CLUB.resenas_mes ? ` (máximo ${CLUB.resenas_mes} por mes)` : ''}.</p>
      <div class="grid g4" style="align-items:end">
        <div class="campo"><label>Cliente</label><select id="hs-cli" onchange="CLUBV.pedidos()"><option value="">Elige…</option>${[...cs].sort((a, b) => nombreCliente(a).localeCompare(nombreCliente(b))).map(c => `<option value="${c.id}">${h(nombreCliente(c))} · ${h(c.celular)}</option>`).join('')}</select></div>
        <div class="campo"><label>Dónde la publicó</label><select id="hs-red">${Object.entries(REDES).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
        <div class="campo"><label>Pedido ${CLUB.resena_requiere_pedido ? '*' : '(opcional)'}</label><select id="hs-ped"><option value="">— elige un cliente —</option></select></div>
        <div class="campo"><label>Link o nota</label><input type="text" id="hs-link" placeholder="https://… o @usuario"></div>
      </div>
      <div class="fila" style="margin-top:10px"><button class="btn prim" onclick="CLUBV.registrar()">Sumar +1 sello</button><span id="hs-msg"></span></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>${ic('camara')} Últimas historias y reseñas</h3>${historias.length ? historias.map(s => { const c = D.clientes.get(s.cliente_id); return c ? `<div style="padding:5px 0;border-bottom:1px solid #f3ecdc;font-size:14.5px"><b>${h(nombreCliente(c))}</b> · ${h(REDES[s.red] || 'Reseña')} <small class="suave">· ${fechaCorta(s.fecha)}</small>${s.link ? ` · <a href="${h(s.link)}" target="_blank" rel="noopener">ver</a>` : ''}${s.nota ? ` <small class="suave">${h(s.nota)}</small>` : ''}</div>` : ''; }).join('') : vacio('Aún no hay historias registradas.')}</div>
      <div class="card"><h3>Últimos sellos</h3>${mov.length ? mov.slice(0, 15).map(lineaMov).join('') : vacio('Aún no hay sellos.')}</div>
    </div>`;
  } else {
    cuerpo = `
    <div class="card" style="max-width:900px"><h3>Variables del Club</h3>
      <table><tbody>${VARIABLES_CLUB.map(([k, t, d]) => `<tr><td><b>${t}</b><br><small class="suave">${d}</small></td><td style="width:110px"><input type="number" min="0" value="${CLUB[k]}" onchange="CLUBV.set('${k}',this.value)"></td></tr>`).join('')}</tbody></table>
      <p class="suave">Reglas fijas: un pedido B2C con pack, <b>pagado y entregado</b>, suma 1 sello (los frascos sueltos y los pedidos B2B no suman). El amigo referido da +1 sello cuando su primer pack queda pagado y entregado. El nivel se puede fijar a mano en la ficha del cliente. Los precios por nivel se cambian en <a href="#" onclick="ir('productos');return false">Productos y promociones</a>.</p>
      <button class="btn mini" onclick="CLUBV.reset()">Volver a las variables originales</button>
    </div>`;
  }
  $('#v-club').innerHTML = `
    <div class="cab-vista"><div><h2>Club Mr. Peanut</h2><span class="suave">1 pedido con pack, pagado y entregado = 1 sello · VIP desde ${CLUB.vip_sellos} · Leyenda desde ${CLUB.leyenda_sellos} · regalo cada ${CLUB.regalo_cada} sellos.</span></div></div>
    <div class="subtabs" role="tablist">${tabs.map(([k, i, t]) => `<button role="tab" class="${sub === k ? 'activo' : ''}" aria-selected="${sub === k}" onclick="UI.club='${k}';recordarVista();renderClub()">${ic(i)} ${t}</button>`).join('')}</div>
    ${cuerpo}`;
}
const CLUBV = {
  pedidos() {
    const cid = $('#hs-cli').value; const sel = $('#hs-ped');
    const ps = cid ? pedidosParaResena(cid) : [];
    sel.innerHTML = (CLUB.resena_requiere_pedido ? '' : '<option value="">—</option>') + (ps.length ? ps.map(p => `<option value="${p.id}">${h(p.numero)} · ${fechaCorta(p.fecha)}</option>`).join('') : (CLUB.resena_requiere_pedido ? '<option value="">sin pedidos entregados disponibles</option>' : ''));
  },
  async registrar() {
    const cid = $('#hs-cli').value; if (!cid) return toast('Elige el cliente.');
    const link = $('#hs-link').value.trim();
    const err = await registrarResena(cid, { red: $('#hs-red').value, pedido_id: $('#hs-ped').value || null, link: /^https?:/.test(link) ? link : '', nota: /^https?:/.test(link) ? '' : link });
    if (err) { $('#hs-msg').innerHTML = `<span class="aviso alerta">${h(err)}</span>`; return; }
    renderClub();
  },
  async set(k, v) { CLUB[k] = Math.max(0, +v || 0); CFG.club = { ...CLUB }; await guardarConfig(); invalidar(); renderClub(); toast('Variable actualizada.'); },
  async reset() { if (!confirm('¿Volver a las variables originales del Club?')) return; CLUB = { ...CLUB_BASE }; CFG.club = null; await guardarConfig(); invalidar(); renderClub(); },
};

// ==================================================================== PRODUCTOS Y PROMOCIONES
function urlFeed() {
  if (!CFG.supabase?.url) return '';
  const wa = soloDigitos(CFG.whatsapp);
  return `${CFG.supabase.url}/functions/v1/catalogo-meta${wa ? `?wa=${wa}` : ''}`;
}
function renderProductos() {
  const ps = lista('productos').sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const packs = lista('packs').sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const filas = filasMeta();
  const sinFoto = filas.filter(f => !/^https?:/.test(f.image_link));
  const feed = urlFeed();
  $('#v-productos').innerHTML = `
    <div class="cab-vista"><div><h2>Productos y promociones</h2><span class="suave">Lo que marques “en catálogo” es lo que ve Meta (Facebook, Instagram y WhatsApp).</span></div>
      <div class="der"><button class="btn" onclick="PR.abrir()">＋ Producto</button><button class="btn prim" onclick="PK.abrir()">＋ Pack / promoción</button></div></div>
    <h3>Mantequillas (precio suelto)</h3>
    <div class="prod-grid">${ps.map(p => `<div class="prod">
      <img src="${h(fotoDe('productos', p))}" alt="" loading="lazy">
      <div class="info"><b>${h(p.nombre)}</b><span class="precio">${soles(p.precio)}</span>
        ${(() => { const c = costoProducto(p.id); const m = margenDe(+p.precio, c); return `<div class="costo-linea"><span>Costo <b>${soles(c)}</b></span><span>Ganas <b>${soles(+p.precio - c)}</b></span><span class="margen-pill ${claseMargen(m)}">${pct(m)}</span></div>`; })()}
        <div class="fila">${p.disponible !== false ? '<span class="tag entregado">Con stock</span>' : '<span class="tag anulado">Agotado</span>'} ${p.en_catalogo ? '<span class="tag pagado">En catálogo</span>' : '<span class="tag pausa">Oculto en Meta</span>'} ${p._img_pendiente ? '<span class="tag pendiente">foto sin subir</span>' : ''}</div>
        <div class="acc"><button class="btn mini" onclick="PR.abrir('${p.id}')">Editar</button><button class="btn mini" onclick="PR.stock('${p.id}')">${p.disponible !== false ? 'Marcar agotado' : 'Hay stock'}</button></div></div></div>`).join('')}</div>

    <h3 style="margin-top:26px">Packs “Arma tu pack” y precios por nivel</h3>
    <div class="card"><div class="tabla-wrap"><table>
      <thead><tr><th></th><th>Pack</th><th class="cen">Frascos</th><th>Regla</th><th class="der">Oficial</th><th class="der">VIP</th><th class="der">Leyenda</th><th class="cen">Activo</th><th class="cen">En Meta</th><th></th></tr></thead>
      <tbody>${packs.map(p => `<tr>
        <td><img src="${h(fotoDe('packs', p))}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px"></td>
        <td><b>${h(p.nombre)}</b></td><td class="cen">${p.frascos}</td>
        <td><small>${p.tipo === 'almendra' ? 'solo almendra' : `máx. ${p.max_almendra} de almendra`}</small></td>
        ${['oficial', 'vip', 'leyenda'].map(n => { const m = margenPack(p, precioPack(p, n)); return `<td class="der"><input type="number" min="0" step="0.5" value="${p['precio_' + n] ?? ''}" placeholder="—" onchange="PK.precio('${p.id}','${n}',this.value)">
          ${m ? `<br><small class="${claseMargen(m.min)}-txt" title="Margen con la mezcla más cara y la más barata">${Math.round(m.min) === Math.round(m.max) ? pct(m.min) : `${Math.round(m.min)}–${pct(m.max)}`}</small>` : ''}</td>`; }).join('')}
        <td class="cen"><input type="checkbox" ${p.activo !== false ? 'checked' : ''} onchange="PK.flag('${p.id}','activo',this.checked)"></td>
        <td class="cen"><input type="checkbox" ${p.en_catalogo ? 'checked' : ''} ${precioPack(p, 'oficial') == null ? 'disabled title="Sin precio oficial no se publica"' : ''} onchange="PK.flag('${p.id}','en_catalogo',this.checked)"></td>
        <td class="der"><button class="btn mini" onclick="PK.abrir('${p.id}')">Editar</button></td></tr>`).join('')}</tbody>
    </table></div>
    <p class="suave" style="margin-bottom:0">Debajo de cada precio va el <b>margen</b> con la mezcla de sabores más cara y la más barata (costos de la sección de arriba). Verde: ${MARGEN_MINIMO}% o más · ámbar: 30–${MARGEN_MINIMO}% · rojo: menos de 30%.<br>En Meta solo se publica el precio <b>Oficial</b>. Los precios VIP y Leyenda se aplican al registrar el pedido. Deja el precio vacío (—) si el pack no existe en ese nivel. Los pedidos B2B llevan su propio precio.</p></div>

    <h3 style="margin-top:26px">Catálogo de Meta Business Suite</h3>
    <div class="grid g2">
      <div class="card">
        <p style="margin-top:0"><b>Link del catálogo (fuente de datos programada)</b></p>
        ${feed ? `<div class="fila"><span class="codigo" style="flex:1">${h(feed)}</span><button class="btn mini" onclick="copiar('${h(feed)}')">Copiar</button><a class="btn mini" href="${h(feed)}" target="_blank" rel="noopener">Probar</a></div>`
          : `<div class="aviso alerta">Aparece aquí cuando conectes Supabase en <a href="#" onclick="ir('ajustes');return false">Sincronización</a>. Mientras tanto puedes subir el CSV a mano.</div>`}
        ${soloDigitos(CFG.whatsapp) ? '' : `<div class="aviso alerta" style="margin-top:8px">Falta el número de WhatsApp del negocio (en Sincronización): Meta necesita un link por producto y usamos el de WhatsApp.</div>`}
        <ol style="padding-left:20px;margin-bottom:0">
          <li>Meta Business Suite → <b>Commerce Manager</b> → tu catálogo → <b>Orígenes de datos</b>.</li>
          <li><b>Agregar artículos → Fuente de datos → Programada</b> y pega el link.</li>
          <li>Frecuencia: <b>cada hora</b>. Moneda: <b>PEN</b>.</li>
          <li>Cuando edites un producto aquí y se sincronice, Meta lo toma en su siguiente lectura.</li>
        </ol>
      </div>
      <div class="card">
        <p style="margin-top:0"><b>${filas.length} artículos en el catálogo</b></p>
        ${sinFoto.length ? `<div class="aviso alerta">${plural(sinFoto.length, 'artículo')} todavía no ${sinFoto.length === 1 ? 'tiene' : 'tienen'} foto en internet (${sinFoto.map(f => h(f.title)).join(', ')}). Se suben solas al sincronizar con Supabase.</div>` : '<div class="aviso ok">Todas las fotos están en internet.</div>'}
        <p>¿Sin Supabase todavía? Descarga el archivo y súbelo a mano en Commerce Manager (<b>Fuente de datos → Subida única</b>).</p>
        <button class="btn" onclick="descargar('catalogo-meta-mrpeanut.csv', '\\ufeff' + csvMeta(), 'text/csv;charset=utf-8')">Descargar CSV para Meta</button>
      </div>
    </div>`;
}

function filasMeta() {
  const wa = soloDigitos(CFG.whatsapp);
  const link = nombre => wa ? waLink(wa, `Hola Mr. Peanut, quiero: ${nombre}`) : '';
  const out = [];
  lista('productos').filter(p => p.en_catalogo).sort((a, b) => (a.orden || 0) - (b.orden || 0)).forEach(p => out.push({
    id: p.id, title: p.nombre, description: p.descripcion || p.nombre, availability: p.disponible !== false ? 'in stock' : 'out of stock',
    condition: 'new', price: `${(+p.precio).toFixed(2)} PEN`, link: link(p.nombre), image_link: p.imagen_url || '', brand: 'Mr. Peanut',
  }));
  lista('packs').filter(p => p.en_catalogo && p.activo !== false && precioPack(p, 'oficial') != null).sort((a, b) => (a.orden || 0) - (b.orden || 0)).forEach(p => out.push({
    id: p.id, title: p.nombre, description: p.descripcion || p.nombre, availability: 'in stock',
    condition: 'new', price: `${precioPack(p, 'oficial').toFixed(2)} PEN`, link: link(p.nombre), image_link: p.imagen_url || '', brand: 'Mr. Peanut',
  }));
  return out;
}
const csvMeta = () => { const cols = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand']; return aCSV([cols, ...filasMeta().map(f => cols.map(c => f[c]))]); };

async function redimensionar(file, max = 1000) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
}
let FOTO_NUEVA = null;
async function elegirFoto(input, prevId) {
  const f = input.files?.[0]; if (!f) return;
  FOTO_NUEVA = await redimensionar(f);
  $('#' + prevId).src = URL.createObjectURL(FOTO_NUEVA);
}
async function guardarFoto(tabla, rec) {
  if (!FOTO_NUEVA) return;
  const clave = `${tabla}/${rec.id}`;
  await idb.put('imagenes', { clave, blob: FOTO_NUEVA });
  IMG[clave] = URL.createObjectURL(FOTO_NUEVA);
  rec._img_pendiente = true; FOTO_NUEVA = null;
}

let PRF = null;
const PR = {
  abrir(id) {
    FOTO_NUEVA = null;
    PRF = id ? structuredClone(D.productos.get(id)) : { id: 'MP-' + Math.random().toString(36).slice(2, 7).toUpperCase(), nombre: '', sabor: 'mani', descripcion: '', precio: 0, costo: null, disponible: true, en_catalogo: true, orden: lista('productos').length + 1, imagen_url: '' };
    pagina(`${cabPagina(id ? 'Editar producto' : 'Nuevo producto')}
      <div class="card"><div class="fila" style="align-items:flex-start;gap:18px">
        <div><img id="pr-img" class="img-prev" src="${h(fotoDe('productos', PRF))}" alt=""><br>
          <label class="btn mini" style="margin-top:8px">Cambiar foto<input type="file" accept="image/*" hidden onchange="elegirFoto(this,'pr-img')"></label>
          <p class="suave" style="font-size:12.5px;max-width:150px">Cuadrada, mínimo 500×500 px. Se ajusta sola.</p></div>
        <div class="grid g2" style="flex:1">
          <div class="campo" style="grid-column:1/-1"><label>Nombre (título en Meta)</label><input type="text" value="${h(PRF.nombre)}" oninput="PRF.nombre=this.value"></div>
          <div class="campo"><label>Precio suelto (S/)</label><input type="number" step="0.1" min="0" value="${+PRF.precio}" oninput="PRF.precio=+this.value;PR.margen()"></div>
          <div class="campo"><label>Costo por frasco (S/) <small class="suave">no se publica</small></label><input type="number" step="0.01" min="0" value="${PRF.costo ?? ''}" oninput="PRF.costo=this.value===''?null:+this.value;PR.margen()"></div>
          <div class="campo" style="grid-column:1/-1"><div id="pr-margen"></div></div>
          <div class="campo"><label>Sabor</label><select onchange="PRF.sabor=this.value;PR.margen()">${SABORES.map(s => `<option value="${s.id}" ${PRF.sabor === s.id ? 'selected' : ''}>${s.nombre}</option>`).join('')}</select></div>
          <div class="campo"><label>ID (SKU)</label><input type="text" value="${h(PRF.id)}" ${id ? 'disabled' : `oninput="PRF.id=this.value.toUpperCase().replace(/[^A-Z0-9-]/g,'')"`}></div>
          <div class="campo"><label>Orden</label><input type="number" value="${+PRF.orden || 0}" oninput="PRF.orden=+this.value"></div>
          <div class="campo" style="grid-column:1/-1"><label>Descripción (la que ve el cliente en Meta)</label><textarea style="min-height:120px" oninput="PRF.descripcion=this.value">${h(PRF.descripcion)}</textarea></div>
          <label class="check"><input type="checkbox" ${PRF.disponible !== false ? 'checked' : ''} onchange="PRF.disponible=this.checked"> Hay stock</label>
          <label class="check"><input type="checkbox" ${PRF.en_catalogo ? 'checked' : ''} onchange="PRF.en_catalogo=this.checked"> Mostrar en el catálogo de Meta</label>
        </div></div></div>
      <div class="modal-pie">${id ? `<button class="btn peligro" style="margin-right:auto" onclick="PR.borrar()">Eliminar</button>` : ''}<button class="btn" onclick="volver()">Cancelar</button><button class="btn prim" onclick="PR.guardar()">Guardar</button></div>`);
    PR.margen();
  },
  margen() {
    const el = $('#pr-margen'); if (!el) return;
    const c = PRF.costo == null || PRF.costo === '' ? (COSTOS_BASE[PRF.sabor] || 0) : +PRF.costo; const pr = +PRF.precio || 0; const m = margenDe(pr, c);
    el.innerHTML = `<div class="costo-linea grande"><span>Ganas <b>${soles(pr - c)}</b> por frasco suelto</span><span class="margen-pill ${claseMargen(m)}">margen ${pct(m)}</span>
      <small class="suave">El costo sale del Centro de costos. Si cambia, actualízalo aquí: los pedidos nuevos usan el costo nuevo y los ya guardados conservan el suyo.</small></div>`;
  },
  async guardar() {
    if (!PRF.nombre.trim()) return alert('Falta el nombre.');
    if (!PRF.id) return alert('Falta el ID.');
    const esNuevo = !D.productos.get(PRF.id);
    if (esNuevo && lista('productos').some(p => p.sabor === PRF.sabor)) { if (!confirm(`Ya hay un producto de sabor ${nombreSabor(PRF.sabor)}. El precio suelto que usa el pedido será el del primero. ¿Guardar igual?`)) return; }
    const rec = { ...(D.productos.get(PRF.id) || {}), ...PRF };
    await guardarFoto('productos', rec);
    await guardar('productos', rec); toast('Producto guardado.'); volver();
  },
  async stock(id) { const p = D.productos.get(id); p.disponible = p.disponible === false; await guardar('productos', p); render(); },
  async borrar() { if (!confirm('¿Eliminar este producto? Sale también del catálogo de Meta.')) return; await eliminar('productos', PRF.id); volver(); },
};

let PKF = null;
const PK = {
  abrir(id) {
    FOTO_NUEVA = null;
    PKF = id ? structuredClone(D.packs.get(id)) : { id: 'PACK-' + Math.random().toString(36).slice(2, 6).toUpperCase(), nombre: '', frascos: 2, tipo: 'mixto', max_almendra: 1, precio_oficial: null, precio_vip: null, precio_leyenda: null, descripcion: '', activo: true, en_catalogo: true, orden: lista('packs').length + 1, imagen_url: '', imagen_local: 'img/productos/pack.jpg' };
    const num = (k, t) => `<div class="campo"><label>${t}</label><input type="number" min="0" step="0.5" value="${PKF[k] ?? ''}" placeholder="—" oninput="PKF['${k}']=this.value===''?null:+this.value"></div>`;
    pagina(`${cabPagina(id ? 'Editar pack' : 'Nuevo pack / promoción')}
      <div class="card"><div class="fila" style="align-items:flex-start;gap:18px">
        <div><img id="pk-img" class="img-prev" src="${h(fotoDe('packs', PKF))}" alt=""><br>
          <label class="btn mini" style="margin-top:8px">Cambiar foto<input type="file" accept="image/*" hidden onchange="elegirFoto(this,'pk-img')"></label></div>
        <div class="grid g2" style="flex:1">
          <div class="campo" style="grid-column:1/-1"><label>Nombre</label><input type="text" value="${h(PKF.nombre)}" oninput="PKF.nombre=this.value"></div>
          <div class="campo"><label>Frascos</label><input type="number" min="1" value="${PKF.frascos}" oninput="PKF.frascos=+this.value"></div>
          <div class="campo"><label>Tipo</label><select onchange="PKF.tipo=this.value"><option value="mixto" ${PKF.tipo === 'mixto' ? 'selected' : ''}>Mixto (elige sabores)</option><option value="almendra" ${PKF.tipo === 'almendra' ? 'selected' : ''}>Solo almendra</option></select></div>
          <div class="campo"><label>Máx. de almendra (mixto)</label><input type="number" min="0" value="${PKF.max_almendra}" oninput="PKF.max_almendra=+this.value"></div>
          <div class="campo"><label>ID</label><input type="text" value="${h(PKF.id)}" ${id ? 'disabled' : `oninput="PKF.id=this.value.toUpperCase().replace(/[^A-Z0-9-]/g,'')"`}></div>
          ${num('precio_oficial', 'Precio Oficial (S/)')}${num('precio_vip', 'Precio VIP (S/)')}${num('precio_leyenda', 'Precio Leyenda (S/)')}
          <div class="campo"><label>Orden</label><input type="number" value="${+PKF.orden || 0}" oninput="PKF.orden=+this.value"></div>
          <div class="campo" style="grid-column:1/-1"><label>Descripción para Meta</label><textarea style="min-height:100px" oninput="PKF.descripcion=this.value">${h(PKF.descripcion)}</textarea></div>
          <label class="check"><input type="checkbox" ${PKF.activo !== false ? 'checked' : ''} onchange="PKF.activo=this.checked"> Activo (se puede vender)</label>
          <label class="check"><input type="checkbox" ${PKF.en_catalogo ? 'checked' : ''} onchange="PKF.en_catalogo=this.checked"> Mostrar en Meta (precio oficial)</label>
        </div></div></div>
      <div class="modal-pie">${id ? `<button class="btn peligro" style="margin-right:auto" onclick="PK.borrar()">Eliminar</button>` : ''}<button class="btn" onclick="volver()">Cancelar</button><button class="btn prim" onclick="PK.guardar()">Guardar</button></div>`);
  },
  async guardar() {
    if (!PKF.nombre.trim()) return alert('Falta el nombre.');
    if (!(PKF.frascos >= 1)) return alert('El pack necesita al menos 1 frasco.');
    if (PKF.tipo === 'almendra') PKF.max_almendra = PKF.frascos;
    const rec = { ...(D.packs.get(PKF.id) || {}), ...PKF };
    await guardarFoto('packs', rec);
    await guardar('packs', rec); toast('Pack guardado.'); volver();
  },
  async precio(id, nivel, v) { const p = D.packs.get(id); p['precio_' + nivel] = v === '' ? null : +v; if (nivel === 'oficial' && v === '') p.en_catalogo = false; await guardar('packs', p); render(); toast('Precio actualizado.'); },
  async flag(id, k, v) { const p = D.packs.get(id); p[k] = v; await guardar('packs', p); render(); },
  async borrar() { if (!confirm('¿Eliminar este pack?')) return; await eliminar('packs', PKF.id); volver(); },
};

// ==================================================================== INVENTARIO (stock por lotes)
// Stock = entradas − salidas − lo que llevan los pedidos no anulados. Cada pedido descuenta
// solo, del lote que vence primero. Si un pedido se edita o se anula, el stock se recalcula.
// Las salidas manuales pueden elegir su lote.
const MOTIVOS_ENTRADA = ['Producción', 'Compra', 'Devolución de cliente', 'Inventario inicial', 'Otro'];
const MOTIVOS_SALIDA = ['Merma / vencido', 'Muestra / degustación', 'Regalo / marketing', 'Uso interno', 'Otro'];
const SIN_LOTE = 'SIN LOTE';
const DIAS_VIDA = 180; // 6 meses desde la fabricación

// Cuántos frascos de cada producto lleva un pedido.
function consumoPedido(p) {
  const out = {};
  const sumar = (pid, n) => { if (pid && n) out[pid] = (out[pid] || 0) + n; };
  for (const i of p?.items || []) {
    if (i.tipo === 'pack') for (const [s, n] of Object.entries(i.sabores || {})) sumar(productoDeSabor(s)?.id, n);
    if (i.tipo === 'suelto') sumar(productoDeSabor(i.sabor)?.id, +i.cantidad || 0);
    if (i.tipo === 'regalo') sumar(productoDeSabor(i.sabor)?.id, 1);
    if (i.tipo === 'linea') sumar(i.producto_id, +i.cantidad || 0);
  }
  return out;
}

function inventario() {
  if (INV) return INV;
  const lotes = {};   // "prod|lote" -> { prod, lote, fecha, vence, entro, queda }
  const asign = {};   // pedido_id -> [{ prod, lote, n }]
  const salidasPedidos = [];
  const ev = [];
  lista('movimientos_stock').forEach(m => ev.push({ f: m.fecha, o: m.creado_en || '', prod: m.producto_id, n: +m.cantidad || 0, lote: m.lote || '', m }));
  lista('pedidos').filter(p => !p.anulado).forEach(p => Object.entries(consumoPedido(p)).forEach(([prod, n]) => ev.push({ f: p.fecha, o: p.creado_en || '', prod, n: -n, lote: '', p })));
  ev.sort((a, b) => (a.f + a.o).localeCompare(b.f + b.o));
  const lote = (prod, l, e) => {
    const k = `${prod}|${l}`;
    return lotes[k] ||= { prod, lote: l, fecha: e?.f || '', vence: e?.m?.vence || '', entro: 0, queda: 0 };
  };
  for (const e of ev) {
    if (e.n > 0) { const L = lote(e.prod, e.lote || SIN_LOTE, e); L.entro += e.n; L.queda += e.n; if (!L.vence && e.m?.vence) L.vence = e.m.vence; continue; }
    let falta = -e.n;
    const reparto = [];
    if (e.lote) { lote(e.prod, e.lote, e).queda -= falta; reparto.push({ prod: e.prod, lote: e.lote, n: falta }); falta = 0; }
    else {
      const disp = Object.values(lotes).filter(L => L.prod === e.prod && L.queda > 0 && L.lote !== SIN_LOTE)
        .sort((a, b) => (a.vence || a.fecha).localeCompare(b.vence || b.fecha));
      const sl = lotes[`${e.prod}|${SIN_LOTE}`]; if (sl && sl.queda > 0) disp.push(sl);
      for (const L of disp) { if (!falta) break; const t = Math.min(falta, L.queda); L.queda -= t; falta -= t; reparto.push({ prod: e.prod, lote: L.lote, n: t }); }
      if (falta) { lote(e.prod, SIN_LOTE, e).queda -= falta; reparto.push({ prod: e.prod, lote: SIN_LOTE, n: falta }); }
    }
    if (e.p) { (asign[e.p.id] ||= []).push(...reparto); salidasPedidos.push({ fecha: e.f, prod: e.prod, n: -e.n, pedido: e.p, lotes: reparto }); }
  }
  const stock = {};
  Object.values(lotes).forEach(L => { stock[L.prod] = (stock[L.prod] || 0) + L.queda; });
  INV = { lotes, asign, stock, salidasPedidos };
  return INV;
}
const stockDe = pid => inventario().stock[pid] || 0;
const stockMin = pid => +(CFG.stock_min?.[pid] ?? 10);
const lotesDe = pid => Object.values(inventario().lotes).filter(L => L.prod === pid);

const UIINV = { prod: 'todos' };
function renderInventario() {
  const inv = inventario();
  const ps = lista('productos').sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const en30 = sumarDias(hoy(), 30);
  const porVencer = Object.values(inv.lotes).filter(L => L.queda > 0 && L.vence && L.vence <= en30).sort((a, b) => a.vence.localeCompare(b.vence));
  const bajos = ps.filter(p => stockDe(p.id) <= stockMin(p.id));
  const movs = [
    ...lista('movimientos_stock').map(m => ({ fecha: m.fecha, prod: m.producto_id, n: +m.cantidad, lote: m.lote || '', que: `${m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'salida' ? 'Salida' : 'Ajuste por conteo'} · ${m.motivo || ''}`, nota: m.nota, id: m.id, orden: m.creado_en })),
    ...inv.salidasPedidos.map(s => ({ fecha: s.fecha, prod: s.prod, n: -s.n, lote: s.lotes.map(l => `${l.lote} (${l.n})`).join(', '), que: `Pedido ${s.pedido.numero}`, pedido: s.pedido.id, orden: s.pedido.creado_en })),
  ].filter(m => UIINV.prod === 'todos' || m.prod === UIINV.prod).sort((a, b) => (b.fecha + (b.orden || '')).localeCompare(a.fecha + (a.orden || ''))).slice(0, 60);
  $('#v-inventario').innerHTML = `
    <div class="cab-vista"><div><h2>Inventario</h2><span class="suave">Stock por producto y por lote. Cada pedido descuenta solo, empezando por el lote que vence primero.</span></div>
      <div class="der"><button class="btn" onclick="INVF.abrir('salida')">− Salida</button><button class="btn" onclick="INVF.abrir('ajuste')">Conteo / ajuste</button><button class="btn prim" onclick="INVF.abrir('entrada')">＋ Entrada</button></div></div>
    <div class="kpis">
      <div class="kpi"><small>Frascos en stock</small><b class="num">${ps.reduce((a, p) => a + Math.max(0, stockDe(p.id)), 0)}</b><em>${plural(ps.length, 'producto')}</em></div>
      <div class="kpi"><small>Bajo el mínimo</small><b class="num" style="color:${bajos.length ? 'var(--error)' : 'inherit'}">${bajos.length}</b><em>${bajos.map(p => nombreSabor(p.sabor)).join(', ') || 'todo bien'}</em></div>
      <div class="kpi"><small>Lotes por vencer (30 días)</small><b class="num" style="color:${porVencer.length ? 'var(--alerta)' : 'inherit'}">${porVencer.length}</b><em>${porVencer.reduce((a, L) => a + L.queda, 0)} frascos</em></div>
      <div class="kpi"><small>Salieron este mes en pedidos</small><b class="num">${inv.salidasPedidos.filter(s => s.fecha?.startsWith(hoy().slice(0, 7))).reduce((a, s) => a + s.n, 0)}</b><em>frascos</em></div>
    </div>
    <div class="grid g2">
      ${ps.map(p => { const st = stockDe(p.id); const ls = lotesDe(p.id).filter(L => L.queda !== 0).sort((a, b) => (a.vence || a.fecha).localeCompare(b.vence || b.fecha)); return `<div class="card">
        <div class="fila"><img src="${h(fotoDe('productos', p))}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover">
          <div style="flex:1"><b style="font-size:17px">${h(nombreSabor(p.sabor))}</b><br><small class="suave">${h(p.nombre)}</small></div>
          <div style="text-align:right"><b class="titan" style="font-size:30px;color:${st <= stockMin(p.id) ? 'var(--error)' : 'var(--texto)'}">${st}</b><br><small>mínimo <input type="number" min="0" value="${stockMin(p.id)}" style="width:64px;padding:3px 6px" onchange="INVF.minimo('${p.id}',this.value)"></small></div></div>
        ${st < 0 ? '<div class="aviso error" style="margin-top:8px">Stock negativo: hay pedidos sin entrada registrada. Registra la entrada (o el inventario inicial).</div>' : ''}
        ${ls.length ? `<table style="margin-top:10px"><thead><tr><th>Lote</th><th>Entró</th><th>Vence</th><th class="der">Queda</th></tr></thead><tbody>
          ${ls.map(L => `<tr><td><span class="codigo">${h(L.lote)}</span></td><td>${L.fecha ? fechaCorta(L.fecha) : '—'}</td><td>${L.vence ? `<span style="color:${L.vence < hoy() ? 'var(--error)' : L.vence <= en30 ? 'var(--alerta)' : 'inherit'}">${fechaCorta(L.vence)}</span>` : '—'}</td><td class="der num"><b>${L.queda}</b> <small>/ ${L.entro}</small></td></tr>`).join('')}
        </tbody></table>` : '<p class="suave" style="margin-bottom:0">Sin lotes con stock.</p>'}
        <div class="fila" style="margin-top:10px"><button class="btn mini" onclick="INVF.abrir('entrada','${p.id}')">＋ Entrada</button><button class="btn mini" onclick="INVF.abrir('salida','${p.id}')">− Salida</button><button class="btn mini" onclick="INVF.abrir('ajuste','${p.id}')">Conteo</button></div>
      </div>`; }).join('')}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="fila" style="margin-bottom:10px"><h3 style="margin:0">Movimientos</h3>
        <select style="width:220px;margin-left:auto" onchange="UIINV.prod=this.value;renderInventario()"><option value="todos">Todos los productos</option>${ps.map(p => `<option value="${p.id}" ${UIINV.prod === p.id ? 'selected' : ''}>${h(nombreSabor(p.sabor))}</option>`).join('')}</select></div>
      <div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Lote</th><th class="der">Cantidad</th><th></th></tr></thead><tbody>
        ${movs.length ? movs.map(m => `<tr><td>${fechaCorta(m.fecha)}</td><td>${h(nombreSabor(D.productos.get(m.prod)?.sabor) || m.prod)}</td>
          <td>${m.pedido ? `<a href="#" onclick="PF.abrir('${m.pedido}');return false">${h(m.que)}</a>` : h(m.que)}${m.nota ? `<br><small>${h(m.nota)}</small>` : ''}</td>
          <td><small>${h(m.lote)}</small></td><td class="der num"><b style="color:${m.n > 0 ? 'var(--ok)' : 'var(--error)'}">${m.n > 0 ? '+' : ''}${m.n}</b></td>
          <td class="der">${m.id ? `<button class="btn mini peligro" onclick="INVF.borrar('${m.id}')">Quitar</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="6" class="vacio">Sin movimientos. Empieza con <b>＋ Entrada</b> (motivo “Inventario inicial”).</td></tr>'}
      </tbody></table></div>
    </div>`;
}

let MF = null;
const INVF = {
  abrir(tipo, prodId) {
    const ps = lista('productos').sort((a, b) => (a.orden || 0) - (b.orden || 0));
    MF = { tipo, producto_id: prodId || ps[0]?.id, cantidad: '', lote: tipo === 'entrada' ? 'L-' + hoy().slice(2).replace(/-/g, '') : '', fecha: hoy(), vence: tipo === 'entrada' ? sumarDias(hoy(), DIAS_VIDA) : '', motivo: tipo === 'entrada' ? 'Producción' : tipo === 'salida' ? 'Merma / vencido' : 'Conteo físico', nota: '' };
    INVF.pintar();
  },
  pintar() {
    const ps = lista('productos').sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const t = MF.tipo; const ls = lotesDe(MF.producto_id).filter(L => L.lote !== SIN_LOTE || L.queda !== 0);
    const titulo = t === 'entrada' ? 'Entrada de stock' : t === 'salida' ? 'Salida de stock' : 'Conteo físico / ajuste';
    pagina(`${cabPagina(titulo)}
      <div class="card" style="max-width:820px">
        <div class="chips" style="margin-bottom:14px">${[['entrada', '＋ Entrada'], ['salida', '− Salida'], ['ajuste', 'Conteo / ajuste']].map(([k, x]) => `<button class="chip ${t === k ? 'activo' : ''}" onclick="INVF.abrir('${k}',MF.producto_id)">${x}</button>`).join('')}</div>
        <div class="grid g2">
          <div class="campo"><label>Producto *</label><select onchange="MF.producto_id=this.value;INVF.pintar()">${ps.map(p => `<option value="${p.id}" ${MF.producto_id === p.id ? 'selected' : ''}>${h(nombreSabor(p.sabor))} · stock ${stockDe(p.id)}</option>`).join('')}</select></div>
          <div class="campo"><label>Fecha *</label><input type="date" value="${h(MF.fecha)}" onchange="MF.fecha=this.value"></div>
          ${t === 'entrada' ? `
            <div class="campo"><label>N.° de lote * <small class="suave">(si repites uno existente, se suma a ese lote)</small></label><input type="text" list="inv-lotes" value="${h(MF.lote)}" oninput="MF.lote=this.value.toUpperCase().trim();INVF.infoLote()">
              <datalist id="inv-lotes">${ls.filter(L => L.lote !== SIN_LOTE).map(L => `<option value="${h(L.lote)}">quedan ${L.queda}</option>`).join('')}</datalist><small id="inv-lote-info" class="suave"></small></div>
            <div class="campo"><label>Cantidad (frascos) *</label><input type="number" min="1" step="1" value="${h(MF.cantidad)}" oninput="MF.cantidad=this.value"></div>
            <div class="campo"><label>Vence</label><input type="date" value="${h(MF.vence)}" onchange="MF.vence=this.value"></div>
            <div class="campo"><label>Motivo *</label><select onchange="MF.motivo=this.value">${MOTIVOS_ENTRADA.map(x => `<option ${MF.motivo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`
          : t === 'salida' ? `
            <div class="campo"><label>Lote</label><select onchange="MF.lote=this.value"><option value="">Automático (el que vence primero)</option>${ls.filter(L => L.queda > 0).map(L => `<option value="${h(L.lote)}" ${MF.lote === L.lote ? 'selected' : ''}>${h(L.lote)} · quedan ${L.queda}</option>`).join('')}</select></div>
            <div class="campo"><label>Cantidad (frascos) *</label><input type="number" min="1" step="1" value="${h(MF.cantidad)}" oninput="MF.cantidad=this.value"></div>
            <div class="campo"><label>Motivo *</label><select onchange="MF.motivo=this.value">${MOTIVOS_SALIDA.map(x => `<option ${MF.motivo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
            <p class="suave" style="grid-column:1/-1;margin:0">Las ventas no se registran aquí: cada pedido ya descuenta su stock.</p>`
          : `
            <div class="campo"><label>Lote que contaste *</label><select onchange="MF.lote=this.value;INVF.pintar()"><option value="">Elige…</option>${ls.map(L => `<option value="${h(L.lote)}" ${MF.lote === L.lote ? 'selected' : ''}>${h(L.lote)} · el sistema dice ${L.queda}</option>`).join('')}</select></div>
            <div class="campo"><label>Frascos que hay de verdad *</label><input type="number" min="0" step="1" value="${h(MF.cantidad)}" oninput="MF.cantidad=this.value"></div>
            <div class="campo"><label>Motivo</label><input type="text" value="${h(MF.motivo)}" oninput="MF.motivo=this.value"></div>
            <p class="suave" style="grid-column:1/-1;margin:0">Se guarda la diferencia entre lo contado y lo que dice el sistema.</p>`}
          <div class="campo" style="grid-column:1/-1"><label>Nota</label><input type="text" value="${h(MF.nota)}" oninput="MF.nota=this.value" placeholder="Opcional"></div>
        </div>
      </div>
      <div class="modal-pie" style="max-width:820px"><button class="btn" onclick="volver()">Cancelar</button><button class="btn prim" onclick="INVF.guardar()">Guardar</button></div>`);
    if (t === 'entrada') INVF.infoLote();
  },
  infoLote() {
    const el = $('#inv-lote-info'); if (!el) return;
    const L = inventario().lotes[`${MF.producto_id}|${MF.lote}`];
    el.textContent = L ? `Lote existente: entraron ${L.entro}, quedan ${L.queda}. Se sumará a este lote.` : MF.lote ? 'Lote nuevo.' : '';
  },
  async guardar() {
    const t = MF.tipo; const n = parseInt(MF.cantidad, 10);
    if (!MF.producto_id) return toast('Elige el producto.');
    if (!MF.fecha) return toast('Pon la fecha.');
    let cantidad;
    if (t === 'ajuste') {
      if (!MF.lote) return toast('Elige el lote que contaste.');
      if (!(n >= 0)) return toast('Escribe cuántos frascos contaste.');
      const L = inventario().lotes[`${MF.producto_id}|${MF.lote}`];
      cantidad = n - (L ? L.queda : 0);
      if (!cantidad) { toast('El conteo coincide con el sistema. No hay nada que ajustar.'); return volver(); }
    } else {
      if (!(n > 0)) return toast('Escribe la cantidad.');
      if (t === 'entrada' && !MF.lote) return toast('Escribe el número de lote.');
      cantidad = t === 'entrada' ? n : -n;
      if (t === 'salida' && n > stockDe(MF.producto_id) && !confirm(`Solo hay ${stockDe(MF.producto_id)} en stock. ¿Registrar igual?`)) return;
    }
    await guardar('movimientos_stock', { id: uid(), producto_id: MF.producto_id, tipo: t, cantidad, lote: MF.lote || '', fecha: MF.fecha, vence: t === 'entrada' ? (MF.vence || null) : null, motivo: MF.motivo || '', nota: MF.nota || '' });
    toast(t === 'entrada' ? `+${n} en el lote ${MF.lote}.` : t === 'salida' ? `−${n} registrados.` : `Ajuste de ${cantidad > 0 ? '+' : ''}${cantidad}.`);
    ir('inventario');
  },
  async minimo(pid, v) { CFG.stock_min = { ...(CFG.stock_min || {}), [pid]: Math.max(0, +v || 0) }; await guardarConfig(); renderInventario(); },
  async borrar(id) { if (!confirm('¿Quitar este movimiento? El stock se recalcula.')) return; await eliminar('movimientos_stock', id); renderInventario(); },
};

// ==================================================================== SINCRONIZACIÓN CON SUPABASE
let sincronizando = false; let ultimoError = null; let _tSync = null;
const conectado = () => !!(CFG.supabase?.url && CFG.supabase?.refresh_token);
function programarSync(ms = 2500) { if (!conectado()) return; clearTimeout(_tSync); _tSync = setTimeout(() => sincronizar(false), ms); }

function pintarEstado() {
  const b = $('#estado-sync'); if (!b) return;
  const n = COLA.size;
  let cls = 'ok', txt = 'Sincronizado';
  if (!conectado()) { cls = 'off'; txt = 'Solo en esta PC'; }
  else if (!navigator.onLine) { cls = 'off'; txt = `Sin internet${n ? ` · ${n} por subir` : ''}`; }
  else if (sincronizando) { cls = 'pend'; txt = 'Sincronizando…'; }
  else if (ultimoError) { cls = 'off'; txt = 'Error al sincronizar'; }
  else if (n) { cls = 'pend'; txt = `${n} por subir`; }
  b.className = 'pill ' + cls; b.querySelector('span').textContent = txt;
  b.title = ultimoError || (CFG.ultima_sync ? `Última sincronización: ${new Date(CFG.ultima_sync).toLocaleString('es-PE')}` : '');
}

async function token() {
  const s = CFG.supabase;
  if (s.access_token && s.expires_at && s.expires_at * 1000 > Date.now() + 60000) return s.access_token;
  const r = await fetch(`${s.url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: s.anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
  if (!r.ok) throw new Error('La sesión de Supabase venció. Vuelve a conectar en Sincronización.');
  const j = await r.json();
  Object.assign(s, { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at });
  await guardarConfig();
  return j.access_token;
}
async function cabeceras(extra = {}) { return { apikey: CFG.supabase.anon, Authorization: `Bearer ${await token()}`, ...extra }; }

async function sincronizar(manual) {
  if (sincronizando || !conectado()) { pintarEstado(); return; }
  if (!navigator.onLine) { pintarEstado(); if (manual) toast('No hay internet. Los cambios quedan guardados en esta PC.'); return; }
  sincronizando = true; pintarEstado();
  try {
    // Primero los datos: una foto que falle nunca debe frenar el respaldo.
    await subirCola();
    let avisoFotos = null;
    try { await subirFotos(); await subirVouchers(); await subirCola(); }
    catch (e) { avisoFotos = e.message || String(e); }
    const bajados = await bajarCambios();
    if (avisoFotos && manual) toast('Datos sincronizados. Algunas fotos quedaron pendientes: ' + avisoFotos, 6000);
    CFG.ultima_sync = new Date().toISOString(); await guardarConfig();
    ultimoError = null;
    if (manual) toast(`Sincronizado${bajados ? ` · ${plural(bajados, 'cambio')} bajado${bajados === 1 ? '' : 's'}` : ''}.`);
    if (bajados && !$('#v-pagina').innerHTML) { invalidar(); render(); }
  } catch (e) {
    ultimoError = e.message || String(e);
    if (manual) toast('No se pudo sincronizar: ' + ultimoError, 6000);
  } finally {
    sincronizando = false; pintarEstado();
    if (!$('#v-pagina').innerHTML && (UI.vista === 'ajustes' || UI.vista === 'productos')) render();
  }
}

async function subirArchivo(bucket, ruta, blob) {
  const resp = await fetch(`${CFG.supabase.url}/storage/v1/object/${bucket}/${ruta}`, { method: 'POST', headers: await cabeceras({ 'x-upsert': 'true', 'Content-Type': blob.type || 'image/jpeg' }), body: blob });
  if (!resp.ok) throw new Error(`No se pudo subir una foto: ${(await resp.text()).slice(0, 160)}`);
}
async function subirFotos() {
  for (const tabla of ['productos', 'packs']) {
    for (const r of [...D[tabla].values()].filter(x => x._img_pendiente && !x._demo)) {
      const guardada = await idb.get('imagenes', `${tabla}/${r.id}`);
      let blob = guardada?.blob;
      if (!blob && r.imagen_local) {
        if (location.protocol === 'file:') continue; // abierto con doble clic: el navegador no deja leer img/; se sube desde la versión web
        try { const resp = await fetch(r.imagen_local); if (resp.ok) blob = await resp.blob(); } catch { continue; }
      }
      if (!blob) { r._img_pendiente = false; await idb.put(tabla, r); continue; }
      const ruta = `${tabla}/${encodeURIComponent(r.id)}.jpg`;
      await subirArchivo('productos', ruta, blob);
      r.imagen_url = `${CFG.supabase.url}/storage/v1/object/public/productos/${ruta}?v=${Date.now()}`;
      r._img_pendiente = false;
      await guardar(tabla, r);
    }
  }
}
// Vouchers de pago: bucket privado "comprobantes" (solo lo ve el usuario con sesión).
async function subirVouchers() {
  for (const p of [...D.pedidos.values()].filter(x => !x._demo && (x.pagos || []).some(y => y._foto_pendiente))) {
    let cambio = false;
    for (const x of p.pagos) {
      if (!x._foto_pendiente) continue;
      const g = await idb.get('imagenes', `pagos/${x.id}`); if (!g?.blob) continue; // la foto está en otra PC
      const ruta = `${p.id}/${x.id}.jpg`;
      await subirArchivo('comprobantes', ruta, g.blob);
      x.foto_path = ruta; delete x._foto_pendiente; cambio = true;
    }
    if (cambio) await guardar('pedidos', p);
  }
}

// Columnas que en Supabase no aceptan vacío: si el registro local no las tiene, va su valor por defecto.
const NO_NULOS = {
  _todas: { eliminado: false },
  clientes: { tipo_cliente: 'persona', regalo_agendado: false, nombre: '' },
  pedidos: { canal: 'b2c', estado_entrega: 'por_preparar', estado_pago: 'pendiente', anulado: false, envio_asumido: false, items: [], pagos: [] },
  productos: { precio: 0, disponible: true, en_catalogo: true, nombre: '' },
  packs: { tipo: 'mixto', max_almendra: 1, activo: true, en_catalogo: true, frascos: 1, nombre: '' },
  sellos_extra: { cantidad: 1, tipo: 'ajuste' },
  movimientos_stock: { tipo: 'ajuste', cantidad: 0 },
};
async function subirCola() {
  let errSubida = null;
  const pendientes = await idb.all('cola');
  for (const tabla of TABLAS) {
    const items = pendientes.filter(c => c.tabla === tabla);
    for (let i = 0; i < items.length; i += 200) {
      const lote = items.slice(i, i + 200).map(c => D[tabla].get(c.id)).filter(r => r && !r._demo);
      const snap = new Map(lote.map(r => [r.id, r.updated_at]));
      const fallidos = new Set();
      if (lote.length) {
        const fila = r => Object.fromEntries(COLUMNAS[tabla].map(k => [k, r[k] ?? NO_NULOS[tabla]?.[k] ?? NO_NULOS._todas[k] ?? null]));
        const conCab = async filas => fetch(`${CFG.supabase.url}/rest/v1/${tabla}`, { method: 'POST', headers: await cabeceras({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(filas) });
        const resp = await conCab(lote.map(fila));
        if (!resp.ok) {
          const t = await resp.text();
          if (/row-level security|JWT/i.test(t)) throw new Error(/JWT/i.test(t) ? 'La sesión de Supabase venció. Vuelve a conectar.' : `Tu correo (${CFG.supabase.email}) no está autorizado en la tabla "equipo" de Supabase.`);
          // Un registro malo no debe frenar a los demás: se sube uno por uno y el que falla queda en la cola.
          let primerError = null;
          for (const r of lote) {
            const r1 = await conCab([fila(r)]);
            if (!r1.ok) { fallidos.add(r.id); primerError ||= `${tabla}: ${(await r1.text()).slice(0, 160)}`; }
          }
          if (primerError) errSubida ||= primerError;
        }
      }
      const listos = items.slice(i, i + 200).filter(c => { const r = D[tabla].get(c.id); return !fallidos.has(c.id) && (!r || r._demo || snap.get(c.id) === r.updated_at); }).map(c => c.clave);
      await idb.delMany('cola', listos); listos.forEach(k => COLA.delete(k));
      pintarEstado();
    }
  }
  if (errSubida) throw new Error(`Se subió todo menos algunos registros (${errSubida})`);
}

async function bajarCambios() {
  CFG.ultimo_pull ||= {};
  let n = 0;
  for (const tabla of TABLAS) {
    for (;;) {
      const desde = CFG.ultimo_pull[tabla] || '1970-01-01T00:00:00Z';
      const resp = await fetch(`${CFG.supabase.url}/rest/v1/${tabla}?select=*&updated_at=gt.${encodeURIComponent(desde)}&order=updated_at.asc&limit=500`, { headers: await cabeceras() });
      if (!resp.ok) throw new Error(`No se pudo leer ${tabla}: ${(await resp.text()).slice(0, 200)}`);
      const filas = await resp.json();
      const cambios = [];
      for (const r of filas) {
        const local = D[tabla].get(r.id);
        const enCola = COLA.has(`${tabla}:${r.id}`);
        if (!local || (!enCola && Date.parse(r.updated_at) > Date.parse(local.updated_at))) {
          const nuevo = { ...(local || {}), ...r };
          if (local?._img_pendiente && !(esSemilla(local) && r.imagen_url)) nuevo._img_pendiente = true;
          else delete nuevo._img_pendiente;
          D[tabla].set(r.id, nuevo); cambios.push(nuevo);
        }
      }
      if (cambios.length) { await idb.putMany(tabla, cambios); n += cambios.length; }
      if (filas.length) CFG.ultimo_pull[tabla] = filas[filas.length - 1].updated_at;
      if (filas.length < 500) break;
    }
  }
  return n;
}

async function conectarSupabase() {
  const url = $('#sb-url').value.trim().replace(/\/+$/, '');
  const anon = $('#sb-anon').value.trim(); const email = $('#sb-email').value.trim(); const pass = $('#sb-pass').value;
  const msg = $('#sb-msg');
  if (!/^https:\/\/.+/.test(url) || !anon || !email || !pass) { msg.innerHTML = '<div class="aviso error">Completa los cuatro datos.</div>'; return; }
  if (!navigator.onLine) { msg.innerHTML = '<div class="aviso error">Necesitas internet para conectar la primera vez.</div>'; return; }
  msg.innerHTML = '<div class="aviso info">Conectando…</div>';
  try {
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || 'Correo o contraseña incorrectos.');
    CFG.supabase = { url, anon, email, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at };
    CFG.ultimo_pull = {};
    msg.innerHTML = '<div class="aviso info">Bajando tus datos de Supabase…</div>';
    await bajarCambios(); invalidar();
    const todo = [];
    for (const t of TABLAS) for (const rec of D[t].values()) if (!rec._demo) { const clave = `${t}:${rec.id}`; COLA.add(clave); todo.push({ clave, tabla: t, id: rec.id }); }
    await idb.putMany('cola', todo);
    await guardarConfig();
    renderAjustes();
    await sincronizar(true);
  } catch (e) { msg.innerHTML = `<div class="aviso error">${h(e.message)}</div>`; }
}
async function desconectarSupabase() {
  if (!confirm('¿Desconectar de Supabase? Los datos siguen en esta PC; solo deja de sincronizar.')) return;
  CFG.supabase = null; CFG.ultimo_pull = {}; await guardarConfig(); ultimoError = null; pintarEstado(); renderAjustes();
}

// ==================================================================== AJUSTES / SINCRONIZACIÓN
let eventoInstalar = null;
function renderAjustes() {
  const s = CFG.supabase;
  const demo = TABLAS.some(t => [...D[t].values()].some(r => r._demo));
  const sub = UI.ajustes || 'conexion';
  const NOMBRES = { pedidos: 'Pedidos', clientes: 'Clientes', movimientos_stock: 'Movimientos de stock', sellos_extra: 'Historias y ajustes de sellos', productos: 'Productos', packs: 'Packs' };
  const pendientesDe = t => [...COLA].filter(k => k.startsWith(t + ':')).length;
  // estado general en una frase
  const est = !s ? ['off', 'sync', 'Solo en esta PC', 'Todo se guarda en esta computadora. Conéctate a Supabase para tener el respaldo en la nube.']
    : !navigator.onLine ? ['pend', 'alerta', 'Sin internet', `Sigues trabajando normal: ${COLA.size ? `${plural(COLA.size, 'cambio')} se subirán` : 'los cambios se subirán'} solos cuando vuelva la conexión.`]
    : sincronizando ? ['pend', 'sync', 'Sincronizando…', 'Subiendo los cambios a Supabase.']
    : ultimoError ? ['error', 'alerta', 'No se pudo sincronizar', ultimoError]
    : COLA.size ? ['pend', 'reloj', `${plural(COLA.size, 'cambio')} por subir`, 'Se suben solos en unos segundos.']
    : ['ok', 'sync', 'Todo respaldado en Supabase', CFG.ultima_sync ? `Última sincronización: ${new Date(CFG.ultima_sync).toLocaleString('es-PE')}` : ''];
  const tabs = [['conexion', 'sync', 'Conexión'], ['negocio', 'wa', 'WhatsApp y envíos'], ['datos', 'hoja', 'Datos y pruebas']];
  let cuerpo = '';
  if (sub === 'conexion') {
    cuerpo = `
    <div class="sync-hero ${est[0]}">
      <div class="sync-ic">${ic(est[1])}</div>
      <div style="flex:1;min-width:220px"><b>${h(est[2])}</b><span>${h(est[3])}</span></div>
      ${s ? `<div class="fila"><button class="btn prim" onclick="sincronizar(true)" ${sincronizando ? 'disabled' : ''}>Sincronizar ahora</button></div>` : ''}
    </div>
    <div class="sync-flujo">
      <div><span class="n">1</span><b>Guardas</b><small>Se graba al instante en esta PC, con o sin internet.</small></div>
      <div><span class="n">2</span><b>Cola</b><small>Cada cambio espera su turno para subir (${COLA.size} ahora).</small></div>
      <div><span class="n">3</span><b>Supabase</b><small>Se copia solo a la nube a los pocos segundos: ese es tu respaldo.</small></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>Qué hay guardado</h3>
        <table><thead><tr><th>Datos</th><th class="der">En esta PC</th><th class="der">Por subir</th></tr></thead><tbody>
        ${TABLAS.map(t => `<tr><td>${NOMBRES[t] || t}</td><td class="der num">${lista(t).length}</td><td class="der num">${pendientesDe(t) ? `<b style="color:var(--alerta)">${pendientesDe(t)}</b>` : '<span style="color:var(--ok)">✓</span>'}</td></tr>`).join('')}
        </tbody></table>
        <p class="suave" style="margin-bottom:0;font-size:13.5px">Internet: ${navigator.onLine ? '<b style="color:var(--ok)">con conexión</b>' : '<b style="color:var(--error)">sin conexión</b>'} · se revisa cada minuto y al volver la conexión.</p>
      </div>
      <div class="card"><h3>${s ? 'Cuenta de Supabase' : 'Conectar con Supabase'}</h3>
        ${s ? `<table><tbody>
            <tr><td>Usuario</td><td><b>${h(s.email)}</b></td></tr>
            <tr><td>Proyecto</td><td><span class="codigo" style="font-size:12.5px">${h(s.url.replace('https://', ''))}</span></td></tr>
            <tr><td>Catálogo para Meta</td><td><button class="btn mini" onclick="copiar('${h(urlFeed())}')">${ic('copiar')} Copiar link</button></td></tr>
          </tbody></table>
          <button class="btn peligro mini" style="margin-top:12px" onclick="desconectarSupabase()">Desconectar</button>` : `
          <p class="suave" style="margin-top:0">Entra con el usuario del negocio (creado en Supabase → <b>Authentication → Users</b>).</p>
          <div class="grid" style="gap:10px">
            <div class="campo"><label>Correo del usuario</label><input type="email" id="sb-email" autocomplete="username"></div>
            <div class="campo"><label>Contraseña</label><input type="password" id="sb-pass" autocomplete="current-password" onkeydown="if(event.key==='Enter')conectarSupabase()"></div>
          </div>
          <details style="margin-top:8px"><summary class="suave" style="cursor:pointer">Datos del proyecto</summary>
            <div class="grid" style="gap:10px;margin-top:8px">
              <div class="campo"><label>URL del proyecto</label><input type="url" id="sb-url" value="${h(SUPABASE_PROYECTO.url)}"></div>
              <div class="campo"><label>Clave publicable</label><input type="text" id="sb-anon" value="${h(SUPABASE_PROYECTO.anon)}"></div>
            </div></details>
          <p class="suave" style="font-size:13.5px">La contraseña no se guarda: solo se usa para iniciar la sesión.</p>
          <button class="btn prim" onclick="conectarSupabase()">Conectar y subir datos</button><div id="sb-msg" style="margin-top:10px"></div>`}
      </div>
    </div>`;
  } else if (sub === 'negocio') {
    cuerpo = `<div class="grid g2">
      <div class="card"><h3>${ic('wa')} WhatsApp</h3>
        <div class="campo"><label>Número del negocio (también es el link de los productos en Meta)</label>
          <input type="tel" value="${h(CFG.whatsapp || '')}" placeholder="Ej.: 51987654321" onchange="AJ.set('whatsapp',soloDigitos(this.value))"></div>
        <div class="campo" style="margin-top:10px"><label>Al tocar un botón de WhatsApp, abrir…</label>
          <select onchange="AJ.set('wa_modo',this.value)">
            ${[['app', 'WhatsApp de escritorio (aplicación)'], ['web', 'WhatsApp Web (navegador)'], ['elegir', 'Preguntar cada vez']].map(([k, t]) => `<option value="${k}" ${(CFG.wa_modo || 'app') === k ? 'selected' : ''}>${t}</option>`).join('')}
          </select></div>
        <div class="campo" style="margin-top:10px"><label>Datos de pago que van en los mensajes</label>
          <input type="text" value="${h(CFG.datos_pago || '')}" placeholder="Ej.: Yape o Plin al 987 654 321 (Piero S.)" onchange="AJ.set('datos_pago',this.value.trim())"></div>
        <button class="btn mini wa" style="margin-top:10px" onclick="abrirWhatsApp(CFG.whatsapp || '', 'Prueba del panel Mr. Peanut 🥜')">Probar</button>
      </div>
      <div class="card"><h3>${ic('camion')} Couriers y crédito B2B</h3>
        <p class="suave" style="margin-top:0">Las empresas de envío que aparecen en cada pedido. En el pedido también puedes elegir “Otro…”.</p>
        <div class="chips">${couriers().map((c, i) => `<span class="chip">${h(c)} <a href="#" onclick="AJ.quitarCourier(${i});return false" title="Quitar">✕</a></span>`).join('')}</div>
        <div class="fila" style="margin-top:10px"><input type="text" id="aj-courier" placeholder="Ej.: Cabify, Rappi, Olva" style="max-width:240px"><button class="btn" onclick="AJ.agregarCourier()">Agregar</button></div>
        <div class="campo" style="margin-top:14px;max-width:240px"><label>Días de crédito B2B por defecto</label><input type="number" min="1" value="${+CFG.dias_credito || 15}" onchange="AJ.set('dias_credito',+this.value||15)"></div>
      </div>
    </div>`;
  } else {
    const nPrueba = (CFG.prueba || []).filter(k => { const [t, id] = k.split(':'); const r = D[t]?.get(id); return r && !r.eliminado; }).length;
    cuerpo = `<div class="grid g2">
      <div class="card" style="grid-column:1/-1"><h3>${ic('bot')} Simulador de pruebas</h3>
        <p class="suave" style="margin-top:0">Un bot registra clientes, pedidos en todos los estados (por preparar, listo, en camino, entregado, cancelado y uno eliminado), pagos con voucher, referidos, regalo del Club, historia, VIP, nivel en pausa, Leyenda, empresas con factura y crédito vencido, e inventario por lotes. Usa las mismas pantallas que tú. Todo queda marcado como <span class="tag prueba">prueba</span> y ${conectado() ? '<b>se sube a Supabase</b>' : 'se guarda en esta PC'}; se borra con un clic.</p>
        <div class="fila">
          <select id="bot-vel" style="width:auto"><option value="lento">Ver paso a paso</option><option value="rapido">Rápido</option></select>
          <button class="btn prim" onclick="BOT.ejecutar()" ${BOT.corriendo ? 'disabled' : ''}>${ic('bot')} ${BOT.corriendo ? 'Simulando…' : 'Ejecutar simulación'}</button>
          ${nPrueba ? `<button class="btn peligro" onclick="BOT.borrar()" ${BOT.corriendo ? 'disabled' : ''}>${ic('basura')} Borrar datos de prueba (${nPrueba})</button>` : ''}
        </div>
        <div id="bot-log" class="bot-log" ${BOT.log.length || BOT.corriendo ? '' : 'hidden'}>${BOT.log.map(([t, c]) => `<div class="${c}">${h(t)}</div>`).join('')}</div>
      </div>
      <div class="card"><h3>${ic('descargar')} Copia de seguridad</h3>
        <p class="suave" style="margin-top:0">Descarga todo lo que hay en esta PC en un archivo. Sirve aunque no uses Supabase. Los vouchers no van en el respaldo.</p>
        <div class="fila"><button class="btn" onclick="exportarRespaldo()">Descargar respaldo</button>
          <label class="btn">Restaurar respaldo<input type="file" accept=".json" hidden onchange="importarRespaldo(this)"></label></div>
      </div>
      ${window.escritorio ? `<div class="card"><h3>Programa de escritorio</h3>
        <p class="suave" style="margin-top:0">El panel se actualiza solo desde GitHub: revisa al abrir y cada 30 minutos.</p>
        <p id="esc-version" class="suave">Versión…</p>
        <button class="btn" onclick="ESC.buscar(this)">Buscar actualizaciones</button> <span id="esc-msg" class="suave"></span>
      </div>` : `<div class="card"><h3>Instalar en esta computadora</h3>
        ${matchMedia('(display-mode: standalone)').matches ? '<div class="aviso ok">Ya está instalado como aplicación.</div>' : `
        <p class="suave" style="margin-top:0">Abre el panel en Chrome o Edge y usa el botón <b>Instalar</b> (arriba a la derecha) o el ícono ⊕ de la barra de direcciones. Queda en el menú Inicio y abre sin internet.</p>
        ${eventoInstalar ? '<button class="btn prim" onclick="instalar()">Instalar ahora</button>' : ''}`}
      </div>`}
      ${demo ? `<div class="card"><h3>Datos de ejemplo antiguos</h3><p class="suave" style="margin-top:0">Hay datos de ejemplo locales (no se suben a Supabase).</p><button class="btn peligro" onclick="borrarDemo()">Borrar datos de ejemplo</button></div>` : ''}
    </div>`;
  }
  $('#v-ajustes').innerHTML = `
    <div class="cab-vista"><div><h2>Sincronización y ajustes</h2><span class="suave">Todo se guarda primero en esta computadora y se respalda solo en Supabase.</span></div></div>
    <div class="subtabs" role="tablist">${tabs.map(([k, i, t]) => `<button role="tab" class="${sub === k ? 'activo' : ''}" aria-selected="${sub === k}" onclick="UI.ajustes='${k}';recordarVista();renderAjustes()">${ic(i)} ${t}</button>`).join('')}</div>
    ${cuerpo}`;
  ESC.pintar();
}
// Programa de escritorio (solo existe dentro del .exe).
const ESC = {
  async pintar() {
    const el = $('#esc-version'); if (!el || !window.escritorio) return;
    const v = await window.escritorio.version();
    el.innerHTML = `Programa <b>v${h(v.programa)}</b> · panel <b>${h(v.panel)}</b>`;
  },
  async buscar(btn) {
    btn.disabled = true; $('#esc-msg').textContent = 'Revisando GitHub…';
    $('#esc-msg').textContent = await window.escritorio.buscarActualizacion() || '';
    btn.disabled = false; ESC.pintar();
  },
};
const AJ = {
  async set(k, v) { CFG[k] = v; await guardarConfig(); toast('Guardado.'); },
  async agregarCourier() { const v = $('#aj-courier').value.trim(); if (!v) return; CFG.couriers = [...new Set([...couriers(), v])]; await guardarConfig(); renderAjustes(); },
  async quitarCourier(i) { const l = [...couriers()]; l.splice(i, 1); CFG.couriers = l.length ? l : null; await guardarConfig(); renderAjustes(); },
};
async function instalar() { if (!eventoInstalar) return; eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; $('#btn-instalar').classList.add('oculto'); render(); }

async function exportarRespaldo() {
  const datos = { app: 'mrpeanut-panel', version: 2, fecha: new Date().toISOString(), club: CFG.club || null, whatsapp: CFG.whatsapp || '', couriers: CFG.couriers || null, datos_pago: CFG.datos_pago || '' };
  for (const t of TABLAS) datos[t] = [...D[t].values()].filter(r => !r._demo);
  descargar(`respaldo-mrpeanut-${hoy()}.json`, JSON.stringify(datos, null, 1), 'application/json');
}
async function importarRespaldo(input) {
  const f = input.files?.[0]; if (!f) return;
  let datos; try { datos = JSON.parse(await f.text()); } catch { return alert('El archivo no es un respaldo válido.'); }
  if (datos.app !== 'mrpeanut-panel') return alert('El archivo no es un respaldo del panel Mr. Peanut.');
  if (!confirm('Se agregarán los registros del respaldo. Si un registro existe en ambos lados, se queda el más reciente. ¿Continuar?')) return;
  let n = 0;
  for (const t of TABLAS) {
    const cambios = [];
    for (const r of datos[t] || []) {
      if (t === 'pedidos') migrarPedido(r);
      if (t === 'clientes' && !r.tipo_cliente) r.tipo_cliente = 'persona';
      const local = D[t].get(r.id);
      if (!local || Date.parse(r.updated_at) > Date.parse(local.updated_at)) { D[t].set(r.id, r); cambios.push(r); }
    }
    if (cambios.length) {
      await idb.putMany(t, cambios);
      const cola = cambios.map(r => ({ clave: `${t}:${r.id}`, tabla: t, id: r.id }));
      await idb.putMany('cola', cola); cola.forEach(c => COLA.add(c.clave)); n += cambios.length;
    }
  }
  ['whatsapp', 'datos_pago', 'couriers'].forEach(k => { if (datos[k] && !CFG[k]) CFG[k] = datos[k]; });
  if (datos.club) { CFG.club = datos.club; CLUB = { ...CLUB_BASE, ...datos.club }; }
  await guardarConfig(); invalidar(); pintarEstado(); programarSync(); render();
  toast(`Respaldo restaurado: ${plural(n, 'registro')}.`);
}

// ---------- datos de ejemplo (no se sincronizan)
async function cargarDemo() {
  let semilla = 7; const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const elegir = a => a[Math.floor(rnd() * a.length)];
  const personas = [['Andrea', 'Salas', 'Miraflores'], ['Pedro', 'Quispe', 'Santiago de Surco'], ['Lucía', 'Ramos', 'San Borja'], ['Diego', 'Torres', 'Miraflores'], ['Valeria', 'Chávez', 'San Isidro'],
    ['Renzo', 'Huamán', 'La Molina'], ['Camila', 'Flores', 'Barranco'], ['José', 'Mendoza', 'Santiago de Surco'], ['María', 'Castillo', 'Jesús María'], ['Gonzalo', 'Rojas', 'Magdalena del Mar'],
    ['Fiorella', 'Vargas', 'San Miguel'], ['Martín', 'Paredes', 'Lince'], ['Ximena', 'Díaz', 'Miraflores'], ['Álvaro', 'Gutiérrez', 'Surquillo']];
  const perfil = [[12, 12, 'almendra'], [8, 16, 'mani'], [6, 20, 'chocomani'], [5, 25, 'crunchy'], [4, 30, 'mani'], [3, 35, 'almendra'], [3, 40, 'chocomani'], [2, 70, 'mani'], [2, 45, 'crunchy'], [1, 0, 'mani'], [1, 0, 'almendra'], [4, 22, 'mani'], [1, 0, 'chocomani'], [2, 80, 'crunchy']];
  const clientes = personas.map(([n, a, d], i) => ({ id: uid(), tipo_cliente: 'persona', nombre: n, apellido: a, distrito: d, celular: '9' + String(10000000 + Math.floor(rnd() * 89999999)), direccion: `Calle ${elegir(['Los Pinos', 'Las Flores', 'Arequipa', 'Larco', 'Benavides', 'Primavera'])} ${100 + i * 37}`, referencia: '', nivel_manual: null, notas: '', _demo: true }));
  clientes.forEach(c => { c.direccion_envio = c.direccion; c.correo = `${norm(c.nombre)}.${norm(c.apellido)}@correo.com`.replace(/\s+/g, ''); });
  clientes[1].referido_por = clientes[0].id; clientes[3].referido_por = clientes[0].id; clientes[6].referido_por = clientes[1].id; clientes[10].referido_por = clientes[0].id; clientes[12].referido_por = clientes[2].id;
  const empresas = [
    { nombre: 'Café Central', razon_social: 'Inversiones Café Central S.A.C.', ruc: '20601234567', contacto: 'Rosa Medina', tipo_negocio: 'Cafetería', distrito: 'Miraflores' },
    { nombre: 'FitZone Gym', razon_social: 'FitZone Perú E.I.R.L.', ruc: '20557654321', contacto: 'Carlos Ríos', tipo_negocio: 'Gimnasio', distrito: 'Santiago de Surco' },
    { nombre: 'Bodega Don Lucho', razon_social: '', ruc: '', contacto: 'Luis Pérez', tipo_negocio: 'Tienda / bodega', distrito: 'Lince' },
  ].map((e, i) => ({ id: uid(), tipo_cliente: 'empresa', apellido: '', codigo: '', celular: '9' + String(20000000 + Math.floor(rnd() * 79999999)), direccion: `Av. ${elegir(['Larco', 'Benavides', 'Arequipa'])} ${300 + i * 111}`, referencia: '', nivel_manual: null, notas: '', _demo: true, ...e }));
  empresas.forEach(c => { c.direccion_envio = c.direccion; });
  const packs = packsActivos();
  const pedidos = []; const ahora = Date.now();
  const iso = d => isoLocal(d);
  clientes.forEach((c, i) => {
    const [n, cada, fav] = perfil[i];
    let dia = cada ? Math.min(170, n * cada + Math.floor(rnd() * 10)) : Math.floor(rnd() * 20) + 2;
    if (i === 2 || i === 7 || i === 13) dia += 45;
    for (let k = 0; k < n; k++) {
      const fecha = new Date(ahora - dia * 86400000);
      const pk = elegir(packs.filter(p => p.tipo === 'mixto' && p.precio_oficial != null));
      const sab = Object.fromEntries(SABORES.map(s => [s.id, 0]));
      for (let j = 0; j < pk.frascos; j++) { let s = rnd() < 0.55 ? fav : elegir(SABORES).id; if (s === 'almendra' && sab.almendra >= pk.max_almendra) s = 'mani'; sab[s]++; }
      const nivel = k >= 5 ? 'vip' : 'oficial';
      const precio = precioPack(pk, nivel);
      const items = [{ tipo: 'pack', pack_id: pk.id, nombre: pk.nombre, frascos: pk.frascos, tipo_pack: pk.tipo, max_almendra: pk.max_almendra, precio, sabores: Object.fromEntries(Object.entries(sab).filter(([, v]) => v)) }];
      if (rnd() < 0.2) items.push({ tipo: 'suelto', sabor: fav, cantidad: 1, precio_unit: precioSuelto(fav) });
      const sub = items.reduce((a, it) => a + (it.precio ?? it.cantidad * it.precio_unit), 0);
      const ref = k === 0 && c.referido_por ? CLUB.desc_referido : 0;
      const total = sub - ref;
      const entrega = dia < 2 ? 'por_preparar' : dia < 4 ? 'preparado' : 'entregado';
      const modalidad = rnd() < 0.3 ? 'contra_entrega' : 'anticipado';
      const pagado = !(dia < 2 || (modalidad === 'contra_entrega' && entrega !== 'entregado'));
      const metodo = elegir(METODOS.slice(0, 3));
      pedidos.push({ id: uid(), numero: '', canal: 'b2c', cliente_id: c.id, fecha: iso(fecha), fecha_entrega: null, estado_entrega: entrega, anulado: false, modalidad_pago: modalidad, fecha_vencimiento: null, nivel_precio: nivel, items, subtotal: sub, descuento: ref, descuento_referido: ref, descuento_motivo: '', envio: 0, igv: 0, total,
        pagos: pagado ? [{ id: uid(), fecha: iso(fecha), monto: total, metodo, referencia: '', tiene_foto: false }] : [], metodo_pago: pagado ? metodo : '',
        courier: entrega !== 'por_preparar' ? { empresa: elegir(COURIERS_BASE), conductor: '', celular: '', placa: '', costo: '', seguimiento: '' } : null,
        comprobante: pagado && rnd() < 0.8 ? { tipo: 'boleta', numero: 'B001-' + String(100 + pedidos.length).padStart(8, '0'), fecha: iso(fecha) } : null, guia: null,
        direccion_envio: c.direccion_envio, referido_por: ref ? c.referido_por : null, notas: '', entregado_en: entrega === 'entregado' ? new Date(+fecha + 86400000).toISOString() : null, _demo: true });
      dia -= cada || 0; if (dia < 0) break;
    }
  });
  // B2B: pedidos con precio propio, factura, guía y crédito
  const b2b = [[0, 40, 24, 13.7, 'credito', true], [0, 12, 24, 13.7, 'credito', false], [1, 25, 30, 15.2, 'anticipado', true], [1, 3, 20, 15.2, 'credito', false], [2, 8, 12, 15.2, 'contra_entrega', false]];
  b2b.forEach(([ie, dias, cant, pu, mod, pagado]) => {
    const emp = empresas[ie]; const fecha = new Date(ahora - dias * 86400000);
    const items = [{ tipo: 'linea', producto_id: 'MP-MANI-150', nombre: 'Mantequilla de Maní Mr. Peanut 150 g', cantidad: cant, precio_unit: pu }];
    if (ie === 0) items.push({ tipo: 'linea', producto_id: null, nombre: 'Balde de mantequilla de maní 4 kg', cantidad: 2, precio_unit: 135 });
    const total = r2(items.reduce((a, l) => a + l.cantidad * l.precio_unit, 0));
    const entregado = dias > 2;
    pedidos.push({ id: uid(), numero: '', canal: 'b2b', cliente_id: emp.id, fecha: iso(fecha), fecha_entrega: null, estado_entrega: entregado ? 'entregado' : 'preparado', anulado: false, modalidad_pago: mod,
      fecha_vencimiento: mod === 'credito' ? sumarDias(iso(fecha), 15) : null, nivel_precio: null, items, subtotal: total, descuento: 0, descuento_referido: 0, descuento_motivo: '', envio: 0, igv: r2(total - total / 1.18), total,
      pagos: pagado ? [{ id: uid(), fecha: iso(fecha), monto: total, metodo: 'Transferencia', referencia: '', tiene_foto: false }] : [], metodo_pago: pagado ? 'Transferencia' : '',
      courier: { empresa: 'Entrega propia', conductor: '', celular: '', placa: '', costo: '', seguimiento: '' },
      comprobante: entregado ? { tipo: emp.ruc ? 'factura' : 'boleta', numero: (emp.ruc ? 'F001-' : 'B001-') + String(40 + pedidos.length).padStart(8, '0'), fecha: iso(fecha) } : null,
      guia: entregado ? { numero: 'T001-' + String(10 + pedidos.length).padStart(8, '0'), fecha: iso(fecha) } : null,
      direccion_envio: emp.direccion_envio, referido_por: null, notas: '', entregado_en: entregado ? new Date(+fecha + 86400000).toISOString() : null, _demo: true });
  });
  pedidos.forEach(p => { p.estado_pago = estadoPago(p); });
  pedidos.sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((p, i) => { p.numero = `${p.canal === 'b2b' ? 'EJ-E' : 'EJ-'}${String(i + 1).padStart(3, '0')}`; });
  const ahoraIso = new Date().toISOString();
  const marcar = r => ({ ...r, creado_en: r.creado_en || ahoraIso, updated_at: ahoraIso, eliminado: false });
  clientes.forEach(c => { c.codigo = generarCodigo(c.nombre, c.apellido, c.id); D.clientes.set(c.id, marcar(c)); });
  empresas.forEach(c => D.clientes.set(c.id, marcar(c)));
  pedidos.forEach(p => D.pedidos.set(p.id, marcar(p)));
  const movs = lista('productos').flatMap((pr, i) => [
    { id: uid(), producto_id: pr.id, tipo: 'entrada', cantidad: 150, lote: 'L-DEMO-01', fecha: iso(new Date(ahora - 240 * 86400000)), vence: iso(new Date(ahora + 10 * 86400000)), motivo: 'Inventario inicial', nota: '', _demo: true },
    { id: uid(), producto_id: pr.id, tipo: 'entrada', cantidad: 60 + i * 10, lote: 'L-DEMO-02', fecha: iso(new Date(ahora - 20 * 86400000)), vence: iso(new Date(ahora + 160 * 86400000)), motivo: 'Producción', nota: '', _demo: true },
  ]);
  movs.forEach(m => D.movimientos_stock.set(m.id, marcar(m)));
  await idb.putMany('movimientos_stock', movs.map(m => D.movimientos_stock.get(m.id)));
  const pAndrea = pedidos.find(p => p.cliente_id === clientes[0].id && p.estado_entrega === 'entregado');
  const extras = [{ id: uid(), cliente_id: clientes[0].id, tipo: 'resena', cantidad: 1, pedido_id: pAndrea?.id || null, red: 'ig_historia', link: '', nota: '@andrea.salas', fecha: pAndrea?.fecha || hoy(), _demo: true }];
  extras.forEach(s => D.sellos_extra.set(s.id, marcar(s)));
  await idb.putMany('clientes', [...clientes, ...empresas].map(c => D.clientes.get(c.id)));
  await idb.putMany('pedidos', pedidos.map(p => D.pedidos.get(p.id)));
  await idb.putMany('sellos_extra', extras.map(s => D.sellos_extra.get(s.id)));
  invalidar(); render(); toast('Datos de ejemplo cargados. Míralos en Pedidos, Clientes y Análisis.');
}
async function borrarDemo() {
  for (const t of TABLAS) { const ids = [...D[t].values()].filter(r => r._demo).map(r => r.id); ids.forEach(id => D[t].delete(id)); await idb.delMany(t, ids); }
  invalidar(); render(); toast('Datos de ejemplo borrados.');
}

// ==================================================================== SIMULADOR DE PRUEBAS
// Un "bot" que registra clientes, pedidos, pagos con voucher, inventario y actividad del Club
// usando las mismas funciones que usas tú (página del pedido, ficha del cliente, inventario).
// Todo lo que crea queda marcado como prueba (CFG.prueba) y se borra con un botón,
// también en Supabase. Los sellos, el stock y los referidos se recalculan solos.
let PRUEBA = null;
const esPrueba = (t, id) => { if (!PRUEBA) PRUEBA = new Set(CFG.prueba || []); return PRUEBA.has(`${t}:${id}`); };
const fuePrueba = (t, id) => esPrueba(t, id) || (CFG.prueba_borrados || []).includes(`${t}:${id}`);

const BOT = {
  corriendo: false, pausaMs: 350, nBoleta: 0, nFactura: 0, cel: 0,
  escribir(t, cls = '') {
    const el = $('#bot-log');
    if (el) { el.insertAdjacentHTML('beforeend', `<div class="${cls}">${h(t)}</div>`); el.scrollTop = el.scrollHeight; }
    BOT.log.push([t, cls]);
  },
  log: [],
  esperar(ms) { return new Promise(r => setTimeout(r, ms ?? BOT.pausaMs)); },
  hace: d => sumarDias(hoy(), -d),
  celular() { return '9' + String(BOT.cel++).padStart(8, '0'); },
  boleta() { return 'B001-' + String(900000 + ++BOT.nBoleta).padStart(8, '0'); },
  factura() { return 'F001-' + String(900000 + ++BOT.nFactura).padStart(8, '0'); },

  // Captura de voucher falsa (imagen) para probar la subida al bucket privado.
  async voucher(metodo, monto) {
    const cv = document.createElement('canvas'); cv.width = 360; cv.height = 560; const x = cv.getContext('2d');
    x.fillStyle = metodo === 'Plin' ? '#00a3b4' : metodo === 'Yape' ? '#742284' : '#1d4ed8'; x.fillRect(0, 0, 360, 560);
    x.fillStyle = '#fff'; x.textAlign = 'center';
    x.font = 'bold 30px sans-serif'; x.fillText(metodo, 180, 90);
    x.font = 'bold 56px sans-serif'; x.fillText(soles(monto), 180, 260);
    x.font = '20px sans-serif'; x.fillText('VOUCHER DE PRUEBA', 180, 340); x.fillText(new Date().toLocaleString('es-PE'), 180, 375);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.8));
    return new File([blob], 'voucher-prueba.jpg', { type: 'image/jpeg' });
  },
  async pago({ fecha, monto, metodo = 'Yape', ref = '' }) {
    $('#pg-fecha').value = fecha; $('#pg-monto').value = r2(monto); $('#pg-metodo').value = metodo; $('#pg-ref').value = ref;
    if (metodo !== 'Efectivo') { const dt = new DataTransfer(); dt.items.add(await BOT.voucher(metodo, monto)); $('#pg-foto').files = dt.files; }
    await PF.agregarPago();
  },

  // Arma un pedido paso a paso en la página del pedido y lo guarda.
  async pedido(o) {
    PF.abrir(null, o.cliente || null, o.canal || 'b2c');
    if (o.nuevo) {
      PF.nuevo();
      for (const [k, v] of Object.entries(o.nuevo)) if (k !== 'referido_por') PF.setN(k, v);
      if (o.nuevo.referido_por) await PF.fijarRef(o.nuevo.referido_por);
      PF.pintarCliente();
    }
    F.fecha = o.fecha || hoy();
    if (o.nivel) PF.nivel(o.nivel);
    for (const [packId, sab] of o.packs || []) {
      PF.agregarPack(packId); const i = F.packs.length - 1;
      if (F.packs[i] && F.packs[i].tipo_pack !== 'almendra') for (const [s, n] of Object.entries(sab || {})) for (let k = 0; k < n; k++) PF.sabor(i, s, 1);
    }
    for (const [s, n] of Object.entries(o.sueltos || {})) for (let k = 0; k < n; k++) PF.suelto(s, 1);
    for (const l of o.lineas || []) {
      PF.agregarLinea(l.producto_id || null); const i = F.lineas.length - 1;
      if (!l.producto_id) { PF.lin(i, 'nombre', l.nombre); PF.lin(i, 'costo_unit', l.costo); }
      PF.lin(i, 'cantidad', l.cantidad); PF.lin(i, 'precio_unit', l.precio);
    }
    PF.pintarItems();
    if (o.modalidad) PF.modalidad(o.modalidad);
    if (o.vence) F.fecha_vencimiento = o.vence;
    if (o.courier) {
      const c = o.courier;
      if (c.otro) { PF.cour('empresa', '__otro'); PF.courOtro(c.empresa); } else PF.cour('empresa', c.empresa);
      for (const k of ['conductor', 'celular', 'placa', 'costo']) if (c[k] != null) PF.cour(k, String(c[k]));
    }
    if (o.envioGratis) PF.asumeEnvio(true); else if (o.envio) F.envio = o.envio;
    if (o.descuento) { F._otroDesc = o.descuento; F.descuento_motivo = o.motivo || ''; }
    F.fecha_entrega = o.fechaEntrega || '';
    F.notas = 'Pedido de prueba (simulador)';
    PF.pintarEntrega(); PF.pintarPago(); PF.pintarResumen();
    await BOT.esperar();
    const total = PF.totales().total;
    for (const pg of o.pagos || []) await BOT.pago({ fecha: pg.fecha || F.fecha, monto: pg.monto === 'total' ? total : pg.monto, metodo: pg.metodo, ref: pg.ref });
    if (o.doc) { F.comprobante.tipo = o.doc; F.comprobante.numero = o.doc === 'factura' ? BOT.factura() : BOT.boleta(); F.comprobante.fecha = F.fecha; }
    if (o.guia) { F.guia.numero = 'T001-' + String(900000 + BOT.nFactura).padStart(8, '0'); F.guia.fecha = F.fecha; }
    if (o.estado) {
      await PF.estado(o.estado);
      if (o.estado === 'entregado') F.entregado_en = new Date(sumarDias(F.fecha, 1) + 'T18:00:00').toISOString();
    }
    PF.pintarDoc(); PF.pintarResumen();
    await BOT.esperar();
    const rec = await PF.guardar();
    if (!rec) throw new Error(`No se pudo guardar el pedido: ${$('#pf-errores')?.innerText || 'revisa los datos'}`);
    const R = rentabilidad(rec);
    BOT.escribir(`✓ ${rec.numero} · ${nombreCliente(D.clientes.get(rec.cliente_id))} · ${soles(rec.total)} · ${ESTADO_PED[estadoPed(rec)]} · ${PAGO[rec.estado_pago]} · gana ${soles(R.ganancia)} (${pct(R.margen)})`, 'ok');
    return rec;
  },

  async movimiento(tipo, pid, o) {
    INVF.abrir(tipo, pid);
    Object.assign(MF, { nota: 'Prueba (simulador)' }, o, { cantidad: String(o.cantidad) });
    INVF.pintar(); await BOT.esperar(BOT.pausaMs / 2);
    await INVF.guardar();
  },

  async ejecutar() {
    if (BOT.corriendo) return;
    if ((CFG.prueba || []).length && !confirm('Ya hay datos de prueba. ¿Agregar otra tanda? (Puedes borrarlos antes con “Borrar datos de prueba”.)')) return;
    BOT.pausaMs = $('#bot-vel')?.value === 'rapido' ? 0 : 350;
    BOT.corriendo = true; BOT.log = []; UI.ajustes = 'datos';
    const antes = new Set(TABLAS.flatMap(t => [...D[t].keys()].map(id => `${t}:${id}`)));
    const marcar = async () => {
      const nuevos = TABLAS.flatMap(t => [...D[t].keys()].map(id => `${t}:${id}`)).filter(k => !antes.has(k));
      CFG.prueba = [...new Set([...(CFG.prueba || []), ...nuevos])]; PRUEBA = null; await guardarConfig();
      return nuevos.length;
    };
    BOT.cel = 900100000 + Math.floor(Math.random() * 800000);
    BOT.nBoleta = Math.floor(Math.random() * 90000); BOT.nFactura = BOT.nBoleta;
    renderAjustes();
    const paso = t => BOT.escribir(`— ${t}`);
    const P = id => lista('productos').find(p => p.sabor === id)?.id;
    try {
      // 1. Inventario
      paso('Inventario: entradas por lote, una salida y un conteo');
      for (const s of SABORES) {
        const pid = P(s.id); if (!pid) continue;
        await BOT.movimiento('entrada', pid, { cantidad: s.id === 'almendra' ? 30 : 110, lote: 'L-PRUEBA-01', fecha: BOT.hace(280), vence: sumarDias(hoy(), 20), motivo: 'Inventario inicial' });
        await BOT.movimiento('entrada', pid, { cantidad: s.id === 'almendra' ? 12 : 60, lote: 'L-PRUEBA-02', fecha: BOT.hace(12), vence: sumarDias(BOT.hace(12), DIAS_VIDA), motivo: 'Producción' });
      }
      await BOT.movimiento('salida', P('mani'), { cantidad: 3, lote: '', fecha: BOT.hace(5), motivo: 'Muestra / degustación' });
      BOT.escribir('✓ Stock cargado en 2 lotes por sabor (el 01 vence en 20 días) · salida de 3 maní por degustación', 'ok');

      // 2. Clientes con historial (B2C)
      const H = (fecha, packs, extra = {}) => ({ fecha, packs, pagos: [{ monto: 'total', metodo: extra.metodo || 'Yape' }], doc: 'boleta', estado: 'entregado', courier: { empresa: 'InDriver', costo: 8 }, envio: 8, ...extra });
      paso('Andrea: 9 compras en 9 meses + una historia → llega a 10 sellos (regalo)');
      let r = await BOT.pedido({ nuevo: { nombre: 'Andrea', apellido: 'Salas', celular: BOT.celular(), distrito: 'Miraflores', direccion: 'Calle Los Pinos 120', correo: 'andrea.prueba@correo.com', referencia: 'Frente al parque' }, ...H(BOT.hace(235), [['PACK-3', { mani: 2, chocomani: 1 }]]) });
      const andrea = r.cliente_id;
      for (let d = 210; d >= 35; d -= 25) await BOT.pedido({ cliente: andrea, ...H(BOT.hace(d), [['PACK-3', { mani: 1, chocomani: 1, almendra: 1 }]], { metodo: d % 2 ? 'Plin' : 'Yape' }) });
      const ped = pedidosParaResena(andrea)[0];
      const err = await registrarResena(andrea, { red: 'ig_historia', pedido_id: ped?.id, nota: '@andrea.prueba' });
      BOT.escribir(err ? `✗ Historia: ${err}` : `✓ Historia de Instagram registrada para Andrea (+1 sello) · total ${statsDe(andrea).total} sellos`, err ? 'err' : 'ok');

      paso('Pedro llega referido por Andrea (descuento en su primer pack) y hace 5 compras → VIP');
      r = await BOT.pedido({ nuevo: { nombre: 'Pedro', apellido: 'Quispe', celular: BOT.celular(), distrito: 'Santiago de Surco', direccion: 'Av. Primavera 455', referido_por: andrea }, ...H(BOT.hace(150), [['PACK-2', { mani: 1, crunchy: 1 }]]) });
      const pedro = r.cliente_id;
      BOT.escribir(`  Descuento referido aplicado: ${soles(r.descuento_referido)} · Andrea ahora tiene ${statsDe(andrea).total} sellos`);
      for (const d of [120, 90, 62, 35]) await BOT.pedido({ cliente: pedro, ...H(BOT.hace(d), [['PACK-4', { mani: 2, crunchy: 1, chocomani: 1 }]]) });
      BOT.escribir(`  Pedro: ${statsDe(pedro).total} sellos · nivel ${NIVELES[statsDe(pedro).nivel]}`);

      paso('Diego: 5 compras hace meses → VIP en pausa (se le cobra oficial)');
      r = await BOT.pedido({ nuevo: { nombre: 'Diego', apellido: 'Torres', celular: BOT.celular(), distrito: 'San Borja', direccion: 'Jr. Las Magnolias 310' }, ...H(BOT.hace(260), [['PACK-2', { crunchy: 2 }]]) });
      for (const d of [230, 200, 170, 135]) await BOT.pedido({ cliente: r.cliente_id, ...H(BOT.hace(d), [['PACK-2', { crunchy: 1, mani: 1 }]]) });
      BOT.escribir(`  Diego: ${statsDe(r.cliente_id).total} sellos · ${statsDe(r.cliente_id).pausa ? 'nivel en pausa' : 'activo'}`);

      paso('Valeria: cliente creada desde su ficha con nivel Leyenda fijado a mano');
      CLI.abrir(null, 'persona');
      Object.assign(CF, { nombre: 'Valeria', apellido: 'Chávez', celular: BOT.celular(), distrito: 'San Isidro', direccion: 'Av. Camino Real 890', correo: 'valeria.prueba@correo.com', nivel_manual: 'leyenda', _mismaDir: true, notas: 'Cliente de prueba (simulador)' });
      await BOT.esperar(); await CLI.guardar(false);
      const valeria = CF.id;
      BOT.escribir(`✓ Valeria registrada · código ${D.clientes.get(valeria).codigo} · nivel Leyenda (fijado)`, 'ok');

      // 3. Pedidos actuales en todos los estados
      paso('Pedidos de esta semana en todos los estados');
      const a = D.clientes.get(andrea); a.regalo_agendado = true; await guardar('clientes', a);
      BOT.escribir('  Regalo de Andrea agendado para su próxima compra');
      await BOT.pedido({ cliente: andrea, fecha: BOT.hace(1), packs: [['PACK-3', { mani: 2, chocomani: 1 }]], pagos: [{ monto: 'total', metodo: 'Yape' }], doc: 'boleta', estado: 'preparado', courier: { empresa: 'InDriver', costo: 10 }, envio: 8, fechaEntrega: hoy() });
      await BOT.pedido({ cliente: pedro, fecha: hoy(), packs: [['PACK-5', { mani: 2, crunchy: 1, chocomani: 1, almendra: 1 }]], modalidad: 'contra_entrega', estado: 'en_camino', courier: { empresa: 'Uber', conductor: 'Jorge Ramírez', celular: '987111222', placa: 'ABC-123', costo: 12 }, envio: 10, fechaEntrega: hoy() });
      await BOT.pedido({ nuevo: { nombre: 'Lucía', apellido: 'Ramos', celular: BOT.celular(), distrito: 'Barranco', direccion: 'Av. Grau 222', referido_por: andrea }, fecha: hoy(), packs: [['PACK-2', { mani: 1, chocomani: 1 }]], estado: 'por_preparar', envio: 8, fechaEntrega: sumarDias(hoy(), 1) });
      await BOT.pedido({ nuevo: { nombre: 'Camila', apellido: 'Flores', celular: BOT.celular(), distrito: 'Jesús María', direccion: 'Av. Salaverry 1500' }, fecha: BOT.hace(1), packs: [['PACK-3', { crunchy: 2, almendra: 1 }]], pagos: [{ monto: 20, metodo: 'Plin' }], estado: 'preparado', envio: 8, courier: { empresa: 'InDriver', costo: 9 } });
      await BOT.pedido({ cliente: valeria, fecha: BOT.hace(2), packs: [['PACK-ALM-2']], envioGratis: true, courier: { empresa: 'Entrega propia', costo: 10 }, pagos: [{ monto: 'total', metodo: 'Plin' }], doc: 'boleta', estado: 'entregado' });
      await BOT.pedido({ nuevo: { nombre: 'Ximena', apellido: 'Díaz', celular: BOT.celular(), distrito: 'Lince', direccion: 'Jr. Risso 330' }, fecha: BOT.hace(3), sueltos: { mani: 2 }, pagos: [{ monto: 'total', metodo: 'Efectivo' }], doc: 'boleta', estado: 'entregado', envio: 6, courier: { empresa: 'Motorizado del barrio', otro: true, costo: 6 } });
      BOT.escribir('  Ximena compró frascos sueltos: no suma sello (regla del Club)');

      paso('Martín: el pedido avanza de estado paso a paso desde la lista');
      r = await BOT.pedido({ nuevo: { nombre: 'Martín', apellido: 'Paredes', celular: BOT.celular(), distrito: 'Magdalena del Mar', direccion: 'Av. Brasil 3100' }, fecha: BOT.hace(2), packs: [['PACK-4', { mani: 2, chocomani: 2 }]], descuento: 5, motivo: 'Cortesía por demora', pagos: [{ monto: 'total', metodo: 'Tarjeta' }], estado: 'por_preparar', envio: 8, courier: { empresa: 'InDriver', costo: 8 } });
      for (const e of ['preparado', 'en_camino', 'entregado']) { await BOT.esperar(); await aplicarEstado(D.pedidos.get(r.id), e); BOT.escribir(`  ${r.numero} → ${ESTADO_PED[e]}`); }
      BOT.escribir(`  Martín: ${statsDe(r.cliente_id).total} sello (pagado y entregado)`);

      paso('Renzo: pedido cancelado · Gonzalo: pedido eliminado (se devuelven sello y stock)');
      r = await BOT.pedido({ nuevo: { nombre: 'Renzo', apellido: 'Huamán', celular: BOT.celular(), distrito: 'La Molina', direccion: 'Calle Las Lomas 45' }, fecha: BOT.hace(4), packs: [['PACK-2', { mani: 2 }]], pagos: [{ monto: 'total', metodo: 'Yape' }], estado: 'preparado' });
      await aplicarEstado(D.pedidos.get(r.id), 'cancelado', { preguntar: false });
      BOT.escribir(`  ${r.numero} → Cancelado (no cuenta como venta)`);
      r = await BOT.pedido({ nuevo: { nombre: 'Gonzalo', apellido: 'Rojas', celular: BOT.celular(), distrito: 'San Miguel', direccion: 'Av. La Marina 2000' }, fecha: BOT.hace(6), packs: [['PACK-2', { chocomani: 2 }]], pagos: [{ monto: 'total', metodo: 'Yape' }], doc: 'boleta', estado: 'entregado' });
      const gonzalo = r.cliente_id; const stockAntes = stockDe(P('chocomani'));
      BOT.escribir(`  Gonzalo tiene ${statsDe(gonzalo).total} sello · stock chocomaní ${stockAntes}`);
      await eliminarPedido(D.pedidos.get(r.id), { preguntar: false });
      invalidar();
      BOT.escribir(`✓ Pedido ${r.numero} eliminado → Gonzalo vuelve a ${statsDe(gonzalo).total} sellos · stock chocomaní ${stockDe(P('chocomani'))}`, 'ok');

      // 4. Empresas (B2B)
      paso('Empresas: crédito vencido con factura, pago anticipado, contra entrega con courier “Otro”');
      await BOT.pedido({ canal: 'b2b', nuevo: { nombre: 'Café Central', razon_social: 'Inversiones Café Central S.A.C.', ruc: '20601234567', contacto: 'Rosa Medina', tipo_negocio: 'Cafetería', celular: BOT.celular(), distrito: 'Miraflores', direccion: 'Av. Larco 345' },
        fecha: BOT.hace(25), lineas: [{ producto_id: P('mani'), cantidad: 24, precio: 13.7 }], modalidad: 'credito', vence: BOT.hace(10), doc: 'factura', guia: true, estado: 'entregado', courier: { empresa: 'Entrega propia', costo: 15 } });
      await BOT.pedido({ canal: 'b2b', nuevo: { nombre: 'FitZone Gym', razon_social: 'FitZone Perú E.I.R.L.', ruc: '20557654321', contacto: 'Carlos Ríos', tipo_negocio: 'Gimnasio', celular: BOT.celular(), distrito: 'Santiago de Surco', direccion: 'Av. Benavides 4400' },
        fecha: BOT.hace(10), lineas: [{ producto_id: P('chocomani'), cantidad: 12, precio: 15.2 }, { nombre: 'Balde de mantequilla de maní 4 kg', costo: 70, cantidad: 2, precio: 135 }], modalidad: 'anticipado', pagos: [{ monto: 'total', metodo: 'Transferencia', ref: 'OP-778812' }], doc: 'factura', guia: true, estado: 'entregado', courier: { empresa: 'Entrega propia', costo: 15 } });
      await BOT.pedido({ canal: 'b2b', nuevo: { nombre: 'Bodega Don Lucho', contacto: 'Luis Pérez', tipo_negocio: 'Tienda / bodega', celular: BOT.celular(), distrito: 'Lince', direccion: 'Jr. Manuel Candamo 520' },
        fecha: hoy(), lineas: [{ producto_id: P('mani'), cantidad: 12, precio: 15.2 }, { producto_id: P('crunchy'), cantidad: 6, precio: 15.5 }], modalidad: 'contra_entrega', doc: 'boleta', estado: 'en_camino', courier: { empresa: 'Motorizado del barrio', otro: true, conductor: 'Juan', costo: 12 } });

      // 5. Conteo de inventario al final (el sistema ya descontó los pedidos)
      const pc = P('chocomani'); const L = inventario().lotes[`${pc}|L-PRUEBA-02`];
      if (L) { await BOT.movimiento('ajuste', pc, { lote: 'L-PRUEBA-02', cantidad: L.queda - 2, fecha: hoy(), motivo: 'Conteo físico' }); BOT.escribir(`✓ Conteo de chocomaní lote 02: faltaban 2 frascos → ajuste −2`, 'ok'); }

      const n = await marcar();
      BOT.escribir(`Listo: ${plural(n, 'registro')} de prueba. Revisa Pedidos, Clientes, Club e Inventario.${conectado() ? ' Se están subiendo a Supabase.' : ''}`, 'ok');
      toast('Simulación terminada.', 4000);
    } catch (e) {
      await marcar();
      BOT.escribir('✗ ' + (e.message || e), 'err');
      toast('La simulación se detuvo: ' + (e.message || e), 6000);
    } finally {
      BOT.corriendo = false; invalidar();
      if ($('#v-pagina').innerHTML) volver();
      ir('ajustes');
    }
  },

  async borrar() {
    const claves = (CFG.prueba || []).filter(k => { const [t, id] = k.split(':'); const r = D[t]?.get(id); return r && !r.eliminado; });
    if (!claves.length) { CFG.prueba = []; await guardarConfig(); return toast('No hay datos de prueba.'); }
    if (!confirm(`¿Borrar los ${claves.length} registros de prueba (clientes, pedidos, stock e historias)? También se borran en Supabase.`)) return;
    for (const k of claves) { const [t, id] = k.split(':'); await eliminar(t, id); }
    CFG.prueba_borrados = [...new Set([...(CFG.prueba_borrados || []), ...(CFG.prueba || [])])];
    CFG.prueba = []; PRUEBA = null; await guardarConfig();
    invalidar(); render(); toast(`${plural(claves.length, 'registro')} de prueba borrados.`);
  },
};

// ==================================================================== ARRANQUE
async function arrancar() {
  try { await iniciarDatos(); }
  catch (e) { document.querySelector('main').innerHTML = `<div class="aviso error">No se pudo abrir la base de datos local: ${h(e.message)}. Abre el panel desde Chrome o Edge (no en modo incógnito).</div>`; return; }
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-vista]'); if (b) ir(b.dataset.vista); });
  $('#btn-notif').addEventListener('click', e => { e.stopPropagation(); cerrarMas(); $('#panel-notif').classList.toggle('abierto'); pintarCampana(); });
  document.addEventListener('click', e => { if (!e.target.closest('#notif-caja')) cerrarNotif(); });
  $('#btn-mas').addEventListener('click', e => { e.stopPropagation(); const m = $('#menu-mas'); m.classList.toggle('abierto'); $('#btn-mas').setAttribute('aria-expanded', m.classList.contains('abierto')); });
  document.addEventListener('click', e => { if (!e.target.closest('#tabs-mas')) cerrarMas(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrarMas(); cerrarNotif(); } });
  let _rz; window.addEventListener('resize', () => { cancelAnimationFrame(_rz); _rz = requestAnimationFrame(acomodarMenu); });
  document.fonts?.ready.then(acomodarMenu);
  new MutationObserver(() => etiquetarTablas($('main'))).observe($('main'), { childList: true, subtree: true });
  $('#estado-sync').addEventListener('click', () => ir('ajustes'));
  $('#btn-instalar').addEventListener('click', instalar);
  window.addEventListener('online', () => { pintarEstado(); sincronizar(false); });
  window.addEventListener('offline', pintarEstado);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); eventoInstalar = e; $('#btn-instalar').classList.remove('oculto'); });
  setInterval(() => { if (conectado() && navigator.onLine) sincronizar(false); }, 60000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.escritorio) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  pintarEstado(); acomodarMenu();
  const v0 = vistaGuardada(); if (v0 && v0 !== UI.vista) ir(v0); else render();
  window.addEventListener('hashchange', () => { const v = vistaGuardada(); if (v) ir(v); });
  sincronizar(false);
}
arrancar();
