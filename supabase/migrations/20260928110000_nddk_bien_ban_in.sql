-- ============================================================================
-- Nhà đại đoàn kết — dữ liệu cho 3 biên bản in từ hệ thống:
--   1. Phiếu khảo sát hộ nghèo, cận nghèo, hộ khó khăn về nhà ở
--   2. Biên bản kiểm tra việc hoàn thành xây dựng (sửa chữa) nhà ở
--   3. Biên bản bàn giao tiền mặt hỗ trợ xây mới (sửa chữa) nhà ở
--
-- Chia làm hai nơi lưu:
--   * Thông tin CON NGƯỜI của chủ hộ (giới tính, năm sinh, nhân khẩu…) nằm ở
--     `hngh_thong_tin_ho_ngheo` — một hộ được hỗ trợ nhiều lần chỉ nhập một lần.
--   * Thông tin RIÊNG TỪNG CĂN NHÀ (ngày khảo sát, diện tích, thành phần kiểm
--     tra, bên giao tiền…) nằm ở `nddk_nha_dai_doan_ket`.
--
-- Mọi cột đều để trống được: ô nào trống thì biên bản in dòng chấm để viết tay.
-- Các danh mục CHECK dưới đây có bản sao ở `core/constants.ts` của từng module;
-- sửa một bên phải sửa cả bên kia.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Hộ nghèo — nhân khẩu & đời sống
-- ---------------------------------------------------------------------------

ALTER TABLE public.hngh_thong_tin_ho_ngheo
  ADD COLUMN IF NOT EXISTS gioi_tinh           TEXT,
  ADD COLUMN IF NOT EXISTS nam_sinh            INTEGER,
  ADD COLUMN IF NOT EXISTS ngay_cap_cccd       DATE,
  ADD COLUMN IF NOT EXISTS noi_cap_cccd        TEXT,
  ADD COLUMN IF NOT EXISTS ho_ten_vo_chong     TEXT,
  ADD COLUMN IF NOT EXISTS so_nhan_khau        INTEGER,
  ADD COLUMN IF NOT EXISTS nghe_nghiep         TEXT,
  ADD COLUMN IF NOT EXISTS trinh_do_hoc_van    TEXT,
  ADD COLUMN IF NOT EXISTS tinh_trang_viec_lam TEXT,
  ADD COLUMN IF NOT EXISTS doi_tuong_uu_tien   TEXT,
  ADD COLUMN IF NOT EXISTS tinh_trang_dat      TEXT;

ALTER TABLE public.hngh_thong_tin_ho_ngheo
  DROP CONSTRAINT IF EXISTS hngh_gioi_tinh_chk,
  DROP CONSTRAINT IF EXISTS hngh_nam_sinh_chk,
  DROP CONSTRAINT IF EXISTS hngh_so_nhan_khau_chk,
  DROP CONSTRAINT IF EXISTS hngh_tinh_trang_viec_lam_chk,
  DROP CONSTRAINT IF EXISTS hngh_tinh_trang_dat_chk;

