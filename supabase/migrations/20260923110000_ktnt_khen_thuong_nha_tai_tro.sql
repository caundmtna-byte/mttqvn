-- ============================================================================
-- An sinh xã hội — Khen thưởng nhà tài trợ
--
-- Một dòng = MỘT quyết định khen một nhà tài trợ. Bảng GIAO DỊCH (tăng theo
-- từng đợt khen, không có trần) ⇒ phân trang phía máy chủ bằng `get_ktnt_page`.
--
-- Bảng KHÔNG lưu thông tin người nghèo. "Thành tích" của nhà tài trợ — các
-- khoản đã hỗ trợ, cho ai, bao nhiêu tiền — đọc thẳng từ `vnn_chuong_trinh`
-- theo `don_vi_ho_tro_id` trong kỳ thành tích. Chép sang đây là nguồn sự thật
-- thứ hai, sửa một khoản bên kia thì quyết định khen bên này lệch số.
--
-- Liên kết:
--   · nha_tai_tro_id → kho_don_vi_cuu_tro (danh mục Đơn vị cứu trợ).
--   · xa_phuong_id   → var_ssn_xa_phuong: xã của đơn vị khen khi `cap_khen =
--                      'Cấp xã'` (bắt buộc), NULL với cấp khác. Cũng là khoá
--                      phạm vi xem của cán bộ cấp xã.
--
-- Danh mục là ENUM CỨNG bằng CHECK; nguồn đối chiếu ở client:
-- `features/nha-dai-doan-ket/khen-thuong-nha-tai-tro/core/constants.ts`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ktnt_khen_thuong_nha_tai_tro (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  noi_dung_khen             TEXT NOT NULL,
  ngay_khen                 DATE NOT NULL,
  so_quyet_dinh             TEXT,
  cap_khen                  TEXT NOT NULL DEFAULT 'Cấp tỉnh'
                            CHECK (cap_khen IN ('Trung ương', 'Cấp tỉnh', 'Cấp xã')),
  don_vi_khen               TEXT,
  xa_phuong_id              BIGINT
                            CONSTRAINT ktnt_khen_thuong_nha_tai_tro_xa_phuong_id_fkey
                            REFERENCES public.var_ssn_xa_phuong (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  -- RESTRICT: xoá nhà tài trợ đang có quyết định khen là xoá mất người được khen.
  nha_tai_tro_id            BIGINT NOT NULL
                            CONSTRAINT ktnt_khen_thuong_nha_tai_tro_nha_tai_tro_id_fkey
                            REFERENCES public.kho_don_vi_cuu_tro (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  -- Kỳ thành tích: chỉ các khoản hỗ trợ có `nam` trong khoảng này được tính.
  -- NULL một đầu = không giới hạn đầu đó.
  nam_thanh_tich_tu         INTEGER CHECK (nam_thanh_tich_tu BETWEEN 2000 AND 2100),
  nam_thanh_tich_den        INTEGER CHECK (nam_thanh_tich_den BETWEEN 2000 AND 2100),
  -- Đóng góp KHÔNG đi qua Chương trình vì người nghèo (tài trợ công trình,
  -- ủng hộ quỹ…) — nhập tay, cộng thêm vào tổng thành tích.
  gia_tri_dong_gop_khac     NUMERIC(15, 0)
                            CHECK (gia_tri_dong_gop_khac IS NULL OR gia_tri_dong_gop_khac >= 0),
  trang_thai                TEXT NOT NULL DEFAULT 'Chờ duyệt'
                            CHECK (trang_thai IN ('Chờ duyệt', 'Đã duyệt', 'Không duyệt', 'Hủy')),
  -- Ba cột dưới do máy chủ gán — form không có ô nhập.
  ngay_cap_nhat_trang_thai  TIMESTAMPTZ NOT NULL DEFAULT now(),
  nguoi_duyet_id            BIGINT
                            CONSTRAINT ktnt_khen_thuong_nha_tai_tro_nguoi_duyet_id_fkey
                            REFERENCES public.var_nhan_vien (id)
                            ON UPDATE CASCADE ON DELETE SET NULL,
  tg_duyet                  TIMESTAMPTZ,
  -- Cũng là "lý do đổi trạng thái": fn_ghi_lich_su_trang_thai() chụp cột này.
  ghi_chu                   TEXT,
  id_nguoi_tao              BIGINT NOT NULL
                            CONSTRAINT ktnt_khen_thuong_nha_tai_tro_id_nguoi_tao_fkey
                            REFERENCES public.var_nhan_vien (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Cấp xã thì phải biết xã nào; cấp khác mà gắn xã là dữ liệu lai, và làm cán
  -- bộ xã đó "thấy" một quyết định cấp tỉnh.
  CONSTRAINT ktnt_xa_phuong_theo_cap_chk CHECK (
    (cap_khen = 'Cấp xã' AND xa_phuong_id IS NOT NULL)
    OR (cap_khen <> 'Cấp xã' AND xa_phuong_id IS NULL)
  ),
  CONSTRAINT ktnt_ky_thanh_tich_chk CHECK (
    nam_thanh_tich_tu IS NULL OR nam_thanh_tich_den IS NULL
    OR nam_thanh_tich_tu <= nam_thanh_tich_den
  )
);

COMMENT ON TABLE public.ktnt_khen_thuong_nha_tai_tro IS
  'Khen thưởng nhà tài trợ — mỗi dòng một quyết định khen; thành tích đọc từ vnn_chuong_trinh.';

CREATE INDEX IF NOT EXISTS idx_ktnt_ngay_khen    ON public.ktnt_khen_thuong_nha_tai_tro (ngay_khen DESC);
CREATE INDEX IF NOT EXISTS idx_ktnt_trang_thai   ON public.ktnt_khen_thuong_nha_tai_tro (trang_thai);
CREATE INDEX IF NOT EXISTS idx_ktnt_cap_khen     ON public.ktnt_khen_thuong_nha_tai_tro (cap_khen);
CREATE INDEX IF NOT EXISTS idx_ktnt_xa_phuong    ON public.ktnt_khen_thuong_nha_tai_tro (xa_phuong_id);
CREATE INDEX IF NOT EXISTS idx_ktnt_nha_tai_tro  ON public.ktnt_khen_thuong_nha_tai_tro (nha_tai_tro_id);
CREATE INDEX IF NOT EXISTS idx_ktnt_nguoi_duyet  ON public.ktnt_khen_thuong_nha_tai_tro (nguoi_duyet_id);
CREATE INDEX IF NOT EXISTS idx_ktnt_nguoi_tao    ON public.ktnt_khen_thuong_nha_tai_tro (id_nguoi_tao);

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_ktnt_updated ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE TRIGGER trg_ktnt_updated
  BEFORE UPDATE ON public.ktnt_khen_thuong_nha_tai_tro
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

DROP TRIGGER IF EXISTS tg_gan_id_nguoi_tao_ktnt_khen_thuong_nha_tai_tro ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE TRIGGER tg_gan_id_nguoi_tao_ktnt_khen_thuong_nha_tai_tro
  BEFORE INSERT ON public.ktnt_khen_thuong_nha_tai_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();

/**
 * Máy chủ gán ngày trạng thái và người duyệt:
 *   · ngày trạng thái đổi mỗi khi trạng thái đổi;
 *   · vào 'Đã duyệt' / 'Không duyệt' ⇒ ghi người + thời điểm ra quyết định;
 *   · rời hai trạng thái đó ⇒ xoá, tránh "đã duyệt bởi X" trên hồ sơ đang chờ.
 * Client gửi lên các cột này cũng bị ghi đè.
 */
CREATE OR REPLACE FUNCTION public.fn_ktnt_gan_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    NEW.ngay_cap_nhat_trang_thai := now();
    IF NEW.trang_thai IN ('Đã duyệt', 'Không duyệt') THEN
      NEW.nguoi_duyet_id := public.fn_nhan_vien_id_hien_tai();
      NEW.tg_duyet := now();
    ELSIF NEW.trang_thai = 'Hủy' AND TG_OP = 'UPDATE' THEN
      -- Huỷ một quyết định đã duyệt vẫn giữ vết ai đã duyệt nó.
      NEW.nguoi_duyet_id := OLD.nguoi_duyet_id;
      NEW.tg_duyet := OLD.tg_duyet;
    ELSE
      NEW.nguoi_duyet_id := NULL;
      NEW.tg_duyet := NULL;
    END IF;
  ELSE
    NEW.ngay_cap_nhat_trang_thai := OLD.ngay_cap_nhat_trang_thai;
    NEW.nguoi_duyet_id := OLD.nguoi_duyet_id;
    NEW.tg_duyet := OLD.tg_duyet;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ktnt_gan_trang_thai ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE TRIGGER trg_ktnt_gan_trang_thai
  BEFORE INSERT OR UPDATE ON public.ktnt_khen_thuong_nha_tai_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_ktnt_gan_trang_thai();

/**
 * Quyền DUYỆT tách khỏi quyền SỬA: người nhập liệu không tự duyệt được hồ sơ
 * khen của chính mình (bài học 20260731100000 ở khen thưởng cán bộ).
 * Chỉ chặn lúc ĐƯA vào 'Đã duyệt' / 'Không duyệt'; sửa chính tả trên hồ sơ đã
 * duyệt thì không đụng.
 */
CREATE OR REPLACE FUNCTION public.fn_ktnt_kiem_quyen_phe_duyet()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trang_thai IN ('Đã duyệt', 'Không duyệt')
     AND (TG_OP = 'INSERT' OR OLD.trang_thai IS DISTINCT FROM NEW.trang_thai) THEN
    IF NOT public.fn_co_quyen('khen-thuong-nha-tai-tro', 'phe_duyet') THEN
      RAISE EXCEPTION
        'PHE_DUYET_KHONG_DU_QUYEN: Bạn không có quyền Duyệt khen thưởng nhà tài trợ.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ktnt_kiem_quyen_phe_duyet ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE TRIGGER trg_ktnt_kiem_quyen_phe_duyet
  BEFORE INSERT OR UPDATE OF trang_thai ON public.ktnt_khen_thuong_nha_tai_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_ktnt_kiem_quyen_phe_duyet();

DROP TRIGGER IF EXISTS tg_lich_su_trang_thai_ktnt_khen_thuong_nha_tai_tro ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE TRIGGER tg_lich_su_trang_thai_ktnt_khen_thuong_nha_tai_tro
  AFTER UPDATE OF trang_thai ON public.ktnt_khen_thuong_nha_tai_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();

DROP TRIGGER IF EXISTS tg_audit_ktnt_khen_thuong_nha_tai_tro ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE TRIGGER tg_audit_ktnt_khen_thuong_nha_tai_tro
  AFTER INSERT OR UPDATE OR DELETE ON public.ktnt_khen_thuong_nha_tai_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();

-- ---------------------------------------------------------------------------
-- RLS — đọc mở, GHI siết theo ma trận (module_key 'khen-thuong-nha-tai-tro')
-- ---------------------------------------------------------------------------

ALTER TABLE public.ktnt_khen_thuong_nha_tai_tro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ktnt_doc ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE POLICY ktnt_doc ON public.ktnt_khen_thuong_nha_tai_tro
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ktnt_them ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE POLICY ktnt_them ON public.ktnt_khen_thuong_nha_tai_tro
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_co_quyen('khen-thuong-nha-tai-tro', 'them'));

DROP POLICY IF EXISTS ktnt_sua ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE POLICY ktnt_sua ON public.ktnt_khen_thuong_nha_tai_tro
  FOR UPDATE TO authenticated
  USING (public.fn_co_quyen('khen-thuong-nha-tai-tro', 'sua'))
  WITH CHECK (public.fn_co_quyen('khen-thuong-nha-tai-tro', 'sua'));

DROP POLICY IF EXISTS ktnt_xoa ON public.ktnt_khen_thuong_nha_tai_tro;
CREATE POLICY ktnt_xoa ON public.ktnt_khen_thuong_nha_tai_tro
  FOR DELETE TO authenticated
  USING (public.fn_co_quyen('khen-thuong-nha-tai-tro', 'xoa'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ktnt_khen_thuong_nha_tai_tro TO authenticated;

NOTIFY pgrst, 'reload schema';
