-- ============================================================================
-- An sinh xã hội — Chương trình vì người nghèo
--
-- Một dòng = MỘT KHOẢN HỖ TRỢ trao cho một người/hộ (Tết vì người nghèo, cứu
-- trợ, sinh kế, học sinh nghèo, chữa bệnh…). Bảng GIAO DỊCH: tăng theo từng
-- đợt, không có trần tự nhiên ⇒ phân trang phía máy chủ bằng RPC
-- `get_vnn_page`, không phải phân trang client.
--
-- Đây là NGUỒN DUY NHẤT của các khoản hỗ trợ. Bảng con `hngh_ho_tro_ct` (màn
-- Thông tin hộ nghèo) trùng gần hết nghiệp vụ nên được gộp vào đây ở migration
-- kế tiếp; màn hộ nghèo đọc lại qua `ho_ngheo_id`. Hai nơi nhập tay cùng một
-- khoản là báo cáo lệch.
--
-- Liên kết:
--   · ho_ngheo_id       → hngh_thong_tin_ho_ngheo (tuỳ chọn). Người nhận không
--                         nằm trong danh sách hộ nghèo vẫn nhập tay được, nên
--                         bảng GIỮ cột họ tên / xã / khối xóm / đối tượng riêng —
--                         đúng cách `nddk_nha_dai_doan_ket` đang làm.
--   · xa_phuong_id      → var_ssn_xa_phuong — cũng là khoá phạm vi xem.
--   · don_vi_ho_tro_id  → kho_don_vi_cuu_tro ("Đơn vị, cá nhân hỗ trợ").
--
-- Danh mục là ENUM CỨNG bằng CHECK, nguồn sự thật đối chiếu 1-1 ở client:
-- `features/nha-dai-doan-ket/vi-nguoi-ngheo/core/constants.ts`.
-- Sửa một bên phải sửa cả bên kia.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vnn_chuong_trinh (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Chữ tự do mô tả đợt/trường hợp ("Tết vì người nghèo 2026"); khác
  -- `linh_vuc_ho_tro` là danh mục để thống kê.
  noi_dung_ho_tro           TEXT NOT NULL,
  nam                       INTEGER NOT NULL
                            CHECK (nam BETWEEN 2000 AND 2100),
  linh_vuc_ho_tro           TEXT NOT NULL
                            CHECK (linh_vuc_ho_tro IN (
                              'Tết vì người nghèo', 'Cứu trợ', 'Mô hình sinh kế',
                              'Học sinh nghèo', 'Chữa bệnh', 'Nhà bị sập',
                              'Người chết', 'Hoả hoạn'
                            )),
  nguon                     TEXT NOT NULL DEFAULT 'Vì người nghèo'
                            CHECK (nguon IN ('Vì người nghèo', 'Cứu trợ', 'Ngân sách')),
  -- Cùng bộ giá trị với Nhà đại đoàn kết để hai module cộng chung được.
  nguon_ho_tro              TEXT NOT NULL DEFAULT 'Cấp tỉnh'
                            CHECK (nguon_ho_tro IN ('Cấp tỉnh', 'Cấp xã', 'Ủng hộ trực tiếp', 'Trung ương')),
  -- ON DELETE SET NULL: xoá một hộ chỉ GỠ liên kết. Khoản hỗ trợ đã có họ tên,
  -- xã, số tiền riêng — là lịch sử chi, không được mất theo hộ.
  ho_ngheo_id               BIGINT
                            CONSTRAINT vnn_chuong_trinh_ho_ngheo_id_fkey
                            REFERENCES public.hngh_thong_tin_ho_ngheo (id)
                            ON UPDATE CASCADE ON DELETE SET NULL,
  ho_ten_nguoi_nhan         TEXT NOT NULL,
  xa_phuong_id              BIGINT
                            CONSTRAINT vnn_chuong_trinh_xa_phuong_id_fkey
                            REFERENCES public.var_ssn_xa_phuong (id)
                            ON UPDATE CASCADE ON DELETE SET NULL,
  khoi_xom                  TEXT,
  doi_tuong                 TEXT
                            CHECK (doi_tuong IS NULL OR doi_tuong IN ('Hộ nghèo', 'Cận nghèo', 'Khó khăn')),
  hinh_thuc_ho_tro          TEXT NOT NULL DEFAULT 'Tiền mặt'
                            CHECK (hinh_thuc_ho_tro IN ('Tiền mặt', 'Quà và Tiền', 'Quà')),
  -- Để trống được: khoản chỉ có quà, hoặc đang khảo sát chưa chốt mức.
  so_tien                   NUMERIC(15, 0)
                            CHECK (so_tien IS NULL OR so_tien >= 0),
  trang_thai                TEXT NOT NULL DEFAULT 'Đang khảo sát'
                            CHECK (trang_thai IN ('Đang khảo sát', 'Đã nhận')),
  -- Máy chủ gán, KHÔNG nhận từ client — xem trigger fn_vnn_set_ngay_trang_thai.
  ngay_cap_nhat_trang_thai  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- RESTRICT: xoá một nhà tài trợ đang đứng tên khoản hỗ trợ là xoá mất nguồn
  -- tiền của khoản đó. Muốn xoá thì gỡ khỏi các khoản trước.
  don_vi_ho_tro_id          BIGINT
                            CONSTRAINT vnn_chuong_trinh_don_vi_ho_tro_id_fkey
                            REFERENCES public.kho_don_vi_cuu_tro (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  -- Cũng là "lý do đổi trạng thái": fn_ghi_lich_su_trang_thai() chụp cột này.
  ghi_chu                   TEXT,
  id_nguoi_tao              BIGINT NOT NULL
                            CONSTRAINT vnn_chuong_trinh_id_nguoi_tao_fkey
                            REFERENCES public.var_nhan_vien (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vnn_chuong_trinh IS
  'Chương trình vì người nghèo — mỗi dòng một khoản hỗ trợ trao cho một người/hộ.';
COMMENT ON COLUMN public.vnn_chuong_trinh.ho_ngheo_id IS
  'Hộ nghèo nhận khoản này (tuỳ chọn) — FK hngh_thong_tin_ho_ngheo.';
COMMENT ON COLUMN public.vnn_chuong_trinh.don_vi_ho_tro_id IS
  'Đơn vị, cá nhân hỗ trợ — FK kho_don_vi_cuu_tro.';
COMMENT ON COLUMN public.vnn_chuong_trinh.ngay_cap_nhat_trang_thai IS
  'Ngày cập nhật trạng thái — máy chủ gán, form không có ô nhập.';

-- ---------------------------------------------------------------------------
-- Index — Postgres không tự đánh index cho khoá ngoại
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_vnn_nam          ON public.vnn_chuong_trinh (nam DESC);
CREATE INDEX IF NOT EXISTS idx_vnn_trang_thai   ON public.vnn_chuong_trinh (trang_thai);
CREATE INDEX IF NOT EXISTS idx_vnn_linh_vuc     ON public.vnn_chuong_trinh (linh_vuc_ho_tro);
CREATE INDEX IF NOT EXISTS idx_vnn_xa_phuong    ON public.vnn_chuong_trinh (xa_phuong_id);
CREATE INDEX IF NOT EXISTS idx_vnn_ho_ngheo     ON public.vnn_chuong_trinh (ho_ngheo_id);
CREATE INDEX IF NOT EXISTS idx_vnn_don_vi_ho_tro ON public.vnn_chuong_trinh (don_vi_ho_tro_id);
CREATE INDEX IF NOT EXISTS idx_vnn_nguoi_tao    ON public.vnn_chuong_trinh (id_nguoi_tao);
CREATE INDEX IF NOT EXISTS idx_vnn_nguoi_nhan_lower
  ON public.vnn_chuong_trinh (lower(btrim(ho_ten_nguoi_nhan)));

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_vnn_updated ON public.vnn_chuong_trinh;
CREATE TRIGGER trg_vnn_updated
  BEFORE UPDATE ON public.vnn_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- Bảng sinh sau vòng đăng ký tự động của fn_gan_id_nguoi_tao phải tự gắn tay —
-- thiếu là phải tin vào id_nguoi_tao do trình duyệt khai.
DROP TRIGGER IF EXISTS tg_gan_id_nguoi_tao_vnn_chuong_trinh ON public.vnn_chuong_trinh;
CREATE TRIGGER tg_gan_id_nguoi_tao_vnn_chuong_trinh
  BEFORE INSERT ON public.vnn_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();

CREATE OR REPLACE FUNCTION public.fn_vnn_set_ngay_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.ngay_cap_nhat_trang_thai := now();
  ELSIF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    NEW.ngay_cap_nhat_trang_thai := now();
  ELSE
    NEW.ngay_cap_nhat_trang_thai := OLD.ngay_cap_nhat_trang_thai;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vnn_ngay_trang_thai ON public.vnn_chuong_trinh;
CREATE TRIGGER trg_vnn_ngay_trang_thai
  BEFORE INSERT OR UPDATE ON public.vnn_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.fn_vnn_set_ngay_trang_thai();

-- Vết đổi trạng thái. KHÔNG gắn fn_kiem_luat_trang_thai và KHÔNG đòi quyền
-- `phe_duyet`: "Đã nhận" ghi nhận một việc đã xảy ra ngoài đời (tiền/quà đã
-- trao tay), không phải một quyết định cần ai phê; ghi nhầm thì phải lùi được.
DROP TRIGGER IF EXISTS tg_lich_su_trang_thai_vnn_chuong_trinh ON public.vnn_chuong_trinh;
CREATE TRIGGER tg_lich_su_trang_thai_vnn_chuong_trinh
  AFTER UPDATE OF trang_thai ON public.vnn_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();

-- Bảng có tiền ⇒ ghi nhật ký thêm/sửa/xoá như bảng hộ nghèo.
DROP TRIGGER IF EXISTS tg_audit_vnn_chuong_trinh ON public.vnn_chuong_trinh;
CREATE TRIGGER tg_audit_vnn_chuong_trinh
  AFTER INSERT OR UPDATE OR DELETE ON public.vnn_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();

-- ---------------------------------------------------------------------------
-- RLS — đọc mở, GHI siết theo ma trận var_phan_quyen (module_key 'vi-nguoi-ngheo')
-- ---------------------------------------------------------------------------

ALTER TABLE public.vnn_chuong_trinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vnn_chuong_trinh_doc ON public.vnn_chuong_trinh;
CREATE POLICY vnn_chuong_trinh_doc ON public.vnn_chuong_trinh
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vnn_chuong_trinh_them ON public.vnn_chuong_trinh;
CREATE POLICY vnn_chuong_trinh_them ON public.vnn_chuong_trinh
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_co_quyen('vi-nguoi-ngheo', 'them'));

DROP POLICY IF EXISTS vnn_chuong_trinh_sua ON public.vnn_chuong_trinh;
CREATE POLICY vnn_chuong_trinh_sua ON public.vnn_chuong_trinh
  FOR UPDATE TO authenticated
  USING (public.fn_co_quyen('vi-nguoi-ngheo', 'sua'))
  WITH CHECK (public.fn_co_quyen('vi-nguoi-ngheo', 'sua'));

DROP POLICY IF EXISTS vnn_chuong_trinh_xoa ON public.vnn_chuong_trinh;
CREATE POLICY vnn_chuong_trinh_xoa ON public.vnn_chuong_trinh
  FOR DELETE TO authenticated
  USING (public.fn_co_quyen('vi-nguoi-ngheo', 'xoa'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vnn_chuong_trinh TO authenticated;

NOTIFY pgrst, 'reload schema';
