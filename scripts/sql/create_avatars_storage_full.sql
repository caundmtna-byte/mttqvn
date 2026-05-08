-- =============================================================================
-- Tạo bucket Storage `avatars` + RLS (private) — chạy trong Supabase SQL Editor.
-- Dùng khi migration chưa chạy hoặc báo "Bucket not found" / upload 400.
--
-- Lưu ý: URL dạng .../storage/v1/object/avatars/path KHÔNG dùng làm <img src>
-- với bucket private — app phải dùng createSignedUrl (path trong DB: nhan-vien/...).
-- =============================================================================

-- 1) Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  2 * 1024 * 1024,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Policies trên storage.objects (idempotent)

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;

-- User đã đăng nhập: đọc (ký signed URL), ghi/sửa/xóa object trong bucket avatars
CREATE POLICY "avatars_auth_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

-- 3) Chuẩn hóa cột nhân viên: URL public cũ → path; URL thiếu segment "public" → path
UPDATE var_nhan_vien
SET hinh_anh = regexp_replace(
  hinh_anh,
  '^https?://[^/]+/storage/v1/object/public/avatars/',
  ''
)
WHERE hinh_anh LIKE '%/storage/v1/object/public/avatars/%';

UPDATE var_nhan_vien
SET hinh_anh = regexp_replace(
  hinh_anh,
  '^https?://[^/]+/storage/v1/object/avatars/',
  ''
)
WHERE hinh_anh LIKE '%/storage/v1/object/avatars/%'
  AND hinh_anh NOT LIKE '%/object/public/avatars/%'
  AND hinh_anh NOT LIKE '%/object/sign/avatars/%';
