-- Gỡ module "Thống kê nhà đại đoàn kết" khỏi ma trận phân quyền.
--
-- Thống kê nay là một TAB bên trong module "Danh sách nhà đại đoàn kết"
-- (`/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach?tab=thong_ke`), không còn là
-- module riêng nên cũng không cần dòng phân quyền riêng.
--
-- An toàn: đã đối chiếu trước khi chạy — cả hai `module_key` có đúng 18 chức vụ
-- với quyền GIỐNG HỆT nhau ('xem,them,sua'), không chức vụ nào có quyền Thống kê
-- mà thiếu quyền xem Danh sách. Tab Thống kê nay gác bằng quyền của
-- 'nha-dai-doan-ket' ⇒ không ai mất quyền, cũng không ai được thêm quyền.
--
-- RLS KHÔNG đụng tới: policy của `nddk_nha_dai_doan_ket` chỉ gọi
-- `fn_co_quyen('nha-dai-doan-ket', …)` (20260913100000, 20260913103000) —
-- không nơi nào dùng 'thong-ke-nha-dai-doan-ket'.
--
-- Không sửa `20260913102000_nddk_phan_quyen_seed.sql`: nó là lịch sử đã chạy.

DELETE FROM public.var_phan_quyen
WHERE module_key = 'thong-ke-nha-dai-doan-ket';

NOTIFY pgrst, 'reload schema';
