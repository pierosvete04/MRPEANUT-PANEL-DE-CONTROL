# Mr. Peanut · Panel de control

Panel para registrar pedidos, clientes y el Club Mr. Peanut. **Funciona sin internet**: todo se guarda
primero en la computadora y, cuando hay conexión, se sube solo a Supabase.

## Pestañas

Todo es HTML, CSS y JavaScript plano (sin frameworks ni instalación). Crear o editar abre una página dentro del panel, nunca una ventana flotante. Es responsive: si las pestañas no entran, las que sobran pasan al botón **Más**; en celular las tablas se ven como tarjetas. Los filtros son listas desplegables. Colores, logo, patrón y fuentes salen de `BRANDING/` (paleta oficial, encabezado celeste).

| Pestaña | Qué hace |
|---|---|
| **Inicio** | Dashboard: ventas de hoy y del mes, por cobrar, por entregar, stock; entregas pendientes y lo que hay que revisar (stock bajo, lotes por vencer, créditos vencidos, ventas sin boleta, regalos, clientes que no compran). |
| **Pedidos** | Un solo lugar para **B2C** (consumidores, con Club) y **B2B** (empresas). El **pago** y la **entrega** se siguen por separado. Cada pedido tiene courier (con conductor, placa y seguimiento), pagos con voucher, boleta (B2C) o factura/boleta + guía de remisión (B2B) y un botón de **WhatsApp** con el mensaje de su etapa. |
| **Clientes** | Personas (tarjeta de sellos, nivel y código de referido) y empresas (RUC, contacto, lo que deben). |
| **Análisis de clientes** | Ventas, ticket, recompra, sabores, mejores clientes, quién dejó de comprar, B2C vs B2B y análisis por cliente. |
| **Club Mr. Peanut** | Registrar historias o reseñas (+1 sello, a mano), regalos por entregar, cerca de VIP, referidos y las **variables del Club** (editables). |
| **Productos y promociones** | Precios sueltos, packs por nivel, fotos y el link del catálogo para Meta. |
| **Inventario** | Stock por producto y **por lote**. Entradas (con n.° de lote y vencimiento), salidas con motivo y conteos. Cada pedido descuenta solo, del lote que vence primero. |
| **Sincronización** | Supabase, WhatsApp (número, escritorio o Web, datos de pago), couriers, días de crédito, respaldo y datos de ejemplo. |

## Clientes

- **Distrito**: lista desplegable (43 distritos de Lima, 7 del Callao y “Provincia”).
- **Correo**: opcional, se valida el formato.
- **Dirección de envío**: al crear un cliente es la misma que la dirección, salvo que desmarques “Es la misma dirección”.
- **Referido por**: se elige en la ficha (código PEANUT-… o nombre) antes de su primera compra. En su primer pedido con pack se aplica solo el descuento y su amigo gana 1 sello cuando ese pedido queda pagado y entregado.

## Notificaciones (campana)

- Un cliente llega a 10, 20, 30… sellos → “le toca su mantequilla de regalo”, con **Agendar para su próxima compra** y **Avisarle por WhatsApp**.
- Si está agendado, el regalo se agrega solo al crear su siguiente pedido.
- También avisa entregas para hoy o atrasadas, créditos vencidos y stock bajo. Las nuevas salen además en Inicio.
- Dentro de cada pedido siempre se ven los avisos del cliente: regalo por usar, referido y descuento, si con este pedido pasa a VIP o completa 10 sellos, y si su nivel está en pausa.

## Simulador de pruebas

**Sincronización → Datos y pruebas → Ejecutar simulación**: un bot usa las mismas pantallas del panel para registrar
~30 pedidos (todos los estados, pagos con voucher, referidos, regalo, historia, VIP, pausa, Leyenda, B2B con factura y
crédito vencido) e inventario por lotes. Todo queda con la etiqueta *prueba*, se sube a Supabase y se borra con
**Borrar datos de prueba** (también en Supabase). Al borrarlos, sus códigos PEANUT-… quedan libres.

## Pedidos: estados

- **Pago** (se calcula solo con los pagos registrados): Pendiente → Parcial → Pagado. Modalidad: *Paga antes*, *Contra entrega* o *Crédito* (solo B2B, con fecha de vencimiento).
- **Estado** (lista desplegable en la tabla y arriba del pedido, se guarda al elegir): Por preparar → Listo para enviar → En camino → Entregado, o **Cancelado**.
- **Eliminar pedido**: lo borra y se recalculan solos los sellos, el regalo usado, el referido y el stock.
- Toda la fila de la tabla (pedidos y clientes) abre el detalle.
- **Voucher obligatorio** para Yape, Plin, transferencia y tarjeta; el efectivo va sin voucher.
- B2B: los precios se escriben en cada pedido **con IGV** y el panel desglosa op. gravada e IGV. Para registrar una factura la empresa necesita RUC.

