-- ============================================================================
-- Thiết lập lương: ngạch lương, bậc lương (theo ngạch B1–B9), cấu hình MLCS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Singleton: mức lương cơ sở (nhân với hệ số bậc ở UI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.luong_thiet_lap_cau_hinh (
  id                 BIGINT NOT NULL PRIMARY KEY DEFAULT 1,
  CONSTRAINT luong_thiet_lap_cau_hinh_singleton_chk CHECK (id = 1),
  muc_luong_co_so    NUMERIC(14, 2) NOT NULL DEFAULT 2340000
                     CHECK (muc_luong_co_so > 0),
  tg_tao             TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.luong_thiet_lap_cau_hinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS luong_thiet_lap_cau_hinh_select ON public.luong_thiet_lap_cau_hinh;
CREATE POLICY luong_thiet_lap_cau_hinh_select ON public.luong_thiet_lap_cau_hinh
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS luong_thiet_lap_cau_hinh_modify ON public.luong_thiet_lap_cau_hinh;
CREATE POLICY luong_thiet_lap_cau_hinh_modify ON public.luong_thiet_lap_cau_hinh
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_luong_thiet_lap_cau_hinh_updated ON public.luong_thiet_lap_cau_hinh;
CREATE TRIGGER trg_luong_thiet_lap_cau_hinh_updated
  BEFORE UPDATE ON public.luong_thiet_lap_cau_hinh
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

INSERT INTO public.luong_thiet_lap_cau_hinh (id, muc_luong_co_so)
VALUES (1, 2340000)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Ngạch lương (master)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.luong_thiet_lap_ngach_luong (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ma            TEXT,
  ten           TEXT NOT NULL,
  mo_ta         TEXT,
  thu_tu        INTEGER NOT NULL DEFAULT 0,
  tg_tao        TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_luong_thiet_lap_ngach_luong_ten_lower
  ON public.luong_thiet_lap_ngach_luong (lower(trim(ten)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_luong_thiet_lap_ngach_luong_ma_lower
  ON public.luong_thiet_lap_ngach_luong (lower(trim(ma)))
  WHERE ma IS NOT NULL AND trim(ma) <> '';

CREATE INDEX IF NOT EXISTS idx_luong_thiet_lap_ngach_luong_thu_tu
  ON public.luong_thiet_lap_ngach_luong (thu_tu);

DROP TRIGGER IF EXISTS trg_luong_thiet_lap_ngach_luong_updated ON public.luong_thiet_lap_ngach_luong;
CREATE TRIGGER trg_luong_thiet_lap_ngach_luong_updated
  BEFORE UPDATE ON public.luong_thiet_lap_ngach_luong
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.luong_thiet_lap_ngach_luong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS luong_thiet_lap_ngach_luong_select ON public.luong_thiet_lap_ngach_luong;
CREATE POLICY luong_thiet_lap_ngach_luong_select ON public.luong_thiet_lap_ngach_luong
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS luong_thiet_lap_ngach_luong_modify ON public.luong_thiet_lap_ngach_luong;
CREATE POLICY luong_thiet_lap_ngach_luong_modify ON public.luong_thiet_lap_ngach_luong
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Bậc lương (B1–B9 / ngạch)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.luong_thiet_lap_bac_luong (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ngach_id      BIGINT NOT NULL
                REFERENCES public.luong_thiet_lap_ngach_luong (id)
                ON UPDATE CASCADE ON DELETE CASCADE,
  ma_bac        TEXT NOT NULL
                CONSTRAINT luong_thiet_lap_bac_luong_ma_bac_chk
                CHECK (ma_bac IN ('B1','B2','B3','B4','B5','B6','B7','B8','B9')),
  he_so         NUMERIC(10, 4) NOT NULL
                CONSTRAINT luong_thiet_lap_bac_luong_he_so_chk
                CHECK (he_so > 0),
  thu_tu        INTEGER NOT NULL DEFAULT 0,
  tg_tao        TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT luong_thiet_lap_bac_luong_ngach_ma_uq UNIQUE (ngach_id, ma_bac)
);

CREATE INDEX IF NOT EXISTS idx_luong_thiet_lap_bac_luong_ngach
  ON public.luong_thiet_lap_bac_luong (ngach_id, thu_tu);

DROP TRIGGER IF EXISTS trg_luong_thiet_lap_bac_luong_updated ON public.luong_thiet_lap_bac_luong;
CREATE TRIGGER trg_luong_thiet_lap_bac_luong_updated
  BEFORE UPDATE ON public.luong_thiet_lap_bac_luong
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.luong_thiet_lap_bac_luong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS luong_thiet_lap_bac_luong_select ON public.luong_thiet_lap_bac_luong;
CREATE POLICY luong_thiet_lap_bac_luong_select ON public.luong_thiet_lap_bac_luong
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS luong_thiet_lap_bac_luong_modify ON public.luong_thiet_lap_bac_luong;
CREATE POLICY luong_thiet_lap_bac_luong_modify ON public.luong_thiet_lap_bac_luong
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Sau khi thêm ngạch: tự tạo đủ 9 bậc (hệ số mặc định 1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.luong_thiet_lap_ngach_seed_bac()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  i INTEGER;
  lbl TEXT;
BEGIN
  FOR i IN 1..9 LOOP
    lbl := 'B' || i::text;
    INSERT INTO public.luong_thiet_lap_bac_luong (ngach_id, ma_bac, he_so, thu_tu)
    VALUES (NEW.id, lbl, 1.0, i);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_luong_thiet_lap_ngach_seed_bac ON public.luong_thiet_lap_ngach_luong;
CREATE TRIGGER trg_luong_thiet_lap_ngach_seed_bac
  AFTER INSERT ON public.luong_thiet_lap_ngach_luong
  FOR EACH ROW EXECUTE FUNCTION public.luong_thiet_lap_ngach_seed_bac();

NOTIFY pgrst, 'reload schema';
