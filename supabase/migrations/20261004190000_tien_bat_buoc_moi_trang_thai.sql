-- Số tiền bắt buộc ở MỌI trạng thái (yêu cầu: "Nơi nào có số tiền bắt buộc nhập").
-- Thay luật cũ của 20261004120000_nddk_nha_tai_tro_tien_bat_buoc (chỉ bắt buộc khi đã chốt).
--
--   CT hỗ trợ: Tiền mặt ⇒ so_tien > 0 · Hiện vật ⇒ tong_tien_quy_doi > 0 · Hiện vật và Tiền ⇒ cả hai.
--     Dữ liệu hiện có đều đạt ⇒ CHECK đã VALIDATE.
--   NĐĐK: so_tien > 0. Còn hồ sơ "Đang khảo sát" cũ chưa có tiền, nên KHÔNG dùng CHECK:
--     CHECK chạy trên MỌI lần UPDATE, kể cả lúc trg_hngh_lan_sang_nddk đồng bộ họ tên / xã
--     từ hộ nghèo ⇒ sửa hộ nghèo sẽ hỏng vì một hồ sơ cũ thiếu tiền. Trigger chỉ chạy khi
--     ghi so_tien / trang_thai: form Sửa (gửi so_tien) và đổi trạng thái buộc phải điền.
--
-- Bản sao ở client: core/luat-so-tien.ts của từng module — sửa một bên phải sửa cả bên kia.

BEGIN;

ALTER TABLE public.vnn_chuong_trinh DROP CONSTRAINT vnn_so_tien_theo_trang_thai_chk;
ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_so_tien_theo_hinh_thuc_chk CHECK (
    (hinh_thuc_ho_tro = 'Hiện vật' OR COALESCE(so_tien, 0) > 0)
    AND (hinh_thuc_ho_tro = 'Tiền mặt' OR COALESCE(tong_tien_quy_doi, 0) > 0)
  );

ALTER TABLE public.nddk_nha_dai_doan_ket DROP CONSTRAINT nddk_so_tien_theo_trang_thai_chk;

CREATE FUNCTION public.fn_nddk_kiem_so_tien() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF COALESCE(NEW.so_tien, 0) <= 0 THEN
    RAISE EXCEPTION 'NDDK_THIEU_SO_TIEN: Hồ sơ nhà đại đoàn kết phải có số tiền hỗ trợ (lớn hơn 0).';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_nddk_kiem_so_tien() IS
  'Bắt buộc so_tien > 0 khi thêm hồ sơ hoặc ghi so_tien / trang_thai. Bản sao client: danh-sach/core/luat-so-tien.ts.';

CREATE TRIGGER trg_nddk_kiem_so_tien
  BEFORE INSERT OR UPDATE OF so_tien, trang_thai ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.fn_nddk_kiem_so_tien();

COMMIT;
