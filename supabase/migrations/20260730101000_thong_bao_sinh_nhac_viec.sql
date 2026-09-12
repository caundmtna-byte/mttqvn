-- ============================================================================
-- Sinh thông báo nhắc việc — hai loại đầu tiên, đúng dữ liệu đang có
--
--   1. Công việc quá hạn / sắp đến hạn CỦA CHÍNH NGƯỜI ĐÓ (là người trách nhiệm).
--   2. Sắp đến hạn nâng bậc lương — chỉ gửi cho người có quyền trên module lương,
--      và ĐẾM THEO ĐÚNG PHẠM VI XEM của từng người (không phải số toàn tỉnh).
--
-- Nhịp nhắc — cố ý GOM NHÓM thay vì mỗi việc một dòng. Người trễ 20 việc mà
-- sáng nào cũng nhận 20 dòng y hệt thì thôi không mở chuông nữa; mà danh sách
-- công việc lại không có đường mở thẳng tới MỘT việc (chỉ có màn danh sách),
-- nên 20 dòng đó cũng dẫn về cùng một chỗ. Vì vậy:
--   · quá hạn     : 1 dòng/người/ngày — "Bạn có N công việc đã quá hạn";
--   · sắp đến hạn : 1 dòng/người/ngày — N việc đến hạn trong 3 ngày tới;
--   · nâng lương  : 1 dòng/người/tuần (khoá theo tuần ISO).
--
-- Idempotent hai tầng: khoá duy nhất `(nhan_vien_id, khoa_chong_trung)` +
-- `ON CONFLICT DO NOTHING`. Chạy lại 100 lần trong ngày vẫn ra đúng số dòng.
-- ============================================================================

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
      AND nv.auth_user_id IS NOT NULL          -- chưa có tài khoản thì không ai đọc được
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
      AND nv.auth_user_id IS NOT NULL          -- chưa có tài khoản thì không ai đọc được
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

-- Chỉ nền tảng gọi (pg_cron chạy dưới quyền postgres). KHÔNG mở cho `anon` /
-- `authenticated`: hàm này ghi vào hộp thông báo của TẤT CẢ mọi người.
--
-- Phải REVOKE đích danh hai vai đó. `REVOKE ... FROM PUBLIC` là chưa đủ, vì
-- Supabase cấp EXECUTE trực tiếp cho `anon`/`authenticated` trên mọi hàm mới
-- trong schema `public` qua `ALTER DEFAULT PRIVILEGES` — đã kiểm chứng bằng
-- `pg_proc.proacl` sau lần chạy đầu.
REVOKE ALL ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(date) TO service_role;

-- ---------------------------------------------------------------------------
-- rpc_thong_bao_danh_dau_tat_ca_da_doc — "Đánh dấu tất cả đã đọc" trong 1 request
--
-- Không có hàm này thì giao diện phải phát N lệnh UPDATE (hoặc kéo hết id về
-- rồi gửi lại) — đúng thứ docs/supabase-egress.md cấm.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER          -- vẫn đi qua RLS: chỉ chạm được hộp của chính mình
SET search_path = public, pg_temp
AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE public.thong_bao
  SET da_doc = true
  WHERE da_doc = false;   -- RLS đã giới hạn về đúng dòng của người gọi
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() IS
  'Đánh dấu đã đọc toàn bộ thông báo chưa đọc của người đang đăng nhập (1 request).';

REVOKE ALL ON FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
