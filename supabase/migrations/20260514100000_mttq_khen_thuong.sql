-- ============================================================================
-- Mặt trận Tổ quốc: khen thưởng (cha) + chi tiết từng cán bộ (con)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_khen_thuong (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  so_qd               TEXT NOT NULL,
  ngay_khen_thuong    DATE NOT NULL,
  don_vi_de_xuat      TEXT,
  ghi_chu             TEXT,
  trang_thai          TEXT NOT NULL DEFAULT 'Mới'
                      CHECK (trang_thai IN ('Mới', 'Đang xử lý', 'Đã ban hành', 'Hủy')),
  id_nguoi_tao        BIGINT NOT NULL
                      CONSTRAINT mttq_khen_thuong_id_nguoi_tao_fkey
                      REFERENCES public.var_nhan_vien (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao              TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mttq_khen_thuong_ngay ON public.mttq_khen_thuong (ngay_khen_thuong DESC);
CREATE INDEX IF NOT EXISTS idx_mttq_khen_thuong_trang_thai ON public.mttq_khen_thuong (trang_thai);
CREATE INDEX IF NOT EXISTS idx_mttq_khen_thuong_nguoi_tao ON public.mttq_khen_thuong (id_nguoi_tao);

DROP TRIGGER IF EXISTS trg_mttq_khen_thuong_updated ON public.mttq_khen_thuong;
CREATE TRIGGER trg_mttq_khen_thuong_updated
  BEFORE UPDATE ON public.mttq_khen_thuong
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

CREATE TABLE IF NOT EXISTS public.mttq_khen_thuong_ct (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_khen_thuong     BIGINT NOT NULL
                     CONSTRAINT mttq_khen_thuong_ct_id_khen_thuong_fkey
                     REFERENCES public.mttq_khen_thuong (id)
                     ON UPDATE CASCADE ON DELETE CASCADE,
  can_bo_id          BIGINT NOT NULL
                     CONSTRAINT mttq_khen_thuong_ct_can_bo_id_fkey
                     REFERENCES public.mttq_can_bo (id)
                     ON UPDATE CASCADE ON DELETE RESTRICT,
  hinh_thuc_khen     TEXT NOT NULL
                     CHECK (hinh_thuc_khen IN ('Thường xuyên', 'Chuyên đề')),
  danh_hieu          TEXT NOT NULL
                     CHECK (danh_hieu IN ('Giấy khen', 'Bằng khen')),
  noi_dung_khen      TEXT,
  ho_so_khen         TEXT
);

CREATE INDEX IF NOT EXISTS idx_mttq_khen_thuong_ct_khen ON public.mttq_khen_thuong_ct (id_khen_thuong);
CREATE INDEX IF NOT EXISTS idx_mttq_khen_thuong_ct_can_bo ON public.mttq_khen_thuong_ct (can_bo_id);

-- Cập nhật tg_cap_nhat bảng cha khi thêm/sửa/xóa dòng con
CREATE OR REPLACE FUNCTION public.mttq_khen_thuong_ct_touch_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pid bigint;
BEGIN
  pid := COALESCE(NEW.id_khen_thuong, OLD.id_khen_thuong);
  IF pid IS NOT NULL THEN
    UPDATE public.mttq_khen_thuong SET tg_cap_nhat = now() WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mttq_khen_thuong_ct_touch_parent ON public.mttq_khen_thuong_ct;
CREATE TRIGGER trg_mttq_khen_thuong_ct_touch_parent
  AFTER INSERT OR UPDATE OR DELETE ON public.mttq_khen_thuong_ct
  FOR EACH ROW EXECUTE FUNCTION public.mttq_khen_thuong_ct_touch_parent();

ALTER TABLE public.mttq_khen_thuong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mttq_khen_thuong_ct ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_khen_thuong_select ON public.mttq_khen_thuong;
CREATE POLICY mttq_khen_thuong_select ON public.mttq_khen_thuong
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_khen_thuong_modify ON public.mttq_khen_thuong;
CREATE POLICY mttq_khen_thuong_modify ON public.mttq_khen_thuong
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mttq_khen_thuong_ct_select ON public.mttq_khen_thuong_ct;
CREATE POLICY mttq_khen_thuong_ct_select ON public.mttq_khen_thuong_ct
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_khen_thuong_ct_modify ON public.mttq_khen_thuong_ct;
CREATE POLICY mttq_khen_thuong_ct_modify ON public.mttq_khen_thuong_ct
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
