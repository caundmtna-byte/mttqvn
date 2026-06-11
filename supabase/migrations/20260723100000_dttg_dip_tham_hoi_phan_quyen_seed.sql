-- ============================================================================
-- DTTG Dịp thăm hỏi — seed quyền phân quyền (copy từ Thăm hỏi tổ chức nếu chưa có)
-- Module mới trên UI cần bản ghi var_phan_quyen để matrix canView sau hydrate
-- ============================================================================

INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
SELECT src.chuc_vu_id, 'dip-tham-hoi', src.quyen
FROM public.var_phan_quyen src
WHERE src.module_key IN ('tham-hoi-to-chuc', 'dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc')
  AND NOT EXISTS (
    SELECT 1 FROM public.var_phan_quyen existing
    WHERE existing.chuc_vu_id = src.chuc_vu_id
      AND existing.module_key IN ('dip-tham-hoi', 'dan-toc-ton-giao/tham-hoi/dip-tham-hoi')
  );
