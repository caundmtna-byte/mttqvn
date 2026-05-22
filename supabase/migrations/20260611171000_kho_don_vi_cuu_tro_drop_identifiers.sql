-- Gỡ cột định danh thuế/CCCD (chỉ giữ thông tin cơ bản) — an toàn nếu DB đã tạo từ bản migration trước có 2 cột này.
ALTER TABLE public.kho_don_vi_cuu_tro DROP COLUMN IF EXISTS ma_so_thue;
ALTER TABLE public.kho_don_vi_cuu_tro DROP COLUMN IF EXISTS so_cccd;

NOTIFY pgrst, 'reload schema';
