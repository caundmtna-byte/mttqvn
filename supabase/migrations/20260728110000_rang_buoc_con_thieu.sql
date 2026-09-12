-- ============================================================================
-- Bổ sung ràng buộc còn thiếu ở DB
--
-- Mỗi ràng buộc đều tự KIỂM DỮ LIỆU HIỆN CÓ trước khi thêm: nếu còn dòng vi
-- phạm thì migration DỪNG và báo rõ số dòng, thay vì ép ràng buộc lên dữ liệu
-- thật rồi làm hỏng nghiệp vụ đang chạy.
--
-- Ba ràng buộc trong kế hoạch KHÔNG thêm được vì dữ liệu thật đang vi phạm —
-- xem chú thích ở cuối file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. var_nhan_vien — khoá ngoại cho id_phong_ban / id_chuc_vu
--
-- `var_nhan_vien` là bảng gốc của toàn bộ phân quyền, nhưng ba cột tham chiếu
-- của nó không có FK nào. Trong khi đó `var_phan_quyen.chuc_vu_id` lại
-- ON DELETE CASCADE: xoá một chức vụ thì toàn bộ dòng phân quyền của chức vụ
-- đó bay sạch, còn nhân viên vẫn treo `id_chuc_vu` trỏ vào khoảng không —
-- người đó lặng lẽ mất hết quyền mà không ai thấy lỗi.
--
-- Vì sao hai cột hai kiểu ON DELETE khác nhau:
--
--   • id_chuc_vu  → RESTRICT. Chức vụ là gốc của quyền. Chặn xoá để thao tác
--     thất bại THÀNH TIẾNG ("còn nhân viên đang giữ chức vụ này") thay vì xoá
--     trót lọt rồi cuốn theo cả bảng phân quyền. Muốn xoá thì chuyển nhân viên
--     sang chức vụ khác trước — đúng trình tự nghiệp vụ.
--
--   • id_phong_ban → SET NULL, theo đúng khuôn mọi tham chiếu phòng ban khác
--     đang dùng (`var_chuc_vu.phong_ban_id`, `mttq_can_bo.phong_ban_id`,
--     `chuong_trinh_nam.id_phong_ban`…). Mất phòng ban không làm mất quyền.
--
-- `id_bo_phan` KHÔNG thêm được — xem cuối file.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_mo_coi bigint;
BEGIN
  SELECT count(*) INTO v_mo_coi
  FROM public.var_nhan_vien n
  WHERE n.id_phong_ban IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.var_phong_ban p WHERE p.id = n.id_phong_ban);
  IF v_mo_coi > 0 THEN
    RAISE EXCEPTION 'DUNG: % nhân viên có id_phong_ban trỏ vào phòng ban không tồn tại. Dọn dữ liệu trước khi thêm khoá ngoại.', v_mo_coi;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.var_nhan_vien'::regclass
      AND conname  = 'var_nhan_vien_id_phong_ban_fkey'
  ) THEN
    ALTER TABLE public.var_nhan_vien
      ADD CONSTRAINT var_nhan_vien_id_phong_ban_fkey
      FOREIGN KEY (id_phong_ban) REFERENCES public.var_phong_ban (id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

DO $$
DECLARE
  v_mo_coi bigint;
BEGIN
  SELECT count(*) INTO v_mo_coi
  FROM public.var_nhan_vien n
  WHERE n.id_chuc_vu IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.var_chuc_vu c WHERE c.id = n.id_chuc_vu);
  IF v_mo_coi > 0 THEN
    RAISE EXCEPTION 'DUNG: % nhân viên có id_chuc_vu trỏ vào chức vụ không tồn tại. Dọn dữ liệu trước khi thêm khoá ngoại.', v_mo_coi;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.var_nhan_vien'::regclass
      AND conname  = 'var_nhan_vien_id_chuc_vu_fkey'
  ) THEN
    ALTER TABLE public.var_nhan_vien
      ADD CONSTRAINT var_nhan_vien_id_chuc_vu_fkey
      FOREIGN KEY (id_chuc_vu) REFERENCES public.var_chuc_vu (id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_var_nhan_vien_phong_ban ON public.var_nhan_vien (id_phong_ban);
CREATE INDEX IF NOT EXISTS idx_var_nhan_vien_chuc_vu   ON public.var_nhan_vien (id_chuc_vu);

-- ----------------------------------------------------------------------------
-- 2. mttq_tang_luong — mỗi cán bộ chỉ có MỘT lần nâng lương trong cùng một ngày
--
-- Không có ràng buộc này thì bấm Lưu hai lần (mạng chậm) là ra hai quyết định
-- nâng lương trùng ngày cho cùng một người, và mọi thống kê lương đếm đôi.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_trung bigint;
BEGIN
  SELECT count(*) INTO v_trung FROM (
    SELECT 1 FROM public.mttq_tang_luong
    WHERE can_bo_id IS NOT NULL AND ngay_nang_luong IS NOT NULL
    GROUP BY can_bo_id, ngay_nang_luong HAVING count(*) > 1
  ) t;
  IF v_trung > 0 THEN
    RAISE EXCEPTION 'DUNG: % cặp (can_bo_id, ngay_nang_luong) đang trùng. Gộp dữ liệu trước khi thêm UNIQUE.', v_trung;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_tang_luong_can_bo_ngay
  ON public.mttq_tang_luong (can_bo_id, ngay_nang_luong);

-- ----------------------------------------------------------------------------
-- 3. pbxh_thuc_hien_phan_bien_xa_hoi — ngày kết thúc không được trước ngày bắt đầu
--
-- Trước bản này không có ở CẢ zod LẪN DB, nên nhập ngược ngày vẫn lưu được và
-- mọi phép tính thời lượng cuộc giám sát ra số âm.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_vi_pham bigint;
BEGIN
  SELECT count(*) INTO v_vi_pham
  FROM public.pbxh_thuc_hien_phan_bien_xa_hoi
  WHERE ngay_bat_dau IS NOT NULL AND ngay_ket_thuc IS NOT NULL
    AND ngay_ket_thuc < ngay_bat_dau;
  IF v_vi_pham > 0 THEN
    RAISE EXCEPTION 'DUNG: % dòng pbxh có ngay_ket_thuc < ngay_bat_dau. Sửa dữ liệu trước khi thêm CHECK.', v_vi_pham;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pbxh_thuc_hien_phan_bien_xa_hoi'::regclass
      AND conname  = 'chk_pbxh_thuc_hien_ngay'
  ) THEN
    ALTER TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi
      ADD CONSTRAINT chk_pbxh_thuc_hien_ngay
      CHECK (ngay_bat_dau IS NULL OR ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau);
  END IF;
