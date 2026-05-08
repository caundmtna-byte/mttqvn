-- Bucket avatar private: không còn public URL cố định → giảm abuse / transfer ngoài app.
-- Client dùng storage.createSignedUrl(path) (JWT authenticated).
-- Chuẩn hóa cột: URL public cũ → chỉ lưu path trong bucket.

UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';

-- Bỏ đọc ẩn danh; chỉ user đã đăng nhập (và RLS) mới SELECT — phục vụ ký URL & kiểm tra quyền.
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

DROP POLICY IF EXISTS "avatars_auth_select" ON storage.objects;
CREATE POLICY "avatars_auth_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- Đổi URL public đầy đủ trong DB thành path tương đối bucket (nếu còn sót sau migration script).
UPDATE var_nhan_vien
SET hinh_anh = regexp_replace(
  hinh_anh,
  '^https?://[^/]+/storage/v1/object/public/avatars/',
  ''
)
WHERE hinh_anh LIKE '%/storage/v1/object/public/avatars/%';
