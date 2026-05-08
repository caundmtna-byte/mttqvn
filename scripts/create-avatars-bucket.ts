/* eslint-disable no-console */
/**
 * Tạo / cập nhật bucket Storage `avatars` qua API (service role).
 * RLS policies: chạy thêm file SQL — scripts/sql/create_avatars_storage_full.sql
 * trong Dashboard (Storage policies không tạo được qua client này).
 *
 * Chạy:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/create-avatars-bucket.ts
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !key) {
  console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'avatars';
const TWO_MB = 2 * 1024 * 1024;
const MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

async function main() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('listBuckets:', listErr.message);
    process.exit(2);
  }

  const exists = buckets?.some((b) => b.id === BUCKET) ?? false;

  if (!exists) {
    const { data, error } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: TWO_MB,
      allowedMimeTypes: [...MIME],
    });
    if (error) {
      console.error('createBucket:', error.message);
      process.exit(3);
    }
    console.log('Đã tạo bucket:', data?.name ?? BUCKET);
  } else {
    const { error } = await supabase.storage.updateBucket(BUCKET, {
      public: false,
      fileSizeLimit: TWO_MB,
      allowedMimeTypes: [...MIME],
    });
    if (error) {
      console.error('updateBucket:', error.message);
      process.exit(4);
    }
    console.log('Đã cập nhật bucket:', BUCKET);
  }

  console.log('\nBước tiếp theo (bắt buộc): mở Supabase → SQL Editor, dán và chạy file:');
  console.log('  scripts/sql/create_avatars_storage_full.sql');
  console.log('(phần INSERT bucket trong SQL sẽ idempotent; phần policies là cần cho upload/sign.)');
}

void main();
