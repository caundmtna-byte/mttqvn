-- Đơn giá bài viết: chỉ cap_bac = 1 hoặc quản trị module (quan_tri / all trong var_phan_quyen, module_key bai-viet) được lưu giá khác mặc định thể loại.
-- Người khác: luôn gán don_gia = don_gia của bai_viet_thiet_lap_the_loai tương ứng (khớp UI read-only).

CREATE OR REPLACE FUNCTION public.bai_viet_danh_sach_enforce_don_gia()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tl_don_gia numeric;
  v_can_edit boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bai_viet_thiet_lap_the_loai tl WHERE tl.id = NEW.id_the_loai
  ) THEN
    RAISE EXCEPTION 'bai_viet_danh_sach: id_the_loai không hợp lệ';
  END IF;

  SELECT tl.don_gia INTO STRICT v_tl_don_gia
  FROM public.bai_viet_thiet_lap_the_loai tl
  WHERE tl.id = NEW.id_the_loai;

  SELECT COALESCE(
    (
      SELECT
        (COALESCE(cv.cap_bac, 0) = 1)
        OR EXISTS (
          SELECT 1
          FROM public.var_phan_quyen pq
          WHERE pq.chuc_vu_id = nv.id_chuc_vu
            AND pq.module_key = 'bai-viet'
            AND (
              pq.quyen ~* '(^|,)\\s*quan_tri\\s*(,|$)'
              OR pq.quyen ~* '(^|,)\\s*all\\s*(,|$)'
            )
        )
      FROM public.var_nhan_vien nv
      LEFT JOIN public.var_chuc_vu cv ON cv.id = nv.id_chuc_vu
      WHERE auth.role() = 'authenticated'
        AND lower(trim(nv.ten_tai_khoan)) = lower(trim(split_part(COALESCE(auth.jwt()->>'email', ''), '@', 1)))
    ),
    false
  )
  INTO v_can_edit;

  IF NOT v_can_edit THEN
    NEW.don_gia := v_tl_don_gia;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bai_viet_danh_sach_enforce_don_gia ON public.bai_viet_danh_sach;
CREATE TRIGGER trg_bai_viet_danh_sach_enforce_don_gia
  BEFORE INSERT OR UPDATE OF id_the_loai, don_gia ON public.bai_viet_danh_sach
  FOR EACH ROW
  EXECUTE FUNCTION public.bai_viet_danh_sach_enforce_don_gia();

COMMENT ON FUNCTION public.bai_viet_danh_sach_enforce_don_gia() IS
  'Gán don_gia theo thể loại nếu user không phải cap_bac=1 và không có quan_tri/all trên module bai-viet.';
