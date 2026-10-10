-- Chương trình hỗ trợ: ô biên bản bàn giao BẮT BUỘC theo trạng thái.
--
--   "Đã nhận" ⇒ bien_ban_ban_giao->>'ngay_ban_giao';
--               thêm 'so_quyet_dinh' + 'ngay_quyet_dinh' nếu nguon_ho_tro ∈ {Cấp tỉnh, Cấp xã, Trung ương}
--
-- Chỉ kiểm lúc THÊM MỚI hoặc lúc ĐỔI trạng thái (cùng cách với fn_nddk_kiem_truong_bat_buoc):
-- khoản cũ "Đã nhận" còn thiếu ngày không chặn các cập nhật khác. Form Sửa ở client vẫn
-- bắt nhập đủ nên dữ liệu cũ được làm đầy dần.
--
-- Bản sao ở client: features/nha-dai-doan-ket/vi-nguoi-ngheo/core/luat-truong-bat-buoc.ts
-- — sửa một bên phải sửa cả bên kia.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_vnn_kiem_truong_bat_buoc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  thieu text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.trang_thai IS NOT DISTINCT FROM NEW.trang_thai THEN
    RETURN NEW;
  END IF;

  IF NEW.trang_thai = 'Đã nhận' THEN
    IF NULLIF(btrim(NEW.bien_ban_ban_giao->>'ngay_ban_giao'), '') IS NULL THEN
      thieu := array_append(thieu, 'ngày bàn giao');
    END IF;
    IF NEW.nguon_ho_tro IN ('Cấp tỉnh', 'Cấp xã', 'Trung ương') THEN
      IF NULLIF(btrim(NEW.bien_ban_ban_giao->>'so_quyet_dinh'), '') IS NULL THEN
        thieu := array_append(thieu, 'số quyết định');
      END IF;
      IF NULLIF(btrim(NEW.bien_ban_ban_giao->>'ngay_quyet_dinh'), '') IS NULL THEN
        thieu := array_append(thieu, 'ngày quyết định');
      END IF;
    END IF;
  END IF;

  IF cardinality(thieu) > 0 THEN
    RAISE EXCEPTION 'VNN_THIEU_TRUONG_BAT_BUOC: Trạng thái "%" phải nhập %.',
      NEW.trang_thai, array_to_string(thieu, ', ');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_vnn_kiem_truong_bat_buoc() IS
  'Chặn thêm mới / đổi trạng thái khoản hỗ trợ sang "Đã nhận" khi biên bản bàn giao thiếu ngày bàn giao (và số + ngày quyết định với nguồn Cấp tỉnh/Cấp xã/Trung ương). Bản sao client: vi-nguoi-ngheo/core/luat-truong-bat-buoc.ts.';

DROP TRIGGER IF EXISTS trg_vnn_kiem_truong_bat_buoc ON public.vnn_chuong_trinh;
CREATE TRIGGER trg_vnn_kiem_truong_bat_buoc
  BEFORE INSERT OR UPDATE OF trang_thai ON public.vnn_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.fn_vnn_kiem_truong_bat_buoc();

COMMIT;
