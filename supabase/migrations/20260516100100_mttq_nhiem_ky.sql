-- ============================================================================
-- Mặt trận Tổ quốc: nhiệm kỳ (Ủy viên Ủy ban)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_nhiem_ky (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_nhiem_ky         TEXT NOT NULL,
  tu_nam               INTEGER
                         CHECK (tu_nam IS NULL OR tu_nam BETWEEN 2000 AND 2100),
  den_nam              INTEGER
                         CHECK (den_nam IS NULL OR den_nam BETWEEN 2000 AND 2100),
  thong_tin            TEXT,
  sl_dau_nhiem_ky      INTEGER NOT NULL DEFAULT 0,
  sl_dang_tham_gia     INTEGER NOT NULL DEFAULT 0,
  sl_thoi_tham_gia     INTEGER NOT NULL DEFAULT 0,
  sl_can_bo_sung       INTEGER NOT NULL DEFAULT 0,
  sl_thieu             INTEGER NOT NULL DEFAULT 0,
  ghi_chu              TEXT,
  id_nguoi_tao         BIGINT NOT NULL
                         CONSTRAINT mttq_nhiem_ky_id_nguoi_tao_fkey
                         REFERENCES public.var_nhan_vien (id)
                         ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao               TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mttq_nhiem_ky_tu_den_nam_chk
    CHECK (tu_nam IS NULL OR den_nam IS NULL OR tu_nam <= den_nam)
);

CREATE INDEX IF NOT EXISTS idx_mttq_nhiem_ky_tu_nam ON public.mttq_nhiem_ky (tu_nam DESC);
CREATE INDEX IF NOT EXISTS idx_mttq_nhiem_ky_den_nam ON public.mttq_nhiem_ky (den_nam DESC);
CREATE INDEX IF NOT EXISTS idx_mttq_nhiem_ky_nguoi_tao ON public.mttq_nhiem_ky (id_nguoi_tao);

DROP TRIGGER IF EXISTS trg_mttq_nhiem_ky_updated ON public.mttq_nhiem_ky;
CREATE TRIGGER trg_mttq_nhiem_ky_updated
  BEFORE UPDATE ON public.mttq_nhiem_ky
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.mttq_nhiem_ky ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_nhiem_ky_select ON public.mttq_nhiem_ky;
CREATE POLICY mttq_nhiem_ky_select ON public.mttq_nhiem_ky
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_nhiem_ky_modify ON public.mttq_nhiem_ky;
CREATE POLICY mttq_nhiem_ky_modify ON public.mttq_nhiem_ky
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
