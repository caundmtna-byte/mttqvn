-- ============================================================================
-- Thông tin hộ nghèo — siết thêm bốn chỗ hở phát hiện khi rà soát lại thiết kế.
--
-- Chạy ngay sau migration tạo bảng, trước khi có dữ liệu thật.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Chuẩn hoá chuỗi trước khi lưu
--
-- Unique index `uq_hngh_so_cccd` so trên `btrim(so_cccd)`, mà `btrim` chỉ cắt
-- hai ĐẦU. '012 345 678 901' và '012345678901' là cùng một người nhưng lọt qua
-- unique — tức ràng buộc "không trùng" vô hiệu ngay với cách gõ phổ biến nhất.
--
-- Trigger làm sạch GIÁ TRỊ LƯU chứ không chỉ làm sạch ở index: nhờ vậy xuất
-- Excel, tìm kiếm ILIKE và đối chiếu với hệ khác đều nhất quán.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_hngh_chuan_hoa()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ho_ten_dai_dien := regexp_replace(btrim(NEW.ho_ten_dai_dien), '\s+', ' ', 'g');
  -- Bóc MỌI khoảng trắng kể cả ở giữa; chuỗi rỗng về NULL để không đụng unique.
  NEW.so_cccd      := nullif(regexp_replace(coalesce(NEW.so_cccd, ''), '\s+', '', 'g'), '');
  NEW.so_tai_khoan := nullif(regexp_replace(coalesce(NEW.so_tai_khoan, ''), '\s+', '', 'g'), '');
  NEW.dien_thoai   := nullif(regexp_replace(coalesce(NEW.dien_thoai, ''), '\s+', '', 'g'), '');
  NEW.ngan_hang    := nullif(btrim(coalesce(NEW.ngan_hang, '')), '');
  NEW.khoi_xom     := nullif(btrim(coalesce(NEW.khoi_xom, '')), '');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_hngh_chuan_hoa() IS
  'BEFORE INSERT/UPDATE: bóc khoảng trắng, đổi chuỗi rỗng thành NULL. Chạy trước mọi CHECK và trước unique index so_cccd.';

DROP TRIGGER IF EXISTS trg_hngh_chuan_hoa ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER trg_hngh_chuan_hoa
  BEFORE INSERT OR UPDATE ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_chuan_hoa();

-- ---------------------------------------------------------------------------
-- 2. Tên hộ không được là chuỗi rỗng
--
-- `NOT NULL` một mình cho qua ''. Một hộ tên rỗng là dòng ma giữa danh sách:
-- tìm không ra, mà xoá thì không ai dám vì không biết đó là hồ sơ của ai.
-- ---------------------------------------------------------------------------

ALTER TABLE public.hngh_thong_tin_ho_ngheo
  DROP CONSTRAINT IF EXISTS hngh_ho_ten_dai_dien_chk;
ALTER TABLE public.hngh_thong_tin_ho_ngheo
  ADD CONSTRAINT hngh_ho_ten_dai_dien_chk CHECK (btrim(ho_ten_dai_dien) <> '');

-- ---------------------------------------------------------------------------
-- 3. Nhật ký thay đổi cho cả hai bảng
--
-- Đây là CCCD + số tài khoản ngân hàng + tiền — nhóm dữ liệu nhạy cảm ngang
-- `kho_nhap_xuat_kho` và `mttq_tang_luong` đã được bật audit. Phải gắn tay:
-- vòng đăng ký tự động trong 20260726111000 chỉ chạy cho các bảng tồn tại
-- ngày đó.
--
-- Trigger dòng VẪN nổ khi dòng con bị xoá theo CASCADE, nên xoá một hộ vẫn để
-- lại đủ vết từng khoản hỗ trợ để dựng lại.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS tg_audit_hngh_thong_tin_ho_ngheo ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER tg_audit_hngh_thong_tin_ho_ngheo
  AFTER INSERT OR UPDATE OR DELETE ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();

DROP TRIGGER IF EXISTS tg_audit_hngh_ho_tro_ct ON public.hngh_ho_tro_ct;
CREATE TRIGGER tg_audit_hngh_ho_tro_ct
  AFTER INSERT OR UPDATE OR DELETE ON public.hngh_ho_tro_ct
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();

