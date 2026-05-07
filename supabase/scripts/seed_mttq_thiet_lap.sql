-- Dữ liệu mẫu: mttq_thiet_lap (MTTQ — Thiết lập cài đặt)
-- Phụ thuộc: migration 20260510100000_mttq_thiet_lap.sql

INSERT INTO public.mttq_thiet_lap (loai, ten, mo_ta, thu_tu)
SELECT v.loai, v.ten, v.mo_ta, v.thu_tu
FROM (
  VALUES
    ('cap_quan_ly'::text, 'Cấp tỉnh'::text, null::text, 1),
    ('cap_quan_ly', 'Cấp huyện', 'Ví dụ', 2),
    ('to_chuc', 'UB MTTQ tỉnh', null, 1),
    ('dan_toc', 'Kinh', null, 1),
    ('trinh_do', 'Đại học', null, 1),
    ('ly_luan_chinh_tri', 'Cao cấp', null, 1),
    ('chuc_vu', 'Chủ tịch', null, 1),
    ('trang_thai', 'Đang công tác', null, 1)
) AS v(loai, ten, mo_ta, thu_tu)
WHERE NOT EXISTS (
  SELECT 1 FROM public.mttq_thiet_lap x
  WHERE x.loai = v.loai AND lower(trim(x.ten)) = lower(trim(v.ten))
);
