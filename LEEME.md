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
| **Productos y promociones** | Precios sueltos, packs por nivel, baldes, fotos y el link del catálogo para Meta. |

## Baldes (1 y 4 kg)

- Son productos con **Formato: Balde** (los frascos de 150 g son los que usan packs, sueltos y regalos). Se crean con **＋ Balde** y salen en su propia sección.
- Vienen **ocultos del catálogo de Meta / WhatsApp Business** (casilla “Mostrar en el catálogo de Meta” desmarcada). Cualquier producto se puede ocultar igual.
- **Consumidores (B2C)**: botones “＋ Balde…” en el pedido, al precio del balde (igual para Oficial, VIP y Leyenda). No suman sello.
- **Empresas (B2B)**: precio por tramo según cuántos baldes lleva, con IGV: Comercial (1 a 3), Mayorista (4 a 6), Distribuidor (7 a 9) y Exclusivo (10 o más). Se configura en la ficha del balde; si un tramo está vacío usa el anterior o el precio del balde. Al cambiar la cantidad el precio se ajusta solo; si lo escribes a mano se respeta.
- Descuentan stock de su propio producto en Inventario. Solo avisan stock bajo si les pones un mínimo.
| **Inventario** | Stock por producto y **por lote**. Entradas (con n.° de lote y vencimiento), salidas con motivo y conteos. Cada pedido descuenta solo, del lote que vence primero. |
| **Sincronización** | Supabase, WhatsApp (número, escritorio o Web, datos de pago), couriers, días de crédito, respaldo y datos de ejemplo. |

## Clientes

- **Nombres**: al guardar, nombre, apellido y persona de contacto quedan con mayúscula inicial (“adriana anaya” → “Adriana Anaya”).
- **Sin repetidos**: no se puede registrar a una persona con el mismo nombre y apellido, ni con un celular que ya existe; el panel ofrece usar la ficha existente.
- **Unir con otro cliente** (en la ficha): si alguien quedó registrado dos veces, pasa sus pedidos, sellos y referidos a la otra ficha y elimina la repetida.
- **Eliminar**: desde la ficha o con el ícono de basura en la lista. Los pedidos se conservan.
- **Cambiar cliente de un pedido**: en un pedido ya guardado, **Cambiar cliente** lo pasa a otra ficha sin tocar los precios cobrados.
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
- **Al entrar a Pedidos** se ven todos los pedidos del mes, sin filtros: B2C y B2B, en cualquier estado (también canjes entregados que falta publicar). La lista muestra el monto, no el detalle de mantequillas (está dentro del pedido).
- **Columna Fechas** (en la lista): fecha del pedido, fecha de entrega (✓ si ya se entregó, la programada si no) y, en el último pedido de cada cliente, la fecha de su **siguiente pedido**.
- **Siguiente pedido** = último pedido + cada cuánto compra. Se elige en la ficha del cliente (*Recordarme su siguiente pedido*: cada 2 o 3 semanas, cada mes… o no recordar). En automático usa su propio ritmo si ya compró 2+ veces; si no, la *frecuencia esperada* de Análisis (30 días).
- Cuando llega esa fecha (y su último pedido ya se entregó) sale el aviso **Escribirle a…** en la campana y en Inicio, con un mensaje de WhatsApp listo. El filtro **Toca escribirle** muestra a todos.
- **Eliminar pedido**: lo borra y se recalculan solos los sellos, el regalo usado, el referido y el stock.
- Toda la fila de la tabla (pedidos y clientes) abre el detalle.
- **Voucher opcional**: puedes adjuntar la captura del pago (Yape, Plin, transferencia, tarjeta) o registrar el pago sin ella.
- **Celular**: puedes pegarlo tal cual desde WhatsApp (“+51 987 654 321”); se guarda solo con los 9 dígitos. También sirve pegado en los buscadores.
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

Reglas fijas: un pedido B2C con pack, **pagado y entregado**, suma 1 sello (los frascos sueltos y el B2B no suman). El amigo referido da +1 sello cuando su primer pack queda pagado y entregado. Las historias y reseñas las registra el encargado a mano; el pedido es opcional (para clientas antiguas sin compra registrada se elige “Sin pedido”), y si se elige uno, es 1 historia por pedido.

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
