-- ============================================================================
-- Danh sách kho (kho cứu trợ) — gắn địa bàn xã/phường
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kho_danh_sach_kho (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_kho          TEXT NOT NULL,
  don_vi_id        BIGINT NOT NULL
                   CONSTRAINT kho_danh_sach_kho_don_vi_id_fkey
                   REFERENCES public.var_ssn_xa_phuong (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  mo_ta            TEXT,
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kho_danh_sach_kho_don_vi ON public.kho_danh_sach_kho (don_vi_id);
CREATE INDEX IF NOT EXISTS idx_kho_danh_sach_kho_ten_lower ON public.kho_danh_sach_kho (lower(trim(ten_kho)));

DROP TRIGGER IF EXISTS trg_kho_danh_sach_kho_updated ON public.kho_danh_sach_kho;
CREATE TRIGGER trg_kho_danh_sach_kho_updated
  BEFORE UPDATE ON public.kho_danh_sach_kho
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.kho_danh_sach_kho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kho_danh_sach_kho_select ON public.kho_danh_sach_kho;
CREATE POLICY kho_danh_sach_kho_select ON public.kho_danh_sach_kho
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kho_danh_sach_kho_modify ON public.kho_danh_sach_kho;
CREATE POLICY kho_danh_sach_kho_modify ON public.kho_danh_sach_kho
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
