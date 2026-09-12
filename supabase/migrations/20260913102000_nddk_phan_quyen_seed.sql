-- ============================================================================
-- Nhà đại đoàn kết — seed ma trận phân quyền.
--
-- Module mới trên giao diện cần có dòng trong `var_phan_quyen` thì `can()` sau
-- khi hydrate ma trận mới trả true. Không seed = chỉ `cap_bac = 1` mở được.
--
-- `module_key` lưu DB là KHÓA NGẮN, ở đây khai tường minh bằng `storageKey`
-- trong `permission-modules-config.ts` ('nha-dai-doan-ket' /
-- 'thong-ke-nha-dai-doan-ket') vì segment cuối đường dẫn ('danh-sach',
-- 'thong-ke') quá chung, sẽ đụng module khác về sau.
--
-- CHỌN MODULE NGUỒN — đây là chỗ dễ sai:
--   · Danh sách  ← 'nhap-xuat-kho'  (bảng GIAO DỊCH cùng nhóm An sinh, cán bộ
--     nhập liệu hằng ngày: 21 chức vụ có đủ xem/them/sua/xoa).
--   · Thống kê   ← 'bao-cao-ho-tro' (màn BÁO CÁO cùng nhóm An sinh).
-- Chép từ 'so-thu-chi' hay 'bao-cao-thong-ke' thì hỏng: hai module đó chỉ có
-- token 'xem' cho mọi chức vụ, nên module nhập liệu này sẽ ra đời ở trạng thái
-- không ai thêm/sửa/xoá được ngoài cap_bac = 1 — người dùng chỉ thấy bảng rỗng
-- và không có nút nào, mà không hiểu vì sao.
-- Sau khi chạy, cơ quan tự bỏ tích những chức vụ không cần trên màn Phân quyền.
-- ============================================================================

INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
SELECT src.chuc_vu_id, 'nha-dai-doan-ket', src.quyen
FROM public.var_phan_quyen src
WHERE src.module_key IN ('nhap-xuat-kho', 'an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho')
  AND NOT EXISTS (
    SELECT 1 FROM public.var_phan_quyen existing
    WHERE existing.chuc_vu_id = src.chuc_vu_id
      AND existing.module_key IN (
        'nha-dai-doan-ket', 'an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach'
      )
  );

INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
SELECT src.chuc_vu_id, 'thong-ke-nha-dai-doan-ket', src.quyen
FROM public.var_phan_quyen src
WHERE src.module_key IN ('bao-cao-ho-tro', 'an-sinh-xa-hoi/kho-cuu-tro/bao-cao-ho-tro')
  AND NOT EXISTS (
    SELECT 1 FROM public.var_phan_quyen existing
    WHERE existing.chuc_vu_id = src.chuc_vu_id
      AND existing.module_key IN (
        'thong-ke-nha-dai-doan-ket', 'an-sinh-xa-hoi/nha-dai-doan-ket/thong-ke'
      )
  );
