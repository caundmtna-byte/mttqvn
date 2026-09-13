-- ============================================================================
-- Nhà đại đoàn kết — tách quyền DUYỆT khỏi quyền SỬA
--
-- Trước bản này, "Đã phê duyệt" chỉ là một giá trị trong ô Trạng thái của form
-- sửa: ai sửa được hồ sơ thì tự phê duyệt được chính hồ sơ mình nhập. Đây đúng
-- là lỗ hổng đã gặp ở khen thưởng (xem
-- `20260731100000_seed_quyen_phe_duyet_khen_thuong.sql`).
--
-- Nay: đưa hồ sơ VÀO trạng thái 'Đã phê duyệt' đòi token `phe_duyet` trong
-- `var_phan_quyen`. Bốn trạng thái còn lại vẫn là thao tác nhập liệu bình
-- thường, chỉ cần `sua` — chặn hết sẽ làm tắc luồng làm việc thật.
--
-- CỐ Ý KHÔNG thêm nhánh vào `fn_kiem_luat_trang_thai`: module này không có luật
-- chuyển trạng thái cứng (một căn tạm dừng quay lại thực hiện, hoặc bàn giao
-- nhầm phải sửa lại, đều là chuyện bình thường). Ràng buộc duy nhất ở đây là
-- ràng buộc về QUYỀN, và nó được áp ở cả hai phía — trigger dưới đây và
-- `core/quyen-trang-thai.ts` ở client.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_nddk_kiem_quyen_phe_duyet()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Chỉ chặn lúc ĐƯA hồ sơ VÀO 'Đã phê duyệt'. Hồ sơ đang ở trạng thái đó mà
  -- sửa các trường khác thì không đụng tới, nếu không người nhập liệu sẽ không
  -- sửa nổi một lỗi chính tả trên hồ sơ đã duyệt.
  IF NEW.trang_thai = 'Đã phê duyệt'
     AND (TG_OP = 'INSERT' OR OLD.trang_thai IS DISTINCT FROM NEW.trang_thai) THEN
    -- fn_co_quyen đã bao gồm lối tắt cho quản trị / cap_bac = 1.
    IF NOT public.fn_co_quyen('nha-dai-doan-ket', 'phe_duyet') THEN
      RAISE EXCEPTION
        'PHE_DUYET_KHONG_DU_QUYEN: Bạn không có quyền Duyệt hồ sơ nhà đại đoàn kết.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_nddk_kiem_quyen_phe_duyet() IS
  'Chặn đưa hồ sơ nhà đại đoàn kết vào trạng thái "Đã phê duyệt" nếu thiếu quyền phe_duyet.';

DROP TRIGGER IF EXISTS trg_nddk_kiem_quyen_phe_duyet ON public.nddk_nha_dai_doan_ket;
CREATE TRIGGER trg_nddk_kiem_quyen_phe_duyet
  BEFORE INSERT OR UPDATE OF trang_thai ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.fn_nddk_kiem_quyen_phe_duyet();

-- ---------------------------------------------------------------------------
-- Seed token `phe_duyet`
--
-- KHÔNG một dòng nào trong `var_phan_quyen` có sẵn `phe_duyet`. Bật trigger mà
-- không seed = chỉ còn `cap_bac = 1` duyệt được, tức là đổi một lỗ hổng lấy một
-- ách tắc. Bản này giữ nguyên hành vi hiện tại — chức vụ nào đang sửa được thì
-- vẫn duyệt được — nhưng từ nay hai quyền TÁCH RỜI, cơ quan vào
-- Hệ thống → Phân quyền bỏ tích "Duyệt" ở các chức vụ chuyên nhập liệu.
--
-- Idempotent: chỉ thêm vào dòng chưa có, chạy lại không sinh 'phe_duyet,phe_duyet'.
-- ---------------------------------------------------------------------------
UPDATE public.var_phan_quyen
SET quyen = quyen || ',phe_duyet'
WHERE module_key = 'nha-dai-doan-ket'
  AND quyen ~ '(^|,)\s*sua\s*(,|$)'
  AND quyen !~ '(^|,)\s*phe_duyet\s*(,|$)';

NOTIFY pgrst, 'reload schema';
