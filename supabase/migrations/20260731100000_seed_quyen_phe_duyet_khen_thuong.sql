-- ============================================================================
-- Bật quyền "Duyệt" (`phe_duyet`) cho đúng những chức vụ ĐANG ban hành được
--
-- Giao diện vừa tách `approve` khỏi `edit`: nút đổi trạng thái sang "Đã ban
-- hành" nay đòi quyền `phe_duyet` chứ không còn ăn theo quyền `sua`. Vấn đề là
-- **không một dòng nào trong `var_phan_quyen` có `phe_duyet`** (giá trị đang
-- dùng chỉ có xem/them/sua/xoa), nên nếu không làm gì thì từ lúc phát hành bản
-- này chỉ còn duy nhất tài khoản `cap_bac = 1` ban hành được quyết định — tức
-- là đổi một lỗ hổng lấy một ách tắc.
--
-- Bản này **giữ nguyên hành vi của ngày hôm nay**: chức vụ nào đang sửa được
-- quyết định khen thưởng thì vẫn ban hành được, không hơn không kém. Cái thay
-- đổi là từ nay hai quyền đó **tách rời nhau** — cơ quan có thể vào
-- Hệ thống → Phân quyền bỏ tích "Duyệt" ở các chức vụ chuyên nhập liệu, việc
-- mà trước đây không có cách nào làm.
--
-- Idempotent: chỉ thêm `phe_duyet` vào dòng chưa có, chạy lại không đổi gì.
-- ============================================================================

UPDATE public.var_phan_quyen
SET quyen = quyen || ',phe_duyet'
WHERE module_key = 'danh-sach-khen-thuong'
  -- Đang sửa được ⇒ đang ban hành được (nút cũ gác bằng `canEdit`).
  AND quyen ~ '(^|,)\s*sua\s*(,|$)'
  -- Chưa có thì mới thêm, để chạy lại lần hai không sinh 'phe_duyet,phe_duyet'.
  AND quyen !~ '(^|,)\s*phe_duyet\s*(,|$)';

NOTIFY pgrst, 'reload schema';
