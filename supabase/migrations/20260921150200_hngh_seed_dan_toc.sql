-- Bổ sung dân tộc còn thiếu vào danh mục dùng chung `mttq_thiet_lap`.
--
-- Danh mục loai = 'dan_toc' trên production đã có: Kinh, Thái, Thổ, Ơ Đu, Mông,
-- Khơ-mú, Mường, Dao. Danh sách cơ quan dùng cho hộ nghèo còn thiếu "Đan Lai".
--
-- Idempotent: so theo lower(btrim(ten)) nên chạy lại không sinh dòng trùng
-- (và cũng không chọi với unique index uq_mttq_thiet_lap_loai_ten_lower).
--
-- Ghi chú: danh mục viết "Khơ-mú", tài liệu nghiệp vụ hay viết "Khơ Mú" — cùng
-- một dân tộc. KHÔNG tự sửa ở đây: đây là danh mục cơ quan tự quản trên màn
-- Thiết lập MTTQ, đổi tên sau lưng người dùng là đổi dữ liệu họ đang dùng.

INSERT INTO public.mttq_thiet_lap (loai, ten, mo_ta, thu_tu)
SELECT 'dan_toc', 'Đan Lai', NULL,
       COALESCE((SELECT max(thu_tu) FROM public.mttq_thiet_lap WHERE loai = 'dan_toc'), 0) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.mttq_thiet_lap
  WHERE loai = 'dan_toc' AND lower(btrim(ten)) = lower(btrim('Đan Lai'))
);