-- ---------------------------------------------------------------------------
-- 4. Quyền DUYỆT tách khỏi quyền SỬA — trên bảng con
--
-- Bảng con có trạng thái 'Đã phê duyệt' và cột `so_tien`: đúng cặp đã sinh ra
-- lỗ hổng ở khen thưởng (20260731100000) rồi ở nhà đại đoàn kết
-- (20260913103000) — người nhập liệu tự phê duyệt khoản chi của chính mình.
-- Không gác ở đây là mở lại đúng lỗ hổng vừa vá.
--
-- Chỉ chặn lúc ĐƯA khoản VÀO 'Đã phê duyệt'. Sửa chính tả trên khoản đã duyệt
-- thì không đụng, nếu không người nhập liệu không sửa nổi một lỗi gõ.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_hngh_ct_kiem_quyen_phe_duyet()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trang_thai = 'Đã phê duyệt'
     AND (TG_OP = 'INSERT' OR OLD.trang_thai IS DISTINCT FROM NEW.trang_thai) THEN
    -- fn_co_quyen đã bao gồm lối tắt cho quản trị / cap_bac = 1.
    IF NOT public.fn_co_quyen('thong-tin-ho-ngheo', 'phe_duyet') THEN
      RAISE EXCEPTION
        'PHE_DUYET_KHONG_DU_QUYEN: Bạn không có quyền Duyệt khoản hỗ trợ hộ nghèo.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hngh_ct_kiem_quyen_phe_duyet ON public.hngh_ho_tro_ct;
CREATE TRIGGER trg_hngh_ct_kiem_quyen_phe_duyet
  BEFORE INSERT OR UPDATE OF trang_thai ON public.hngh_ho_tro_ct
  FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_ct_kiem_quyen_phe_duyet();

-- Không dòng phân quyền nào có sẵn `phe_duyet`. Bật trigger mà không seed là
-- đổi một lỗ hổng lấy một ách tắc: chỉ còn cap_bac = 1 duyệt được.
-- Seed đúng những chức vụ đang có `sua` để giữ nguyên hành vi, rồi để cơ quan
-- tự bỏ tích dần trên màn Phân quyền.
UPDATE public.var_phan_quyen
SET quyen = quyen || ',phe_duyet'
WHERE module_key = 'thong-tin-ho-ngheo'
  AND quyen ~ '(^|,)\s*sua\s*(,|$)'
  AND quyen !~ '(^|,)\s*phe_duyet\s*(,|$)';

-- ---------------------------------------------------------------------------
-- 5. Chặn xoá hộ còn khoản đã bàn giao
--
-- Bảng con để ON DELETE CASCADE (khoản hỗ trợ không có nghĩa khi tách khỏi
-- hộ), nhưng 'Đã bàn giao' nghĩa là tiền/hiện vật đã trao tay. Một cú bấm nhầm
-- nút Xoá ở màn danh sách không được phép xoá sạch lịch sử chi của một hộ.
-- Muốn xoá thật thì xử lý từng khoản trước — đúng trình tự nghiệp vụ.
--
-- Trigger nằm ở BẢNG CHA: đến lúc trigger bảng con chạy thì lệnh DELETE đã
-- được chấp nhận rồi.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_hngh_chan_xoa_da_ban_giao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_so_khoan integer;
BEGIN
  SELECT count(*) INTO v_so_khoan
  FROM public.hngh_ho_tro_ct c
  WHERE c.ho_ngheo_id = OLD.id AND c.trang_thai = 'Đã bàn giao';

  IF v_so_khoan > 0 THEN
    RAISE EXCEPTION
      'XOA_KHONG_HOP_LE: Hộ này còn % khoản hỗ trợ đã bàn giao. Xoá hộ sẽ xoá luôn lịch sử chi. Hãy xử lý các khoản đó trước.',
      v_so_khoan;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_hngh_chan_xoa_da_ban_giao ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER trg_hngh_chan_xoa_da_ban_giao
  BEFORE DELETE ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_chan_xoa_da_ban_giao();

NOTIFY pgrst, 'reload schema';
