-- ============================================================================
-- Mặt trận Tổ quốc: lớp tập huấn (cha) + chi tiết cán bộ tham gia (con)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_lop_tap_huan (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_lop_tap_huan    TEXT NOT NULL,
  nam_tap_huan        INTEGER NOT NULL
                      CHECK (nam_tap_huan BETWEEN 2000 AND 2100),
  cap_tap_huan        TEXT NOT NULL
                      CHECK (cap_tap_huan IN ('Cấp tỉnh', 'Cấp xã')),
  ghi_chu             TEXT,
  id_nguoi_tao        BIGINT NOT NULL
                      CONSTRAINT mttq_lop_tap_huan_id_nguoi_tao_fkey
                      REFERENCES public.var_nhan_vien (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao              TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_nam      ON public.mttq_lop_tap_huan (nam_tap_huan DESC);
CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_cap      ON public.mttq_lop_tap_huan (cap_tap_huan);
CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_ten      ON public.mttq_lop_tap_huan (ten_lop_tap_huan);
CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_nguoi    ON public.mttq_lop_tap_huan (id_nguoi_tao);

DROP TRIGGER IF EXISTS trg_mttq_lop_tap_huan_updated ON public.mttq_lop_tap_huan;
CREATE TRIGGER trg_mttq_lop_tap_huan_updated
  BEFORE UPDATE ON public.mttq_lop_tap_huan
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

CREATE TABLE IF NOT EXISTS public.mttq_lop_tap_huan_ct (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_lop_tap_huan    BIGINT NOT NULL
                     CONSTRAINT mttq_lop_tap_huan_ct_id_lop_tap_huan_fkey
                     REFERENCES public.mttq_lop_tap_huan (id)
                     ON UPDATE CASCADE ON DELETE CASCADE,
  can_bo_id          BIGINT NOT NULL
                     CONSTRAINT mttq_lop_tap_huan_ct_can_bo_id_fkey
                     REFERENCES public.mttq_can_bo (id)
                     ON UPDATE CASCADE ON DELETE RESTRICT,
  thuoc_dien         TEXT NOT NULL
                     CHECK (thuoc_dien IN ('Biên chế', 'Ngoài biên chế')),
  chuc_vu            TEXT NOT NULL DEFAULT '',
  don_vi_cong_tac    TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_lop_tap_huan_ct_lop_can_bo
  ON public.mttq_lop_tap_huan_ct (id_lop_tap_huan, can_bo_id);

CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_ct_lop    ON public.mttq_lop_tap_huan_ct (id_lop_tap_huan);
CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_ct_can_bo ON public.mttq_lop_tap_huan_ct (can_bo_id);

-- Cập nhật tg_cap_nhat của bảng cha khi thêm/sửa/xóa dòng con
CREATE OR REPLACE FUNCTION public.mttq_lop_tap_huan_ct_touch_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pid bigint;
BEGIN
  pid := COALESCE(NEW.id_lop_tap_huan, OLD.id_lop_tap_huan);
  IF pid IS NOT NULL THEN
    UPDATE public.mttq_lop_tap_huan SET tg_cap_nhat = now() WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mttq_lop_tap_huan_ct_touch_parent ON public.mttq_lop_tap_huan_ct;
CREATE TRIGGER trg_mttq_lop_tap_huan_ct_touch_parent
  AFTER INSERT OR UPDATE OR DELETE ON public.mttq_lop_tap_huan_ct
  FOR EACH ROW EXECUTE FUNCTION public.mttq_lop_tap_huan_ct_touch_parent();

ALTER TABLE public.mttq_lop_tap_huan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mttq_lop_tap_huan_ct ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_lop_tap_huan_select ON public.mttq_lop_tap_huan;
CREATE POLICY mttq_lop_tap_huan_select ON public.mttq_lop_tap_huan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_lop_tap_huan_modify ON public.mttq_lop_tap_huan;
CREATE POLICY mttq_lop_tap_huan_modify ON public.mttq_lop_tap_huan
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mttq_lop_tap_huan_ct_select ON public.mttq_lop_tap_huan_ct;
CREATE POLICY mttq_lop_tap_huan_ct_select ON public.mttq_lop_tap_huan_ct
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_lop_tap_huan_ct_modify ON public.mttq_lop_tap_huan_ct;
CREATE POLICY mttq_lop_tap_huan_ct_modify ON public.mttq_lop_tap_huan_ct
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