END $$;

-- ============================================================================
-- BA RÀNG BUỘC KHÔNG THÊM ĐƯỢC — dữ liệu thật đang vi phạm
--
-- 1. FK `var_nhan_vien.id_bo_phan → var_phong_ban`
--    17/89 nhân viên có id_bo_phan trỏ vào phòng ban đã bị xoá
--    (id 6, 12, 13, 14, 19, 47, 48, 53). Thêm FK sẽ làm mọi lần lưu hồ sơ của
--    17 người này đổ lỗi. Cần quyết định nghiệp vụ trước: xoá trắng giá trị
--    chết, hay khôi phục các phòng ban đó.
--
-- 2. UNIQUE `mttq_khen_thuong.so_qd`
--    4/12 dòng có cùng một giá trị so_qd, và giá trị đó không phải số quyết
--    định mà là cả một câu lý do khen thưởng ("Có thành tích xuất sắc trong
--    công tác Bầu cử..."). Cột đang bị dùng sai mục đích; thêm UNIQUE chỉ khoá
--    cứng cái sai lại. Cần làm sạch cột trước.
--
-- 3. UNIQUE `mttq_ky_hop(nhiem_ky_id, ky_thu)`
--    11/15 dòng trùng, vì `ky_thu` là TEXT nhập tay nên cùng một kỳ họp được
--    ghi bốn kiểu: '3', 'Lần 3', 'Lần thứ 3'. Chuẩn hoá `ky_thu` (tốt nhất là
--    đổi sang số nguyên) rồi mới thêm UNIQUE được.
--
-- 4. CHECK `so_lan_hoan_thanh <= so_lan_khao_sat` (pbxh)
--    1/5 dòng đang vi phạm. Ràng buộc này mới chỉ có ở zod
--    (`phan-bien-xa-hoi/.../core/schema.ts`) nên dòng cũ lọt vào từ trước.
-- ============================================================================

NOTIFY pgrst, 'reload schema';
