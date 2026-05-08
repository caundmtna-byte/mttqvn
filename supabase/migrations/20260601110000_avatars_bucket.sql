-- Phase 3.1 — Bucket Storage cho avatar nhân viên.
-- Mục tiêu: ngừng lưu base64 (≤2MB/dòng) trong cột `var_nhan_vien.hinh_anh`,
-- thay bằng URL public ngắn → giảm egress đáng kể với module nhiều nhân viên.
--
-- Bucket public read (avatars là dữ liệu công khai trong app), authenticated write/update/delete.

-- Tạo bucket nếu chưa có (Supabase quản lý qua bảng `storage.buckets`).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024, -- 2MB tương ứng giới hạn UI (`maxSizeMB={2}`)
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies cho bucket `avatars`.
-- Public read (ai cũng đọc được URL).
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated user có thể upload/replace.
DROP POLICY IF EXISTS "avatars_auth_write" ON storage.objects;
CREATE POLICY "avatars_auth_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
