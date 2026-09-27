import { supabase } from '../lib/supabase';

export interface CatalogCollection {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  color_hex: string;
  color_soft: string;
  icon: string;
  sort: number;
  is_public: boolean;
  cover_item_id: string | null;
  created_at: string;
  cover_url?: string | null;
}

export interface CatalogItem {
  id: string;
  organization_id: string;
  collection_id: string | null;
  storage_path: string;
  thumb_path: string | null;
  blur_hash: string | null;
  media_type: 'photo' | 'video';
  title: string | null;
  description: string | null;
  tags: string[];
  staff_id: string | null;
  service_id: string | null;
  client_id: string | null;
  consent: boolean;
  before_path: string | null;
  after_path: string | null;
  views: number;
  likes: number;
  saves: number;
  created_at: string;
  url?: string;
  thumb_url?: string | null;
  collection?: Pick<CatalogCollection, 'id' | 'name' | 'slug' | 'color_hex' | 'color_soft' | 'icon'> | null;
  inspiration_notes?: string | null;
}

const BUCKET = 'catalog';

export function publicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).publicUrl;
}

function hydrate(i: CatalogItem): CatalogItem {
  return { ...i, url: publicUrl(i.storage_path), thumb_url: i.thumb_path ? publicUrl(i.thumb_path) : null };
}

// ---------------- compresión client-side ----------------
function supportsWebp(): boolean {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  return c.toDataURL('image/webp').indexOf('image/webp') === 5;
}

function loadBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen (¿formato HEIC?)')); };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

function canvasToBlob(c: HTMLCanvasElement, type: string, q: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falló'))), type, q);
  });
}

export async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<{ blob: Blob; ext: string }> {
  const img = await loadBlob(file);
  const canvas = drawScaled(img, maxDim);
  const type = supportsWebp() ? 'image/webp' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, type, quality);
  return { blob, ext: type === 'image/webp' ? 'webp' : 'jpg' };
}

export async function tinyPlaceholder(file: File): Promise<string> {
  const img = await loadBlob(file);
  const c = drawScaled(img, 12);
  try { return c.toDataURL('image/webp', 0.6); } catch { return c.toDataURL('image/jpeg', 0.6); }
}

// ---------------- upload ----------------
export interface UploadMeta {
  organizationId: string;
  collectionId?: string | null;
  title?: string;
  description?: string;
  tags?: string[];
  staffId?: string | null;
  serviceId?: string | null;
  clientId?: string | null;
  consent?: boolean;
  before?: File | null;
  after?: File | null;
  onProgress?: (pct: number) => void;
}

