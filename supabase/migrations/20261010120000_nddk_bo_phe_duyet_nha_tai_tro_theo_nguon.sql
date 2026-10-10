-- 1) Nhà đại đoàn kết: BỎ trạng thái "Đã phê duyệt".
--    Hồ sơ cũ (nếu có) chuyển sang "Đang thực hiện" — trigger lich_su_trang_thai ghi vết.
--    Bỏ luôn trigger quyền Duyệt fn_nddk_kiem_quyen_phe_duyet: không còn trạng thái nào cần duyệt.
--
-- 2) Nhà tài trợ chỉ gắn được khi đúng nguồn (trước đây chỉ là "bắt buộc ở client"):
--    - NĐĐK: nguon = 'Giới thiệu' VÀ nguon_ho_tro = 'Ủng hộ trực tiếp'
--    - Chương trình hỗ trợ: nguon_ho_tro = 'Ủng hộ trực tiếp'
--    Dữ liệu cũ sai luật (89 hồ sơ NĐĐK, 2 khoản VNN) được bỏ nhà tài trợ theo yêu cầu.
--    Bản sao client: features/nha-dai-doan-ket/danh-sach/core/luat-so-tien.ts
--    (nddkCanNhaTaiTro / canNhaTaiTro) — sửa một bên phải sửa cả bên kia.

BEGIN;

UPDATE public.nddk_nha_dai_doan_ket
SET trang_thai = 'Đang thực hiện'
WHERE trang_thai = 'Đã phê duyệt';

ALTER TABLE public.nddk_nha_dai_doan_ket
  DROP CONSTRAINT nddk_nha_dai_doan_ket_trang_thai_check,
  ADD CONSTRAINT nddk_nha_dai_doan_ket_trang_thai_check
    CHECK (trang_thai = ANY (ARRAY['Đang khảo sát', 'Đang thực hiện', 'Đã bàn giao', 'Tạm dừng']));

DROP TRIGGER IF EXISTS trg_nddk_kiem_quyen_phe_duyet ON public.nddk_nha_dai_doan_ket;
DROP FUNCTION IF EXISTS public.fn_nddk_kiem_quyen_phe_duyet();

UPDATE public.nddk_nha_dai_doan_ket
SET nha_tai_tro_id = NULL
WHERE nha_tai_tro_id IS NOT NULL
  AND NOT (nguon = 'Giới thiệu' AND nguon_ho_tro = 'Ủng hộ trực tiếp');

ALTER TABLE public.nddk_nha_dai_doan_ket
  ADD CONSTRAINT nddk_nha_tai_tro_theo_nguon_chk
    CHECK (nha_tai_tro_id IS NULL OR (nguon = 'Giới thiệu' AND nguon_ho_tro = 'Ủng hộ trực tiếp'));

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.nha_tai_tro_id IS
  'Nhà tài trợ (kho_don_vi_cuu_tro). Chỉ có khi nguon = ''Giới thiệu'' và nguon_ho_tro = ''Ủng hộ trực tiếp'' (CHECK nddk_nha_tai_tro_theo_nguon_chk).';

UPDATE public.vnn_chuong_trinh
SET don_vi_ho_tro_id = NULL
WHERE don_vi_ho_tro_id IS NOT NULL
  AND nguon_ho_tro <> 'Ủng hộ trực tiếp';

ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_don_vi_ho_tro_theo_nguon_chk
    CHECK (don_vi_ho_tro_id IS NULL OR nguon_ho_tro = 'Ủng hộ trực tiếp');

COMMIT;