ALTER TABLE public.hngh_thong_tin_ho_ngheo
  ADD CONSTRAINT hngh_gioi_tinh_chk
    CHECK (gioi_tinh IS NULL OR gioi_tinh IN ('Nam', 'Nữ')),
  ADD CONSTRAINT hngh_nam_sinh_chk
    CHECK (nam_sinh IS NULL OR nam_sinh BETWEEN 1900 AND 2100),
  ADD CONSTRAINT hngh_so_nhan_khau_chk
    CHECK (so_nhan_khau IS NULL OR so_nhan_khau BETWEEN 0 AND 100),
  ADD CONSTRAINT hngh_tinh_trang_viec_lam_chk
    CHECK (tinh_trang_viec_lam IS NULL
           OR tinh_trang_viec_lam IN ('Có việc làm', 'Không có việc làm', 'Đang đi học')),
  ADD CONSTRAINT hngh_tinh_trang_dat_chk
    CHECK (tinh_trang_dat IS NULL OR tinh_trang_dat IN ('Có GCN QSDĐ', 'Chưa có GCN QSDĐ'));

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.gioi_tinh IS 'Giới tính chủ hộ: Nam / Nữ.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.nam_sinh IS 'Năm sinh chủ hộ.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.ngay_cap_cccd IS 'Ngày cấp căn cước — in ở biên bản bàn giao.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.noi_cap_cccd IS 'Nơi cấp căn cước — in ở biên bản bàn giao.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.ho_ten_vo_chong IS 'Họ tên vợ hoặc chồng của chủ hộ.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.so_nhan_khau IS 'Số lượng nhân khẩu của hộ.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.nghe_nghiep IS 'Nghề nghiệp chủ hộ.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.trinh_do_hoc_van IS 'Trình độ học vấn chủ hộ.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.tinh_trang_viec_lam IS 'Có việc làm / Không có việc làm / Đang đi học.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.doi_tuong_uu_tien IS 'Đối tượng ưu tiên (người có công, dân tộc thiểu số…), gõ tự do.';
COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.tinh_trang_dat IS 'Tình trạng đất ở: Có / Chưa có giấy chứng nhận quyền sử dụng đất.';

-- ---------------------------------------------------------------------------
-- Nhà đại đoàn kết — khảo sát, kiểm tra hoàn thành, bàn giao
-- ---------------------------------------------------------------------------

ALTER TABLE public.nddk_nha_dai_doan_ket
  -- Khảo sát
  ADD COLUMN IF NOT EXISTS ngay_khao_sat            DATE,
  ADD COLUMN IF NOT EXISTS hien_trang_nha           TEXT,
  ADD COLUMN IF NOT EXISTS hoan_canh_gia_dinh       TEXT,
  ADD COLUMN IF NOT EXISTS nhu_cau_ho_tro           TEXT,
  ADD COLUMN IF NOT EXISTS ghi_chu_khao_sat         TEXT,
  -- Kiểm tra hoàn thành
  ADD COLUMN IF NOT EXISTS ngay_kiem_tra_hoan_thanh DATE,
  ADD COLUMN IF NOT EXISTS thanh_phan_kiem_tra      JSONB,
  ADD COLUMN IF NOT EXISTS dien_tich_san            NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS phan_nen                 TEXT,
  ADD COLUMN IF NOT EXISTS phan_mai                 TEXT,
  ADD COLUMN IF NOT EXISTS phan_khung_tuong         TEXT,
  ADD COLUMN IF NOT EXISTS tong_gia_tri             NUMERIC(15, 0),
  ADD COLUMN IF NOT EXISTS nguon_khac               JSONB,
  -- Bàn giao
  ADD COLUMN IF NOT EXISTS ngay_ban_giao            DATE,
  ADD COLUMN IF NOT EXISTS dia_diem_ban_giao        TEXT,
  ADD COLUMN IF NOT EXISTS ban_giao_ho_ten          TEXT,
  ADD COLUMN IF NOT EXISTS ban_giao_chuc_vu         TEXT,
  ADD COLUMN IF NOT EXISTS lam_chung_ho_ten         TEXT,
  ADD COLUMN IF NOT EXISTS lam_chung_chuc_vu        TEXT,
  ADD COLUMN IF NOT EXISTS so_quyet_dinh            TEXT,
  ADD COLUMN IF NOT EXISTS ngay_quyet_dinh          DATE;

ALTER TABLE public.nddk_nha_dai_doan_ket
  DROP CONSTRAINT IF EXISTS nddk_nhu_cau_ho_tro_chk,
  DROP CONSTRAINT IF EXISTS nddk_dien_tich_san_chk,
  DROP CONSTRAINT IF EXISTS nddk_tong_gia_tri_chk,
  DROP CONSTRAINT IF EXISTS nddk_thanh_phan_kiem_tra_chk,
  DROP CONSTRAINT IF EXISTS nddk_nguon_khac_chk;

