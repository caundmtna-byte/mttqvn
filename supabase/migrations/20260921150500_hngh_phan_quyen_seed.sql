-- ============================================================================
-- Seed ma trận phân quyền cho module "Thông tin hộ nghèo".
--
-- Module mới ra đời với ma trận RỖNG thì chỉ `cap_bac = 1` dùng được: người
-- dùng thường mở trang ra chỉ thấy bảng trắng và không có nút nào, mà không
-- hiểu vì sao. Nên chép sẵn quyền từ một module NHẬP LIỆU đã chạy.
--
-- Chọn nguồn `nhap-xuat-kho` — module nhập liệu có đủ xem/thêm/sửa/xoá trên
-- nhiều chức vụ. Chép nhầm từ một module chỉ-đọc (`bao-cao-ho-tro`) là module
-- ra đời không ai thêm được bản ghi nào.
--
-- Kiểm cả khoá ngắn lẫn module_id dài ở NOT EXISTS vì dữ liệu cũ tồn tại ở cả
-- hai dạng. Idempotent: chạy lại không sinh dòng trùng.
--
-- Sau khi chạy, cơ quan tự bỏ tích những chức vụ không cần trên màn Phân quyền.
-- ============================================================================

INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
SELECT src.chuc_vu_id, 'thong-tin-ho-ngheo', src.quyen
FROM public.var_phan_quyen src
WHERE src.module_key IN ('nhap-xuat-kho', 'an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho')
  AND NOT EXISTS (
    SELECT 1 FROM public.var_phan_quyen existing
    WHERE existing.chuc_vu_id = src.chuc_vu_id
      AND existing.module_key IN (
        'thong-tin-ho-ngheo', 'an-sinh-xa-hoi/thong-tin-ho-ngheo/danh-sach'
      )
  );

NOTIFY pgrst, 'reload schema';
