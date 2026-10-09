-- Thêm 3 loại đối tượng hộ: "Trẻ mồ côi", "Khuyết tật", "Nạn nhân CĐDC" (chất độc da cam).
--
-- Ba bảng dùng CHUNG một bộ giá trị: đối tượng nhập ở Thông tin hộ nghèo và được
-- trigger chép sang Nhà đại đoàn kết (fn_nddk_dong_bo_tu_ho_ngheo / fn_hngh_lan_sang_nddk)
-- và Chương trình hỗ trợ ⇒ nới CHECK ở cả ba, thiếu một bảng là lưu hộ bị lỗi.
--
-- Bản sao ở client: HNGH_DOI_TUONG_VALUES (thong-tin-ho-ngheo/core/constants.ts)
-- và NDDK_DOI_TUONG_VALUES (danh-sach/core/constants.ts) — sửa một bên phải sửa cả bên kia.

BEGIN;

ALTER TABLE public.hngh_thong_tin_ho_ngheo DROP CONSTRAINT hngh_thong_tin_ho_ngheo_doi_tuong_check;
ALTER TABLE public.hngh_thong_tin_ho_ngheo
  ADD CONSTRAINT hngh_thong_tin_ho_ngheo_doi_tuong_check CHECK (
    doi_tuong IS NULL OR doi_tuong = ANY (ARRAY[
      'Hộ nghèo', 'Cận nghèo', 'Khó khăn', 'Trẻ mồ côi', 'Khuyết tật', 'Nạn nhân CĐDC'
    ])
  );

ALTER TABLE public.nddk_nha_dai_doan_ket DROP CONSTRAINT nddk_nha_dai_doan_ket_doi_tuong_check;
ALTER TABLE public.nddk_nha_dai_doan_ket
  ADD CONSTRAINT nddk_nha_dai_doan_ket_doi_tuong_check CHECK (
    doi_tuong IS NULL OR doi_tuong = ANY (ARRAY[
      'Hộ nghèo', 'Cận nghèo', 'Khó khăn', 'Trẻ mồ côi', 'Khuyết tật', 'Nạn nhân CĐDC'
    ])
  );

ALTER TABLE public.vnn_chuong_trinh DROP CONSTRAINT vnn_chuong_trinh_doi_tuong_check;
ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_chuong_trinh_doi_tuong_check CHECK (
    doi_tuong IS NULL OR doi_tuong = ANY (ARRAY[
      'Hộ nghèo', 'Cận nghèo', 'Khó khăn', 'Trẻ mồ côi', 'Khuyết tật', 'Nạn nhân CĐDC'
    ])
  );

COMMIT;
