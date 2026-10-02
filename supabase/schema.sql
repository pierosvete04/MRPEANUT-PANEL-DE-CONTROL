-- =====================================================================
-- Mr. Peanut · Panel de control — base de datos en Supabase
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr varias veces.
-- Las columnas deben coincidir con COLUMNAS en app.js.
-- =====================================================================

create table if not exists public.productos (
  id text primary key,
  nombre text not null,
  sabor text,
  descripcion text,
  precio numeric(10,2) not null default 0,
  disponible boolean not null default true,
  en_catalogo boolean not null default true,
  imagen_url text,
  orden int default 0,
  creado_en timestamptz default now(),
  updated_at timestamptz not null default now(),
  eliminado boolean not null default false
);

create table if not exists public.packs (
  id text primary key,
  nombre text not null,
  frascos int not null,
  tipo text not null default 'mixto',          -- mixto | almendra
  max_almendra int not null default 1,
  precio_oficial numeric(10,2),                -- el único que se publica en Meta
  precio_vip numeric(10,2),
  precio_leyenda numeric(10,2),
  descripcion text,
  activo boolean not null default true,
  en_catalogo boolean not null default true,
  imagen_url text,
  orden int default 0,
  creado_en timestamptz default now(),
  updated_at timestamptz not null default now(),
  eliminado boolean not null default false
);

create table if not exists public.clientes (
  id uuid primary key,
  tipo_cliente text not null default 'persona', -- persona (B2C) | empresa (B2B)
  codigo text,                                 -- código de referido: PEANUT-NOMBRE (solo personas)
  nombre text not null,                        -- persona: nombre · empresa: nombre comercial
  apellido text,
  razon_social text,
  ruc text,
  contacto text,                               -- empresa: persona de contacto
  tipo_negocio text,
  correo text,
  regalo_agendado boolean not null default false, -- el regalo del Club se agrega solo en su próxima compra
  celular text,
  direccion text,
  distrito text,
  direccion_envio text,
  referencia text,
  referido_por uuid,                           -- cliente que lo refirió
  nivel_manual text,                           -- null = automático por sellos
  notas text,
  creado_en timestamptz default now(),
  updated_at timestamptz not null default now(),
  eliminado boolean not null default false
);

create table if not exists public.pedidos (
  id uuid primary key,
  numero text,
  canal text not null default 'b2c',           -- b2c | b2b
  cliente_id uuid,
  fecha date not null,
  fecha_entrega date,
  estado_entrega text not null default 'por_preparar', -- por_preparar | preparado | en_camino | entregado
  estado_pago text not null default 'pendiente',       -- pendiente | parcial | pagado | anulado (se calcula de pagos)
  anulado boolean not null default false,
  modalidad_pago text default 'anticipado',    -- anticipado | contra_entrega | credito
  fecha_vencimiento date,                      -- solo crédito B2B
  nivel_precio text,                           -- oficial | vip | leyenda (B2C)
  items jsonb not null default '[]',           -- packs con sabores, sueltos, regalos o líneas B2B
  subtotal numeric(10,2) default 0,
  descuento numeric(10,2) default 0,
  descuento_referido numeric(10,2) default 0,
  descuento_motivo text,
  envio numeric(10,2) default 0,
  igv numeric(10,2) default 0,                 -- B2B: IGV incluido en el total
  total numeric(10,2) default 0,
  pagos jsonb not null default '[]',           -- [{fecha, monto, metodo, referencia, foto_path}]
  metodo_pago text,
  courier jsonb,                               -- {empresa, conductor, celular, placa, costo, seguimiento}
  comprobante jsonb,                           -- {tipo: boleta|factura, numero, fecha}
  guia jsonb,                                  -- guía de remisión {numero, fecha}
  direccion_envio text,
  referido_por uuid,
  notas text,
  entregado_en timestamptz,
  creado_en timestamptz default now(),
  updated_at timestamptz not null default now(),
  eliminado boolean not null default false
);

-- Sellos que no vienen de un pedido: reseñas con foto y ajustes manuales.
-- (Los sellos por compra y por amigo referido se calculan desde los pedidos.)
create table if not exists public.sellos_extra (
  id uuid primary key,
  cliente_id uuid not null,
  tipo text not null,                          -- resena (historia o reseña) | ajuste
  cantidad int not null default 1,
  pedido_id uuid,
  red text,                                    -- ig_historia | ig_post | tiktok | google | facebook | otro
  link text,
  nota text,
  fecha date not null default current_date,
  creado_en timestamptz default now(),
  updated_at timestamptz not null default now(),
  eliminado boolean not null default false
);

-- Inventario por lotes: entradas (+), salidas (−) y ajustes por conteo.
-- Lo que sale en pedidos se calcula desde pedidos (no se guarda aquí).
create table if not exists public.movimientos_stock (
  id uuid primary key,
  producto_id text not null,
  tipo text not null,                          -- entrada | salida | ajuste
  cantidad int not null,                       -- con signo
  lote text,
  fecha date not null,
  vence date,
  motivo text,
  nota text,
  creado_en timestamptz default now(),
  updated_at timestamptz not null default now(),
  eliminado boolean not null default false
);

