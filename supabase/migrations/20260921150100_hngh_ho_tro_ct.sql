-- ============================================================================
-- Thông tin hộ nghèo — bảng con: các khoản hỗ trợ đã nhận
-- ("Chương trình cứu trợ và vì người nghèo")
--
-- Một hộ nhận hỗ trợ NHIỀU LẦN qua các năm, nên đây là bảng con 1-n chứ không
-- phải vài cột phẳng trên bảng hộ: nhét phẳng thì khoản hỗ trợ lần hai ghi đè
-- mất lần đầu, không tra được lịch sử và không cộng được tổng tiền của một hộ.
--
-- Hai danh mục:
--   · linh_vuc_ho_tro — bảy lĩnh vực cơ quan đang dùng (ENUM CỨNG).
--   · trang_thai      — dùng CHUNG bộ giá trị với Nhà đại đoàn kết để hai
--                       module cộng chung được trên báo cáo.
-- Nguồn sự thật đối chiếu:
-- `features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/constants.ts`.
--
-- "Nội dung hỗ trợ" là ô chữ TỰ DO mô tả trường hợp cụ thể, khác với "Lĩnh vực
-- hỗ trợ" là danh mục để thống kê.
--
-- Bảng nhỏ (vài dòng mỗi hộ) và luôn đọc theo `ho_ngheo_id` ⇒ KHÔNG cần RPC
-- phân trang riêng.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hngh_ho_tro_ct (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- CASCADE: khoản hỗ trợ không có nghĩa khi tách khỏi hộ. Xoá hộ là thao tác
  -- hiếm và đã có hộp thoại xác nhận riêng ở giao diện.
  ho_ngheo_id       BIGINT NOT NULL
                    CONSTRAINT hngh_ho_tro_ct_ho_ngheo_id_fkey
                    REFERENCES public.hngh_thong_tin_ho_ngheo (id)
                    ON UPDATE CASCADE ON DELETE CASCADE,
  linh_vuc_ho_tro   TEXT NOT NULL
                    CHECK (linh_vuc_ho_tro IN (
                      'Nhà bị sập', 'Mô hình sinh kế', 'Học sinh nghèo',
                      'Chữa bệnh', 'Quà tết', 'Người chết', 'Hoả hoạn'
                    )),
  noi_dung_ho_tro   TEXT,
  nam               INTEGER NOT NULL
                    CHECK (nam BETWEEN 2000 AND 2100),
  so_tien           NUMERIC(15, 0)
                    CHECK (so_tien IS NULL OR so_tien >= 0),
  trang_thai        TEXT NOT NULL DEFAULT 'Đang khảo sát'
                    CHECK (trang_thai IN (
                      'Đang khảo sát', 'Đã phê duyệt', 'Đang thực hiện',
                      'Đã bàn giao', 'Tạm dừng'
                    )),
  ghi_chu           TEXT,
  id_nguoi_tao      BIGINT NOT NULL
                    CONSTRAINT hngh_ho_tro_ct_id_nguoi_tao_fkey
                    REFERENCES public.var_nhan_vien (id)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao            TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hngh_ho_tro_ct IS
  'Các khoản hỗ trợ đã nhận của từng hộ nghèo — một hộ nhiều khoản, theo năm.';

CREATE INDEX IF NOT EXISTS idx_hngh_ct_ho_ngheo  ON public.hngh_ho_tro_ct (ho_ngheo_id);
CREATE INDEX IF NOT EXISTS idx_hngh_ct_nam       ON public.hngh_ho_tro_ct (nam DESC);
CREATE INDEX IF NOT EXISTS idx_hngh_ct_linh_vuc  ON public.hngh_ho_tro_ct (linh_vuc_ho_tro);
CREATE INDEX IF NOT EXISTS idx_hngh_ct_trang_thai ON public.hngh_ho_tro_ct (trang_thai);
CREATE INDEX IF NOT EXISTS idx_hngh_ct_nguoi_tao ON public.hngh_ho_tro_ct (id_nguoi_tao);

DROP TRIGGER IF EXISTS trg_hngh_ct_updated ON public.hngh_ho_tro_ct;
CREATE TRIGGER trg_hngh_ct_updated
  BEFORE UPDATE ON public.hngh_ho_tro_ct
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

DROP TRIGGER IF EXISTS tg_gan_id_nguoi_tao_hngh_ho_tro_ct ON public.hngh_ho_tro_ct;
CREATE TRIGGER tg_gan_id_nguoi_tao_hngh_ho_tro_ct
  BEFORE INSERT ON public.hngh_ho_tro_ct
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();

-- ---------------------------------------------------------------------------
-- RLS — cùng module_key với bảng cha: quyền trên hộ là quyền trên khoản hỗ trợ
-- ---------------------------------------------------------------------------

ALTER TABLE public.hngh_ho_tro_ct ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hngh_ho_tro_ct_doc ON public.hngh_ho_tro_ct;
CREATE POLICY hngh_ho_tro_ct_doc ON public.hngh_ho_tro_ct
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS hngh_ho_tro_ct_them ON public.hngh_ho_tro_ct;
CREATE POLICY hngh_ho_tro_ct_them ON public.hngh_ho_tro_ct
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_co_quyen('thong-tin-ho-ngheo', 'them'));

DROP POLICY IF EXISTS hngh_ho_tro_ct_sua ON public.hngh_ho_tro_ct;
CREATE POLICY hngh_ho_tro_ct_sua ON public.hngh_ho_tro_ct
  FOR UPDATE TO authenticated
  USING (public.fn_co_quyen('thong-tin-ho-ngheo', 'sua'))
  WITH CHECK (public.fn_co_quyen('thong-tin-ho-ngheo', 'sua'));

DROP POLICY IF EXISTS hngh_ho_tro_ct_xoa ON public.hngh_ho_tro_ct;
CREATE POLICY hngh_ho_tro_ct_xoa ON public.hngh_ho_tro_ct
  FOR DELETE TO authenticated
  USING (public.fn_co_quyen('thong-tin-ho-ngheo', 'xoa'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hngh_ho_tro_ct TO authenticated;

NOTIFY pgrst, 'reload schema';
