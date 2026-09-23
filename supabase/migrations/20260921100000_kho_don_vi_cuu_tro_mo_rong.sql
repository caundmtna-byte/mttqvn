-- Mở rộng danh mục đơn vị hỗ trợ (`kho_don_vi_cuu_tro`) cho khớp mẫu nhập liệu thực tế:
--   Tên nhà tài trợ · Loại đối tượng · Số người · Người đại diện · Chức vụ ·
--   Số điện thoại · Địa chỉ · Đơn vị giới thiệu.
--
-- Hai việc:
--   1) Đổi HẲN bộ giá trị `loai` (5 → 8) cho đúng cách cơ quan đang phân loại nhà tài trợ.
--      Bộ cũ (chua / giao_xu / co_quan / don_vi / ca_nhan) lẫn cấp hành chính với loại
--      hình, không tách được "CQ cấp tỉnh" với "CQ cấp xã", cũng không có chỗ cho
--      doanh nghiệp / câu lạc bộ / nhóm thiện nguyện — vốn là nhóm tài trợ đông nhất.
--   2) Thêm 5 cột: so_nguoi, nguoi_dai_dien, chuc_vu và cặp cột "Đơn vị giới thiệu".
--
-- "Đơn vị giới thiệu" lưu bằng HAI cột để phân biệt rõ ba trạng thái — nếu chỉ dùng
-- một khoá ngoại nullable thì "MTTQ tỉnh giới thiệu" và "chưa ai nhập" trùng nhau:
--   (NULL, NULL)          → chưa nhập
--   ('tinh', NULL)        → MTTQ tỉnh
--   ('xa_phuong', <id>)   → một xã/phường cụ thể trong var_ssn_xa_phuong

-- ---------------------------------------------------------------------------
-- 1. Bộ giá trị `loai` mới
-- ---------------------------------------------------------------------------

ALTER TABLE public.kho_don_vi_cuu_tro DROP CONSTRAINT IF EXISTS kho_don_vi_cuu_tro_loai_chk;
ALTER TABLE public.kho_don_vi_cuu_tro ALTER COLUMN loai DROP DEFAULT;

-- Chuyển dữ liệu cũ sang loại tương đương gần nhất. `to_chuc` là giá trị thời kỳ
-- trước migration 20260624120000, giữ trong bảng map để chạy lại vẫn đúng.
UPDATE public.kho_don_vi_cuu_tro
SET loai = CASE loai
  WHEN 'chua'    THEN 'co_so_ton_giao'
  WHEN 'giao_xu' THEN 'co_so_ton_giao'
  WHEN 'co_quan' THEN 'cq_cap_tinh'
  WHEN 'don_vi'  THEN 'don_vi_su_nghiep'
  WHEN 'to_chuc' THEN 'don_vi_su_nghiep'
  ELSE loai
END
WHERE loai IN ('chua', 'giao_xu', 'co_quan', 'don_vi', 'to_chuc');

ALTER TABLE public.kho_don_vi_cuu_tro ALTER COLUMN loai SET DEFAULT 'doanh_nghiep';

