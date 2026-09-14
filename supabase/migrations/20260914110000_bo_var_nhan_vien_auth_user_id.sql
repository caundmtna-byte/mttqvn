-- ============================================================================
-- Bỏ `var_nhan_vien.auth_user_id` — quay về quy ước nhận diện của ứng dụng:
--
--   auth.users.email = '<ten_tai_khoan>@gmail.com'
--
-- Vì sao quay lại: cột `auth_user_id` (migration 20260726110000) CHỈ được điền
-- đúng một lần bằng câu UPDATE backfill trong chính migration đó. Không trigger
-- trên `auth.users`, không Edge Function, không một dòng TypeScript nào ghi vào
-- nó. Mọi nhân viên được cấp tài khoản SAU thời điểm backfill đều có
-- `auth_user_id = NULL`, nên phía DB coi như họ không tồn tại:
--
--   · fn_la_quan_tri() / fn_co_quyen() → false ⇒ RLS chặn ghi ở var_phan_quyen,
--     var_chuc_vu, var_nhan_vien, mttq_tang_luong, luong_thiet_lap_*, quỹ,
--     khoá kỳ, NĐĐK… dù người đó có đủ quyền trong ma trận;
--   · fn_nhan_vien_id_hien_tai() → NULL ⇒ không gán được `id_nguoi_tao`, nhật ký
--     thay đổi mất tên người, hộp thông báo cá nhân rỗng;
--   · policy `var_nhan_vien_sua` chặn chính chủ sửa hồ sơ của mình.
--
-- Đổi `ten_tai_khoan` vẫn làm lệch liên kết — nhưng đó là rủi ro của quy ước
-- chuỗi, và ứng dụng (đăng nhập, Edge Function admin-user) đã chạy trên đúng
-- quy ước đó từ đầu. Giữ hai cơ chế song song mới là thứ gây lỗi thật.
--
-- KHÔNG đụng tới cột `auth_user_id` của `audit_log` và `lich_su_trang_thai`:
-- ở đó nó ghi `auth.uid()` tại thời điểm thay đổi, là VẾT KIỂM TOÁN, không phải
-- cơ chế nhận diện.
--
-- Thứ tự trong file này là bắt buộc: dựng lại hàm + policy TRƯỚC, bỏ cột SAU —
-- Postgres từ chối DROP COLUMN khi còn policy tham chiếu tới cột đó.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Nguồn sự thật duy nhất: "ai đang đăng nhập" — trả về ten_tai_khoan đã chuẩn hoá
--
-- NULL khi không có email trong JWT (anon, service_role) ⇒ mọi phép so sánh
-- thành NULL ⇒ false, đúng như `auth.uid()` trả NULL trước đây.
-- Cùng công thức với guard đã chạy sẵn ở 20260610140000_bai_viet_don_gia_guard.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_ten_dang_nhap_hien_tai()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT nullif(lower(btrim(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))), '');
$$;

COMMENT ON FUNCTION public.fn_ten_dang_nhap_hien_tai() IS
  'Tên tài khoản của người đang đăng nhập, lấy từ phần trước @ của email Auth. '
  'NULL nếu không có phiên đăng nhập. Dùng chung cho RLS và các hàm kiểm quyền.';

GRANT EXECUTE ON FUNCTION public.fn_ten_dang_nhap_hien_tai() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ba hàm dùng chung — chỉ đổi mệnh đề nhận diện, giữ nguyên mọi thứ còn lại.
--
-- SECURITY DEFINER vẫn bắt buộc: hàm đọc `var_nhan_vien`, mà policy của chính
-- bảng đó lại gọi hàm này — không bỏ qua RLS thì thành đệ quy vô tận.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_nhan_vien_id_hien_tai()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT nv.id
  FROM public.var_nhan_vien nv
  WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_nhan_vien_id_hien_tai() IS
  'Trả về var_nhan_vien.id của người đang đăng nhập, hoặc NULL. Nhận diện bằng '
  'ten_tai_khoan khớp phần trước @ của email Auth. Dùng cho RLS, trigger gán '
  'id_nguoi_tao và nhật ký thay đổi.';

GRANT EXECUTE ON FUNCTION public.fn_nhan_vien_id_hien_tai() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_la_quan_tri()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.var_nhan_vien nv
    LEFT JOIN public.var_chuc_vu cv ON cv.id = nv.id_chuc_vu
    WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
      AND nv.trang_thai = 'Hoạt động'
      AND (
        cv.cap_bac = 1
        OR EXISTS (
          SELECT 1 FROM public.var_phan_quyen pq
          WHERE pq.chuc_vu_id = nv.id_chuc_vu
            AND pq.quyen ~* '(^|,)\s*(quan_tri|all|admin)\s*(,|$)'
        )
      )
  );
