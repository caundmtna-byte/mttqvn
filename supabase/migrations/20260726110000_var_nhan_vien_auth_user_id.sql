-- ⚠️ ĐÃ BỊ GỠ BỎ bởi 20260914110000_bo_var_nhan_vien_auth_user_id.sql.
-- Cột `auth_user_id` không còn tồn tại: hệ thống quay về nhận diện người dùng
-- bằng `ten_tai_khoan` khớp phần trước @ của email Auth. Giữ file này nguyên
-- trạng vì đây là lịch sử migration — đừng dùng nó làm mô tả schema hiện tại.

-- ============================================================================
-- var_nhan_vien.auth_user_id — nối hồ sơ nhân viên với tài khoản đăng nhập
--
-- Hiện tại hai thứ này chỉ nối với nhau bằng **quy ước chuỗi**:
--   auth.users.email = '<ten_tai_khoan>@gmail.com'
-- Hệ quả:
--   1. Đổi `ten_tai_khoan` là tài khoản đăng nhập âm thầm rời khỏi hồ sơ —
--      người đó vẫn đăng nhập được nhưng hệ thống không còn biết họ là ai.
--   2. Mọi kiểm tra quyền phía DB phải `split_part(email,'@',1)` + `lower(trim())`
--      cho từng dòng — không dùng được index, và RLS viết kiểu đó sẽ rất chậm.
--
-- Cột này là NỀN cho: RLS thật, gán `id_nguoi_tao` phía máy chủ, và nhật ký
-- thay đổi (audit_log) — cả ba đều cần trả lời được "auth.uid() là nhân viên nào"
-- bằng một phép so khớp khoá chính.
--
-- An toàn: cột NULL được. Backfill theo đúng quy ước đang chạy; nhân viên chưa
-- có tài khoản đăng nhập thì để trống, không chặn gì.
-- ============================================================================

ALTER TABLE public.var_nhan_vien
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'var_nhan_vien_auth_user_id_fkey'
      AND conrelid = 'public.var_nhan_vien'::regclass
  ) THEN
    ALTER TABLE public.var_nhan_vien
      ADD CONSTRAINT var_nhan_vien_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Một tài khoản đăng nhập chỉ được gắn với đúng một hồ sơ nhân viên.
CREATE UNIQUE INDEX IF NOT EXISTS uq_var_nhan_vien_auth_user_id
  ON public.var_nhan_vien (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Backfill theo quy ước hiện hành. Chỉ ghi vào dòng đang trống, nên chạy lại
-- migration này không đè lên liên kết đã được sửa tay.
UPDATE public.var_nhan_vien nv
SET auth_user_id = u.id
FROM auth.users u
WHERE nv.auth_user_id IS NULL
  AND lower(btrim(nv.ten_tai_khoan)) = lower(split_part(u.email, '@', 1));

COMMENT ON COLUMN public.var_nhan_vien.auth_user_id IS
  'Tài khoản đăng nhập (auth.users.id). Nối bằng khoá thay vì quy ước chuỗi '
  '<ten_tai_khoan>@gmail.com. NULL = nhân viên chưa được cấp tài khoản.';

-- ---------------------------------------------------------------------------
-- Hàm tra cứu dùng chung cho RLS / trigger: auth.uid() là nhân viên nào?
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_nhan_vien_id_hien_tai()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT nv.id
  FROM public.var_nhan_vien nv
  WHERE nv.auth_user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_nhan_vien_id_hien_tai() IS
  'Trả về var_nhan_vien.id của người đang đăng nhập, hoặc NULL. Dùng cho RLS, '
  'trigger gán id_nguoi_tao và nhật ký thay đổi.';

GRANT EXECUTE ON FUNCTION public.fn_nhan_vien_id_hien_tai() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
