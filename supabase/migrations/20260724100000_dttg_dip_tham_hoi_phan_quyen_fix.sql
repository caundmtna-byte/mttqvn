-- ============================================================================
-- DTTG Dịp thăm hỏi — seed quyền phân quyền (fix: fallback toàn bộ chức vụ)
-- Lý do: migration 20260723 chỉ copy từ tham-hoi-to-chuc; nếu module đó
-- chưa có quyền nào trong var_phan_quyen thì INSERT trả về 0 dòng và
-- module Dịp thăm hỏi bị chặn hoàn toàn (canView = false → listQueryEnabled = false).
-- ============================================================================

-- Bước 1: copy từ bất kỳ module tham-hoi nào đã có quyền (ưu tiên giữ đúng cấp quyền)
INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
SELECT DISTINCT ON (src.chuc_vu_id) src.chuc_vu_id, 'dip-tham-hoi', src.quyen
FROM public.var_phan_quyen src
WHERE src.module_key IN (
  'tham-hoi-to-chuc',
  'dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc',
  'tham-hoi-ca-nhan',
  'dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan'
)
AND NOT EXISTS (
  SELECT 1 FROM public.var_phan_quyen e
  WHERE e.chuc_vu_id = src.chuc_vu_id
    AND e.module_key IN ('dip-tham-hoi', 'dan-toc-ton-giao/tham-hoi/dip-tham-hoi')
);

-- Bước 2: fallback — nếu vẫn chưa có (không có module tham-hoi nào được cấp quyền),
-- cấp xem,them,sua,xoa cho tất cả chức vụ đang hoạt động
INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
SELECT cv.id, 'dip-tham-hoi', 'xem,them,sua,xoa'
FROM public.var_chuc_vu cv
WHERE cv.trang_thai = 'Đang hoạt động'
AND NOT EXISTS (
  SELECT 1 FROM public.var_phan_quyen e
  WHERE e.chuc_vu_id = cv.id
    AND e.module_key IN ('dip-tham-hoi', 'dan-toc-ton-giao/tham-hoi/dip-tham-hoi')
);
