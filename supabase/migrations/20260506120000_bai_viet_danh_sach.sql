-- ============================================================================
-- Danh sách bài viết (nghiệp vụ) — FK thiết lập thể loại / trang & nguồn đăng / nhân viên
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bai_viet_danh_sach (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_bai          TEXT NOT NULL,
  id_the_loai      BIGINT NOT NULL
                   REFERENCES public.bai_viet_thiet_lap_the_loai (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  don_gia          NUMERIC(14, 2) NOT NULL DEFAULT 0
                   CHECK (don_gia >= 0),
  ngay_dang        DATE NOT NULL,
  id_nguon_dang    BIGINT NOT NULL
                   REFERENCES public.bai_viet_thiet_lap_khac (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  id_trang_dang    BIGINT NOT NULL
                   REFERENCES public.bai_viet_thiet_lap_khac (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  link             TEXT NOT NULL,
  id_nguoi_tao     BIGINT NOT NULL
                   REFERENCES public.var_nhan_vien (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bai_viet_danh_sach_nguoi_tao ON public.bai_viet_danh_sach (id_nguoi_tao);
CREATE INDEX IF NOT EXISTS idx_bai_viet_danh_sach_ngay_dang ON public.bai_viet_danh_sach (ngay_dang DESC);
CREATE INDEX IF NOT EXISTS idx_bai_viet_danh_sach_the_loai ON public.bai_viet_danh_sach (id_the_loai);

-- Đảm bảo id_nguon_dang / id_trang_dang đúng loại trong bảng khác
CREATE OR REPLACE FUNCTION public.bai_viet_danh_sach_validate_khac_loai()
RETURNS TRIGGER AS $$
DECLARE
  loai_nguon TEXT;
  loai_trang TEXT;
BEGIN
  SELECT k.loai INTO loai_nguon
  FROM public.bai_viet_thiet_lap_khac k
  WHERE k.id = NEW.id_nguon_dang;

  IF loai_nguon IS DISTINCT FROM 'nguon_dang' THEN
    RAISE EXCEPTION 'bai_viet_danh_sach: id_nguon_dang phải trỏ tới bản ghi loai nguon_dang';
  END IF;

  SELECT k.loai INTO loai_trang
  FROM public.bai_viet_thiet_lap_khac k
  WHERE k.id = NEW.id_trang_dang;

  IF loai_trang IS DISTINCT FROM 'trang_dang' THEN
    RAISE EXCEPTION 'bai_viet_danh_sach: id_trang_dang phải trỏ tới bản ghi loai trang_dang';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bai_viet_danh_sach_validate_khac ON public.bai_viet_danh_sach;
CREATE TRIGGER trg_bai_viet_danh_sach_validate_khac
  BEFORE INSERT OR UPDATE OF id_nguon_dang, id_trang_dang ON public.bai_viet_danh_sach
  FOR EACH ROW EXECUTE FUNCTION public.bai_viet_danh_sach_validate_khac_loai();

DROP TRIGGER IF EXISTS trg_bai_viet_danh_sach_updated ON public.bai_viet_danh_sach;
CREATE TRIGGER trg_bai_viet_danh_sach_updated
  BEFORE UPDATE ON public.bai_viet_danh_sach
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.bai_viet_danh_sach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bai_viet_danh_sach_select ON public.bai_viet_danh_sach;
CREATE POLICY bai_viet_danh_sach_select ON public.bai_viet_danh_sach
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS bai_viet_danh_sach_modify ON public.bai_viet_danh_sach;
CREATE POLICY bai_viet_danh_sach_modify ON public.bai_viet_danh_sach
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
