-- ============================================================================
-- Mặt trận Tổ quốc: danh mục thiết lập (nhiều loại, một bảng)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_thiet_lap (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loai            TEXT NOT NULL
                  CHECK (loai IN (
                    'cap_quan_ly',
                    'to_chuc',
                    'dan_toc',
                    'trinh_do',
                    'ly_luan_chinh_tri',
                    'chuc_vu',
                    'trang_thai'
                  )),
  ten             TEXT NOT NULL,
  mo_ta           TEXT,
  thu_tu          INTEGER NOT NULL DEFAULT 0,
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mttq_thiet_lap_loai_thu_tu
  ON public.mttq_thiet_lap (loai, thu_tu);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_thiet_lap_loai_ten_lower
  ON public.mttq_thiet_lap (loai, lower(trim(ten)));

ALTER TABLE public.mttq_thiet_lap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_thiet_lap_select ON public.mttq_thiet_lap;
CREATE POLICY mttq_thiet_lap_select ON public.mttq_thiet_lap
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_thiet_lap_modify ON public.mttq_thiet_lap;
CREATE POLICY mttq_thiet_lap_modify ON public.mttq_thiet_lap
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_mttq_thiet_lap_updated ON public.mttq_thiet_lap;
CREATE TRIGGER trg_mttq_thiet_lap_updated
  BEFORE UPDATE ON public.mttq_thiet_lap
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();
