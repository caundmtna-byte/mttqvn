/* eslint-disable no-console */
/**
 * Script migration một lần: chuyển `var_nhan_vien.hinh_anh` từ data URL base64
 * sang Supabase Storage URL.
 *
 * Cách chạy (cần SERVICE ROLE key):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/migrate-avatars-to-storage.ts
 *
 * - Đọc các row có `hinh_anh` bắt đầu bằng `data:image/`.
 * - Upload bytes lên bucket `avatars` (path: `nhan-vien/{id}/{ts}.{ext}`).
 * - Update column về **path** trong bucket (`nhan-vien/{id}/...`) — bucket private, app dùng signed URL.
 * - Idempotent: bỏ qua row đã có path/URL (không còn data URL).
 *
 * BACKUP DB TRƯỚC KHI CHẠY. Phase 3.1 của plan tối ưu egress.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BUCKET = process.env.AVATAR_BUCKET ?? 'avatars';
const PAGE = Number(process.env.PAGE_SIZE ?? '50');
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DATA_URL_RE = /^data:([\w+/.-]+);base64,(.*)$/i;

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  return 'png';
}

async function processRow(row: { id: number | string; hinh_anh: string | null }) {
  const value = row.hinh_anh;
  if (!value) return { status: 'skip-empty' as const };
  const m = DATA_URL_RE.exec(value);
  if (!m) return { status: 'skip-not-data-url' as const };

  const mime = m[1] || 'image/png';
  const b64 = m[2] || '';
  const buf = Buffer.from(b64, 'base64');
  const ext = extFromMime(mime);
  const path = `nhan-vien/${row.id}/${Date.now()}.${ext}`;

  if (DRY_RUN) {
    console.log(`[dry-run] ${row.id}: ${mime} ${buf.byteLength}B → ${path}`);
    return { status: 'dry-run' as const };
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: mime, upsert: true, cacheControl: '31536000' });
  if (upErr) {
    console.error(`[upload-fail] ${row.id}:`, upErr.message);
    return { status: 'upload-fail' as const };
  }

  const { error: updErr } = await supabase
    .from('var_nhan_vien')
    .update({ hinh_anh: path })
    .eq('id', row.id);
  if (updErr) {
    console.error(`[update-fail] ${row.id}:`, updErr.message);
    return { status: 'update-fail' as const };
  }

  console.log(`[ok] ${row.id} → ${path} (${buf.byteLength}B)`);
  return { status: 'ok' as const };
}

async function main() {
  console.log(`Migrating avatars → bucket "${BUCKET}" (DRY_RUN=${DRY_RUN ? '1' : '0'})`);
  let from = 0;
  let total = 0;
  const counters: Record<string, number> = {};
  for (;;) {
    const { data, error } = await supabase
      .from('var_nhan_vien')
      .select('id, hinh_anh')
      .ilike('hinh_anh', 'data:image/%')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('select-fail:', error.message);
      process.exit(2);
    }
    const rows = data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      const result = await processRow(r as { id: number | string; hinh_anh: string | null });
      counters[result.status] = (counters[result.status] ?? 0) + 1;
      total++;
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Done. total=${total}`, counters);
}

void main();
