-- ============================================================================
-- Mặt trận Tổ quốc: danh sách cán bộ (FK thiết lập + người tạo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_can_bo (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cap_quan_ly_id             BIGINT
                             CONSTRAINT mttq_can_bo_cap_quan_ly_id_fkey
                             REFERENCES public.mttq_thiet_lap (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  to_chuc_id                 BIGINT
                             CONSTRAINT mttq_can_bo_to_chuc_id_fkey
                             REFERENCES public.mttq_thiet_lap (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  ho_ten                     TEXT NOT NULL,
  ngay_sinh                  DATE,
  gioi_tinh                  TEXT NOT NULL
                             CHECK (gioi_tinh IN ('Nam', 'Nữ', 'Khác')),
  dan_toc_id                 BIGINT
                             CONSTRAINT mttq_can_bo_dan_toc_id_fkey
                             REFERENCES public.mttq_thiet_lap (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  ton_giao                   TEXT,
  dia_chi                    TEXT,
  dang_vien                  BOOLEAN NOT NULL DEFAULT false,
  trinh_do_id                BIGINT
                             CONSTRAINT mttq_can_bo_trinh_do_id_fkey
                             REFERENCES public.mttq_thiet_lap (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  ly_luan_chinh_tri_id       BIGINT
                             CONSTRAINT mttq_can_bo_ly_luan_chinh_tri_id_fkey
                             REFERENCES public.mttq_thiet_lap (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  dien_thoai                 TEXT,
  chuc_vu_id                 BIGINT
                             CONSTRAINT mttq_can_bo_chuc_vu_id_fkey
                             REFERENCES public.mttq_thiet_lap (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  ngay_tham_gia_to_chuc      DATE,
  trang_thai_id              BIGINT
                             CONSTRAINT mttq_can_bo_trang_thai_id_fkey
                             REFERENCES public.mttq_thiet_lap (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  ngay_nhap_trang_thai       DATE,
  id_nguoi_tao               BIGINT NOT NULL
                             CONSTRAINT mttq_can_bo_id_nguoi_tao_fkey
                             REFERENCES public.var_nhan_vien (id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mttq_can_bo_ho_ten ON public.mttq_can_bo (ho_ten);
CREATE INDEX IF NOT EXISTS idx_mttq_can_bo_cap_quan_ly ON public.mttq_can_bo (cap_quan_ly_id);
CREATE INDEX IF NOT EXISTS idx_mttq_can_bo_trang_thai ON public.mttq_can_bo (trang_thai_id);
CREATE INDEX IF NOT EXISTS idx_mttq_can_bo_nguoi_tao ON public.mttq_can_bo (id_nguoi_tao);

DROP TRIGGER IF EXISTS trg_mttq_can_bo_updated ON public.mttq_can_bo;
CREATE TRIGGER trg_mttq_can_bo_updated
  BEFORE UPDATE ON public.mttq_can_bo
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- Đảm bảo từng FK *_id trỏ tới đúng loại danh mục thiết lập
CREATE OR REPLACE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.cap_quan_ly_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.cap_quan_ly_id AND t.loai = 'cap_quan_ly'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.cap_quan_ly_id must reference mttq_thiet_lap with loai = cap_quan_ly';
    END IF;
  END IF;
  IF NEW.to_chuc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.to_chuc_id AND t.loai = 'to_chuc'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.to_chuc_id must reference mttq_thiet_lap with loai = to_chuc';
    END IF;
  END IF;
  IF NEW.dan_toc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.dan_toc_id AND t.loai = 'dan_toc'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.dan_toc_id must reference mttq_thiet_lap with loai = dan_toc';
    END IF;
  END IF;
  IF NEW.trinh_do_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.trinh_do_id AND t.loai = 'trinh_do'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.trinh_do_id must reference mttq_thiet_lap with loai = trinh_do';
    END IF;
  END IF;
  IF NEW.ly_luan_chinh_tri_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.ly_luan_chinh_tri_id AND t.loai = 'ly_luan_chinh_tri'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.ly_luan_chinh_tri_id must reference mttq_thiet_lap with loai = ly_luan_chinh_tri';
    END IF;
  END IF;
  IF NEW.chuc_vu_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.chuc_vu_id AND t.loai = 'chuc_vu'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.chuc_vu_id must reference mttq_thiet_lap with loai = chuc_vu';
    END IF;
  END IF;
  IF NEW.trang_thai_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.trang_thai_id AND t.loai = 'trang_thai'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.trang_thai_id must reference mttq_thiet_lap with loai = trang_thai';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mttq_can_bo_validate_refs ON public.mttq_can_bo;
CREATE TRIGGER trg_mttq_can_bo_validate_refs
  BEFORE INSERT OR UPDATE ON public.mttq_can_bo
  FOR EACH ROW EXECUTE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai();

ALTER TABLE public.mttq_can_bo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_can_bo_select ON public.mttq_can_bo;
CREATE POLICY mttq_can_bo_select ON public.mttq_can_bo
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_can_bo_modify ON public.mttq_can_bo;
CREATE POLICY mttq_can_bo_modify ON public.mttq_can_bo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
