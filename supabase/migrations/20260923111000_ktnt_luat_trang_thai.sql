-- ============================================================================
-- Luật chuyển trạng thái cho Khen thưởng nhà tài trợ — thêm MỘT nhánh vào hàm
-- dùng chung `fn_kiem_luat_trang_thai` (tạo ở 20260729120000_lich_su_trang_thai.sql).
--
-- Nhánh `mttq_khen_thuong` giữ NGUYÊN từng chữ. Bản sao phía client:
-- `features/nha-dai-doan-ket/khen-thuong-nha-tai-tro/utils/luat-trang-thai.ts`
-- — sửa một bên phải sửa cả bên kia.
--
--   Chờ duyệt   → Đã duyệt / Không duyệt / Hủy
--   Không duyệt → Chờ duyệt (bổ sung hồ sơ, nộp lại) / Hủy
--   Đã duyệt    → Hủy (quyết định đã ra ngoài, không lùi về chờ)
--   Hủy         → (kết thúc — lập quyết định mới)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_kiem_luat_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tu  text := OLD.trang_thai;
  v_den text := NEW.trang_thai;
BEGIN
  IF v_tu IS NOT DISTINCT FROM v_den THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'mttq_khen_thuong' THEN
    -- Đã ban hành là đã phát hành quyết định ra ngoài: chỉ còn đường huỷ,
    -- không lùi về nháp.
    IF v_tu = 'Đã ban hành' AND v_den IN ('Mới', 'Đang xử lý') THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Quyết định đã ban hành thì không quay lại trạng thái "%" được. Nếu sai sót, hãy huỷ quyết định rồi lập quyết định mới.',
        v_den;
    END IF;
    -- Đã huỷ thì không "sống lại" thành quyết định có hiệu lực.
    IF v_tu = 'Hủy' AND v_den = 'Đã ban hành' THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Quyết định đã huỷ thì không ban hành lại được. Hãy lập quyết định mới.';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'ktnt_khen_thuong_nha_tai_tro' THEN
    IF NOT (
      (v_tu = 'Chờ duyệt'   AND v_den IN ('Đã duyệt', 'Không duyệt', 'Hủy'))
      OR (v_tu = 'Không duyệt' AND v_den IN ('Chờ duyệt', 'Hủy'))
      OR (v_tu = 'Đã duyệt'    AND v_den = 'Hủy')
    ) THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Không chuyển được khen thưởng từ "%" sang "%". Quyết định đã duyệt chỉ còn đường huỷ; đã huỷ thì lập quyết định mới.',
        v_tu, v_den;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.fn_kiem_luat_trang_thai() IS
  'Chặn các bước chuyển trạng thái không hợp lệ. Thêm bảng mới = thêm một nhánh IF.';

DROP TRIGGER IF EXISTS tg_luat_trang_thai_ktnt_khen_thuong_nha_tai_tro ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE TRIGGER tg_luat_trang_thai_ktnt_khen_thuong_nha_tai_tro
  BEFORE UPDATE OF trang_thai ON public.ktnt_khen_thuong_nha_tai_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_kiem_luat_trang_thai();
