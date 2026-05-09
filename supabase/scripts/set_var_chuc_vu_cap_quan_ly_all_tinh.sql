-- =============================================================================
-- Gán Cấp quản lý = 'Tỉnh' cho TOÀN BỘ chức vụ (public.var_chuc_vu).
-- Điều kiện: đã chạy migration thêm cột + CHECK (... 'Tỉnh', 'Xã phường').
-- Idempotent: chạy nhiều lần vẫn đúng.
-- =============================================================================

-- Xem trước:
-- SELECT id, ten_chuc_vu, cap_quan_ly FROM public.var_chuc_vu ORDER BY id;

UPDATE public.var_chuc_vu
SET cap_quan_ly = 'Tỉnh';

-- Sau khi chạy:
-- SELECT cap_quan_ly, count(*) FROM public.var_chuc_vu GROUP BY 1;
