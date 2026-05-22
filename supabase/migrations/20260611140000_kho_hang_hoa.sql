-- ============================================================================
-- Hàng hóa cứu trợ: danh mục + danh sách (không đơn giá)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kho_danh_muc_hang_hoa (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_danh_muc     TEXT NOT NULL,
  mo_ta            TEXT,
  thu_tu           INTEGER NOT NULL DEFAULT 0,
  trang_thai       TEXT NOT NULL DEFAULT 'Đang hoạt động'
                   CHECK (trang_thai IN ('Đang hoạt động','Ngừng hoạt động')),
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kho_danh_muc_hang_hoa_ten_lower
  ON public.kho_danh_muc_hang_hoa (lower(trim(ten_danh_muc)));

CREATE INDEX IF NOT EXISTS idx_kho_danh_muc_hang_hoa_thu_tu
  ON public.kho_danh_muc_hang_hoa (thu_tu);

CREATE TABLE IF NOT EXISTS public.kho_danh_sach_hang_hoa (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_danh_muc      BIGINT NOT NULL
                   CONSTRAINT kho_danh_sach_hang_hoa_id_danh_muc_fkey
                   REFERENCES public.kho_danh_muc_hang_hoa (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  ten_hang_hoa     TEXT NOT NULL,
  don_vi_tinh      TEXT NOT NULL,
  mo_ta            TEXT,
  quy_cach         TEXT,
  thu_tu           INTEGER NOT NULL DEFAULT 0,
  trang_thai       TEXT NOT NULL DEFAULT 'Đang hoạt động'
                   CHECK (trang_thai IN ('Đang hoạt động','Ngừng hoạt động')),
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kho_danh_sach_hang_hoa_dm_ten_lower
  ON public.kho_danh_sach_hang_hoa (id_danh_muc, lower(trim(ten_hang_hoa)));

CREATE INDEX IF NOT EXISTS idx_kho_danh_sach_hang_hoa_danh_muc
  ON public.kho_danh_sach_hang_hoa (id_danh_muc);

DROP TRIGGER IF EXISTS trg_kho_danh_muc_hang_hoa_updated ON public.kho_danh_muc_hang_hoa;
CREATE TRIGGER trg_kho_danh_muc_hang_hoa_updated
  BEFORE UPDATE ON public.kho_danh_muc_hang_hoa
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

DROP TRIGGER IF EXISTS trg_kho_danh_sach_hang_hoa_updated ON public.kho_danh_sach_hang_hoa;
CREATE TRIGGER trg_kho_danh_sach_hang_hoa_updated
  BEFORE UPDATE ON public.kho_danh_sach_hang_hoa
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.kho_danh_muc_hang_hoa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kho_danh_sach_hang_hoa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kho_danh_muc_hang_hoa_select ON public.kho_danh_muc_hang_hoa;
CREATE POLICY kho_danh_muc_hang_hoa_select ON public.kho_danh_muc_hang_hoa
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kho_danh_muc_hang_hoa_modify ON public.kho_danh_muc_hang_hoa;
CREATE POLICY kho_danh_muc_hang_hoa_modify ON public.kho_danh_muc_hang_hoa
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kho_danh_sach_hang_hoa_select ON public.kho_danh_sach_hang_hoa;
CREATE POLICY kho_danh_sach_hang_hoa_select ON public.kho_danh_sach_hang_hoa
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kho_danh_sach_hang_hoa_modify ON public.kho_danh_sach_hang_hoa;
CREATE POLICY kho_danh_sach_hang_hoa_modify ON public.kho_danh_sach_hang_hoa
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
