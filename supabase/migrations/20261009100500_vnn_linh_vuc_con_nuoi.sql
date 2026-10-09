-- Chương trình hỗ trợ: thêm lĩnh vực "Con nuôi".
-- Không có phiếu khảo sát (như "Tết vì người nghèo"); biên bản bàn giao vẫn in được.
--
-- Bản sao ở client: features/nha-dai-doan-ket/vi-nguoi-ngheo/core/constants.ts
-- (VNN_LINH_VUC_VALUES) — schema.test.ts giữ hai bên khớp nhau.

BEGIN;

ALTER TABLE public.vnn_chuong_trinh DROP CONSTRAINT vnn_chuong_trinh_linh_vuc_ho_tro_check;
ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_chuong_trinh_linh_vuc_ho_tro_check CHECK (linh_vuc_ho_tro = ANY (ARRAY[
    'Tết vì người nghèo', 'Cứu trợ', 'Mô hình sinh kế', 'Học sinh nghèo',
    'Chữa bệnh', 'Nhà bị sập', 'Người chết', 'Hoả hoạn', 'Con nuôi'
  ]));

COMMIT;
