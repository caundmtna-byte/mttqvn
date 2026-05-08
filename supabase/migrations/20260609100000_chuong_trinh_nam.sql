-- ============================================================================
-- Chương trình năm — FK phòng ban / người tạo (var_nhan_vien), trạng thái đơn giản
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chuong_trinh_nam (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_chuong_trinh   TEXT NOT NULL,
  mo_ta              TEXT,
  ngay_bat_dau       DATE NOT NULL,
  ngay_ket_thuc      DATE NOT NULL,
  trang_thai         TEXT NOT NULL DEFAULT 'Hoạt động'
                     CHECK (trang_thai IN ('Hoạt động','Tạm dừng','Kết thúc')),
  id_phong_ban       BIGINT
                     REFERENCES public.var_phong_ban (id)
                     ON UPDATE CASCADE ON DELETE SET NULL,
  id_nguoi_tao       BIGINT NOT NULL
                     REFERENCES public.var_nhan_vien (id)
                     ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao             TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_chuong_trinh_nam_dates CHECK (ngay_ket_thuc >= ngay_bat_dau)
);

CREATE INDEX IF NOT EXISTS idx_chuong_trinh_nam_phong_ban ON public.chuong_trinh_nam (id_phong_ban);
CREATE INDEX IF NOT EXISTS idx_chuong_trinh_nam_ngay_bd ON public.chuong_trinh_nam (ngay_bat_dau DESC);
CREATE INDEX IF NOT EXISTS idx_chuong_trinh_nam_trang_thai ON public.chuong_trinh_nam (trang_thai);

DROP TRIGGER IF EXISTS trg_chuong_trinh_nam_updated ON public.chuong_trinh_nam;
CREATE TRIGGER trg_chuong_trinh_nam_updated
  BEFORE UPDATE ON public.chuong_trinh_nam
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.chuong_trinh_nam ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chuong_trinh_nam_select ON public.chuong_trinh_nam;
CREATE POLICY chuong_trinh_nam_select ON public.chuong_trinh_nam
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS chuong_trinh_nam_modify ON public.chuong_trinh_nam;
CREATE POLICY chuong_trinh_nam_modify ON public.chuong_trinh_nam
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
