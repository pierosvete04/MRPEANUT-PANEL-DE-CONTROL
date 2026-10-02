// Catálogo de Mr. Peanut para Meta Business Suite (Commerce Manager → fuente de datos programada).
// Devuelve un CSV con los productos y packs marcados "en catálogo". Meta lo lee cada hora.
// Además de la foto principal (image_link) manda la galería del panel:
//   additional_image_link = hasta 20 fotos separadas por coma · video[0].url … video[4].url = videos.
//
// Publicar:  supabase functions deploy catalogo-meta --no-verify-jwt
// Link:      https://<proyecto>.supabase.co/functions/v1/catalogo-meta?wa=51987654321
//            (wa = WhatsApp del negocio; se usa como link de cada producto)
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_FOTOS = 20;
const MAX_VIDEOS = 5;
const BASE = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'additional_image_link', 'brand'];

type Media = { tipo?: string; url?: string };
type Fila = Record<string, string>;

const celda = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Solo lo que ya está subido a internet (las fotos "por subir" todavía no tienen url).
function galeria(media: unknown): Fila {
  const ms = (Array.isArray(media) ? media : []).filter((m: Media) => /^https?:/.test(m?.url ?? '')) as Media[];
  const out: Fila = { additional_image_link: ms.filter((m) => m.tipo === 'imagen').slice(0, MAX_FOTOS).map((m) => m.url!).join(',') };
  ms.filter((m) => m.tipo === 'video').slice(0, MAX_VIDEOS).forEach((m, i) => { out[`video[${i}].url`] = m.url!; });
  return out;
}

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

  const filas: Fila[] = [
    ...(productos.data ?? []).map((p) => ({
      id: p.id, title: p.nombre, description: p.descripcion || p.nombre,
      availability: p.disponible ? 'in stock' : 'out of stock', condition: 'new',
      price: `${Number(p.precio).toFixed(2)} PEN`, link: link(p.nombre), image_link: p.imagen_url ?? '', brand: 'Mr. Peanut',
      ...galeria(p.media),
    })),
    ...(packs.data ?? []).map((p) => ({
      id: p.id, title: p.nombre, description: p.descripcion || p.nombre,
      availability: 'in stock', condition: 'new',
      price: `${Number(p.precio_oficial).toFixed(2)} PEN`, link: link(p.nombre), image_link: p.imagen_url ?? '', brand: 'Mr. Peanut',
      ...galeria(p.media),
    })),
  ];

  const nVideos = Math.max(0, ...filas.map((f) => Object.keys(f).filter((k) => k.startsWith('video[')).length));
  const columnas = [...BASE, ...Array.from({ length: nVideos }, (_, i) => `video[${i}].url`)];
  const csv = [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\n');
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
