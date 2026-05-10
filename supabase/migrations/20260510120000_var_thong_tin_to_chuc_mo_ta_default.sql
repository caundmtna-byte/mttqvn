-- Đổi mô tả mặc định ứng dụng (chỉ khi vẫn là giá trị cũ).
UPDATE public.var_thong_tin_to_chuc
SET mo_ta_ngan = 'Hệ thống nền tảng số'
WHERE id = 1
  AND mo_ta_ngan = 'Trang thông tin điện tử';
