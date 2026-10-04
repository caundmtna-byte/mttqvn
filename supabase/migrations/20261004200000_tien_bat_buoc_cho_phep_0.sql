-- Số tiền vẫn BẮT BUỘC NHẬP, nhưng được nhập 0 (khoản chưa có / không có tiền).
-- Nới luật của 20261004190000_tien_bat_buoc_moi_trang_thai (trước: phải > 0).
--
--   NĐĐK: 5 hồ sơ "Đang khảo sát" cũ chưa có tiền (id 93, 111, 112, 116, 118) ghi 0 theo
--     yêu cầu ⇒ không còn dòng trống ⇒ dùng thẳng NOT NULL, bỏ trigger fn_nddk_kiem_so_tien.
--     (`nddk_nha_dai_doan_ket_so_tien_check` vẫn chặn số âm.)
--   CT hỗ trợ: Tiền mặt ⇒ có so_tien · Hiện vật ⇒ có tong_tien_quy_doi · Hiện vật và Tiền ⇒ cả hai.
--
-- Bản sao ở client: core/luat-so-tien.ts của từng module — sửa một bên phải sửa cả bên kia.

BEGIN;

DROP TRIGGER trg_nddk_kiem_so_tien ON public.nddk_nha_dai_doan_ket;
DROP FUNCTION public.fn_nddk_kiem_so_tien();

UPDATE public.nddk_nha_dai_doan_ket SET so_tien = 0 WHERE so_tien IS NULL;
ALTER TABLE public.nddk_nha_dai_doan_ket ALTER COLUMN so_tien SET NOT NULL;

ALTER TABLE public.vnn_chuong_trinh DROP CONSTRAINT vnn_so_tien_theo_hinh_thuc_chk;
ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_so_tien_theo_hinh_thuc_chk CHECK (
    (hinh_thuc_ho_tro = 'Hiện vật' OR so_tien IS NOT NULL)
    AND (hinh_thuc_ho_tro = 'Tiền mặt' OR tong_tien_quy_doi IS NOT NULL)
  );

COMMIT;
