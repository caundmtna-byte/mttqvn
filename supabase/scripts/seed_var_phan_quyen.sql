-- Seed tùy chọn: một dòng phân quyền mẫu cho chức vụ đầu tiên (chạy sau khi có var_chuc_vu).
-- Idempotent: bỏ qua nếu cặp (chuc_vu_id, module_key) đã tồn tại.

INSERT INTO public.var_phan_quyen (module_key, chuc_vu_id, quyen)
SELECT 'nhan-vien', cv.id, 'xem,them,sua'
FROM public.var_chuc_vu cv
ORDER BY cv.id
LIMIT 1
ON CONFLICT (chuc_vu_id, module_key) DO NOTHING;

INSERT INTO public.var_phan_quyen (module_key, chuc_vu_id, quyen)
SELECT 'phong-ban', cv.id, 'xem,them,sua,xoa'
FROM public.var_chuc_vu cv
ORDER BY cv.id
LIMIT 1
ON CONFLICT (chuc_vu_id, module_key) DO NOTHING;

INSERT INTO public.var_phan_quyen (module_key, chuc_vu_id, quyen)
SELECT 'chuong-trinh-nam', cv.id, 'xem,them,sua,xoa'
FROM public.var_chuc_vu cv
ORDER BY cv.id
LIMIT 1
ON CONFLICT (chuc_vu_id, module_key) DO NOTHING;

-- Hàng hóa cứu trợ (`module_id` đầy đủ: mat-tran-to-quoc/kho-cuu-tro/hang-hoa → `module_key` = hang-hoa)
INSERT INTO public.var_phan_quyen (module_key, chuc_vu_id, quyen)
SELECT 'hang-hoa', cv.id, 'xem,them,sua,xoa'
FROM public.var_chuc_vu cv
ORDER BY cv.id
LIMIT 1
ON CONFLICT (chuc_vu_id, module_key) DO NOTHING;
