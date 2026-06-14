/* eslint-disable no-console */
/**
 * Migration một lần: chuyển `var_thong_tin_to_chuc.url_logo` từ data URL base64
 * sang URL Cloudinary công khai.
 *
 * Cách chạy:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   CLOUDINARY_CLOUD_NAME=... CLOUDINARY_UPLOAD_PRESET=... \
 *     npx tsx scripts/migrate-logo-to-cloudinary.ts
 *
 * DRY_RUN=1 — chỉ in log, không upload/update.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? '';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? '';
const LOGO_PUBLIC_ID = 'mttqvn/branding/app-logo';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const DATA_URL_RE = /^data:([\w+/.-]+);base64,(.*)$/i;

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

async function uploadToCloudinary(dataUrl: string): Promise<string> {
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('public_id', LOGO_PUBLIC_ID);
  form.append('overwrite', 'true');

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

async function main() {
  const { data, error } = await supabase
    .from('var_thong_tin_to_chuc')
    .select('id, url_logo')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Supabase read failed:', error.message);
    process.exit(1);
  }

  const urlLogo = data?.url_logo;
  if (!urlLogo || typeof urlLogo !== 'string') {
    console.log('No url_logo to migrate.');
    return;
  }

  if (!DATA_URL_RE.test(urlLogo.trim())) {
    console.log('url_logo is not a data URL — skip (already HTTPS or empty).');
    return;
  }

  const sizeKb = Math.round((urlLogo.length * 3) / 4 / 1024);
  console.log(`Found base64 logo (~${sizeKb} KB decoded).`);

  if (DRY_RUN) {
    console.log('[dry-run] Would upload to Cloudinary and update var_thong_tin_to_chuc.url_logo');
    return;
  }

  const secureUrl = await uploadToCloudinary(urlLogo.trim());
  console.log('Uploaded:', secureUrl);

  const { error: updErr } = await supabase
    .from('var_thong_tin_to_chuc')
    .update({ url_logo: secureUrl })
    .eq('id', 1);

  if (updErr) {
    console.error('Supabase update failed:', updErr.message);
    process.exit(1);
  }

  console.log('Updated var_thong_tin_to_chuc.url_logo successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
