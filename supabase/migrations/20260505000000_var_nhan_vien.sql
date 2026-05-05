-- ============================================================================
-- Bảng var_nhan_vien — khóa số int8 (BIGINT), trạng thái tiếng Việt có dấu.
-- Không có cột auth_user_id: đăng nhập Supabase dùng email dạng
-- `<ten_tai_khoan>@gmail.com`, nhận diện hồ sơ qua cột `ten_tai_khoan`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.var_nhan_vien (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_tai_khoan   TEXT NOT NULL UNIQUE,
  ho_va_ten       TEXT NOT NULL,
  hinh_anh        TEXT,
  id_phong_ban    BIGINT,
  id_bo_phan      BIGINT,
  id_chuc_vu      BIGINT,
  trang_thai      TEXT NOT NULL DEFAULT 'Hoạt động'
                  CHECK (trang_thai IN ('Hoạt động','Khóa')),
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_var_nhan_vien_username  ON public.var_nhan_vien (lower(ten_tai_khoan));
CREATE INDEX IF NOT EXISTS idx_var_nhan_vien_phong_ban ON public.var_nhan_vien (id_phong_ban);
CREATE INDEX IF NOT EXISTS idx_var_nhan_vien_chuc_vu   ON public.var_nhan_vien (id_chuc_vu);

ALTER TABLE public.var_nhan_vien ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS var_nhan_vien_select ON public.var_nhan_vien;
CREATE POLICY var_nhan_vien_select ON public.var_nhan_vien
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS var_nhan_vien_modify ON public.var_nhan_vien;
CREATE POLICY var_nhan_vien_modify ON public.var_nhan_vien
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_tg_cap_nhat() RETURNS trigger AS $$
BEGIN
  NEW.tg_cap_nhat = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_var_nhan_vien_updated ON public.var_nhan_vien;
CREATE TRIGGER trg_var_nhan_vien_updated
  BEFORE UPDATE ON public.var_nhan_vien
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- Sau khi tạo user `admin@gmail.com` trong Supabase Auth, seed hồ sơ:
-- INSERT INTO public.var_nhan_vien (ten_tai_khoan, ho_va_ten, trang_thai)
-- VALUES ('admin', 'Quản trị viên', 'Hoạt động');
