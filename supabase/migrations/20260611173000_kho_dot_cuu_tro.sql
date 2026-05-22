-- ============================================================================
-- Đợt cứu trợ — danh mục đợt tổ chức (VD: Bão Yagi 2026)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.kho_dot_cuu_tro_tt_seq;

CREATE TABLE IF NOT EXISTS public.kho_dot_cuu_tro (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tt               INTEGER NOT NULL DEFAULT nextval('public.kho_dot_cuu_tro_tt_seq'::regclass),
  ten              TEXT NOT NULL,
  mo_ta            TEXT,
  link             TEXT,
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.kho_dot_cuu_tro_tt_seq OWNED BY public.kho_dot_cuu_tro.tt;

CREATE INDEX IF NOT EXISTS idx_kho_dot_cuu_tro_ten_lower ON public.kho_dot_cuu_tro (lower(trim(ten)));
CREATE INDEX IF NOT EXISTS idx_kho_dot_cuu_tro_tt ON public.kho_dot_cuu_tro (tt);

DROP TRIGGER IF EXISTS trg_kho_dot_cuu_tro_updated ON public.kho_dot_cuu_tro;
CREATE TRIGGER trg_kho_dot_cuu_tro_updated
  BEFORE UPDATE ON public.kho_dot_cuu_tro
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.kho_dot_cuu_tro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kho_dot_cuu_tro_select ON public.kho_dot_cuu_tro;
CREATE POLICY kho_dot_cuu_tro_select ON public.kho_dot_cuu_tro
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kho_dot_cuu_tro_modify ON public.kho_dot_cuu_tro;
CREATE POLICY kho_dot_cuu_tro_modify ON public.kho_dot_cuu_tro
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
