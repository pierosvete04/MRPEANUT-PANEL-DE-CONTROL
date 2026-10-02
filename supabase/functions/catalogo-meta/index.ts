// Catálogo de Mr. Peanut para Meta Business Suite (Commerce Manager → fuente de datos programada).
// Devuelve un CSV con los productos y packs marcados "en catálogo". Meta lo lee cada hora.
//
// Publicar:  supabase functions deploy catalogo-meta --no-verify-jwt
// Link:      https://<proyecto>.supabase.co/functions/v1/catalogo-meta?wa=51987654321
//            (wa = WhatsApp del negocio; se usa como link de cada producto)
import { createClient } from 'jsr:@supabase/supabase-js@2';

const COLUMNAS = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];

const celda = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const wa = (url.searchParams.get('wa') ?? '').replace(/\D/g, '');
  const link = (nombre: string) =>
    wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hola Mr. Peanut, quiero: ${nombre}`)}` : 'https://www.instagram.com/';

  // La service role solo existe dentro de Supabase; nunca sale de esta función.
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const [productos, packs] = await Promise.all([
    sb.from('productos').select('*').eq('eliminado', false).eq('en_catalogo', true).order('orden'),
    sb.from('packs').select('*').eq('eliminado', false).eq('en_catalogo', true).eq('activo', true)
      .not('precio_oficial', 'is', null).order('orden'),
  ]);
  if (productos.error || packs.error) {
    return new Response(`error: ${(productos.error ?? packs.error)!.message}`, { status: 500 });
  }

  const filas = [
    ...(productos.data ?? []).map((p) => ({
      id: p.id, title: p.nombre, description: p.descripcion || p.nombre,
      availability: p.disponible ? 'in stock' : 'out of stock', condition: 'new',
      price: `${Number(p.precio).toFixed(2)} PEN`, link: link(p.nombre), image_link: p.imagen_url ?? '', brand: 'Mr. Peanut',
    })),
    ...(packs.data ?? []).map((p) => ({
      id: p.id, title: p.nombre, description: p.descripcion || p.nombre,
      availability: 'in stock', condition: 'new',
      price: `${Number(p.precio_oficial).toFixed(2)} PEN`, link: link(p.nombre), image_link: p.imagen_url ?? '', brand: 'Mr. Peanut',
    })),
  ];

  const csv = [COLUMNAS.join(','), ...filas.map((f) => COLUMNAS.map((c) => celda((f as Record<string, unknown>)[c])).join(','))].join('\n');
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