-- Si ya habías corrido la primera versión de este archivo, esto agrega lo nuevo.
alter table public.clientes add column if not exists tipo_cliente text not null default 'persona';
alter table public.clientes add column if not exists razon_social text;
alter table public.clientes add column if not exists ruc text;
alter table public.clientes add column if not exists contacto text;
alter table public.clientes add column if not exists tipo_negocio text;
alter table public.clientes add column if not exists correo text;
alter table public.clientes add column if not exists regalo_agendado boolean not null default false;
alter table public.pedidos add column if not exists canal text not null default 'b2c';
alter table public.pedidos add column if not exists estado_entrega text not null default 'por_preparar';
alter table public.pedidos add column if not exists estado_pago text not null default 'pendiente';
alter table public.pedidos add column if not exists anulado boolean not null default false;
alter table public.pedidos add column if not exists modalidad_pago text default 'anticipado';
alter table public.pedidos add column if not exists fecha_vencimiento date;
alter table public.pedidos add column if not exists igv numeric(10,2) default 0;
alter table public.pedidos add column if not exists pagos jsonb not null default '[]';
alter table public.pedidos add column if not exists courier jsonb;
alter table public.pedidos add column if not exists comprobante jsonb;
alter table public.pedidos add column if not exists guia jsonb;
alter table public.pedidos alter column nivel_precio drop not null;
alter table public.pedidos drop column if exists estado;
alter table public.productos add column if not exists costo numeric(10,2);
alter table public.pedidos add column if not exists costo numeric(10,2);
alter table public.pedidos add column if not exists envio_asumido boolean not null default false;
alter table public.pedidos add column if not exists descuento_pct numeric(5,2) not null default 0;
alter table public.pedidos add column if not exists canje boolean not null default false;
alter table public.pedidos add column if not exists canje_publica text;
alter table public.pedidos add column if not exists canje_cumplido boolean not null default false;
alter table public.sellos_extra add column if not exists red text;
alter table public.sellos_extra add column if not exists link text;
alter table public.productos add column if not exists media jsonb not null default '[]';  -- galería: fotos y videos para Meta
alter table public.packs add column if not exists media jsonb not null default '[]';

create index if not exists stock_upd on public.movimientos_stock (updated_at);
create index if not exists productos_upd on public.productos (updated_at);
create index if not exists packs_upd on public.packs (updated_at);
create index if not exists clientes_upd on public.clientes (updated_at);
create index if not exists clientes_cel on public.clientes (celular);
create index if not exists pedidos_upd on public.pedidos (updated_at);
create index if not exists pedidos_cli on public.pedidos (cliente_id);
create index if not exists sellos_upd on public.sellos_extra (updated_at);

-- ---------------------------------------------------------------------
-- Seguridad: solo los correos de la tabla "equipo" leen y escriben.
-- Tener sesión no basta (si alguien se registra por su cuenta, no ve nada).
-- La clave anon sola tampoco ve nada.
-- Para dar acceso a otra persona:
--   insert into public.equipo (email, nombre) values ('correo@ejemplo.com', 'Nombre');
-- ---------------------------------------------------------------------
create table if not exists public.equipo (
  email text primary key,
  nombre text,
  creado_en timestamptz default now()
);
alter table public.equipo enable row level security;   -- sin políticas: nadie la lee desde la app

-- Cambia el correo por el del usuario del negocio (el mismo de Authentication → Users):
insert into public.equipo (email, nombre) values ('correo-del-negocio@ejemplo.com', 'Mr. Peanut')
on conflict (email) do nothing;

create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create or replace function privado.es_equipo()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.equipo
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function privado.es_equipo() from public, anon;
grant execute on function privado.es_equipo() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['productos','packs','clientes','pedidos','sellos_extra','movimientos_stock'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipo mr peanut" on public.%I', t);
    execute format('create policy "equipo mr peanut" on public.%I for all to authenticated using ((select privado.es_equipo())) with check ((select privado.es_equipo()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Fotos: bucket público (Meta necesita poder descargarlas por su link) y
-- solo el equipo puede subirlas o cambiarlas.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "mrp fotos ver" on storage.objects;
drop policy if exists "mrp fotos subir" on storage.objects;
drop policy if exists "mrp fotos cambiar" on storage.objects;
create policy "mrp fotos ver" on storage.objects for select to authenticated using (bucket_id = 'productos' and (select privado.es_equipo()));
create policy "mrp fotos subir" on storage.objects for insert to authenticated with check (bucket_id = 'productos' and (select privado.es_equipo()));
create policy "mrp fotos cambiar" on storage.objects for update to authenticated using (bucket_id = 'productos' and (select privado.es_equipo()));
drop policy if exists "mrp fotos borrar" on storage.objects;
create policy "mrp fotos borrar" on storage.objects for delete to authenticated using (bucket_id = 'productos' and (select privado.es_equipo()));
-- Solo imágenes y videos, hasta 50 MB por archivo.
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
where id = 'productos';

-- Vouchers de pago: bucket PRIVADO (no son públicos como las fotos del catálogo).
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do update set public = false;

drop policy if exists "mrp vouchers ver" on storage.objects;
drop policy if exists "mrp vouchers subir" on storage.objects;
drop policy if exists "mrp vouchers cambiar" on storage.objects;
create policy "mrp vouchers ver" on storage.objects for select to authenticated using (bucket_id = 'comprobantes' and (select privado.es_equipo()));
create policy "mrp vouchers subir" on storage.objects for insert to authenticated with check (bucket_id = 'comprobantes' and (select privado.es_equipo()));
create policy "mrp vouchers cambiar" on storage.objects for update to authenticated using (bucket_id = 'comprobantes' and (select privado.es_equipo()));
