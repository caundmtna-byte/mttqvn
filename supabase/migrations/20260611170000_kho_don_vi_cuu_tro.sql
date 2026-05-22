-- ============================================================================
-- Đơn vị cứu trợ — tổ chức / cá nhân tham gia quyên góp (danh mục master)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.kho_don_vi_cuu_tro_tt_seq;

CREATE TABLE IF NOT EXISTS public.kho_don_vi_cuu_tro (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tt               INTEGER NOT NULL DEFAULT nextval('public.kho_don_vi_cuu_tro_tt_seq'::regclass),
  loai             TEXT NOT NULL DEFAULT 'to_chuc'
                   CONSTRAINT kho_don_vi_cuu_tro_loai_chk
                   CHECK (loai IN ('to_chuc', 'ca_nhan')),
  ten              TEXT NOT NULL,
  dia_chi          TEXT,
  dien_thoai       TEXT,
  email            TEXT,
  ghi_chu          TEXT,
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.kho_don_vi_cuu_tro_tt_seq OWNED BY public.kho_don_vi_cuu_tro.tt;

CREATE INDEX IF NOT EXISTS idx_kho_don_vi_cuu_tro_ten_lower ON public.kho_don_vi_cuu_tro (lower(trim(ten)));
CREATE INDEX IF NOT EXISTS idx_kho_don_vi_cuu_tro_loai ON public.kho_don_vi_cuu_tro (loai);
CREATE INDEX IF NOT EXISTS idx_kho_don_vi_cuu_tro_tt ON public.kho_don_vi_cuu_tro (tt);

DROP TRIGGER IF EXISTS trg_kho_don_vi_cuu_tro_updated ON public.kho_don_vi_cuu_tro;
CREATE TRIGGER trg_kho_don_vi_cuu_tro_updated
  BEFORE UPDATE ON public.kho_don_vi_cuu_tro
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.kho_don_vi_cuu_tro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kho_don_vi_cuu_tro_select ON public.kho_don_vi_cuu_tro;
CREATE POLICY kho_don_vi_cuu_tro_select ON public.kho_don_vi_cuu_tro
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kho_don_vi_cuu_tro_modify ON public.kho_don_vi_cuu_tro;
CREATE POLICY kho_don_vi_cuu_tro_modify ON public.kho_don_vi_cuu_tro
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
