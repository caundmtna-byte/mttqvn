-- ============================================================================
-- Khen thưởng nhà tài trợ — seed ma trận phân quyền.
--
-- Nguồn: 'nha-dai-doan-ket' — module anh em cùng nhóm "Khen thưởng tài trợ".
-- Không seed = chỉ `cap_bac = 1` mở được module.
--
-- `phe_duyet`: không chức vụ nào có sẵn token này. Trigger
-- `fn_ktnt_kiem_quyen_phe_duyet` đã bật, nên seed thiếu là chỉ còn cap_bac = 1
-- duyệt được (bài học 20260731100000_seed_quyen_phe_duyet_khen_thuong.sql).
-- Seed đúng những chức vụ đang có `sua` để giữ hành vi quen thuộc, rồi cơ quan
-- tự bỏ tích trên màn Phân quyền cho người chỉ được nhập liệu.
-- ============================================================================

INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
-- DISTINCT ON: một chức vụ có thể còn cả dòng khoá ngắn lẫn khoá dài ở nguồn.
SELECT DISTINCT ON (src.chuc_vu_id)
  src.chuc_vu_id,
  'khen-thuong-nha-tai-tro',
  CASE
    WHEN src.quyen ~ '(^|,)\s*sua\s*(,|$)' AND src.quyen !~ '(^|,)\s*phe_duyet\s*(,|$)'
      THEN src.quyen || ',phe_duyet'
    ELSE src.quyen
  END
FROM public.var_phan_quyen src
WHERE src.module_key IN ('nha-dai-doan-ket', 'an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach')
  AND NOT EXISTS (
    SELECT 1 FROM public.var_phan_quyen existing
    WHERE existing.chuc_vu_id = src.chuc_vu_id
      AND existing.module_key IN (
        'khen-thuong-nha-tai-tro', 'an-sinh-xa-hoi/khen-thuong-nha-tai-tro/danh-sach'
      )
  )
ORDER BY src.chuc_vu_id, (src.module_key = 'nha-dai-doan-ket') DESC;
