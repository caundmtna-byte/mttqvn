-- ============================================================================
-- Gộp bảng con `hngh_ho_tro_ct` (Thông tin hộ nghèo → "Các khoản hỗ trợ") vào
-- `vnn_chuong_trinh`.
--
-- Hai bảng ghi CÙNG một sự việc — một khoản hỗ trợ trao cho một hộ. Để cả hai
-- là hai nơi nhập tay, sửa một bên quên bên kia là báo cáo lệch. Từ nay màn hộ
-- nghèo đọc khoản hỗ trợ từ `vnn_chuong_trinh` theo `ho_ngheo_id`.
--
-- Quy đổi dữ liệu cũ:
--   · linh_vuc 'Quà tết'      → 'Tết vì người nghèo' (bộ lĩnh vực đã hợp nhất)
--   · trang_thai 'Đã bàn giao' → 'Đã nhận'; bốn trạng thái còn lại (khảo sát,
--     phê duyệt, thực hiện, tạm dừng) đều là "chưa trao" → 'Đang khảo sát'
--   · noi_dung trống           → lấy tên lĩnh vực (cột mới NOT NULL)
--   · họ tên / xã / khối xóm / đối tượng chép từ hộ tại thời điểm gộp
--   · nguon / nguon_ho_tro / hinh_thuc: bảng cũ không có ⇒ nhận mặc định
--
-- Chạy lại an toàn: chỉ chuyển khi bảng cũ còn tồn tại.
-- ============================================================================

DO $$
DECLARE
  v_cu  bigint;
  v_moi bigint;
BEGIN
  IF to_regclass('public.hngh_ho_tro_ct') IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_cu FROM public.hngh_ho_tro_ct;

  INSERT INTO public.vnn_chuong_trinh (
    noi_dung_ho_tro, nam, linh_vuc_ho_tro, ho_ngheo_id, ho_ten_nguoi_nhan,
    xa_phuong_id, khoi_xom, doi_tuong, so_tien, trang_thai, ghi_chu,
    id_nguoi_tao, tg_tao, tg_cap_nhat
  )
  SELECT
    COALESCE(NULLIF(btrim(c.noi_dung_ho_tro), ''),
             CASE c.linh_vuc_ho_tro WHEN 'Quà tết' THEN 'Tết vì người nghèo' ELSE c.linh_vuc_ho_tro END),
    c.nam,
    CASE c.linh_vuc_ho_tro WHEN 'Quà tết' THEN 'Tết vì người nghèo' ELSE c.linh_vuc_ho_tro END,
    c.ho_ngheo_id,
    h.ho_ten_dai_dien,
    h.xa_phuong_id,
    h.khoi_xom,
    h.doi_tuong,
    c.so_tien,
    CASE c.trang_thai WHEN 'Đã bàn giao' THEN 'Đã nhận' ELSE 'Đang khảo sát' END,
    c.ghi_chu,
    c.id_nguoi_tao,
    c.tg_tao,
    c.tg_cap_nhat
  FROM public.hngh_ho_tro_ct c
  JOIN public.hngh_thong_tin_ho_ngheo h ON h.id = c.ho_ngheo_id
  ORDER BY c.id;

  GET DIAGNOSTICS v_moi = ROW_COUNT;
  -- Bảng con là ON DELETE CASCADE nên mọi dòng đều có hộ; lệch số là có lỗi
  -- ⇒ huỷ cả migration, KHÔNG được xoá bảng cũ khi chưa chuyển đủ.
  IF v_moi <> v_cu THEN
    RAISE EXCEPTION 'GOP_HO_TRO_LECH_SO: bảng cũ % dòng, chuyển được % dòng', v_cu, v_moi;
  END IF;
  RAISE NOTICE 'Đã chuyển % khoản hỗ trợ từ hngh_ho_tro_ct sang vnn_chuong_trinh', v_moi;
END;
$$;

-- "Chặn xoá hộ còn khoản đã bàn giao" tồn tại vì bảng cũ CASCADE: xoá hộ là
-- mất sạch lịch sử chi. Bảng mới là ON DELETE SET NULL và giữ họ tên / xã / số
-- tiền riêng, nên xoá hộ không còn làm mất dòng nào ⇒ bỏ trigger.
DROP TRIGGER IF EXISTS trg_hngh_chan_xoa_da_ban_giao ON public.hngh_thong_tin_ho_ngheo;
DROP FUNCTION IF EXISTS public.fn_hngh_chan_xoa_da_ban_giao();

-- DROP TABLE kéo theo trigger, policy, index của bảng; hàm dùng riêng thì xoá tay.
DROP TABLE IF EXISTS public.hngh_ho_tro_ct;
DROP FUNCTION IF EXISTS public.fn_hngh_ct_kiem_quyen_phe_duyet();

NOTIFY pgrst, 'reload schema';