ALTER TABLE public.kho_don_vi_cuu_tro
  ADD CONSTRAINT kho_don_vi_cuu_tro_loai_chk CHECK (
    loai IN (
      'doanh_nghiep',       -- Doanh nghiệp
      'cau_lac_bo',         -- Câu lạc bộ
      'cq_cap_tinh',        -- Cơ quan cấp tỉnh
      'ca_nhan',            -- Cá nhân
      'co_so_ton_giao',     -- Cơ sở tôn giáo (gộp chùa / giáo xứ cũ)
      'nhom_thien_nguyen',  -- Nhóm thiện nguyện
      'don_vi_su_nghiep',   -- Đơn vị sự nghiệp
      'cq_cap_xa'           -- Cơ quan cấp xã
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Năm cột mới
-- ---------------------------------------------------------------------------

ALTER TABLE public.kho_don_vi_cuu_tro
  ADD COLUMN IF NOT EXISTS so_nguoi               INTEGER,
  ADD COLUMN IF NOT EXISTS nguoi_dai_dien         TEXT,
  ADD COLUMN IF NOT EXISTS chuc_vu                TEXT,
  ADD COLUMN IF NOT EXISTS don_vi_gioi_thieu_loai TEXT,
  ADD COLUMN IF NOT EXISTS don_vi_gioi_thieu_id   BIGINT;

-- ON DELETE RESTRICT chứ không phải SET NULL: SET NULL sẽ để lại trạng thái lai
-- ('xa_phuong', NULL) — đúng thứ mà ràng buộc nhất quán bên dưới cấm — nên lệnh
-- xoá xã/phường vẫn thất bại, chỉ khác là báo lỗi CHECK khó hiểu thay vì lỗi khoá
-- ngoại có câu tiếng Việt rõ ràng. Cùng cách làm với `mttq_ky_hop.don_vi_id`.
ALTER TABLE public.kho_don_vi_cuu_tro
  DROP CONSTRAINT IF EXISTS kho_don_vi_cuu_tro_don_vi_gioi_thieu_id_fkey;
ALTER TABLE public.kho_don_vi_cuu_tro
  ADD CONSTRAINT kho_don_vi_cuu_tro_don_vi_gioi_thieu_id_fkey
    FOREIGN KEY (don_vi_gioi_thieu_id) REFERENCES public.var_ssn_xa_phuong (id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.kho_don_vi_cuu_tro
  DROP CONSTRAINT IF EXISTS kho_don_vi_cuu_tro_so_nguoi_chk;
ALTER TABLE public.kho_don_vi_cuu_tro
  ADD CONSTRAINT kho_don_vi_cuu_tro_so_nguoi_chk
    CHECK (so_nguoi IS NULL OR so_nguoi >= 0);

-- Giữ hai cột "Đơn vị giới thiệu" luôn nhất quán — không cho lọt trạng thái lai
-- ('xa_phuong' mà không có id, hoặc có id mà loại lại là 'tinh').
ALTER TABLE public.kho_don_vi_cuu_tro
  DROP CONSTRAINT IF EXISTS kho_don_vi_cuu_tro_dv_gioi_thieu_chk;
ALTER TABLE public.kho_don_vi_cuu_tro
  ADD CONSTRAINT kho_don_vi_cuu_tro_dv_gioi_thieu_chk CHECK (
    (don_vi_gioi_thieu_loai IS NULL        AND don_vi_gioi_thieu_id IS NULL)
    OR (don_vi_gioi_thieu_loai = 'tinh'      AND don_vi_gioi_thieu_id IS NULL)
    OR (don_vi_gioi_thieu_loai = 'xa_phuong' AND don_vi_gioi_thieu_id IS NOT NULL)
  );

-- Postgres KHÔNG tự đánh index cho khoá ngoại. Thiếu index này thì mỗi lần xoá một
-- xã/phường, ON DELETE RESTRICT phải quét toàn bộ bảng đơn vị hỗ trợ để kiểm tra.
CREATE INDEX IF NOT EXISTS idx_kho_don_vi_cuu_tro_dv_gioi_thieu
  ON public.kho_don_vi_cuu_tro (don_vi_gioi_thieu_id);

-- ---------------------------------------------------------------------------
-- 3. Chú thích cột
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.so_nguoi IS
  'Số thành viên của nhóm / câu lạc bộ / tập thể tài trợ. Để trống với cá nhân.';
COMMENT ON COLUMN public.kho_don_vi_cuu_tro.nguoi_dai_dien IS
  'Họ tên người đại diện đứng ra liên hệ, ủng hộ.';
COMMENT ON COLUMN public.kho_don_vi_cuu_tro.chuc_vu IS
  'Chức vụ của người đại diện.';
COMMENT ON COLUMN public.kho_don_vi_cuu_tro.don_vi_gioi_thieu_loai IS
  'Cấp của đơn vị giới thiệu: NULL = chưa nhập, ''tinh'' = MTTQ tỉnh, ''xa_phuong'' = một xã/phường.';
COMMENT ON COLUMN public.kho_don_vi_cuu_tro.don_vi_gioi_thieu_id IS
  'FK var_ssn_xa_phuong — chỉ có giá trị khi don_vi_gioi_thieu_loai = ''xa_phuong''.';

-- PostgREST giữ cache schema riêng: thiếu dòng này thì mọi select/insert có cột
-- mới trả 400 "column does not exist", trông hệt như lỗi phía client.
NOTIFY pgrst, 'reload schema';
