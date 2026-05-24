-- ============================================================================
-- Mặt trận Tổ quốc: lịch sử tăng lương cán bộ
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_tang_luong (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  can_bo_id            BIGINT NOT NULL
                       CONSTRAINT mttq_tang_luong_can_bo_id_fkey
                       REFERENCES public.mttq_can_bo (id)
                       ON UPDATE CASCADE ON DELETE RESTRICT,
  ngay_nang_luong      DATE NOT NULL,
  loai_ky              TEXT NOT NULL
                       CONSTRAINT mttq_tang_luong_loai_ky_chk
                       CHECK (loai_ky IN ('dung_han', 'truoc_han_6', 'truoc_han_9', 'truoc_han_12')),
  ngach_luong_id_cu    BIGINT
                       CONSTRAINT mttq_tang_luong_ngach_cu_fkey
                       REFERENCES public.luong_thiet_lap_ngach_luong (id)
                       ON UPDATE CASCADE ON DELETE SET NULL,
  bac_luong_id_cu      BIGINT
                       CONSTRAINT mttq_tang_luong_bac_cu_fkey
                       REFERENCES public.luong_thiet_lap_bac_luong (id)
                       ON UPDATE CASCADE ON DELETE SET NULL,
  ngach_luong_id_moi   BIGINT NOT NULL
                       CONSTRAINT mttq_tang_luong_ngach_moi_fkey
                       REFERENCES public.luong_thiet_lap_ngach_luong (id)
                       ON UPDATE CASCADE ON DELETE RESTRICT,
  bac_luong_id_moi     BIGINT NOT NULL
                       CONSTRAINT mttq_tang_luong_bac_moi_fkey
                       REFERENCES public.luong_thiet_lap_bac_luong (id)
                       ON UPDATE CASCADE ON DELETE RESTRICT,
  so_thang_rut_ngan    SMALLINT
                       CONSTRAINT mttq_tang_luong_so_thang_chk
                       CHECK (so_thang_rut_ngan IS NULL OR so_thang_rut_ngan IN (6, 9, 12)),
  ngay_den_han_goc     DATE,
  luong                BIGINT NOT NULL DEFAULT 0
                       CONSTRAINT mttq_tang_luong_luong_chk CHECK (luong >= 0),
  ghi_chu              TEXT,
  file_quyet_dinh      TEXT,
  id_nguoi_tao         BIGINT NOT NULL
                       CONSTRAINT mttq_tang_luong_id_nguoi_tao_fkey
                       REFERENCES public.var_nhan_vien (id)
                       ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao               TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mttq_tang_luong_truoc_han_thang_chk CHECK (
    (loai_ky = 'dung_han' AND so_thang_rut_ngan IS NULL)
    OR (loai_ky = 'truoc_han_6' AND so_thang_rut_ngan = 6)
    OR (loai_ky = 'truoc_han_9' AND so_thang_rut_ngan = 9)
    OR (loai_ky = 'truoc_han_12' AND so_thang_rut_ngan = 12)
  )
);

CREATE INDEX IF NOT EXISTS idx_mttq_tang_luong_can_bo_ngay
  ON public.mttq_tang_luong (can_bo_id, ngay_nang_luong DESC);

CREATE INDEX IF NOT EXISTS idx_mttq_tang_luong_ngay
  ON public.mttq_tang_luong (ngay_nang_luong DESC);

DROP TRIGGER IF EXISTS trg_mttq_tang_luong_updated ON public.mttq_tang_luong;
CREATE TRIGGER trg_mttq_tang_luong_updated
  BEFORE UPDATE ON public.mttq_tang_luong
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.mttq_tang_luong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_tang_luong_select ON public.mttq_tang_luong;
CREATE POLICY mttq_tang_luong_select ON public.mttq_tang_luong
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_tang_luong_modify ON public.mttq_tang_luong;
CREATE POLICY mttq_tang_luong_modify ON public.mttq_tang_luong
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
