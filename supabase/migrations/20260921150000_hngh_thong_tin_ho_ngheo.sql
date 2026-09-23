-- ============================================================================
-- An sinh xã hội — Thông tin hộ nghèo
--
-- Một dòng = một HỘ. Bảng GIAO DỊCH: danh sách hộ tăng dần theo từng đợt rà
-- soát, không có trần tự nhiên ⇒ phân trang phía máy chủ bằng RPC
-- `get_hngh_page` (migration kế tiếp), không phải phân trang client.
--
-- Các khoản hỗ trợ ĐÃ NHẬN nằm ở bảng con `hngh_ho_tro_ct` (một hộ nhận hỗ trợ
-- nhiều lần qua các năm). Nhà đại đoàn kết KHÔNG chép cột sang đây mà liên kết
-- bằng `nddk_nha_dai_doan_ket.ho_ngheo_id` — chép cột là hai nơi phải khớp nhau,
-- sửa một bên quên bên kia là báo cáo sai.
--
-- Danh mục Đối tượng và Trạng thái khoản hỗ trợ dùng CHUNG bộ giá trị với
-- Nhà đại đoàn kết để hai module cộng chung được trên báo cáo. Đó là ENUM CỨNG
-- bằng CHECK, nguồn sự thật đối chiếu là
-- `features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/constants.ts`.
-- Sửa một bên phải sửa cả bên kia.
--
-- Riêng DÂN TỘC là khoá ngoại sang danh mục dùng chung `mttq_thiet_lap`
-- (loai = 'dan_toc') — cơ quan tự thêm/sửa dân tộc trên màn Thiết lập MTTQ,
-- không cần lập trình viên. Đúng cách `mttq_can_bo` đang làm.
--
-- KHÔNG có cột "STT": số thứ tự là số dòng hiển thị trên bảng. Bảng phân trang
-- phía máy chủ, lọc và sắp xếp đổi liên tục, nên một cột thứ tự lưu sẵn sẽ lệch
-- khỏi thứ tự người dùng đang nhìn.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hngh_thong_tin_ho_ngheo (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ho_ten_dai_dien           TEXT NOT NULL,
  -- Để trống được (nhiều hộ chưa có giấy tờ lúc rà soát). Đã nhập thì không
  -- trùng — siết bằng partial unique index phía dưới, không phải UNIQUE thường:
  -- UNIQUE thường cho phép nhiều NULL nhưng không chặn được khoảng trắng thừa.
  so_cccd                   TEXT,
  xa_phuong_id              BIGINT
                            CONSTRAINT hngh_thong_tin_ho_ngheo_xa_phuong_id_fkey
                            REFERENCES public.var_ssn_xa_phuong (id)
                            ON UPDATE CASCADE ON DELETE SET NULL,
  khoi_xom                  TEXT,
  doi_tuong                 TEXT
                            CHECK (doi_tuong IS NULL OR doi_tuong IN ('Hộ nghèo', 'Cận nghèo', 'Khó khăn')),
  dien_thoai                TEXT,
  dan_toc_id                BIGINT
                            CONSTRAINT hngh_thong_tin_ho_ngheo_dan_toc_id_fkey
                            REFERENCES public.mttq_thiet_lap (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  ton_giao                  TEXT NOT NULL DEFAULT 'Không'
                            CHECK (ton_giao IN ('Có', 'Không')),
  so_tai_khoan              TEXT,
  ngan_hang                 TEXT,
  trang_thai                TEXT NOT NULL DEFAULT 'Đang khó khăn'
                            CHECK (trang_thai IN ('Đang khó khăn', 'Hết khó khăn')),
  -- Máy chủ gán, KHÔNG nhận từ client — xem trigger fn_hngh_set_ngay_trang_thai.
  ngay_cap_nhat_trang_thai  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Cũng là "lý do đổi trạng thái": fn_ghi_lich_su_trang_thai() chụp cột này.
  ghi_chu                   TEXT,
  id_nguoi_tao              BIGINT NOT NULL
                            CONSTRAINT hngh_thong_tin_ho_ngheo_id_nguoi_tao_fkey
                            REFERENCES public.var_nhan_vien (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hngh_thong_tin_ho_ngheo IS
  'Thông tin hộ nghèo — mỗi dòng một hộ; các khoản hỗ trợ ở bảng con hngh_ho_tro_ct.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.so_cccd IS
  'Số căn cước người đại diện hộ. Để trống được; đã nhập thì không trùng hộ khác.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.dan_toc_id IS
  'FK mttq_thiet_lap, bắt buộc trỏ dòng có loai = ''dan_toc'' (trigger kiểm).';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.ngay_cap_nhat_trang_thai IS
  'Thời gian trạng thái — máy chủ gán, form không có ô nhập.';

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_hngh_xa_phuong   ON public.hngh_thong_tin_ho_ngheo (xa_phuong_id);
CREATE INDEX IF NOT EXISTS idx_hngh_trang_thai  ON public.hngh_thong_tin_ho_ngheo (trang_thai);
CREATE INDEX IF NOT EXISTS idx_hngh_doi_tuong   ON public.hngh_thong_tin_ho_ngheo (doi_tuong);
CREATE INDEX IF NOT EXISTS idx_hngh_dan_toc     ON public.hngh_thong_tin_ho_ngheo (dan_toc_id);
CREATE INDEX IF NOT EXISTS idx_hngh_ton_giao    ON public.hngh_thong_tin_ho_ngheo (ton_giao);
CREATE INDEX IF NOT EXISTS idx_hngh_nguoi_tao   ON public.hngh_thong_tin_ho_ngheo (id_nguoi_tao);
CREATE INDEX IF NOT EXISTS idx_hngh_dai_dien_lower
  ON public.hngh_thong_tin_ho_ngheo (lower(btrim(ho_ten_dai_dien)));

-- Số căn cước không trùng — so sau khi cắt khoảng trắng hai đầu, và chỉ áp cho
-- dòng ĐÃ nhập. Không dùng lower(): căn cước chỉ có chữ số.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hngh_so_cccd
  ON public.hngh_thong_tin_ho_ngheo (btrim(so_cccd))
  WHERE so_cccd IS NOT NULL AND btrim(so_cccd) <> '';

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_hngh_updated ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER trg_hngh_updated
  BEFORE UPDATE ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- Vòng đăng ký tự động của fn_gan_id_nguoi_tao chỉ chạy một lần hồi 2026-07-26,
-- nên bảng sinh sau phải tự gắn tay — thiếu là client buộc phải tự gửi
-- id_nguoi_tao lên, tức tin vào dữ liệu do trình duyệt khai.
DROP TRIGGER IF EXISTS tg_gan_id_nguoi_tao_hngh_thong_tin_ho_ngheo ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER tg_gan_id_nguoi_tao_hngh_thong_tin_ho_ngheo
  BEFORE INSERT ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();

-- "Thời gian trạng thái" do máy chủ gán. Người nhập liệu không có ô này trên
-- form: để họ tự gõ là mở đường cho ngày không khớp với trạng thái thật.
CREATE OR REPLACE FUNCTION public.fn_hngh_set_ngay_trang_thai()
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

DROP TRIGGER IF EXISTS trg_hngh_ngay_trang_thai ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER trg_hngh_ngay_trang_thai
  BEFORE INSERT OR UPDATE ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_set_ngay_trang_thai();

-- Khoá ngoại thường KHÔNG phân biệt được `loai` của dòng mttq_thiet_lap, nên
-- không có trigger này thì gán nhầm một dòng 'trinh_do' vào ô Dân tộc vẫn lọt.
-- Cùng cách mttq_can_bo_validate_thiet_lap_loai() đang làm.
CREATE OR REPLACE FUNCTION public.fn_hngh_kiem_dan_toc_loai()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.dan_toc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t
      WHERE t.id = NEW.dan_toc_id AND t.loai = 'dan_toc'
    ) THEN
      RAISE EXCEPTION 'DAN_TOC_KHONG_HOP_LE: dan_toc_id phải trỏ dòng mttq_thiet_lap có loai = dan_toc';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hngh_kiem_dan_toc ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER trg_hngh_kiem_dan_toc
  BEFORE INSERT OR UPDATE OF dan_toc_id ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_kiem_dan_toc_loai();

-- Vết đổi trạng thái — dùng lại hàm chung ở 20260729120000_lich_su_trang_thai.sql.
-- KHÔNG gắn fn_kiem_luat_trang_thai: một hộ đã "Hết khó khăn" hoàn toàn có thể
-- tái nghèo và quay lại "Đang khó khăn"; chặn chiều đó là chặn việc có thật.
DROP TRIGGER IF EXISTS tg_lich_su_trang_thai_hngh_thong_tin_ho_ngheo
  ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER tg_lich_su_trang_thai_hngh_thong_tin_ho_ngheo
  AFTER UPDATE OF trang_thai ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();

-- ---------------------------------------------------------------------------
-- RLS — đọc mở, GHI siết theo ma trận var_phan_quyen (module_key 'thong-tin-ho-ngheo')
-- ---------------------------------------------------------------------------

ALTER TABLE public.hngh_thong_tin_ho_ngheo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hngh_thong_tin_ho_ngheo_doc ON public.hngh_thong_tin_ho_ngheo;
CREATE POLICY hngh_thong_tin_ho_ngheo_doc ON public.hngh_thong_tin_ho_ngheo
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS hngh_thong_tin_ho_ngheo_them ON public.hngh_thong_tin_ho_ngheo;
CREATE POLICY hngh_thong_tin_ho_ngheo_them ON public.hngh_thong_tin_ho_ngheo
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_co_quyen('thong-tin-ho-ngheo', 'them'));

DROP POLICY IF EXISTS hngh_thong_tin_ho_ngheo_sua ON public.hngh_thong_tin_ho_ngheo;
CREATE POLICY hngh_thong_tin_ho_ngheo_sua ON public.hngh_thong_tin_ho_ngheo
  FOR UPDATE TO authenticated
  USING (public.fn_co_quyen('thong-tin-ho-ngheo', 'sua'))
  WITH CHECK (public.fn_co_quyen('thong-tin-ho-ngheo', 'sua'));

DROP POLICY IF EXISTS hngh_thong_tin_ho_ngheo_xoa ON public.hngh_thong_tin_ho_ngheo;
CREATE POLICY hngh_thong_tin_ho_ngheo_xoa ON public.hngh_thong_tin_ho_ngheo
  FOR DELETE TO authenticated
  USING (public.fn_co_quyen('thong-tin-ho-ngheo', 'xoa'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hngh_thong_tin_ho_ngheo TO authenticated;

NOTIFY pgrst, 'reload schema';
