// Catálogo de Mr. Peanut para Meta Business Suite (Commerce Manager → fuente de datos programada).
// Devuelve en CSV la tabla catalogo_meta, que Supabase rellena sola cada vez que el panel guarda
// un producto o un pack (ver schema.sql). Meta lo lee cada hora y lo pasa a WhatsApp Business.
//   additional_image_link = hasta 20 fotos separadas por coma · video[0].url … video[4].url = videos.
//
// Publicar:  supabase functions deploy catalogo-meta --no-verify-jwt
// Link:      https://<proyecto>.supabase.co/functions/v1/catalogo-meta
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_VIDEOS = 5;
const BASE = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'additional_image_link', 'brand', 'size', 'google_product_category'];

const celda = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

Deno.serve(async () => {
  // La service role solo existe dentro de Supabase; nunca sale de esta función.
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await sb.from('catalogo_meta').select('*').order('orden').order('id');
  if (error) return new Response(`error: ${error.message}`, { status: 500 });

  const filas = (data ?? []).map((r) => {
    const f: Record<string, string> = Object.fromEntries(BASE.map((c) => [c, r[c] ?? '']));
    Array.from({ length: MAX_VIDEOS }, (_, i) => r[`video_${i + 1}`]).filter(Boolean).forEach((u, i) => { f[`video[${i}].url`] = u; });
    return f;
  });

  const nVideos = Math.max(0, ...filas.map((f) => Object.keys(f).filter((k) => k.startsWith('video[')).length));
  const columnas = [...BASE, ...Array.from({ length: nVideos }, (_, i) => `video[${i}].url`)];
  const csv = [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\n');
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
