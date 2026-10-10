-- Nhà đại đoàn kết: trường biên bản BẮT BUỘC theo trạng thái.
--
--   "Đang khảo sát" ⇒ ngay_khao_sat
--   "Đã bàn giao"   ⇒ ngay_kiem_tra_hoan_thanh + ngay_ban_giao;
--                     thêm so_quyet_dinh + ngay_quyet_dinh nếu nguon_ho_tro ∈ {Cấp tỉnh, Cấp xã, Trung ương}
--
-- Chỉ kiểm lúc THÊM MỚI hoặc lúc ĐỔI trạng thái (mẫu fn_nddk_kiem_quyen_phe_duyet).
-- Không kiểm mọi UPDATE: trigger fn_hngh_lan_sang_nddk cập nhật dòng NĐĐK khi sửa hộ
-- nghèo, hồ sơ cũ còn thiếu ngày sẽ làm hỏng việc sửa hộ. Form Sửa ở client vẫn bắt
-- nhập đủ nên dữ liệu cũ được làm đầy dần.
--
-- Bản sao ở client: features/nha-dai-doan-ket/danh-sach/core/luat-truong-bat-buoc.ts
-- — sửa một bên phải sửa cả bên kia.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_nddk_kiem_truong_bat_buoc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  thieu text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.trang_thai IS NOT DISTINCT FROM NEW.trang_thai THEN
    RETURN NEW;
  END IF;

  IF NEW.trang_thai = 'Đang khảo sát' THEN
    IF NEW.ngay_khao_sat IS NULL THEN thieu := array_append(thieu, 'ngày khảo sát'); END IF;
  ELSIF NEW.trang_thai = 'Đã bàn giao' THEN
    IF NEW.ngay_kiem_tra_hoan_thanh IS NULL THEN thieu := array_append(thieu, 'ngày kiểm tra hoàn thành'); END IF;
    IF NEW.ngay_ban_giao IS NULL THEN thieu := array_append(thieu, 'ngày bàn giao'); END IF;
    IF NEW.nguon_ho_tro IN ('Cấp tỉnh', 'Cấp xã', 'Trung ương') THEN
      IF NULLIF(btrim(NEW.so_quyet_dinh), '') IS NULL THEN thieu := array_append(thieu, 'số quyết định'); END IF;
      IF NEW.ngay_quyet_dinh IS NULL THEN thieu := array_append(thieu, 'ngày quyết định'); END IF;
    END IF;
  END IF;

  IF cardinality(thieu) > 0 THEN
    RAISE EXCEPTION 'NDDK_THIEU_TRUONG_BAT_BUOC: Trạng thái "%" phải nhập %.',
      NEW.trang_thai, array_to_string(thieu, ', ');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_nddk_kiem_truong_bat_buoc() IS
  'Chặn thêm mới / đổi trạng thái hồ sơ nhà đại đoàn kết khi thiếu trường biên bản bắt buộc của trạng thái đích. Bản sao client: core/luat-truong-bat-buoc.ts.';

DROP TRIGGER IF EXISTS trg_nddk_kiem_truong_bat_buoc ON public.nddk_nha_dai_doan_ket;
CREATE TRIGGER trg_nddk_kiem_truong_bat_buoc
  BEFORE INSERT OR UPDATE OF trang_thai ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.fn_nddk_kiem_truong_bat_buoc();

COMMIT;