$$;

COMMENT ON FUNCTION public.fn_la_quan_tri() IS
  'Người đang đăng nhập có phải quản trị hệ thống không (cấp bậc 1 hoặc quyền quan_tri/all/admin).';

CREATE OR REPLACE FUNCTION public.fn_co_quyen(p_module_key text, p_hanh_dong text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.fn_la_quan_tri() OR EXISTS (
    SELECT 1
    FROM public.var_nhan_vien nv
    JOIN public.var_phan_quyen pq ON pq.chuc_vu_id = nv.id_chuc_vu
    WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
      AND nv.trang_thai = 'Hoạt động'
      AND pq.module_key = p_module_key
      AND pq.quyen ~* ('(^|,)\s*' || p_hanh_dong || '\s*(,|$)')
  );
$$;

COMMENT ON FUNCTION public.fn_co_quyen(text, text) IS
  'Người đang đăng nhập có quyền <hanh_dong> trên <module_key> không, theo ma trận var_phan_quyen.';

GRANT EXECUTE ON FUNCTION public.fn_la_quan_tri() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_co_quyen(text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Policy sửa hồ sơ: quản trị, hoặc chính chủ (trang Hồ sơ cá nhân).
-- Dựng lại vì vế cũ tham chiếu thẳng cột sắp bỏ.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS var_nhan_vien_sua ON public.var_nhan_vien;

CREATE POLICY var_nhan_vien_sua ON public.var_nhan_vien
  FOR UPDATE TO authenticated
  USING (
    public.fn_la_quan_tri()
    OR lower(btrim(ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
  )
  WITH CHECK (
    public.fn_la_quan_tri()
    OR lower(btrim(ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
  );

-- ---------------------------------------------------------------------------
-- Thay điều kiện "đã được cấp tài khoản" trong hàm sinh nhắc việc.
--
-- Trước đây là `nv.auth_user_id IS NOT NULL`. Nay phải hỏi thẳng `auth.users`
-- theo đúng quy ước chuỗi. Không mở cho anon/authenticated: biết ai đã có tài
-- khoản Auth là thông tin không cần lộ ra ngoài.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_co_tai_khoan_dang_nhap(p_ten_tai_khoan text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(split_part(u.email, '@', 1)) = lower(btrim(p_ten_tai_khoan))
  );
$$;

COMMENT ON FUNCTION public.fn_co_tai_khoan_dang_nhap(text) IS
  'Tên tài khoản này đã có tài khoản đăng nhập trong auth.users chưa (khớp phần trước @ của email).';

-- Phải REVOKE đích danh `anon`/`authenticated`: Supabase cấp EXECUTE trực tiếp
-- cho hai vai đó trên mọi hàm mới trong schema `public` qua ALTER DEFAULT
-- PRIVILEGES, nên `FROM PUBLIC` là chưa đủ.
REVOKE ALL ON FUNCTION public.fn_co_tai_khoan_dang_nhap(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_co_tai_khoan_dang_nhap(text) TO service_role;

-- ---------------------------------------------------------------------------
-- fn_thong_bao_sinh_nhac_viec — chép nguyên văn từ 20260730101000, chỉ đổi hai
-- dòng lọc người nhận (bản gốc dùng `nv.auth_user_id IS NOT NULL`).
-- Lịch pg_cron ở 20260730102000 gọi theo tên nên không cần đặt lại.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_thong_bao_sinh_nhac_viec(p_ngay date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Cửa sổ cảnh báo nâng lương, khớp `HOME_TANG_LUONG_SO_NGAY` phía ứng dụng.
  c_so_ngay_luong constant integer := 90;
  v_them integer := 0;
  v_n    integer;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Công việc của chính người trách nhiệm
  -- -------------------------------------------------------------------------
  WITH viec AS (
    SELECT
      cv.id,
      cv.ten_cong_viec,
      cv.id_trach_nhiem,
      (p_ngay - cv.thoi_han) AS so_ngay_tre  -- dương = đã trễ, âm = còn lại
    FROM public.cong_viec_danh_sach cv
    JOIN public.var_nhan_vien nv ON nv.id = cv.id_trach_nhiem
    WHERE cv.thoi_han IS NOT NULL
      AND cv.trang_thai NOT IN ('Hoàn thành', 'Hủy')
      AND nv.trang_thai = 'Hoạt động'
      AND public.fn_co_tai_khoan_dang_nhap(nv.ten_tai_khoan)  -- chưa có tài khoản thì không ai đọc được
  ),
  gom AS (
    SELECT
      v.id_trach_nhiem AS nhan_vien_id,
      CASE WHEN v.so_ngay_tre > 0 THEN 'cong_viec_qua_han' ELSE 'cong_viec_sap_den_han' END AS loai,
      count(*) AS so_viec,
      -- Việc gấp nhất trong nhóm: trễ nhiều nhất / đến hạn sớm nhất.
      max(v.so_ngay_tre) AS so_ngay_gap_nhat,
      (array_agg(v.ten_cong_viec ORDER BY v.so_ngay_tre DESC, v.id))[1] AS ten_gap_nhat
    FROM viec v
    -- Quá hạn: mọi việc đã trễ. Sắp đến hạn: đúng hôm nay và 3 ngày tới.
    WHERE v.so_ngay_tre >= -3
    GROUP BY 1, 2
  )
  INSERT INTO public.thong_bao
    (nhan_vien_id, loai, muc_do, tieu_de, noi_dung, duong_dan, khoa_chong_trung)
  SELECT
    g.nhan_vien_id,
    g.loai,
    CASE WHEN g.loai = 'cong_viec_qua_han' THEN 'canh_bao' ELSE 'sap_toi' END,
    CASE
      WHEN g.loai = 'cong_viec_qua_han' AND g.so_viec = 1 THEN 'Bạn có 1 công việc đã quá hạn'
      WHEN g.loai = 'cong_viec_qua_han' THEN 'Bạn có ' || g.so_viec || ' công việc đã quá hạn'
      WHEN g.so_viec = 1 THEN 'Bạn có 1 công việc sắp đến hạn'
      ELSE 'Bạn có ' || g.so_viec || ' công việc sắp đến hạn'
    END,
    CASE
      WHEN g.loai = 'cong_viec_qua_han'
        THEN 'Trễ nhất: “' || g.ten_gap_nhat || '” — quá hạn ' || g.so_ngay_gap_nhat || ' ngày.'
      WHEN g.so_ngay_gap_nhat = 0
        THEN 'Gần nhất: “' || g.ten_gap_nhat || '” — đến hạn hôm nay.'
      WHEN g.so_ngay_gap_nhat = -1
        THEN 'Gần nhất: “' || g.ten_gap_nhat || '” — còn 1 ngày.'
      ELSE 'Gần nhất: “' || g.ten_gap_nhat || '” — còn ' || (-g.so_ngay_gap_nhat) || ' ngày.'
    END
      || CASE WHEN g.so_viec > 1 THEN ' Và ' || (g.so_viec - 1) || ' việc khác.' ELSE '' END,
    '/quan-ly-giao-viec/cong-viec?tab=mine_do',
    g.loai || ':ngay:' || p_ngay::text
  FROM gom g
  ON CONFLICT (nhan_vien_id, khoa_chong_trung) DO NOTHING;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_them := v_them + v_n;

  -- -------------------------------------------------------------------------
  -- 2. Sắp đến hạn nâng bậc lương
  --
  -- Người nhận: có quyền xem module `danh-sach-tang-luong` trong ma trận
  -- `var_phan_quyen`, hoặc là quản trị (cấp bậc 1 / quyền quan_tri|all|admin).
  --
  -- Phạm vi đếm: đúng ba nhánh của `canViewTangLuongRow` / `resolveTangLuongHomeScope`
  --   · quản trị        → toàn bộ;
  --   · cấp Tỉnh        → cán bộ có 'Tỉnh' trong `cap_quan_ly` (thuộc tính CÁN BỘ);
  --   · cấp Xã phường   → cán bộ cùng `don_vi_id`; chưa gắn đơn vị thì KHÔNG gửi
  --                       (gửi số không lọc ở đây là lộ số liệu lương toàn tỉnh);
  --   · cấp khác        → toàn bộ (giống hàm gate ở client).
  --
  -- `cap_quan_ly` của người xem lấy từ `var_nhan_vien`, KHÔNG phải `var_chuc_vu`
  -- — bảng `var_chuc_vu` không hề có cột đó (xem `fetchPositionPermissionGrants`).
  -- -------------------------------------------------------------------------
  WITH nguoi_nhan AS (
    SELECT
      nv.id,
      nv.don_vi_id,
      (cv.cap_bac = 1 OR EXISTS (
        SELECT 1 FROM public.var_phan_quyen pq
        WHERE pq.chuc_vu_id = nv.id_chuc_vu
          AND pq.quyen ~* '(^|,)\s*(quan_tri|all|admin)\s*(,|$)'
      )) AS bo_qua_gioi_han,
      ('Tỉnh'      = ANY (COALESCE(nv.cap_quan_ly, ARRAY[]::text[]))) AS la_tinh,
      ('Xã phường' = ANY (COALESCE(nv.cap_quan_ly, ARRAY[]::text[]))) AS la_xa_phuong
    FROM public.var_nhan_vien nv
    LEFT JOIN public.var_chuc_vu cv ON cv.id = nv.id_chuc_vu
    WHERE nv.trang_thai = 'Hoạt động'
      AND public.fn_co_tai_khoan_dang_nhap(nv.ten_tai_khoan)  -- chưa có tài khoản thì không ai đọc được
      AND (
        cv.cap_bac = 1
        OR EXISTS (
          SELECT 1 FROM public.var_phan_quyen pq
          WHERE pq.chuc_vu_id = nv.id_chuc_vu
            AND pq.module_key = 'danh-sach-tang-luong'
            AND pq.quyen ~* '(^|,)\s*(xem|quan_tri|all|admin)\s*(,|$)'
        )
      )
  ),
  lan_gan_nhat AS (
    -- Mỗi cán bộ một dòng: lần nâng lương gần nhất.
    SELECT DISTINCT ON (tl.can_bo_id)
      tl.can_bo_id,
      tl.ngay_nang_luong,
      cb.don_vi_id,
      cb.cap_quan_ly
    FROM public.mttq_tang_luong tl
    JOIN public.mttq_can_bo cb ON cb.id = tl.can_bo_id
    WHERE tl.ngay_nang_luong IS NOT NULL
    ORDER BY tl.can_bo_id, tl.ngay_nang_luong DESC
  ),
  den_han AS (
    -- Chu kỳ nâng bậc 3 năm, khớp `TANG_LUONG_CYCLE_YEARS` phía ứng dụng.
    SELECT
      don_vi_id,
      cap_quan_ly,
      (ngay_nang_luong + INTERVAL '3 years')::date AS ngay_den_han
    FROM lan_gan_nhat
  ),
  dem AS (
    SELECT n.id AS nhan_vien_id, d.so_luong, d.gan_nhat
    FROM nguoi_nhan n
    CROSS JOIN LATERAL (
      SELECT count(*) AS so_luong, min(dh.ngay_den_han) AS gan_nhat
      FROM den_han dh
      WHERE dh.ngay_den_han >= p_ngay
        AND dh.ngay_den_han <= p_ngay + c_so_ngay_luong
        AND (
          n.bo_qua_gioi_han
          OR (n.la_tinh AND 'Tỉnh' = ANY (COALESCE(dh.cap_quan_ly, ARRAY[]::text[])))
          OR (NOT n.bo_qua_gioi_han AND NOT n.la_tinh AND n.la_xa_phuong
              AND n.don_vi_id IS NOT NULL AND dh.don_vi_id = n.don_vi_id)
          OR (NOT n.bo_qua_gioi_han AND NOT n.la_tinh AND NOT n.la_xa_phuong)
        )
    ) d
    -- Cán bộ cấp Xã phường chưa được gắn đơn vị: không gửi gì cả.
    WHERE NOT (
      NOT n.bo_qua_gioi_han AND NOT n.la_tinh AND n.la_xa_phuong AND n.don_vi_id IS NULL
    )
      AND d.so_luong > 0
  )
  INSERT INTO public.thong_bao
    (nhan_vien_id, loai, muc_do, tieu_de, noi_dung, duong_dan, khoa_chong_trung)
  SELECT
    dem.nhan_vien_id,
    'tang_luong_sap_den_han',
    'sap_toi',
    'Sắp đến hạn nâng bậc lương',
    'Có ' || dem.so_luong || ' cán bộ đến hạn nâng bậc lương trong ' || c_so_ngay_luong
      || ' ngày tới. Sớm nhất là ngày ' || to_char(dem.gan_nhat, 'DD/MM/YYYY') || '.',
    '/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong?tab=ke_hoach',
    'tang_luong_sap_den_han:tuan:' || to_char(p_ngay, 'IYYY-IW')
  FROM dem
  ON CONFLICT (nhan_vien_id, khoa_chong_trung) DO NOTHING;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_them := v_them + v_n;

  RETURN v_them;
END;
$$;

COMMENT ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(date) IS
  'Sinh thông báo nhắc việc cho ngày chỉ định (mặc định hôm nay). Idempotent, trả về số dòng đã thêm.';

REVOKE ALL ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(date) TO service_role;

-- ---------------------------------------------------------------------------
-- Bỏ cột. Khoá ngoại `var_nhan_vien_auth_user_id_fkey` và index duy nhất
-- `uq_var_nhan_vien_auth_user_id` rơi theo cột, không cần lệnh riêng.
-- ---------------------------------------------------------------------------
ALTER TABLE public.var_nhan_vien
  DROP COLUMN IF EXISTS auth_user_id;

NOTIFY pgrst, 'reload schema';
