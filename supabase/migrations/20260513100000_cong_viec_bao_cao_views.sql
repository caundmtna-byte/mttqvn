-- ============================================================================
-- Báo cáo công việc — view nền + 7 RPC tổng hợp + 1 RPC filter options.
-- Mục tiêu: aggregate phía Postgres, trả về số liệu rút gọn cho frontend
-- thay vì fetch toàn bộ bảng cong_viec_danh_sach (giảm egress Supabase).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. View nền v_cong_viec_bao_cao
--    JOIN sẵn nhân viên trách nhiệm + người tạo, tính sẵn days_to_deadline.
--    Tất cả RPC đều dùng view này nên LEFT JOIN chỉ tính 1 lần / query.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_cong_viec_bao_cao;
CREATE VIEW public.v_cong_viec_bao_cao AS
SELECT
  cv.id,
  cv.muc_do,
  cv.ten_cong_viec,
  cv.ghi_chu,
  cv.link_tai_lieu,
  cv.thoi_han,
  cv.tien_do,
  cv.id_trach_nhiem,
  cv.ids_ho_tro,
  cv.trang_thai,
  cv.ket_qua,
  cv.link_kq,
  cv.ngay_hoan_thanh,
  cv.id_nguoi_tao,
  cv.tg_tao,
  cv.tg_cap_nhat,
  tr.ho_va_ten      AS ho_va_ten_trach_nhiem,
  tr.ten_tai_khoan  AS ten_tai_khoan_trach_nhiem,
  ng.ho_va_ten      AS ho_va_ten_nguoi_tao,
  ng.ten_tai_khoan  AS ten_tai_khoan_nguoi_tao,
  CASE
    WHEN cv.trang_thai IN ('Hủy', 'Hoàn thành') THEN NULL
    WHEN cv.thoi_han IS NULL                     THEN NULL
    ELSE (cv.thoi_han - CURRENT_DATE)
  END AS days_to_deadline
FROM public.cong_viec_danh_sach cv
LEFT JOIN public.var_nhan_vien tr ON tr.id = cv.id_trach_nhiem
LEFT JOIN public.var_nhan_vien ng ON ng.id = cv.id_nguoi_tao;

