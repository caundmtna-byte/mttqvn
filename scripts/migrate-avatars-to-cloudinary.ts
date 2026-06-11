/* eslint-disable no-console */
/**
 * Migration một lần: chuyển `var_nhan_vien.hinh_anh` từ data URL base64 hoặc path Supabase Storage
 * sang URL Cloudinary công khai.
 *
 * Cách chạy:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   CLOUDINARY_CLOUD_NAME=... CLOUDINARY_UPLOAD_PRESET=... \
 *     npx tsx scripts/migrate-avatars-to-cloudinary.ts
 *
 * DRY_RUN=1 — chỉ in log, không upload/update.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? '';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? '';
const AVATAR_BUCKET = process.env.AVATAR_BUCKET ?? 'avatars';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const DATA_URL_RE = /^data:([\w+/.-]+);base64,(.*)$/i;
const HTTP_RE = /^https?:\/\//i;
const CLOUDINARY_RE = /res\.cloudinary\.com/i;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Aborting.');
  process.exit(1);
}
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.error('Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extractStoragePath(stored: string): string | null {
  const s = stored.trim();
  if (!s || s.startsWith('data:') || HTTP_RE.test(s)) return null;
  if (s.startsWith('nhan-vien/')) return s.split('?')[0] || null;
  for (const marker of [
    '/object/public/avatars/',
    '/object/sign/avatars/',
    '/object/avatars/',
    '/storage/v1/object/avatars/',
  ]) {
    const i = s.indexOf(marker);
    if (i >= 0) {
      const path = s.slice(i + marker.length).split('?')[0];
      if (path) return path;
    }
  }
  return null;
}

async function uploadToCloudinary(
  file: Blob | Buffer | string,
  employeeId: string | number,
): Promise<string> {
  const form = new FormData();
  form.append('file', file as Blob);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', `mttqvn/avatars/${employeeId}`);
  form.append('public_id', `mttqvn/avatars/${employeeId}/${Date.now()}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Cloudinary upload failed (${res.status})`);
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Cloudinary did not return secure_url');
  return data.secure_url;
}

async function processRow(row: { id: number | string; hinh_anh: string | null }) {
  const value = row.hinh_anh;
  if (!value?.trim()) return { status: 'skip-empty' as const };

  const trimmed = value.trim();
  if (CLOUDINARY_RE.test(trimmed)) return { status: 'skip-cloudinary' as const };
  if (HTTP_RE.test(trimmed) && !trimmed.includes('.supabase.co')) {
    return { status: 'skip-external-url' as const };
  }

  if (DRY_RUN) {
    console.log(`[dry-run] employee ${row.id}: would migrate "${trimmed.slice(0, 40)}..."`);
    return { status: 'dry-run' as const };
  }

  let uploadPayload: Blob | Buffer | string = trimmed;

  if (DATA_URL_RE.test(trimmed)) {
    uploadPayload = trimmed;
  } else {
    const path = extractStoragePath(trimmed);
    if (!path) return { status: 'skip-unknown-format' as const };
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).download(path);
    if (error || !data) {
      console.error(`[download-fail] ${row.id}:`, error?.message ?? 'no data');
      return { status: 'download-fail' as const };
    }
    uploadPayload = data;
  }

  try {
    const secureUrl = await uploadToCloudinary(uploadPayload, row.id);
    const { error: updErr } = await supabase
      .from('var_nhan_vien')
      .update({ hinh_anh: secureUrl })
      .eq('id', row.id);
    if (updErr) {
      console.error(`[update-fail] ${row.id}:`, updErr.message);
      return { status: 'update-fail' as const };
    }
    console.log(`[ok] ${row.id} → ${secureUrl}`);
    return { status: 'ok' as const };
  } catch (e) {
    console.error(`[upload-fail] ${row.id}:`, e instanceof Error ? e.message : e);
    return { status: 'upload-fail' as const };
  }
}

async function main() {
  const { data, error } = await supabase
    .from('var_nhan_vien')
    .select('id, hinh_anh')
    .not('hinh_anh', 'is', null);

  if (error) {
    console.error('Supabase list failed:', error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  console.log(`Found ${rows.length} employees with hinh_anh.`);

  const stats: Record<string, number> = {};
  for (const row of rows) {
    const result = await processRow(row as { id: number | string; hinh_anh: string | null });
    stats[result.status] = (stats[result.status] ?? 0) + 1;
  }

  console.log('Done.', stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
