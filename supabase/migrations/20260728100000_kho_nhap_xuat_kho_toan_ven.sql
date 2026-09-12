-- ============================================================================
-- Kho cứu trợ — vá 4 lỗ hổng toàn vẹn của sổ chứng từ `kho_nhap_xuat_kho`
--
--   (a) Phiếu không lưu NGƯỜI LẬP  → thêm `id_nguoi_tao` + trigger gán tự động
--   (b) XOÁ phiếu không kiểm tồn   → tồn có thể ÂM, không lỗi, không cảnh báo
--   (c) `so_phieu` mâu thuẫn loại  → chặn đổi `loai_phieu` sau khi đã phát số
--   (d) Kiểm tồn không khoá dòng   → hai người cùng xuất có thể vượt tồn
--
-- Nền cũ (20260612100000_kho_nhap_xuat_kho.sql) chỉ có một trigger
-- `BEFORE INSERT OR UPDATE` trên bảng chi tiết, và ngay câu đầu của hàm là
-- `IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;` — nghĩa là nhánh xoá được
-- viết ra rồi bỏ trống. Hệ quả thật: nhập 100 kg → xuất 100 kg → xoá phiếu
-- nhập ⇒ tồn −100.
--
-- ---------------------------------------------------------------------------
-- Vì sao lớp kiểm mới là CONSTRAINT TRIGGER **DEFERRABLE INITIALLY DEFERRED**
-- ---------------------------------------------------------------------------
-- Kiểm ngay từng dòng (immediate) sẽ báo sai ở hai luồng hợp lệ:
--
--   1. `rpc_kho_cap_nhat_phieu_nhap_xuat` sửa phiếu bằng cách XOÁ HẾT dòng chi
--      tiết rồi CHÈN LẠI. Giữa hai bước đó tồn tụt xuống âm một cách tạm thời.
--      Kiểm ngay ⇒ không ai sửa nổi một phiếu nhập đã xuất hết hàng.
--   2. Xoá nhiều phiếu cùng lúc (chọn nhiều dòng rồi Xoá). Postgres xoá lần
--      lượt từng dòng; nếu phiếu nhập bị xoá trước phiếu xuất tương ứng thì
--      kiểm ngay sẽ chặn, còn thứ tự ngược lại thì cho qua — cùng một thao tác
--      mà lúc được lúc không.
--
-- Kiểm hoãn đến lúc COMMIT chỉ nhìn TRẠNG THÁI CUỐI của giao dịch nên cả hai
-- luồng trên đều đúng, mà "tồn không bao giờ âm sau khi giao dịch xong" vẫn
-- được bảo đảm tuyệt đối.
--
-- Trigger `BEFORE INSERT/UPDATE` cũ vẫn giữ: nó báo sớm và báo đúng câu quen
-- thuộc "chỉ còn X, không đủ để xuất Y" cho trường hợp phổ biến nhất (xuất quá
-- tồn), không đợi tới COMMIT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (a) Người lập phiếu
--
-- `nguoi_giao_nhan TEXT` sẵn có KHÔNG phải người thao tác: đó là chuỗi tự do
-- gõ tay để in lên phiếu C30-HD/C21-HD (tên người mang hàng đến / nhận hàng).
-- Trước bản này, toàn bộ nghiệp vụ hàng/tiền cứu trợ không lưu ai lập phiếu.
--
-- Cột để NULL được vì 30 phiếu đã có từ trước không thể suy ngược ra người lập;
-- ép NOT NULL sẽ phải bịa dữ liệu. FK theo đúng khuôn 17 bảng khác đang dùng:
-- ON UPDATE CASCADE ON DELETE RESTRICT (không cho xoá nhân viên đã lập chứng từ).
-- ----------------------------------------------------------------------------
ALTER TABLE public.kho_nhap_xuat_kho
  ADD COLUMN IF NOT EXISTS id_nguoi_tao BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.kho_nhap_xuat_kho'::regclass
      AND conname  = 'kho_nhap_xuat_kho_id_nguoi_tao_fkey'
  ) THEN
    ALTER TABLE public.kho_nhap_xuat_kho
      ADD CONSTRAINT kho_nhap_xuat_kho_id_nguoi_tao_fkey
      FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien (id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_nguoi_tao
  ON public.kho_nhap_xuat_kho (id_nguoi_tao);

COMMENT ON COLUMN public.kho_nhap_xuat_kho.id_nguoi_tao IS
  'Nhân viên LẬP phiếu — do trigger gán từ phiên đăng nhập, không tin payload. '
  'Khác hẳn nguoi_giao_nhan (chuỗi tự do in lên phiếu).';

-- Chỉ GẮN trigger theo đúng khuôn của 20260726112000_id_nguoi_tao_server_side.sql.
-- KHÔNG sửa hàm `fn_gan_id_nguoi_tao()` — hàm đó do phần việc khác sở hữu.
DROP TRIGGER IF EXISTS tg_gan_id_nguoi_tao_kho_nhap_xuat_kho ON public.kho_nhap_xuat_kho;
CREATE TRIGGER tg_gan_id_nguoi_tao_kho_nhap_xuat_kho
  BEFORE INSERT ON public.kho_nhap_xuat_kho
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();

-- ----------------------------------------------------------------------------
-- (b)+(d) Hạ tầng kiểm tồn: đọc tồn, khoá, và báo lỗi tiếng Việt
-- ----------------------------------------------------------------------------

-- (d) Khoá theo kho, phạm vi GIAO DỊCH (tự nhả khi commit/rollback).
--
-- Vì sao advisory lock chứ không phải `SELECT ... FOR UPDATE`: tồn kho không
-- phải một DÒNG nào cả, nó là TỔNG của hai tập dòng ở hai bảng. Không có dòng
-- nào để khoá. Advisory lock đặt tên theo kho là thứ duy nhất hai giao dịch
-- cùng xuất một kho chắc chắn tranh nhau.
--
-- Khoá theo KHO (không theo từng hàng hoá) để tránh deadlock khi một phiếu
-- chuyển kho đụng nhiều mặt hàng; người gọi phải khoá theo THỨ TỰ TĂNG DẦN của
-- id kho khi có từ hai kho trở lên.
CREATE OR REPLACE FUNCTION public.fn_kho_khoa_kho(p_kho_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_kho_id IS NULL THEN
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('kho_ton_kho:' || p_kho_id::TEXT, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.fn_kho_khoa_kho(BIGINT) IS
  'Khoá tư vấn phạm vi giao dịch cho một kho — chống hai người cùng xuất vượt tồn.';

-- Kiểm TOÀN BỘ mặt hàng của một kho, báo lỗi nếu có mặt hàng nào âm.
--
-- Vì sao quét cả kho thay vì chỉ mặt hàng vừa đụng tới: lúc COMMIT, dòng chi
-- tiết (và có khi cả phiếu) đã bị xoá khỏi bảng nên không còn tra ngược ra
-- được danh sách hàng hoá bị ảnh hưởng. Quét theo kho thì luôn đúng, và chi
-- phí chỉ là một phép gộp trên đúng các dòng của kho đó.
CREATE OR REPLACE FUNCTION public.fn_kho_kiem_tra_ton_am(p_kho_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_am       RECORD;
  v_ten_kho  TEXT;
BEGIN
  IF p_kho_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.fn_kho_khoa_kho(p_kho_id);

  SELECT t.hang_hoa_id, t.ton, hh.ten_hang_hoa
  INTO v_am
  FROM (
    SELECT ct.hang_hoa_id, SUM(
             CASE WHEN m.kho_nhap_id = p_kho_id THEN ct.so_luong ELSE 0 END
             - CASE WHEN m.kho_xuat_id = p_kho_id THEN ct.so_luong ELSE 0 END
           )::NUMERIC(18,3) AS ton
    FROM public.kho_nhap_xuat_kho m
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
    WHERE m.kho_nhap_id = p_kho_id OR m.kho_xuat_id = p_kho_id
    GROUP BY ct.hang_hoa_id
  ) t
  LEFT JOIN public.kho_danh_sach_hang_hoa hh ON hh.id = t.hang_hoa_id
  WHERE t.ton < 0
  ORDER BY t.ton ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT ten_kho INTO v_ten_kho FROM public.kho_danh_sach_kho WHERE id = p_kho_id;

  RAISE EXCEPTION
    USING
      ERRCODE = 'P0001',
      MESSAGE = format(
        'TON_KHO_KHONG_DU: Không thực hiện được vì tồn kho sẽ âm. Hàng "%s" tại kho "%s" thiếu %s (tồn sau thao tác: %s). Hãy xoá hoặc sửa các phiếu XUẤT liên quan trước.',
        COALESCE(v_am.ten_hang_hoa, '?'),
        COALESCE(v_ten_kho, '?'),
        (-v_am.ton)::TEXT,
        v_am.ton::TEXT
      );
END;
$$;

COMMENT ON FUNCTION public.fn_kho_kiem_tra_ton_am(BIGINT) IS
  'Báo lỗi TON_KHO_KHONG_DU nếu kho có bất kỳ mặt hàng nào tồn âm.';

-- ----------------------------------------------------------------------------
-- (b) Trigger hoãn: bắt mọi đường làm tồn âm — kể cả XOÁ
-- ----------------------------------------------------------------------------

-- Trên bảng CHI TIẾT: tra kho của phiếu (phiếu còn thì kiểm, phiếu đã bị xoá
-- thì trigger của bảng phiếu lo).
CREATE OR REPLACE FUNCTION public.fn_kho_kiem_tra_ton_am_ct()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_phieu_id BIGINT;
  v_xuat     BIGINT;
  v_nhap     BIGINT;
  v_kho      BIGINT;
BEGIN
  v_phieu_id := COALESCE(NEW.phieu_id, OLD.phieu_id);

  SELECT kho_xuat_id, kho_nhap_id INTO v_xuat, v_nhap
  FROM public.kho_nhap_xuat_kho WHERE id = v_phieu_id;

  IF NOT FOUND THEN
    RETURN NULL;   -- phiếu đã bị xoá trong cùng giao dịch
  END IF;

  -- Thứ tự tăng dần ⇒ hai giao dịch chuyển kho chéo nhau không khoá chết nhau.
  FOR v_kho IN
    SELECT DISTINCT k FROM unnest(ARRAY[v_xuat, v_nhap]) AS k
    WHERE k IS NOT NULL ORDER BY k
  LOOP
    PERFORM public.fn_kho_kiem_tra_ton_am(v_kho);
  END LOOP;

  RETURN NULL;
END;
$$;

-- Trên bảng PHIẾU: OLD/NEW còn giữ id kho ngay cả khi phiếu bị xoá.
CREATE OR REPLACE FUNCTION public.fn_kho_kiem_tra_ton_am_phieu()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_kho BIGINT;
BEGIN
  -- Gom mọi kho dính tới thao tác: cả trước và sau khi sửa.
  FOR v_kho IN
    SELECT DISTINCT k FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.kho_xuat_id END,
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.kho_nhap_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.kho_xuat_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.kho_nhap_id END
    ]) AS k
    WHERE k IS NOT NULL
    ORDER BY k   -- thứ tự tăng dần ⇒ không deadlock với giao dịch khác
  LOOP
    PERFORM public.fn_kho_kiem_tra_ton_am(v_kho);
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_kho_nxk_ct_ton_am ON public.kho_nhap_xuat_kho_ct;
CREATE CONSTRAINT TRIGGER trg_kho_nxk_ct_ton_am
  AFTER INSERT OR UPDATE OR DELETE ON public.kho_nhap_xuat_kho_ct
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_kho_kiem_tra_ton_am_ct();

DROP TRIGGER IF EXISTS trg_kho_nxk_ton_am ON public.kho_nhap_xuat_kho;
CREATE CONSTRAINT TRIGGER trg_kho_nxk_ton_am
  AFTER INSERT OR UPDATE OR DELETE ON public.kho_nhap_xuat_kho
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_kho_kiem_tra_ton_am_phieu();

-- ----------------------------------------------------------------------------
-- (d) Khoá cho cả lớp kiểm NGAY đang có
--
-- Giữ nguyên câu báo lỗi cũ ("chỉ còn X, không đủ để xuất Y") vì client đã map
-- theo tiền tố TON_KHO_KHONG_DU. Chỉ thêm khoá trước khi đọc tồn: không có nó,
-- hai giao dịch cùng đọc "còn 100" rồi cùng xuất 100 và cùng thành công.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_kho_kiem_tra_ton_kho()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_kho_xuat_id   BIGINT;
  v_ton_kho       NUMERIC(18,3);
  v_ten_hang      TEXT;
  v_ten_kho       TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Nhánh xoá do trigger hoãn `trg_kho_nxk_ct_ton_am` lo (xem đầu file).
    RETURN OLD;
  END IF;

  SELECT kho_xuat_id INTO v_kho_xuat_id
  FROM public.kho_nhap_xuat_kho WHERE id = NEW.phieu_id;

  IF v_kho_xuat_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.fn_kho_khoa_kho(v_kho_xuat_id);

  -- Tồn kho hiện tại của (kho_xuat, hang_hoa) ĐÃ bao gồm dòng OLD nếu UPDATE.
  SELECT COALESCE(SUM(qty), 0) INTO v_ton_kho
  FROM (
    SELECT ct.so_luong AS qty
    FROM public.kho_nhap_xuat_kho m
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
    WHERE m.kho_nhap_id = v_kho_xuat_id
      AND ct.hang_hoa_id = NEW.hang_hoa_id
    UNION ALL
    SELECT -ct.so_luong AS qty
    FROM public.kho_nhap_xuat_kho m
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
    WHERE m.kho_xuat_id = v_kho_xuat_id
      AND ct.hang_hoa_id = NEW.hang_hoa_id
      AND ct.id <> COALESCE(NEW.id, -1)
  ) m;

  IF v_ton_kho - NEW.so_luong < 0 THEN
    SELECT ten_hang_hoa INTO v_ten_hang
    FROM public.kho_danh_sach_hang_hoa WHERE id = NEW.hang_hoa_id;
    SELECT ten_kho INTO v_ten_kho
    FROM public.kho_danh_sach_kho WHERE id = v_kho_xuat_id;

    RAISE EXCEPTION
      USING
        ERRCODE = 'P0001',
        MESSAGE = format(
          'TON_KHO_KHONG_DU: Hàng "%s" tại kho "%s" chỉ còn %s, không đủ để xuất %s.',
          COALESCE(v_ten_hang, '?'),
          COALESCE(v_ten_kho, '?'),
          v_ton_kho::TEXT,
          NEW.so_luong::TEXT
        );
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- (c) `so_phieu` phải khớp `loai_phieu` — CHẶN ĐỔI LOẠI PHIẾU
--
-- PHƯƠNG ÁN ĐÃ CHỌN: chặn đổi `loai_phieu`, KHÔNG sinh lại số phiếu.
--
-- Lý do — đây là SỔ CHỨNG TỪ, không phải bảng dữ liệu thường:
--
--   1. Số phiếu đã in ra giấy. Phiếu nhập/xuất kho cứu trợ (mẫu C30-HD,
--      C21-HD) được in, ký, đóng dấu và giao cho đơn vị cứu trợ hoặc đơn vị
--      nhận hàng giữ. Đổi số trong máy không đổi được tờ giấy đang nằm ở tay
--      người khác — đối chiếu sổ với chứng từ giấy sẽ lệch.
--
--   2. Sinh lại số sẽ để lại LỖ TRONG DÃY SỐ. Ba dãy PN/PX/PC chạy bằng
--      sequence tăng đều; bỏ một số giữa dãy trông hệt như một phiếu đã phát
--      hành rồi bị huỷ giấu đi — đúng thứ mà kiểm toán truy.
--
--   3. Đổi loại phiếu không chỉ đổi cái tên. `chk_kho_nxk_consistency` buộc
--      mỗi loại có bộ trường khác hẳn nhau (nhap_ngoai cần đơn vị cứu trợ,
--      xuat_ngoai cần đợt cứu trợ, chuyen_kho cần hai kho), và HƯỚNG của hàng
--      hoá đảo ngược. Một "phiếu nhập" thành "phiếu xuất" không phải là sửa
--      sai sót, đó là một chứng từ khác.
--
-- Cách xử lý đúng khi lập nhầm loại: XOÁ phiếu lập sai (tồn được kiểm ở mục b
-- nên không xoá bừa được) rồi lập phiếu mới đúng loại.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_kho_chan_doi_loai_phieu()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.loai_phieu IS DISTINCT FROM OLD.loai_phieu THEN
    RAISE EXCEPTION
      USING
        ERRCODE = 'P0001',
        MESSAGE = format(
          'LOAI_PHIEU_KHONG_DOI_DUOC: Phiếu "%s" đã phát hành theo loại "%s" nên không đổi sang "%s" được. Số phiếu đã in và đã vào sổ. Hãy xoá phiếu lập sai rồi lập phiếu mới đúng loại.',
          OLD.so_phieu, OLD.loai_phieu, NEW.loai_phieu
        );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kho_nxk_chan_doi_loai ON public.kho_nhap_xuat_kho;
CREATE TRIGGER trg_kho_nxk_chan_doi_loai
  BEFORE UPDATE OF loai_phieu ON public.kho_nhap_xuat_kho
  FOR EACH ROW EXECUTE FUNCTION public.fn_kho_chan_doi_loai_phieu();

NOTIFY pgrst, 'reload schema';