GRANT SELECT ON public.v_cong_viec_bao_cao TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. RPC: cong_viec_bao_cao_kpi
--    Trả 1 row tổng quan: tổng / theo trạng thái / quá hạn / sắp hết hạn ...
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_kpi(
  date, date, bigint[], bigint[], text[], text[], boolean
);
CREATE FUNCTION public.cong_viec_bao_cao_kpi(
  p_start            date,
  p_end              date,
  p_id_trach_nhiem   bigint[] DEFAULT NULL,
  p_id_nguoi_tao     bigint[] DEFAULT NULL,
  p_trang_thai       text[]   DEFAULT NULL,
  p_muc_do           text[]   DEFAULT NULL,
  p_overdue_only     boolean  DEFAULT FALSE
) RETURNS TABLE (
  total                 bigint,
  moi                   bigint,
  dang                  bigint,
  hoan_thanh            bigint,
  tam_dung              bigint,
  huy                   bigint,
  qua_han               bigint,
  sap_het_han           bigint,
  hoan_thanh_dung_han   bigint,
  distinct_trach_nhiem  bigint,
  distinct_nguoi_tao    bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT *
    FROM public.v_cong_viec_bao_cao v
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
  )
  SELECT
    COUNT(*)::bigint                                                                        AS total,
    COUNT(*) FILTER (WHERE trang_thai = 'Mới')::bigint                                      AS moi,
    COUNT(*) FILTER (WHERE trang_thai = 'Đang thực hiện')::bigint                            AS dang,
    COUNT(*) FILTER (WHERE trang_thai = 'Hoàn thành')::bigint                                AS hoan_thanh,
    COUNT(*) FILTER (WHERE trang_thai = 'Tạm dừng')::bigint                                  AS tam_dung,
    COUNT(*) FILTER (WHERE trang_thai = 'Hủy')::bigint                                       AS huy,
    COUNT(*) FILTER (WHERE days_to_deadline IS NOT NULL AND days_to_deadline < 0)::bigint    AS qua_han,
    COUNT(*) FILTER (
      WHERE days_to_deadline IS NOT NULL AND days_to_deadline >= 0 AND days_to_deadline <= 3
    )::bigint                                                                                AS sap_het_han,
    COUNT(*) FILTER (
      WHERE trang_thai = 'Hoàn thành'
        AND ngay_hoan_thanh IS NOT NULL
        AND thoi_han        IS NOT NULL
        AND ngay_hoan_thanh <= thoi_han
    )::bigint                                                                                AS hoan_thanh_dung_han,
    COUNT(DISTINCT id_trach_nhiem)::bigint                                                   AS distinct_trach_nhiem,
    COUNT(DISTINCT id_nguoi_tao)::bigint                                                     AS distinct_nguoi_tao
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_kpi(
  date, date, bigint[], bigint[], text[], text[], boolean
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. RPC: cong_viec_bao_cao_trend
--    Chuỗi liên tục theo bucket day/month: số tạo, hoàn thành, quá hạn.
--    p_bucket = 'auto' (≤62 ngày → day, ngược lại month) | 'day' | 'month'
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_trend(
  date, date, text, bigint[], bigint[], text[], text[], boolean
);
CREATE FUNCTION public.cong_viec_bao_cao_trend(
  p_start            date,
  p_end              date,
  p_bucket           text     DEFAULT 'auto',
  p_id_trach_nhiem   bigint[] DEFAULT NULL,
  p_id_nguoi_tao     bigint[] DEFAULT NULL,
  p_trang_thai       text[]   DEFAULT NULL,
  p_muc_do           text[]   DEFAULT NULL,
  p_overdue_only     boolean  DEFAULT FALSE
) RETURNS TABLE (
  bucket_key  text,
  label       text,
  created     bigint,
  done        bigint,
  overdue     bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_bucket text;
BEGIN
  IF p_bucket = 'auto' THEN
    v_bucket := CASE WHEN (p_end - p_start) > 62 THEN 'month' ELSE 'day' END;
  ELSE
    v_bucket := p_bucket;
  END IF;

  IF v_bucket NOT IN ('day', 'month') THEN
    RAISE EXCEPTION 'Invalid p_bucket %', v_bucket;
  END IF;

  IF v_bucket = 'day' THEN
    RETURN QUERY
    WITH base AS (
      SELECT *
      FROM public.v_cong_viec_bao_cao v
      WHERE v.tg_tao::date BETWEEN p_start AND p_end
        AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
        AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
        AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
        AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
        AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
    ),
    series AS (
      SELECT generate_series(p_start, p_end, '1 day'::interval)::date AS d
    )
    SELECT
      to_char(s.d, 'YYYY-MM-DD')                                                AS bucket_key,
      to_char(s.d, 'DD/MM')                                                     AS label,
      COUNT(b.id) FILTER (WHERE b.tg_tao::date = s.d)::bigint                   AS created,
      COUNT(b.id) FILTER (
        WHERE b.trang_thai = 'Hoàn thành' AND b.ngay_hoan_thanh = s.d
      )::bigint                                                                 AS done,
      COUNT(b.id) FILTER (
        WHERE b.days_to_deadline IS NOT NULL AND b.days_to_deadline < 0
          AND b.thoi_han = s.d
      )::bigint                                                                 AS overdue
    FROM series s
    LEFT JOIN base b ON
      b.tg_tao::date    = s.d
      OR b.ngay_hoan_thanh = s.d
      OR b.thoi_han        = s.d
    GROUP BY s.d
    ORDER BY s.d;
  ELSE
    RETURN QUERY
    WITH base AS (
      SELECT *
      FROM public.v_cong_viec_bao_cao v
      WHERE v.tg_tao::date BETWEEN p_start AND p_end
        AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
        AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
        AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
        AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
        AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
    ),
    series AS (
      SELECT generate_series(date_trunc('month', p_start::timestamp),
                             date_trunc('month', p_end::timestamp),
                             '1 month'::interval)::date AS d
    )
    SELECT
      to_char(s.d, 'YYYY-MM')                                                  AS bucket_key,
      to_char(s.d, 'MM/YYYY')                                                  AS label,
      COUNT(b.id) FILTER (WHERE date_trunc('month', b.tg_tao)::date = s.d)::bigint AS created,
      COUNT(b.id) FILTER (
        WHERE b.trang_thai = 'Hoàn thành'
          AND b.ngay_hoan_thanh IS NOT NULL
          AND date_trunc('month', b.ngay_hoan_thanh::timestamp)::date = s.d
      )::bigint                                                                AS done,
      COUNT(b.id) FILTER (
        WHERE b.days_to_deadline IS NOT NULL AND b.days_to_deadline < 0
          AND b.thoi_han IS NOT NULL
          AND date_trunc('month', b.thoi_han::timestamp)::date = s.d
      )::bigint                                                                AS overdue
    FROM series s
    LEFT JOIN base b ON
      date_trunc('month', b.tg_tao)::date = s.d
      OR date_trunc('month', b.ngay_hoan_thanh::timestamp)::date = s.d
      OR date_trunc('month', b.thoi_han::timestamp)::date = s.d
    GROUP BY s.d
    ORDER BY s.d;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_trend(
  date, date, text, bigint[], bigint[], text[], text[], boolean
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. RPC: cong_viec_bao_cao_phan_bo_trang_thai
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_phan_bo_trang_thai(
  date, date, bigint[], bigint[], text[], text[], boolean
);
CREATE FUNCTION public.cong_viec_bao_cao_phan_bo_trang_thai(
  p_start            date,
  p_end              date,
  p_id_trach_nhiem   bigint[] DEFAULT NULL,
  p_id_nguoi_tao     bigint[] DEFAULT NULL,
  p_trang_thai       text[]   DEFAULT NULL,
  p_muc_do           text[]   DEFAULT NULL,
  p_overdue_only     boolean  DEFAULT FALSE
) RETURNS TABLE (
  trang_thai text,
  count      bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT v.trang_thai, COUNT(*)::bigint AS count
  FROM public.v_cong_viec_bao_cao v
  WHERE v.tg_tao::date BETWEEN p_start AND p_end
    AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
    AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
    AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
    AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
    AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
  GROUP BY v.trang_thai
  ORDER BY count DESC, v.trang_thai;
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_phan_bo_trang_thai(
  date, date, bigint[], bigint[], text[], text[], boolean
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. RPC: cong_viec_bao_cao_phan_bo_muc_do
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_phan_bo_muc_do(
  date, date, bigint[], bigint[], text[], text[], boolean
);
CREATE FUNCTION public.cong_viec_bao_cao_phan_bo_muc_do(
  p_start            date,
  p_end              date,
  p_id_trach_nhiem   bigint[] DEFAULT NULL,
  p_id_nguoi_tao     bigint[] DEFAULT NULL,
  p_trang_thai       text[]   DEFAULT NULL,
  p_muc_do           text[]   DEFAULT NULL,
  p_overdue_only     boolean  DEFAULT FALSE
) RETURNS TABLE (
  muc_do text,
  count  bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT v.muc_do, COUNT(*)::bigint AS count
  FROM public.v_cong_viec_bao_cao v
  WHERE v.tg_tao::date BETWEEN p_start AND p_end
    AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
    AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
    AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
    AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
    AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
  GROUP BY v.muc_do
  ORDER BY
    CASE v.muc_do
      WHEN 'Khẩn'      THEN 1
      WHEN 'Cao'       THEN 2
      WHEN 'Trung bình' THEN 3
      WHEN 'Thấp'      THEN 4
      ELSE 5
    END;
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_phan_bo_muc_do(
  date, date, bigint[], bigint[], text[], text[], boolean
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPC: cong_viec_bao_cao_top_trach_nhiem
--    Top N người trách nhiệm theo tổng việc, có tỉ lệ hoàn thành.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_top_trach_nhiem(
  date, date, integer, bigint[], bigint[], text[], text[], boolean
);
CREATE FUNCTION public.cong_viec_bao_cao_top_trach_nhiem(
  p_start            date,
  p_end              date,
  p_top              integer  DEFAULT 10,
  p_id_trach_nhiem   bigint[] DEFAULT NULL,
  p_id_nguoi_tao     bigint[] DEFAULT NULL,
  p_trang_thai       text[]   DEFAULT NULL,
  p_muc_do           text[]   DEFAULT NULL,
  p_overdue_only     boolean  DEFAULT FALSE
) RETURNS TABLE (
  id_trach_nhiem  bigint,
  ho_va_ten       text,
  ten_tai_khoan   text,
  total           bigint,
  hoan_thanh      bigint,
  dang            bigint,
  qua_han         bigint,
  completion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT *
    FROM public.v_cong_viec_bao_cao v
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
  )
  SELECT
    b.id_trach_nhiem,
    MAX(b.ho_va_ten_trach_nhiem)     AS ho_va_ten,
    MAX(b.ten_tai_khoan_trach_nhiem) AS ten_tai_khoan,
    COUNT(*)::bigint                                                                        AS total,
    COUNT(*) FILTER (WHERE b.trang_thai = 'Hoàn thành')::bigint                              AS hoan_thanh,
    COUNT(*) FILTER (WHERE b.trang_thai = 'Đang thực hiện')::bigint                          AS dang,
    COUNT(*) FILTER (WHERE b.days_to_deadline IS NOT NULL AND b.days_to_deadline < 0)::bigint AS qua_han,
    ROUND(
      COUNT(*) FILTER (WHERE b.trang_thai = 'Hoàn thành')::numeric
      / NULLIF(COUNT(*), 0)::numeric * 100,
      1
    )                                                                                       AS completion_rate
  FROM base b
  GROUP BY b.id_trach_nhiem
  ORDER BY total DESC, completion_rate DESC NULLS LAST
  LIMIT GREATEST(p_top, 1);
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_top_trach_nhiem(
  date, date, integer, bigint[], bigint[], text[], text[], boolean
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC: cong_viec_bao_cao_top_nguoi_tao
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_top_nguoi_tao(
  date, date, integer, bigint[], bigint[], text[], text[], boolean
);
CREATE FUNCTION public.cong_viec_bao_cao_top_nguoi_tao(
  p_start            date,
  p_end              date,
  p_top              integer  DEFAULT 10,
  p_id_trach_nhiem   bigint[] DEFAULT NULL,
  p_id_nguoi_tao     bigint[] DEFAULT NULL,
  p_trang_thai       text[]   DEFAULT NULL,
  p_muc_do           text[]   DEFAULT NULL,
  p_overdue_only     boolean  DEFAULT FALSE
) RETURNS TABLE (
  id_nguoi_tao    bigint,
  ho_va_ten       text,
  ten_tai_khoan   text,
  total           bigint,
  hoan_thanh      bigint,
  qua_han         bigint,
  completion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT *
    FROM public.v_cong_viec_bao_cao v
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
  )
  SELECT
    b.id_nguoi_tao,
    MAX(b.ho_va_ten_nguoi_tao)     AS ho_va_ten,
    MAX(b.ten_tai_khoan_nguoi_tao) AS ten_tai_khoan,
    COUNT(*)::bigint                                                                        AS total,
    COUNT(*) FILTER (WHERE b.trang_thai = 'Hoàn thành')::bigint                              AS hoan_thanh,
    COUNT(*) FILTER (WHERE b.days_to_deadline IS NOT NULL AND b.days_to_deadline < 0)::bigint AS qua_han,
    ROUND(
      COUNT(*) FILTER (WHERE b.trang_thai = 'Hoàn thành')::numeric
      / NULLIF(COUNT(*), 0)::numeric * 100,
      1
    )                                                                                       AS completion_rate
  FROM base b
  GROUP BY b.id_nguoi_tao
  ORDER BY total DESC, completion_rate DESC NULLS LAST
  LIMIT GREATEST(p_top, 1);
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_top_nguoi_tao(
  date, date, integer, bigint[], bigint[], text[], text[], boolean
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC: cong_viec_bao_cao_lookup
--    Phân trang server-side cho bảng tra cứu dưới trang báo cáo.
--    Sort whitelist: thoi_han_desc | thoi_han_asc | tien_do_desc
--                  | trang_thai_asc | tg_cap_nhat_desc
--    Dùng window count(*) OVER () để biết tổng row khớp filter.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_lookup(
  date, date, integer, integer, text, bigint[], bigint[], text[], text[], boolean
);
CREATE FUNCTION public.cong_viec_bao_cao_lookup(
  p_start            date,
  p_end              date,
  p_limit            integer  DEFAULT 50,
  p_offset           integer  DEFAULT 0,
  p_sort             text     DEFAULT 'thoi_han_desc',
  p_id_trach_nhiem   bigint[] DEFAULT NULL,
  p_id_nguoi_tao     bigint[] DEFAULT NULL,
  p_trang_thai       text[]   DEFAULT NULL,
  p_muc_do           text[]   DEFAULT NULL,
  p_overdue_only     boolean  DEFAULT FALSE
) RETURNS TABLE (
  id                          text,
  muc_do                      text,
  ten_cong_viec               text,
  ghi_chu                     text,
  link_tai_lieu               text,
  thoi_han                    date,
  tien_do                     smallint,
  id_trach_nhiem              text,
  ids_ho_tro                  bigint[],
  trang_thai                  text,
  ket_qua                     text,
  link_kq                     text,
  ngay_hoan_thanh             date,
  id_nguoi_tao                text,
  tg_tao                      timestamptz,
  tg_cap_nhat                 timestamptz,
  ho_va_ten_trach_nhiem       text,
  ten_tai_khoan_trach_nhiem   text,
  ho_va_ten_nguoi_tao         text,
  ten_tai_khoan_nguoi_tao     text,
  days_to_deadline            integer,
  total_count                 bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT v.*, COUNT(*) OVER () AS total_count
    FROM public.v_cong_viec_bao_cao v
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
  )
  SELECT
    b.id::text,
    b.muc_do,
    b.ten_cong_viec,
    b.ghi_chu,
    b.link_tai_lieu,
    b.thoi_han,
    b.tien_do,
    b.id_trach_nhiem::text,
    b.ids_ho_tro,
    b.trang_thai,
    b.ket_qua,
    b.link_kq,
    b.ngay_hoan_thanh,
    b.id_nguoi_tao::text,
    b.tg_tao,
    b.tg_cap_nhat,
    b.ho_va_ten_trach_nhiem,
    b.ten_tai_khoan_trach_nhiem,
    b.ho_va_ten_nguoi_tao,
    b.ten_tai_khoan_nguoi_tao,
    b.days_to_deadline,
    b.total_count
  FROM base b
  ORDER BY
    CASE WHEN p_sort = 'thoi_han_desc'    THEN b.thoi_han        END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_han_asc'     THEN b.thoi_han        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc'     THEN b.tien_do         END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'   THEN b.trang_thai      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc' THEN b.tg_cap_nhat     END DESC NULLS LAST,
    b.id DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_lookup(
  date, date, integer, integer, text, bigint[], bigint[], text[], text[], boolean
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. RPC: cong_viec_bao_cao_filter_options
--    Trả về options trach_nhiem & nguoi_tao trong khoảng thời gian:
--    tránh fetch toàn bộ var_nhan_vien (chỉ ai có việc trong kỳ).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cong_viec_bao_cao_filter_options(date, date);
CREATE FUNCTION public.cong_viec_bao_cao_filter_options(
  p_start date,
  p_end   date
) RETURNS TABLE (
  trach_nhiem jsonb,
  nguoi_tao   jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT *
    FROM public.v_cong_viec_bao_cao v
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
  ),
  agg_tn AS (
    SELECT
      id_trach_nhiem AS id,
      MAX(COALESCE(ho_va_ten_trach_nhiem, ten_tai_khoan_trach_nhiem, id_trach_nhiem::text)) AS label,
      COUNT(*)::bigint AS count
    FROM base
    GROUP BY id_trach_nhiem
  ),
  agg_nt AS (
    SELECT
      id_nguoi_tao AS id,
      MAX(COALESCE(ho_va_ten_nguoi_tao, ten_tai_khoan_nguoi_tao, id_nguoi_tao::text)) AS label,
      COUNT(*)::bigint AS count
    FROM base
    GROUP BY id_nguoi_tao
  )
  SELECT
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', id::text, 'label', label, 'count', count) ORDER BY label)
         FROM agg_tn),
      '[]'::jsonb
    ) AS trach_nhiem,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', id::text, 'label', label, 'count', count) ORDER BY label)
         FROM agg_nt),
      '[]'::jsonb
    ) AS nguoi_tao;
$$;

GRANT EXECUTE ON FUNCTION public.cong_viec_bao_cao_filter_options(date, date) TO authenticated;