## Mensajes de WhatsApp según la etapa

| Etapa | Mensaje sugerido |
|---|---|
| Recién creado | Confirmar pedido (detalle, total, cómo pagar) |
| Pago completo | Pago recibido (+ boleta si ya está) |
| Pago parcial | Falta un saldo |
| Listo para enviar | "Tu pedido ya está listo, te lo llevamos a…, ¿nos confirmas?" |
| En camino | Datos del courier, conductor y placa |
| Entregado | B2C: gracias + sellos + código de referido · B2B: entrega confirmada con factura y guía |
| Entregado con saldo o crédito vencido | Recordar pago |

Se puede elegir otro mensaje y editar el texto antes de enviarlo.

## Club Mr. Peanut: variables

| Variable | Valor | Qué hace |
|---|---|---|
| Sellos para VIP | 5 | Desde aquí es VIP… |
| Compras propias mínimas para VIP | 3 | …si al menos 3 sellos son por compras |
| Sellos para Leyenda | 50 | Mejor precio |
| Regalo cada | 10 sellos | 1 mantequilla del sabor que quiera |
| Descuento al amigo referido | S/3 | En su primer pack |
| Días sin comprar para pausa | 60 | Su siguiente pedido se cobra a precio oficial |
| Tope de packs Leyenda por semana | 2 | Solo avisa |
| Historias/reseñas que suman por mes | 1 | 0 = sin límite |
| Historia debe ser de un pedido entregado | Sí | 1 historia por pedido |

Reglas fijas: un pedido B2C con pack, **pagado y entregado**, suma 1 sello (los frascos sueltos y el B2B no suman). El amigo referido da +1 sello cuando su primer pack queda pagado y entregado. Las historias y reseñas las registra el encargado a mano.

## Abrirlo e instalarlo

El panel necesita abrirse desde una dirección web (no con doble clic en el archivo) para poder instalarse:

- **Recomendado:** publicar esta carpeta en Vercel (como el centro de costos) y abrir el link en Chrome o Edge.
  Los datos no viajan con la página: quedan en la PC y en Supabase, protegidos con usuario y contraseña.
- **Solo local:** con Python instalado, en esta carpeta: `python -m http.server 8790` y abrir `http://localhost:8790`.

Luego, en Chrome/Edge: botón **⬇ Instalar** (arriba a la derecha) o el ícono ⊕ de la barra de direcciones.
Queda en el menú Inicio y abre sin internet.

> Importante: los datos locales viven en el navegador de esa PC. No borres los "datos de sitios" del
> navegador. Usa **Sincronización → Descargar respaldo** de vez en cuando si todavía no usas Supabase.

## Supabase (respaldo automático)

Cómo funciona: **todo se guarda primero en la PC** (IndexedDB) y queda en una cola; a los 2–3 segundos se
copia solo a Supabase. Sin internet se acumula ("N por subir") y se sube al volver la conexión
(también reintenta cada minuto).

- Proyecto: `ymvfbpckxegnssvjsrzt` (https://ymvfbpckxegnssvjsrzt.supabase.co). Las tablas, la seguridad (RLS),
  los buckets y la función `catalogo-meta` ya están creados. La URL y la clave publicable ya vienen en el panel.
- **Seguridad**: solo los correos de la tabla `equipo` pueden leer o escribir; tener cuenta no basta.
  Para dar acceso a alguien más (SQL Editor):
  `insert into public.equipo (email, nombre) values ('correo@ejemplo.com', 'Nombre');`
- Para entrar: crea el usuario en **Authentication → Users → Add user** (con el mismo correo que está en `equipo`)
  y en el panel: **Sincronización** → correo y contraseña → *Conectar y subir datos*.

## Catálogo de Meta

1. La función ya está publicada.
2. En el panel pon el **WhatsApp del negocio** (Sincronización). El link del catálogo aparece en
   *Productos y promociones*, algo como `https://xxxx.supabase.co/functions/v1/catalogo-meta?wa=51987654321`.
3. Meta Business Suite → Commerce Manager → Catálogo → **Orígenes de datos → Fuente de datos programada**
   → pega el link, frecuencia **cada hora**, moneda PEN.

Solo se publica el precio **Oficial**. Los precios VIP y Leyenda se aplican al registrar el pedido.
Sin Supabase, puedes usar *Descargar CSV para Meta* y subirlo a mano.

## Archivos

- `index.html`, `styles.css`, `app.js`: el panel (las reglas están arriba de `app.js`).
- `sw.js` + `manifest.webmanifest`: lo que lo hace instalable y usable sin internet. Si cambias archivos,
  sube `VERSION` en `sw.js`.
- `supabase/schema.sql`: tablas (incluye inventario), seguridad, bucket público de fotos y bucket privado de vouchers. Se puede volver a correr: agrega lo nuevo sin borrar datos.
- `supabase/functions/catalogo-meta/index.ts`: genera el catálogo para Meta.
