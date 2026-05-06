-- ============================================================================
-- Thiết lập bài viết: thể loại + thiết lập khác (trang đăng / nguồn đăng)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bai_viet_thiet_lap_the_loai (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_the_loai    TEXT NOT NULL,
  mo_ta           TEXT,
  don_gia         NUMERIC(14, 2) NOT NULL DEFAULT 0
                  CHECK (don_gia >= 0),
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bai_viet_thiet_lap_the_loai_ten_lower
  ON public.bai_viet_thiet_lap_the_loai (lower(trim(ten_the_loai)));

CREATE TABLE IF NOT EXISTS public.bai_viet_thiet_lap_khac (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loai            TEXT NOT NULL
                  CHECK (loai IN ('trang_dang', 'nguon_dang')),
  ten             TEXT NOT NULL,
  mo_ta           TEXT,
  gia_tri         TEXT,
  thu_tu          INTEGER NOT NULL DEFAULT 0,
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bai_viet_thiet_lap_khac_loai_thu_tu
  ON public.bai_viet_thiet_lap_khac (loai, thu_tu);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bai_viet_thiet_lap_khac_loai_ten_lower
  ON public.bai_viet_thiet_lap_khac (loai, lower(trim(ten)));

ALTER TABLE public.bai_viet_thiet_lap_the_loai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bai_viet_thiet_lap_khac ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bai_viet_thiet_lap_the_loai_select ON public.bai_viet_thiet_lap_the_loai;
CREATE POLICY bai_viet_thiet_lap_the_loai_select ON public.bai_viet_thiet_lap_the_loai
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS bai_viet_thiet_lap_the_loai_modify ON public.bai_viet_thiet_lap_the_loai;
CREATE POLICY bai_viet_thiet_lap_the_loai_modify ON public.bai_viet_thiet_lap_the_loai
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS bai_viet_thiet_lap_khac_select ON public.bai_viet_thiet_lap_khac;
CREATE POLICY bai_viet_thiet_lap_khac_select ON public.bai_viet_thiet_lap_khac
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS bai_viet_thiet_lap_khac_modify ON public.bai_viet_thiet_lap_khac;
CREATE POLICY bai_viet_thiet_lap_khac_modify ON public.bai_viet_thiet_lap_khac
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_bai_viet_thiet_lap_the_loai_updated ON public.bai_viet_thiet_lap_the_loai;
CREATE TRIGGER trg_bai_viet_thiet_lap_the_loai_updated
  BEFORE UPDATE ON public.bai_viet_thiet_lap_the_loai
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

DROP TRIGGER IF EXISTS trg_bai_viet_thiet_lap_khac_updated ON public.bai_viet_thiet_lap_khac;
CREATE TRIGGER trg_bai_viet_thiet_lap_khac_updated
  BEFORE UPDATE ON public.bai_viet_thiet_lap_khac
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();
