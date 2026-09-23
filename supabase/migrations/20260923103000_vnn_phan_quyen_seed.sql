-- ============================================================================
-- Chương trình vì người nghèo — seed ma trận phân quyền.
--
-- Không seed = chỉ `cap_bac = 1` mở được module. `module_key` khai tường minh
-- bằng `storageKey: 'vi-nguoi-ngheo'` trong `permission-modules-config.ts` (segment
-- cuối 'danh-sach' quá chung) và cũng là tham số `fn_co_quyen(...)` của RLS.
--
-- Nguồn: 'nha-dai-doan-ket' — module anh em cùng nhóm An sinh, cùng đối tượng
-- nhập liệu (cán bộ nhập hồ sơ hỗ trợ). Cơ quan tự bỏ tích chức vụ không cần
-- trên màn Phân quyền.
--
-- Module này KHÔNG dùng `phe_duyet` (xem migration tạo bảng) — token đó nếu có
-- chép theo cũng vô hại.
-- ============================================================================

INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
-- DISTINCT ON: một chức vụ có thể còn cả dòng khoá ngắn lẫn khoá dài ở nguồn.
SELECT DISTINCT ON (src.chuc_vu_id) src.chuc_vu_id, 'vi-nguoi-ngheo', src.quyen
FROM public.var_phan_quyen src
WHERE src.module_key IN ('nha-dai-doan-ket', 'an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach')
  AND NOT EXISTS (
    SELECT 1 FROM public.var_phan_quyen existing
    WHERE existing.chuc_vu_id = src.chuc_vu_id
      AND existing.module_key IN ('vi-nguoi-ngheo', 'an-sinh-xa-hoi/vi-nguoi-ngheo/danh-sach')
  )
ORDER BY src.chuc_vu_id, (src.module_key = 'nha-dai-doan-ket') DESC;