async function uploadSide(orgId: string, id: string, kind: 'before' | 'after', file: File): Promise<string> {
  const { blob, ext } = await compressImage(file, 1600, 0.8);
  const path = `${orgId}/items/${id}_${kind}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error('Subida ' + kind + ': ' + error.message);
  return path;
}

export async function uploadLook(file: File, meta: UploadMeta): Promise<CatalogItem> {
  const orgId = meta.organizationId;
  const id = crypto.randomUUID();
  const isVideo = file.type.startsWith('video/');
  const mediaType: 'photo' | 'video' = isVideo ? 'video' : 'photo';
  let storagePath = `${orgId}/items/${id}.mp4`;
  let thumbPath: string | null = null;
  let blur: string | null = null;

  meta.onProgress?.(10);
  if (!isVideo) {
    const { blob, ext } = await compressImage(file, 1600, 0.8);
    storagePath = `${orgId}/items/${id}.${ext}`;
    const img = await loadBlob(blob);
    const thumbBlob = await canvasToBlob(drawScaled(img, 480), supportsWebp() ? 'image/webp' : 'image/jpeg', 0.75);
    thumbPath = `${orgId}/items/${id}_thumb.${ext}`;
    blur = await tinyPlaceholder(file);
    meta.onProgress?.(35);
    const { error: e1 } = await supabase.storage.from(BUCKET).upload(storagePath, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
    if (e1) throw new Error('Subida original: ' + e1.message);
    meta.onProgress?.(60);
    const { error: e2 } = await supabase.storage.from(BUCKET).upload(thumbPath, thumbBlob, { contentType: thumbBlob.type, cacheControl: '31536000', upsert: false });
    if (e2) throw new Error('Subida thumb: ' + e2.message);
  } else {
    if (file.size > 15 * 1024 * 1024) throw new Error('El video supera los 15MB');
    const { error: e1 } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
    if (e1) throw new Error('Subida video: ' + e1.message);
  }
  meta.onProgress?.(80);

  const beforePath = meta.before ? await uploadSide(orgId, id, 'before', meta.before) : null;
  const afterPath = meta.after ? await uploadSide(orgId, id, 'after', meta.after) : null;

  const { data, error } = await supabase.from('catalog_items').insert({
    organization_id: orgId,
    collection_id: meta.collectionId ?? null,
    storage_path: storagePath,
    thumb_path: thumbPath,
    blur_hash: blur,
    media_type: mediaType,
    title: meta.title ?? null,
    description: meta.description ?? null,
    tags: meta.tags ?? [],
    staff_id: meta.staffId ?? null,
    service_id: meta.serviceId ?? null,
    client_id: meta.clientId ?? null,
    consent: meta.consent ?? false,
    before_path: beforePath,
    after_path: afterPath,
  }).select().single();
  if (error) throw new Error('Insert item: ' + error.message);
  meta.onProgress?.(100);
  return hydrate(data as CatalogItem);
}

// ---------------- queries ----------------
export async function listCollections(orgId: string): Promise<CatalogCollection[]> {
  const { data, error } = await supabase.from('catalog_collections')
    .select('*')
    .eq('organization_id', orgId)
    .order('sort', { ascending: true });
  if (error) throw new Error(error.message);
  const cols = (data ?? []) as CatalogCollection[];
  if (!cols.length) return cols;

  const coverIds = cols.map((c) => c.cover_item_id).filter(Boolean) as string[];
  const coverMap: Record<string, string> = {};
  if (coverIds.length) {
    const { data: items } = await supabase.from('catalog_items').select('id, thumb_path, storage_path').in('id', coverIds);
    (items ?? []).forEach((it: any) => { coverMap[it.id] = publicUrl(it.thumb_path ?? it.storage_path); });
  }
  const { data: recent } = await supabase.from('catalog_items')
    .select('id, collection_id, thumb_path, storage_path')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);
  const fallback: Record<string, string> = {};
  (recent ?? []).forEach((it: any) => {
    if (it.collection_id && !fallback[it.collection_id]) fallback[it.collection_id] = publicUrl(it.thumb_path ?? it.storage_path);
  });
  return cols.map((c) => ({
    ...c,
    cover_url: (c.cover_item_id && coverMap[c.cover_item_id]) || fallback[c.id] || null,
  }));
}

export async function listItems(
  orgId: string,
  opts: { collectionId?: string | null; limit?: number; before?: string | null } = {},
): Promise<{ items: CatalogItem[]; nextCursor: string | null }> {
  const limit = opts.limit ?? 48;
  let q = supabase.from('catalog_items')
    .select('*, collection:catalog_collections!collection_id(id, name, slug, color_hex, color_soft, icon)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (opts.collectionId) q = q.eq('collection_id', opts.collectionId);
  if (opts.before) q = q.lt('created_at', opts.before);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items = slice.map((r) => hydrate(r as CatalogItem));
  return { items, nextCursor: hasMore && slice.length ? slice[slice.length - 1].created_at : null };
}

// ---------------- métricas ----------------
export async function bumpMetric(orgId: string, itemId: string, metric: 'views' | 'likes' | 'saves', delta = 1): Promise<void> {
  const { error } = await supabase.rpc('catalog_bump', { p_org: orgId, p_item: itemId, p_metric: metric, p_delta: delta });
  if (error) throw new Error(error.message);
}

// ---------------- colecciones CRUD ----------------
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createCollection(
  orgId: string,
  input: { name: string; color_hex: string; color_soft: string; icon?: string; is_public?: boolean },
): Promise<CatalogCollection> {
  const slug = (slugify(input.name) || 'coleccion') + '-' + Date.now().toString(36);
  const { data, error } = await supabase.from('catalog_collections').insert({
    organization_id: orgId,
    name: input.name,
    slug,
    color_hex: input.color_hex,
    color_soft: input.color_soft,
    icon: input.icon ?? 'sparkles',
    is_public: input.is_public ?? true,
    sort: Math.floor(Date.now() / 1000),
  }).select().single();
  if (error) throw new Error(error.message);
  return data as CatalogCollection;
}

export async function updateCollection(
  orgId: string,
  id: string,
  patch: Partial<Pick<CatalogCollection, 'name' | 'color_hex' | 'color_soft' | 'icon' | 'is_public' | 'sort' | 'cover_item_id'>>,
): Promise<void> {
  const { error } = await supabase.from('catalog_collections').update(patch).eq('id', id).eq('organization_id', orgId);
  if (error) throw new Error(error.message);
}

export async function deleteCollection(orgId: string, id: string): Promise<void> {
  const { error } = await supabase.from('catalog_collections').delete().eq('id', id).eq('organization_id', orgId);
  if (error) throw new Error(error.message);
}

// ---------------- items: mover / borrar ----------------
export async function moveItems(orgId: string, ids: string[], collectionId: string | null): Promise<void> {
  const { error } = await supabase.from('catalog_items').update({ collection_id: collectionId }).eq('organization_id', orgId).in('id', ids);
  if (error) throw new Error(error.message);
}

export async function removeItems(orgId: string, ids: string[]): Promise<void> {
  const { data } = await supabase.from('catalog_items')
    .select('storage_path, thumb_path, before_path, after_path')
    .eq('organization_id', orgId).in('id', ids);
  const paths = (data ?? []).flatMap((r: any) => [r.storage_path, r.thumb_path, r.before_path, r.after_path].filter(Boolean)) as string[];
  if (paths.length) {
    const { error: se } = await supabase.storage.from(BUCKET).remove(paths);
    if (se) throw new Error(se.message);
  }
  const { error } = await supabase.from('catalog_items').delete().eq('organization_id', orgId).in('id', ids);
  if (error) throw new Error(error.message);
}

// ---------------- shoppable tags ----------------
export async function setShoppableServices(orgId: string, itemId: string, serviceIds: string[]): Promise<void> {
  const { error: d } = await supabase.from('catalog_item_services').delete().eq('item_id', itemId);
  if (d) throw new Error(d.message);
  if (serviceIds.length) {
    const { error: i } = await supabase.from('catalog_item_services').insert(
      serviceIds.map((sid) => ({ organization_id: orgId, item_id: itemId, service_id: sid })),
    );
    if (i) throw new Error(i.message);
  }
}

export async function listShoppable(orgId: string, itemId: string): Promise<any[]> {
  const { data, error } = await supabase.from('catalog_item_services')
    .select('service_id, price_override, service:services(id, name, price, duration_minutes)')
    .eq('organization_id', orgId).eq('item_id', itemId);
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

// ---------------- inspiración por clienta ----------------
export async function toggleInspiration(orgId: string, clientId: string, itemId: string, notes?: string): Promise<boolean> {
  const { data } = await supabase.from('client_inspiration')
    .select('id').eq('client_id', clientId).eq('item_id', itemId).maybeSingle();
  if (data) {
    const { error } = await supabase.from('client_inspiration').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    await bumpMetric(orgId, itemId, 'saves', -1);
    return false;
  }
  const { error } = await supabase.from('client_inspiration').insert({
    organization_id: orgId, client_id: clientId, item_id: itemId, notes: notes ?? null,
  });
  if (error) throw new Error(error.message);
  await bumpMetric(orgId, itemId, 'saves', 1);
  return true;
}

export async function listInspiration(orgId: string, clientId: string): Promise<CatalogItem[]> {
  const { data, error } = await supabase.from('client_inspiration')
    .select('notes, item:catalog_items(*)')
    .eq('organization_id', orgId).eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => hydrate({ ...(r.item as CatalogItem), inspiration_notes: r.notes }));
}

// ---------------- galería pública (para /g/[slug] y TV) ----------------
export async function getPublicGallery(orgSlug: string): Promise<{
  org: { id: string; name: string; slug: string };
  collections: CatalogCollection[];
  items: CatalogItem[];
} | null> {
  const { data: org } = await supabase.from('organizations')
    .select('id, name, slug').eq('slug', orgSlug).maybeSingle();
  if (!org) return null;
  const { data: cols, error: ce } = await supabase.from('catalog_collections')
    .select('*').eq('organization_id', org.id).eq('is_public', true).order('sort', { ascending: true });
  if (ce) throw new Error(ce.message);
  const collections = (cols ?? []) as CatalogCollection[];
  const { data: items, error: ie } = await supabase.from('catalog_items')
    .select('*, collection:catalog_collections!collection_id(id, name, slug, color_hex, color_soft, icon)')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (ie) throw new Error(ie.message);
  const pubIds = new Set(collections.map((c) => c.id));
  const filtered = ((items ?? []) as any[]).filter((r) => r.collection_id && pubIds.has(r.collection_id));
  return { org, collections, items: filtered.map((r) => hydrate(r as CatalogItem)) };
}
// ---------------- compartir a redes (IG / WhatsApp status) ----------------
export async function shareItems(itemsToShare: CatalogItem[], text?: string): Promise<'shared' | 'downloaded'> {
  const files: File[] = [];
  for (const it of itemsToShare) {
    if (it.media_type !== 'photo' || !it.url) continue;
    const res = await fetch(it.url);
    if (!res.ok) continue;
    const blob = await res.blob();
    const ext = blob.type.includes('webp') ? '.webp' : blob.type.includes('png') ? '.png' : '.jpg';
    const base = (it.title ?? 'salonflow-look').replace(/[^a-z0-9áéíóúñ -]/gi, '').trim().replace(/\s+/g, '-') || 'salonflow-look';
    files.push(new File([blob], base + ext, { type: blob.type }));
  }
  if (!files.length) throw new Error('No hay fotos para compartir (los videos se comparten por link)');
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: files })) {
    await nav.share({ files: files, title: 'SalonFlow', text: text ?? '' });
    return 'shared';
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  return 'downloaded';
}