ALTER TABLE public.nddk_nha_dai_doan_ket
  ADD CONSTRAINT nddk_nhu_cau_ho_tro_chk
    CHECK (nhu_cau_ho_tro IS NULL OR nhu_cau_ho_tro IN (
      'Xây dựng nhà lắp ghép', 'Gia đình tự xây mới', 'Gia đình tự sửa chữa'
    )),
  ADD CONSTRAINT nddk_dien_tich_san_chk
    CHECK (dien_tich_san IS NULL OR dien_tich_san >= 0),
  ADD CONSTRAINT nddk_tong_gia_tri_chk
    CHECK (tong_gia_tri IS NULL OR tong_gia_tri >= 0),
  -- {"bcd":{"ho_ten","chuc_vu"},"ubnd":{…},"mttq":{…},"thon":[{…}, ≤3]}
  ADD CONSTRAINT nddk_thanh_phan_kiem_tra_chk
    CHECK (thanh_phan_kiem_tra IS NULL OR (
      jsonb_typeof(thanh_phan_kiem_tra) = 'object'
      AND (NOT thanh_phan_kiem_tra ? 'thon'
           OR (jsonb_typeof(thanh_phan_kiem_tra -> 'thon') = 'array'
               AND jsonb_array_length(thanh_phan_kiem_tra -> 'thon') <= 3))
    )),
  -- [{"ten","so_tien"}, ≤3] — các nguồn ngoài Chương trình trong biên bản hoàn thành.
  ADD CONSTRAINT nddk_nguon_khac_chk
    CHECK (nguon_khac IS NULL OR (
      jsonb_typeof(nguon_khac) = 'array' AND jsonb_array_length(nguon_khac) <= 3
    ));

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_khao_sat IS 'Ngày lập phiếu khảo sát.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.hien_trang_nha IS 'Hiện trạng nhà ở lúc khảo sát.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.hoan_canh_gia_dinh IS 'Hoàn cảnh gia đình lúc khảo sát.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.nhu_cau_ho_tro IS 'Nhu cầu cần hỗ trợ (phiếu khảo sát).';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ghi_chu_khao_sat IS 'Mục "Ghi chú" của phiếu khảo sát — khác ghi_chu (lý do đổi trạng thái).';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_kiem_tra_hoan_thanh IS 'Ngày lập biên bản kiểm tra hoàn thành.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.thanh_phan_kiem_tra IS 'Thành phần kiểm tra: đại diện BCĐ, UBND, MTTQ xã và tối đa 3 đại diện thôn.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.dien_tich_san IS 'Diện tích sàn đã hoàn thành (m2).';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.phan_nen IS 'Mô tả phần nền.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.phan_mai IS 'Mô tả phần mái.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.phan_khung_tuong IS 'Mô tả phần khung, tường bao.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.tong_gia_tri IS 'Tổng giá trị xây dựng/sửa chữa (VND), gồm cả phần Chương trình hỗ trợ (so_tien).';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.nguon_khac IS 'Các nguồn khác ngoài Chương trình: [{ten, so_tien}], tối đa 3.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_ban_giao IS 'Ngày lập biên bản bàn giao tiền.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.dia_diem_ban_giao IS 'Địa điểm bàn giao.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ban_giao_ho_ten IS 'Đại diện bên giao tiền (Ban Vận động Quỹ Vì người nghèo).';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ban_giao_chuc_vu IS 'Chức vụ đại diện bên giao tiền.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.lam_chung_ho_ten IS 'Bên làm chứng (cán bộ khối, xóm, thôn, bản).';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.lam_chung_chuc_vu IS 'Chức vụ bên làm chứng.';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.so_quyet_dinh IS 'Số quyết định hỗ trợ của Ban Vận động (vd 12/QĐ-BVĐ).';
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_quyet_dinh IS 'Ngày quyết định hỗ trợ.';

NOTIFY pgrst, 'reload schema';
