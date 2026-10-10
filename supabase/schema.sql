--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: bai_viet_danh_sach_enforce_don_gia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bai_viet_danh_sach_enforce_don_gia() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_tl_don_gia numeric;
  v_can_edit boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bai_viet_thiet_lap_the_loai tl WHERE tl.id = NEW.id_the_loai
  ) THEN
    RAISE EXCEPTION 'bai_viet_danh_sach: id_the_loai không hợp lệ';
  END IF;

  SELECT tl.don_gia INTO STRICT v_tl_don_gia
  FROM public.bai_viet_thiet_lap_the_loai tl
  WHERE tl.id = NEW.id_the_loai;

  SELECT COALESCE(
    (
      SELECT
        (COALESCE(cv.cap_bac, 0) = 1)
        OR EXISTS (
          SELECT 1
          FROM public.var_phan_quyen pq
          WHERE pq.chuc_vu_id = nv.id_chuc_vu
            AND pq.module_key = 'bai-viet'
            AND (
              pq.quyen ~* '(^|,)\\s*quan_tri\\s*(,|$)'
              OR pq.quyen ~* '(^|,)\\s*all\\s*(,|$)'
            )
        )
      FROM public.var_nhan_vien nv
      LEFT JOIN public.var_chuc_vu cv ON cv.id = nv.id_chuc_vu
      WHERE auth.role() = 'authenticated'
        AND lower(trim(nv.ten_tai_khoan)) = lower(trim(split_part(COALESCE(auth.jwt()->>'email', ''), '@', 1)))
    ),
    false
  )
  INTO v_can_edit;

  IF NOT v_can_edit THEN
    NEW.don_gia := v_tl_don_gia;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: FUNCTION bai_viet_danh_sach_enforce_don_gia(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.bai_viet_danh_sach_enforce_don_gia() IS 'Gán don_gia theo thể loại nếu user không phải cap_bac=1 và không có quan_tri/all trên module bai-viet.';


--
-- Name: bai_viet_danh_sach_validate_khac_loai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bai_viet_danh_sach_validate_khac_loai() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  loai_nguon TEXT;
  loai_trang TEXT;
BEGIN
  SELECT k.loai INTO loai_nguon
  FROM public.bai_viet_thiet_lap_khac k
  WHERE k.id = NEW.id_nguon_dang;

  IF loai_nguon IS DISTINCT FROM 'nguon_dang' THEN
    RAISE EXCEPTION 'bai_viet_danh_sach: id_nguon_dang phải trỏ tới bản ghi loai nguon_dang';
  END IF;

  SELECT k.loai INTO loai_trang
  FROM public.bai_viet_thiet_lap_khac k
  WHERE k.id = NEW.id_trang_dang;

  IF loai_trang IS DISTINCT FROM 'trang_dang' THEN
    RAISE EXCEPTION 'bai_viet_danh_sach: id_trang_dang phải trỏ tới bản ghi loai trang_dang';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: cong_viec_bao_cao_filter_options(date, date, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_filter_options(p_start date, p_end date, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(trach_nhiem jsonb, nguoi_tao jsonb)
    LANGUAGE sql STABLE
    AS $$
  WITH base AS (
    SELECT v.*
    FROM public.v_cong_viec_bao_cao v
    LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (
        p_view_all
        OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
        OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
        OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
        OR (p_viewer_don_vi_id IS NOT NULL
            AND tnv.don_vi_id IS NOT NULL
            AND tnv.don_vi_id = p_viewer_don_vi_id)
        OR (p_viewer_phong_ban_id IS NOT NULL
            AND tnv.id_phong_ban IS NOT NULL
            AND tnv.id_phong_ban = p_viewer_phong_ban_id)
      )
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


--
-- Name: cong_viec_bao_cao_kpi(date, date, bigint[], bigint[], text[], text[], boolean, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_kpi(p_start date, p_end date, p_id_trach_nhiem bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_overdue_only boolean DEFAULT false, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(total bigint, moi bigint, dang bigint, hoan_thanh bigint, tam_dung bigint, huy bigint, qua_han bigint, sap_het_han bigint, hoan_thanh_dung_han bigint, distinct_trach_nhiem bigint, distinct_nguoi_tao bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH base AS (
    SELECT v.*
    FROM public.v_cong_viec_bao_cao v
    LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
      AND (
        p_view_all
        OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
        OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
        OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
        OR (p_viewer_don_vi_id IS NOT NULL
            AND tnv.don_vi_id IS NOT NULL
            AND tnv.don_vi_id = p_viewer_don_vi_id)
        OR (p_viewer_phong_ban_id IS NOT NULL
            AND tnv.id_phong_ban IS NOT NULL
            AND tnv.id_phong_ban = p_viewer_phong_ban_id)
      )
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


--
-- Name: cong_viec_bao_cao_lookup(date, date, integer, integer, text, bigint[], bigint[], text[], text[], boolean, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_lookup(p_start date, p_end date, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_sort text DEFAULT 'thoi_han_desc'::text, p_id_trach_nhiem bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_overdue_only boolean DEFAULT false, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(id text, muc_do text, ten_cong_viec text, ghi_chu text, link_tai_lieu text, thoi_han date, tien_do smallint, id_trach_nhiem text, ids_ho_tro bigint[], trang_thai text, ket_qua text, link_kq text, ngay_hoan_thanh date, id_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, ho_va_ten_trach_nhiem text, ten_tai_khoan_trach_nhiem text, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, days_to_deadline integer, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH base AS (
    SELECT v.*, COUNT(*) OVER () AS total_count
    FROM public.v_cong_viec_bao_cao v
    LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
      AND (
        p_view_all
        OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
        OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
        OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
        OR (p_viewer_don_vi_id IS NOT NULL
            AND tnv.don_vi_id IS NOT NULL
            AND tnv.don_vi_id = p_viewer_don_vi_id)
        OR (p_viewer_phong_ban_id IS NOT NULL
            AND tnv.id_phong_ban IS NOT NULL
            AND tnv.id_phong_ban = p_viewer_phong_ban_id)
      )
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


--
-- Name: cong_viec_bao_cao_phan_bo_muc_do(date, date, bigint[], bigint[], text[], text[], boolean, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_phan_bo_muc_do(p_start date, p_end date, p_id_trach_nhiem bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_overdue_only boolean DEFAULT false, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(muc_do text, count bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT v.muc_do, COUNT(*)::bigint AS count
  FROM public.v_cong_viec_bao_cao v
  LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
  WHERE v.tg_tao::date BETWEEN p_start AND p_end
    AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
    AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
    AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
    AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
    AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
    AND (
      p_view_all
      OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
      OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
      OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
      OR (p_viewer_don_vi_id IS NOT NULL
          AND tnv.don_vi_id IS NOT NULL
          AND tnv.don_vi_id = p_viewer_don_vi_id)
      OR (p_viewer_phong_ban_id IS NOT NULL
          AND tnv.id_phong_ban IS NOT NULL
          AND tnv.id_phong_ban = p_viewer_phong_ban_id)
    )
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


--
-- Name: cong_viec_bao_cao_phan_bo_trang_thai(date, date, bigint[], bigint[], text[], text[], boolean, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_phan_bo_trang_thai(p_start date, p_end date, p_id_trach_nhiem bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_overdue_only boolean DEFAULT false, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(trang_thai text, count bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT v.trang_thai, COUNT(*)::bigint AS count
  FROM public.v_cong_viec_bao_cao v
  LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
  WHERE v.tg_tao::date BETWEEN p_start AND p_end
    AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
    AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
    AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
    AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
    AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
    AND (
      p_view_all
      OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
      OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
      OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
      OR (p_viewer_don_vi_id IS NOT NULL
          AND tnv.don_vi_id IS NOT NULL
          AND tnv.don_vi_id = p_viewer_don_vi_id)
      OR (p_viewer_phong_ban_id IS NOT NULL
          AND tnv.id_phong_ban IS NOT NULL
          AND tnv.id_phong_ban = p_viewer_phong_ban_id)
    )
  GROUP BY v.trang_thai
  ORDER BY count DESC, v.trang_thai;
$$;


--
-- Name: cong_viec_bao_cao_top_nguoi_tao(date, date, integer, bigint[], bigint[], text[], text[], boolean, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_top_nguoi_tao(p_start date, p_end date, p_top integer DEFAULT 10, p_id_trach_nhiem bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_overdue_only boolean DEFAULT false, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(id_nguoi_tao bigint, ho_va_ten text, ten_tai_khoan text, total bigint, hoan_thanh bigint, qua_han bigint, completion_rate numeric)
    LANGUAGE sql STABLE
    AS $$
  WITH base AS (
    SELECT v.*
    FROM public.v_cong_viec_bao_cao v
    LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
      AND (
        p_view_all
        OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
        OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
        OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
        OR (p_viewer_don_vi_id IS NOT NULL
            AND tnv.don_vi_id IS NOT NULL
            AND tnv.don_vi_id = p_viewer_don_vi_id)
        OR (p_viewer_phong_ban_id IS NOT NULL
            AND tnv.id_phong_ban IS NOT NULL
            AND tnv.id_phong_ban = p_viewer_phong_ban_id)
      )
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


--
-- Name: cong_viec_bao_cao_top_trach_nhiem(date, date, integer, bigint[], bigint[], text[], text[], boolean, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_top_trach_nhiem(p_start date, p_end date, p_top integer DEFAULT 10, p_id_trach_nhiem bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_overdue_only boolean DEFAULT false, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(id_trach_nhiem bigint, ho_va_ten text, ten_tai_khoan text, total bigint, hoan_thanh bigint, dang bigint, qua_han bigint, completion_rate numeric)
    LANGUAGE sql STABLE
    AS $$
  WITH base AS (
    SELECT v.*
    FROM public.v_cong_viec_bao_cao v
    LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
    WHERE v.tg_tao::date BETWEEN p_start AND p_end
      AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
      AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
      AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
      AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
      AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
      AND (
        p_view_all
        OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
        OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
        OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
        OR (p_viewer_don_vi_id IS NOT NULL
            AND tnv.don_vi_id IS NOT NULL
            AND tnv.don_vi_id = p_viewer_don_vi_id)
        OR (p_viewer_phong_ban_id IS NOT NULL
            AND tnv.id_phong_ban IS NOT NULL
            AND tnv.id_phong_ban = p_viewer_phong_ban_id)
      )
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


--
-- Name: cong_viec_bao_cao_trend(date, date, text, bigint[], bigint[], text[], text[], boolean, bigint, bigint, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cong_viec_bao_cao_trend(p_start date, p_end date, p_bucket text DEFAULT 'auto'::text, p_id_trach_nhiem bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_overdue_only boolean DEFAULT false, p_viewer_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_view_all boolean DEFAULT false, p_viewer_phong_ban_id bigint DEFAULT NULL::bigint) RETURNS TABLE(bucket_key text, label text, created bigint, done bigint, overdue bigint)
    LANGUAGE plpgsql STABLE
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
      SELECT v.*
      FROM public.v_cong_viec_bao_cao v
      LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
      WHERE v.tg_tao::date BETWEEN p_start AND p_end
        AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
        AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
        AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
        AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
        AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
        AND (
          p_view_all
          OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
          OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
          OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
          OR (p_viewer_don_vi_id IS NOT NULL
              AND tnv.don_vi_id IS NOT NULL
              AND tnv.don_vi_id = p_viewer_don_vi_id)
          OR (p_viewer_phong_ban_id IS NOT NULL
              AND tnv.id_phong_ban IS NOT NULL
              AND tnv.id_phong_ban = p_viewer_phong_ban_id)
        )
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
      SELECT v.*
      FROM public.v_cong_viec_bao_cao v
      LEFT JOIN public.var_nhan_vien tnv ON tnv.id = v.id_trach_nhiem
      WHERE v.tg_tao::date BETWEEN p_start AND p_end
        AND (p_id_trach_nhiem IS NULL OR v.id_trach_nhiem = ANY(p_id_trach_nhiem))
        AND (p_id_nguoi_tao   IS NULL OR v.id_nguoi_tao   = ANY(p_id_nguoi_tao))
        AND (p_trang_thai     IS NULL OR v.trang_thai     = ANY(p_trang_thai))
        AND (p_muc_do         IS NULL OR v.muc_do         = ANY(p_muc_do))
        AND (NOT p_overdue_only OR (v.days_to_deadline IS NOT NULL AND v.days_to_deadline < 0))
        AND (
          p_view_all
          OR (p_viewer_id IS NOT NULL AND v.id_nguoi_tao = p_viewer_id)
          OR (p_viewer_id IS NOT NULL AND p_viewer_id = ANY(v.ids_ho_tro))
          OR (p_viewer_id IS NOT NULL AND v.id_trach_nhiem = p_viewer_id)
          OR (p_viewer_don_vi_id IS NOT NULL
              AND tnv.don_vi_id IS NOT NULL
              AND tnv.don_vi_id = p_viewer_don_vi_id)
          OR (p_viewer_phong_ban_id IS NOT NULL
              AND tnv.id_phong_ban IS NOT NULL
              AND tnv.id_phong_ban = p_viewer_phong_ban_id)
        )
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


--
-- Name: fn_chuan_hoa_tim_kiem(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_chuan_hoa_tim_kiem(p_text text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
  SELECT lower(extensions.unaccent('extensions.unaccent'::regdictionary,
                                   translate(coalesce(p_text, ''), 'đĐ', 'dD')));
$$;


--
-- Name: fn_co_quyen(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_co_quyen(p_module_key text, p_hanh_dong text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $_$
  SELECT public.fn_la_quan_tri() OR EXISTS (
    SELECT 1
    FROM public.var_nhan_vien nv
    JOIN public.var_phan_quyen pq ON pq.chuc_vu_id = nv.id_chuc_vu
    WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
      AND nv.trang_thai = 'Hoạt động'
      AND pq.module_key = p_module_key
      AND pq.quyen ~* ('(^|,)\s*' || p_hanh_dong || '\s*(,|$)')
  );
$_$;


--
-- Name: FUNCTION fn_co_quyen(p_module_key text, p_hanh_dong text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_co_quyen(p_module_key text, p_hanh_dong text) IS 'Người đang đăng nhập có quyền <hanh_dong> trên <module_key> không, theo ma trận var_phan_quyen.';


--
-- Name: fn_co_tai_khoan_dang_nhap(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_co_tai_khoan_dang_nhap(p_ten_tai_khoan text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(split_part(u.email, '@', 1)) = lower(btrim(p_ten_tai_khoan))
  );
$$;


--
-- Name: FUNCTION fn_co_tai_khoan_dang_nhap(p_ten_tai_khoan text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_co_tai_khoan_dang_nhap(p_ten_tai_khoan text) IS 'Tên tài khoản này đã có tài khoản đăng nhập trong auth.users chưa (khớp phần trước @ của email).';


--
-- Name: fn_don_vi_cua_toi(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_don_vi_cua_toi() RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT nv.don_vi_id
  FROM public.var_nhan_vien nv
  WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
    AND nv.trang_thai = 'Hoạt động'
  LIMIT 1;
$$;


--
-- Name: FUNCTION fn_don_vi_cua_toi(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_don_vi_cua_toi() IS 'var_nhan_vien.don_vi_id (xã/phường) của người đang đăng nhập, hoặc NULL.';


--
-- Name: fn_duoc_khoa_ky(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_duoc_khoa_ky(p_module_key text) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT CASE
           WHEN current_user IN ('authenticated', 'anon')
             THEN public.fn_co_quyen(p_module_key, 'sua')
           ELSE true
         END;
$$;


--
-- Name: FUNCTION fn_duoc_khoa_ky(p_module_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_duoc_khoa_ky(p_module_key text) IS 'Người đang đăng nhập có được khoá sổ / mở khoá kỳ của <module_key> không.';


--
-- Name: fn_gan_id_nguoi_tao(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_gan_id_nguoi_tao() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
DECLARE
  v_nv bigint;
BEGIN
  v_nv := public.fn_nhan_vien_id_hien_tai();
  IF v_nv IS NOT NULL THEN
    NEW.id_nguoi_tao := v_nv;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_gan_id_nguoi_tao(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_gan_id_nguoi_tao() IS 'Trigger BEFORE INSERT: ghi đè id_nguoi_tao bằng nhân viên của auth.uid(). Không có phiên đăng nhập (service_role, script) thì giữ nguyên giá trị truyền vào.';


--
-- Name: fn_gan_ngay_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_gan_ngay_trang_thai() RETURNS trigger
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


--
-- Name: FUNCTION fn_gan_ngay_trang_thai(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_gan_ngay_trang_thai() IS 'BEFORE INSERT OR UPDATE: ngay_cap_nhat_trang_thai = now() khi thêm mới hoặc khi trang_thai đổi; không thì giữ giá trị cũ.';


--
-- Name: fn_gan_nguoi_cap_nhat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_gan_nguoi_cap_nhat() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'auth'
    AS $$
BEGIN
  -- Không nhận diện được (service role, job nền) ⇒ giữ người cũ / người tạo.
  NEW.id_nguoi_cap_nhat := COALESCE(
    public.fn_nhan_vien_id_hien_tai(),
    CASE WHEN TG_OP = 'INSERT' THEN NEW.id_nguoi_tao ELSE OLD.id_nguoi_cap_nhat END
  );
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_gan_nguoi_cap_nhat(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_gan_nguoi_cap_nhat() IS 'BEFORE INSERT OR UPDATE: gán id_nguoi_cap_nhat = nhân viên đang đăng nhập. Bảng gắn trigger này phải có cả id_nguoi_tao.';


--
-- Name: fn_gan_nguoi_duyet_khen_thuong(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_gan_nguoi_duyet_khen_thuong() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
BEGIN
  IF NEW.trang_thai = 'Đã ban hành' AND OLD.trang_thai IS DISTINCT FROM 'Đã ban hành' THEN
    NEW.nguoi_duyet_id := public.fn_nhan_vien_id_hien_tai();
    NEW.tg_duyet := now();
  ELSIF NEW.trang_thai <> 'Đã ban hành' AND OLD.trang_thai = 'Đã ban hành' THEN
    -- Rời khỏi trạng thái đã ban hành (chỉ còn đường huỷ) thì xoá dấu duyệt.
    NEW.nguoi_duyet_id := NULL;
    NEW.tg_duyet := NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_ghi_lich_su_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ghi_lich_su_trang_thai() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
BEGIN
  IF OLD.trang_thai IS NOT DISTINCT FROM NEW.trang_thai THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.lich_su_trang_thai (
    bang, ban_ghi_id, tu_trang_thai, den_trang_thai, ly_do, nguoi_thuc_hien_id, auth_user_id
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id::text,
    OLD.trang_thai,
    NEW.trang_thai,
    -- Nhiều bảng dùng `ghi_chu` để chứa lý do đổi trạng thái; chụp lại tại đây
    -- để lần đổi sau ghi đè cũng không mất.
    NULLIF(btrim(COALESCE(to_jsonb(NEW)->>'ghi_chu', '')), ''),
    public.fn_nhan_vien_id_hien_tai(),
    auth.uid()
  );
  RETURN NULL;
END;
$$;


--
-- Name: fn_ghi_nhat_ky(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ghi_nhat_ky() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
DECLARE
  v_hanh_dong text;
  v_ban_ghi_id text;
  v_cu jsonb;
  v_moi jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_hanh_dong := 'them';
    v_moi := to_jsonb(NEW);
    v_ban_ghi_id := v_moi->>'id';
  ELSIF TG_OP = 'UPDATE' THEN
    v_hanh_dong := 'sua';
    v_cu  := to_jsonb(OLD);
    v_moi := to_jsonb(NEW);
    v_ban_ghi_id := v_moi->>'id';
    -- Không ghi khi nội dung không đổi (ví dụ trigger tg_cap_nhat chạm vào dòng).
    IF v_cu - 'tg_cap_nhat' = v_moi - 'tg_cap_nhat' THEN
      RETURN NULL;
    END IF;
  ELSE
    v_hanh_dong := 'xoa';
    v_cu := to_jsonb(OLD);
    v_ban_ghi_id := v_cu->>'id';
  END IF;

  INSERT INTO public.audit_log (
    bang, ban_ghi_id, hanh_dong, nguoi_thuc_hien_id, auth_user_id, du_lieu_cu, du_lieu_moi
  ) VALUES (
    TG_TABLE_NAME, v_ban_ghi_id, v_hanh_dong,
    public.fn_nhan_vien_id_hien_tai(), auth.uid(), v_cu, v_moi
  );

  RETURN NULL; -- AFTER trigger, giá trị trả về bị bỏ qua.
END;
$$;


--
-- Name: FUNCTION fn_ghi_nhat_ky(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_ghi_nhat_ky() IS 'Trigger AFTER INSERT/UPDATE/DELETE dùng chung, ghi vào audit_log. Gắn thêm cho bảng mới: CREATE TRIGGER tg_audit_<bang> AFTER INSERT OR UPDATE OR DELETE ON public.<bang> FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();';


--
-- Name: fn_hngh_chuan_hoa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_hngh_chuan_hoa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.ho_ten_dai_dien := regexp_replace(btrim(NEW.ho_ten_dai_dien), '\s+', ' ', 'g');
  -- Bóc MỌI khoảng trắng kể cả ở giữa; chuỗi rỗng về NULL để không đụng unique.
  NEW.so_cccd      := nullif(regexp_replace(coalesce(NEW.so_cccd, ''), '\s+', '', 'g'), '');
  NEW.so_tai_khoan := nullif(regexp_replace(coalesce(NEW.so_tai_khoan, ''), '\s+', '', 'g'), '');
  NEW.dien_thoai   := nullif(regexp_replace(coalesce(NEW.dien_thoai, ''), '\s+', '', 'g'), '');
  NEW.ngan_hang    := nullif(btrim(coalesce(NEW.ngan_hang, '')), '');
  NEW.khoi_xom     := nullif(btrim(coalesce(NEW.khoi_xom, '')), '');
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_hngh_chuan_hoa(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_hngh_chuan_hoa() IS 'BEFORE INSERT/UPDATE: bóc khoảng trắng, đổi chuỗi rỗng thành NULL. Chạy trước mọi CHECK và trước unique index so_cccd.';


--
-- Name: fn_hngh_kiem_dan_toc_loai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_hngh_kiem_dan_toc_loai() RETURNS trigger
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


--
-- Name: fn_hngh_lan_sang_nddk(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_hngh_lan_sang_nddk() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.nddk_nha_dai_doan_ket n
     SET ho_ten_chu_ho = NEW.ho_ten_dai_dien,
         xa_phuong_id  = NEW.xa_phuong_id,
         khoi_xom      = NEW.khoi_xom,
         doi_tuong     = NEW.doi_tuong
   WHERE n.ho_ngheo_id = NEW.id;
  RETURN NULL;
END;
$$;


--
-- Name: FUNCTION fn_hngh_lan_sang_nddk(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_hngh_lan_sang_nddk() IS 'AFTER UPDATE trên hộ nghèo: đồng bộ họ tên / xã / khối xóm / đối tượng sang các nhà đại đoàn kết gắn hộ.';


--
-- Name: fn_hngh_nhan_ho_tro_nguon(text, integer[], bigint[], text[], bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_hngh_nhan_ho_tro_nguon(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_ho_ngheo_id bigint) RETURNS TABLE(id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, vnn_tien numeric, vnn_hien_vat numeric, vnn_so_khoan bigint, nddk_tien numeric, nddk_so_can bigint, kho_gia_tri numeric, kho_so_phieu bigint, tong_gia_tri numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  WITH vnn AS (
    SELECT v.ho_ngheo_id,
           COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro =  'Tiền mặt'), 0) AS tien,
           COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro <> 'Tiền mặt'), 0) AS hien_vat,
           count(*)                              AS so_khoan
    FROM public.vnn_chuong_trinh v
    WHERE v.ho_ngheo_id IS NOT NULL
      AND v.trang_thai = 'Đã nhận'
      AND (p_nam IS NULL OR cardinality(p_nam) = 0 OR v.nam = ANY (p_nam))
    GROUP BY v.ho_ngheo_id
  ),
  nddk AS (
    SELECT n.ho_ngheo_id, sum(COALESCE(n.so_tien, 0)) AS tien, count(*) AS so_can
    FROM public.nddk_nha_dai_doan_ket n
    WHERE n.ho_ngheo_id IS NOT NULL
      AND n.trang_thai = 'Đã bàn giao'
      AND (p_nam IS NULL OR cardinality(p_nam) = 0 OR n.nam = ANY (p_nam))
    GROUP BY n.ho_ngheo_id
  ),
  kho AS (
    SELECT p.ho_ngheo_id, sum(ct.thanh_tien) AS gia_tri, count(DISTINCT p.id) AS so_phieu
    FROM public.kho_nhap_xuat_kho p
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
    WHERE p.loai_phieu = 'xuat_ngoai'
      AND p.ho_ngheo_id IS NOT NULL
      AND (p_nam IS NULL OR cardinality(p_nam) = 0
           OR extract(year FROM p.ngay_phieu)::int = ANY (p_nam))
    GROUP BY p.ho_ngheo_id
  )
  SELECT
    h.id, h.ho_ten_dai_dien, h.so_cccd, h.xa_phuong_id, xp.ten, h.khoi_xom, h.doi_tuong,
    COALESCE(vnn.tien, 0), COALESCE(vnn.hien_vat, 0), COALESCE(vnn.so_khoan, 0),
    COALESCE(nddk.tien, 0), COALESCE(nddk.so_can, 0),
    COALESCE(kho.gia_tri, 0), COALESCE(kho.so_phieu, 0),
    COALESCE(vnn.tien, 0) + COALESCE(vnn.hien_vat, 0) + COALESCE(nddk.tien, 0) + COALESCE(kho.gia_tri, 0)
  FROM public.hngh_thong_tin_ho_ngheo h
  LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = h.xa_phuong_id
  LEFT JOIN vnn  ON vnn.ho_ngheo_id  = h.id
  LEFT JOIN nddk ON nddk.ho_ngheo_id = h.id
  LEFT JOIN kho  ON kho.ho_ngheo_id  = h.id
  WHERE ((SELECT public.fn_kho_xem_tat_ca()) OR h.xa_phuong_id = (SELECT public.fn_don_vi_cua_toi()))
    AND (p_ho_ngheo_id IS NULL OR h.id = p_ho_ngheo_id)
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR h.xa_phuong_id = ANY (p_xa_phuong_ids))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR h.doi_tuong    = ANY (p_doi_tuong))
    AND (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ', h.ho_ten_dai_dien, h.so_cccd, xp.ten, h.khoi_xom))
         LIKE public.fn_mau_tim_kiem(p_search)
    );
$$;


--
-- Name: fn_hngh_set_ngay_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_hngh_set_ngay_trang_thai() RETURNS trigger
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


--
-- Name: fn_kho_chan_doi_loai_phieu(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_chan_doi_loai_phieu() RETURNS trigger
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


--
-- Name: fn_kho_ct_ghi_duoc(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_ct_ghi_duoc(p_phieu_id bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kho_nhap_xuat_kho p
    WHERE p.id = p_phieu_id
      AND public.fn_kho_phieu_ghi_duoc(p.loai_phieu, p.kho_xuat_id, p.kho_nhap_id)
  );
$$;


--
-- Name: FUNCTION fn_kho_ct_ghi_duoc(p_phieu_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kho_ct_ghi_duoc(p_phieu_id bigint) IS 'Dòng chi tiết ghi được khi phiếu cha nằm trong phạm vi GHI (fn_kho_phieu_ghi_duoc).';


--
-- Name: fn_kho_cua_toi(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_cua_toi() RETURNS bigint[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT COALESCE(array_agg(k.id), ARRAY[]::bigint[])
  FROM public.kho_danh_sach_kho k
  WHERE k.don_vi_id = public.fn_don_vi_cua_toi();
$$;


--
-- Name: FUNCTION fn_kho_cua_toi(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kho_cua_toi() IS 'Danh sách id kho thuộc xã (don_vi_id) của người đang đăng nhập. Rỗng nếu chưa gán đơn vị.';


--
-- Name: fn_kho_gan_ten_theo_xa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_gan_ten_theo_xa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_ten text;
BEGIN
  IF NEW.don_vi_id IS NOT NULL THEN
    SELECT public.fn_ten_kho_theo_xa(x.ten) INTO v_ten
    FROM public.var_ssn_xa_phuong x WHERE x.id = NEW.don_vi_id;
    IF v_ten IS NOT NULL THEN
      NEW.ten_kho := v_ten;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_kho_khoa_kho(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_khoa_kho(p_kho_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION fn_kho_khoa_kho(p_kho_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kho_khoa_kho(p_kho_id bigint) IS 'Khoá tư vấn phạm vi giao dịch cho một kho — chống hai người cùng xuất vượt tồn.';


--
-- Name: fn_kho_kiem_tra_ton_am(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_kiem_tra_ton_am(p_kho_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION fn_kho_kiem_tra_ton_am(p_kho_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kho_kiem_tra_ton_am(p_kho_id bigint) IS 'Báo lỗi TON_KHO_KHONG_DU nếu kho có bất kỳ mặt hàng nào tồn âm.';


--
-- Name: fn_kho_kiem_tra_ton_am_ct(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_kiem_tra_ton_am_ct() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: fn_kho_kiem_tra_ton_am_phieu(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_kiem_tra_ton_am_phieu() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: fn_kho_kiem_tra_ton_kho(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_kiem_tra_ton_kho() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: fn_kho_phieu_ghi_duoc(text, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT public.fn_kho_xem_tat_ca()
      OR (CASE WHEN p_loai = 'nhap_ngoai' THEN p_kho_nhap ELSE p_kho_xuat END) = ANY (public.fn_kho_cua_toi());
$$;


--
-- Name: FUNCTION fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint) IS 'Phiếu có nằm trong phạm vi GHI không: kho chính (nhap_ngoai → kho nhập; xuat_ngoai/chuyen_kho → kho xuất) thuộc xã mình.';


--
-- Name: fn_kho_sinh_so_phieu(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_sinh_so_phieu() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_year   TEXT := to_char(COALESCE(NEW.ngay_phieu, CURRENT_DATE), 'YYYY');
  v_seq    BIGINT;
  v_prefix TEXT;
BEGIN
  IF NEW.so_phieu IS NOT NULL AND length(trim(NEW.so_phieu)) > 0 THEN
    RETURN NEW;
  END IF;

  v_prefix := CASE NEW.loai_phieu
    WHEN 'nhap_ngoai' THEN 'PN'
    WHEN 'xuat_ngoai' THEN 'PX'
    WHEN 'chuyen_kho' THEN 'PC'
    ELSE 'P?'
  END;

  v_seq := nextval(CASE NEW.loai_phieu
    WHEN 'nhap_ngoai' THEN 'public.kho_nhap_xuat_kho_pn_seq'
    WHEN 'xuat_ngoai' THEN 'public.kho_nhap_xuat_kho_px_seq'
    WHEN 'chuyen_kho' THEN 'public.kho_nhap_xuat_kho_pc_seq'
  END::regclass);

  NEW.so_phieu := format('%s-%s-%s', v_prefix, v_year, lpad(v_seq::TEXT, 4, '0'));
  RETURN NEW;
END;
$$;


--
-- Name: fn_kho_xem_tat_ca(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kho_xem_tat_ca() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT public.fn_la_quan_tri() OR NOT EXISTS (
    SELECT 1
    FROM public.var_nhan_vien nv
    WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
      AND nv.trang_thai = 'Hoạt động'
      AND 'Xã phường' = ANY (COALESCE(nv.cap_quan_ly, ARRAY[]::text[]))
      AND NOT ('Tỉnh' = ANY (COALESCE(nv.cap_quan_ly, ARRAY[]::text[])))
  );
$$;


--
-- Name: FUNCTION fn_kho_xem_tat_ca(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kho_xem_tat_ca() IS 'Người đang đăng nhập có xem/ghi được phiếu kho của mọi xã không. FALSE chỉ khi là cán bộ cấp Xã phường (không kiêm Tỉnh, không phải quản trị).';


--
-- Name: fn_khoa_ky_diem_danh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_khoa_ky_diem_danh() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_khoa_boi text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_khoa_boi := public.fn_ky_hop_khoa_boi(OLD.ky_hop_id);
    IF v_khoa_boi = 'nhiem_ky' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được điểm danh. Hãy mở khoá nhiệm kỳ trước.';
    ELSIF v_khoa_boi = 'ky_hop' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không xoá được điểm danh. Hãy mở khoá kỳ họp trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_khoa_boi := public.fn_ky_hop_khoa_boi(NEW.ky_hop_id);
    IF v_khoa_boi = 'nhiem_ky' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không điểm danh được. Hãy mở khoá nhiệm kỳ trước.';
    ELSIF v_khoa_boi = 'ky_hop' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không điểm danh được. Hãy mở khoá kỳ họp trước.';
    END IF;
    RETURN NEW;
  END IF;

  v_khoa_boi := COALESCE(
    public.fn_ky_hop_khoa_boi(OLD.ky_hop_id),
    public.fn_ky_hop_khoa_boi(NEW.ky_hop_id)
  );
  IF v_khoa_boi = 'nhiem_ky' THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được điểm danh. Hãy mở khoá nhiệm kỳ trước.';
  ELSIF v_khoa_boi = 'ky_hop' THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không sửa được điểm danh. Hãy mở khoá kỳ họp trước.';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_khoa_ky_ky_hop(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_khoa_ky_ky_hop() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được kỳ họp. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    IF OLD.da_khoa THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không xoá được. Hãy mở khoá kỳ họp trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không thêm được kỳ họp. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    IF NEW.da_khoa AND NOT public.fn_duoc_khoa_ky('ky-hop') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ kỳ họp.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE. Kiểm cả nhiệm kỳ cũ lẫn nhiệm kỳ mới: chuyển một kỳ họp SANG hay
  -- RA KHỎI nhiệm kỳ đã khoá đều là ghi vào sổ đã khoá.
  IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) OR public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được kỳ họp. Hãy mở khoá nhiệm kỳ trước.';
  END IF;

  IF OLD.da_khoa IS DISTINCT FROM NEW.da_khoa THEN
    IF NOT public.fn_duoc_khoa_ky('ky-hop') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ hoặc mở khoá kỳ họp.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.da_khoa THEN
    IF (to_jsonb(NEW) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id') THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không sửa được. Hãy mở khoá kỳ họp trước.';
    END IF;
    NEW.tg_khoa := OLD.tg_khoa;
    NEW.nguoi_khoa_id := OLD.nguoi_khoa_id;
  ELSE
    NEW.tg_khoa := NULL;
    NEW.nguoi_khoa_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_khoa_ky_nhiem_ky(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_khoa_ky_nhiem_ky() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.da_khoa THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.da_khoa AND NOT public.fn_duoc_khoa_ky('nhiem-ky') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ nhiệm kỳ.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.da_khoa IS DISTINCT FROM NEW.da_khoa THEN
    IF NOT public.fn_duoc_khoa_ky('nhiem-ky') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ hoặc mở khoá nhiệm kỳ.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.da_khoa THEN
    IF (to_jsonb(NEW) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id') THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    NEW.tg_khoa := OLD.tg_khoa;
    NEW.nguoi_khoa_id := OLD.nguoi_khoa_id;
  ELSE
    NEW.tg_khoa := NULL;
    NEW.nguoi_khoa_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_khoa_ky_uy_vien(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_khoa_ky_uy_vien() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được uỷ viên. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không thêm được uỷ viên. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    RETURN NEW;
  END IF;

  IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) OR public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được uỷ viên. Hãy mở khoá nhiệm kỳ trước.';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_kiem_luat_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kiem_luat_trang_thai() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_tu  text := OLD.trang_thai;
  v_den text := NEW.trang_thai;
BEGIN
  IF v_tu IS NOT DISTINCT FROM v_den THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'mttq_khen_thuong' THEN
    -- Đã ban hành là đã phát hành quyết định ra ngoài: chỉ còn đường huỷ,
    -- không lùi về nháp.
    IF v_tu = 'Đã ban hành' AND v_den IN ('Mới', 'Đang xử lý') THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Quyết định đã ban hành thì không quay lại trạng thái "%" được. Nếu sai sót, hãy huỷ quyết định rồi lập quyết định mới.',
        v_den;
    END IF;
    -- Đã huỷ thì không "sống lại" thành quyết định có hiệu lực.
    IF v_tu = 'Hủy' AND v_den = 'Đã ban hành' THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Quyết định đã huỷ thì không ban hành lại được. Hãy lập quyết định mới.';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'ktnt_khen_thuong_nha_tai_tro' THEN
    IF NOT (
      (v_tu = 'Chờ duyệt'   AND v_den IN ('Đã duyệt', 'Không duyệt', 'Hủy'))
      OR (v_tu = 'Không duyệt' AND v_den IN ('Chờ duyệt', 'Hủy'))
      OR (v_tu = 'Đã duyệt'    AND v_den = 'Hủy')
    ) THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Không chuyển được khen thưởng từ "%" sang "%". Quyết định đã duyệt chỉ còn đường huỷ; đã huỷ thì lập quyết định mới.',
        v_tu, v_den;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_kiem_luat_trang_thai(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kiem_luat_trang_thai() IS 'Chặn các bước chuyển trạng thái không hợp lệ. Thêm bảng mới = thêm một nhánh IF.';


--
-- Name: fn_ktnt_gan_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ktnt_gan_trang_thai() RETURNS trigger
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


--
-- Name: fn_ktnt_kiem_quyen_phe_duyet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ktnt_kiem_quyen_phe_duyet() RETURNS trigger
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


--
-- Name: fn_ky_hop_khoa_boi(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ky_hop_khoa_boi(p_ky_hop_id bigint) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE
           WHEN nk.da_khoa THEN 'nhiem_ky'
           WHEN kh.da_khoa THEN 'ky_hop'
           ELSE NULL
         END
  FROM public.mttq_ky_hop kh
  JOIN public.mttq_nhiem_ky nk ON nk.id = kh.nhiem_ky_id
  WHERE kh.id = p_ky_hop_id;
$$;


--
-- Name: FUNCTION fn_ky_hop_khoa_boi(p_ky_hop_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_ky_hop_khoa_boi(p_ky_hop_id bigint) IS 'Kỳ họp đang bị khoá bởi đâu: ''nhiem_ky'' | ''ky_hop'' | NULL (không khoá).';


--
-- Name: fn_la_quan_tri(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_la_quan_tri() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $_$
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
$_$;


--
-- Name: FUNCTION fn_la_quan_tri(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_la_quan_tri() IS 'Người đang đăng nhập có phải quản trị hệ thống không (cấp bậc 1 hoặc quyền quan_tri/all/admin).';


--
-- Name: fn_mau_tim_kiem(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_mau_tim_kiem(p_search text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
  SELECT '%' || replace(replace(replace(
           public.fn_chuan_hoa_tim_kiem(btrim(p_search)),
           '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;


--
-- Name: fn_nddk_dong_bo_tu_ho_ngheo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_ho public.hngh_thong_tin_ho_ngheo%ROWTYPE;
BEGIN
  IF NEW.ho_ngheo_id IS NULL THEN
    RAISE EXCEPTION 'Nhà đại đoàn kết phải gắn với một hộ trong Thông tin hộ nghèo.'
      USING ERRCODE = '23502';
  END IF;

  SELECT * INTO v_ho FROM public.hngh_thong_tin_ho_ngheo WHERE id = NEW.ho_ngheo_id;
  IF NOT FOUND THEN
    -- Để FK báo lỗi chuẩn; không tự chế thông điệp khác cho cùng một lỗi.
    RETURN NEW;
  END IF;

  NEW.ho_ten_chu_ho := v_ho.ho_ten_dai_dien;
  NEW.xa_phuong_id  := v_ho.xa_phuong_id;
  NEW.khoi_xom      := v_ho.khoi_xom;
  NEW.doi_tuong     := v_ho.doi_tuong;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_nddk_dong_bo_tu_ho_ngheo(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo() IS 'BEFORE INSERT / UPDATE OF ho_ngheo_id: bắt buộc gắn hộ nghèo, chép họ tên / xã / khối xóm / đối tượng từ hộ.';


--
-- Name: fn_nddk_kiem_truong_bat_buoc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nddk_kiem_truong_bat_buoc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  thieu text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.trang_thai IS NOT DISTINCT FROM NEW.trang_thai THEN
    RETURN NEW;
  END IF;

  IF NEW.trang_thai = 'Đang khảo sát' THEN
    IF NEW.ngay_khao_sat IS NULL THEN thieu := array_append(thieu, 'ngày khảo sát'); END IF;
  ELSIF NEW.trang_thai = 'Đã bàn giao' THEN
    IF NEW.ngay_kiem_tra_hoan_thanh IS NULL THEN thieu := array_append(thieu, 'ngày kiểm tra hoàn thành'); END IF;
    IF NEW.ngay_ban_giao IS NULL THEN thieu := array_append(thieu, 'ngày bàn giao'); END IF;
    IF NEW.nguon_ho_tro IN ('Cấp tỉnh', 'Cấp xã', 'Trung ương') THEN
      IF NULLIF(btrim(NEW.so_quyet_dinh), '') IS NULL THEN thieu := array_append(thieu, 'số quyết định'); END IF;
      IF NEW.ngay_quyet_dinh IS NULL THEN thieu := array_append(thieu, 'ngày quyết định'); END IF;
    END IF;
  END IF;

  IF cardinality(thieu) > 0 THEN
    RAISE EXCEPTION 'NDDK_THIEU_TRUONG_BAT_BUOC: Trạng thái "%" phải nhập %.',
      NEW.trang_thai, array_to_string(thieu, ', ');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_nddk_kiem_truong_bat_buoc(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_nddk_kiem_truong_bat_buoc() IS 'Chặn thêm mới / đổi trạng thái hồ sơ nhà đại đoàn kết khi thiếu trường biên bản bắt buộc của trạng thái đích. Bản sao client: core/luat-truong-bat-buoc.ts.';


--
-- Name: fn_nddk_set_ngay_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nddk_set_ngay_trang_thai() RETURNS trigger
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


--
-- Name: fn_nhan_vien_id_hien_tai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nhan_vien_id_hien_tai() RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT nv.id
  FROM public.var_nhan_vien nv
  WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
  LIMIT 1;
$$;


--
-- Name: FUNCTION fn_nhan_vien_id_hien_tai(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_nhan_vien_id_hien_tai() IS 'Trả về var_nhan_vien.id của người đang đăng nhập, hoặc NULL. Nhận diện bằng ten_tai_khoan khớp phần trước @ của email Auth. Dùng cho RLS, trigger gán id_nguoi_tao và nhật ký thay đổi.';


--
-- Name: fn_nhiem_ky_da_khoa(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT nk.da_khoa FROM public.mttq_nhiem_ky nk WHERE nk.id = p_nhiem_ky_id),
    false
  );
$$;


--
-- Name: FUNCTION fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint) IS 'Nhiệm kỳ này đã khoá sổ chưa (bỏ qua RLS để trạng thái khoá không phụ thuộc người gọi).';


--
-- Name: fn_ten_dang_nhap_hien_tai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ten_dang_nhap_hien_tai() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT nullif(lower(btrim(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))), '');
$$;


--
-- Name: FUNCTION fn_ten_dang_nhap_hien_tai(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_ten_dang_nhap_hien_tai() IS 'Tên tài khoản của người đang đăng nhập, lấy từ phần trước @ của email Auth. NULL nếu không có phiên đăng nhập. Dùng chung cho RLS và các hàm kiểm quyền.';


--
-- Name: fn_ten_kho_theo_xa(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ten_kho_theo_xa(p_ten_xa text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  -- "Xã Yên Hòa" → "MTTQ xã Yên Hòa"; gộp khoảng trắng thừa.
  SELECT 'MTTQ ' || lower(left(t, 1)) || substr(t, 2)
  FROM (SELECT regexp_replace(btrim(p_ten_xa), '\s+', ' ', 'g') AS t) s
  WHERE t <> '';
$$;


--
-- Name: fn_thong_bao_chi_cho_danh_dau_doc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.id               := OLD.id;
  NEW.nhan_vien_id     := OLD.nhan_vien_id;
  NEW.loai             := OLD.loai;
  NEW.muc_do           := OLD.muc_do;
  NEW.tieu_de          := OLD.tieu_de;
  NEW.noi_dung         := OLD.noi_dung;
  NEW.duong_dan        := OLD.duong_dan;
  NEW.khoa_chong_trung := OLD.khoa_chong_trung;
  NEW.tg_tao           := OLD.tg_tao;

  -- Đánh dấu đã đọc thì ghi luôn mốc thời gian; bỏ đánh dấu thì xoá mốc.
  IF NEW.da_doc AND NOT OLD.da_doc THEN
    NEW.tg_doc := now();
  ELSIF NOT NEW.da_doc THEN
    NEW.tg_doc := NULL;
  ELSE
    NEW.tg_doc := OLD.tg_doc;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_thong_bao_chi_cho_danh_dau_doc(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc() IS 'Chặn sửa nội dung thông báo: người nhận chỉ được bật/tắt cờ đã đọc.';


--
-- Name: fn_thong_bao_sinh_nhac_viec(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_thong_bao_sinh_nhac_viec(p_ngay date DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
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
$_$;


--
-- Name: FUNCTION fn_thong_bao_sinh_nhac_viec(p_ngay date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(p_ngay date) IS 'Sinh thông báo nhắc việc cho ngày chỉ định (mặc định hôm nay). Idempotent, trả về số dòng đã thêm.';


--
-- Name: fn_tn_chan_doi_nha_tai_tro(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tn_chan_doi_nha_tai_tro() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.nha_tai_tro_id IS DISTINCT FROM OLD.nha_tai_tro_id AND EXISTS (
    SELECT 1 FROM public.tn_tiep_nhan_phieu_kho WHERE tiep_nhan_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'TN_DOI_NHA_TAI_TRO: Gỡ các phiếu kho đã gắn trước khi đổi nhà tài trợ.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_tn_gia_tri_phieu_kho(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tn_gia_tri_phieu_kho(p_tiep_nhan_id bigint) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(sum(ct.thanh_tien), 0)::numeric
  FROM public.tn_tiep_nhan_phieu_kho l
  JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = l.phieu_id
  WHERE l.tiep_nhan_id = p_tiep_nhan_id;
$$;


--
-- Name: fn_tn_kiem_phieu_kho(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tn_kiem_phieu_kho() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.kho_nhap_xuat_kho p
    JOIN public.tn_tiep_nhan t ON t.id = NEW.tiep_nhan_id
    WHERE p.id = NEW.phieu_id
      AND p.loai_phieu = 'nhap_ngoai'
      AND p.don_vi_cuu_tro_id = t.nha_tai_tro_id
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'TN_PHIEU_KHONG_HOP_LE: Phiếu kho phải là phiếu "Nhập từ ngoài" của đúng nhà tài trợ.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_tn_sinh_so_phieu(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tn_sinh_so_phieu() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.so_phieu IS NOT NULL AND length(trim(NEW.so_phieu)) > 0 THEN
    RETURN NEW;
  END IF;
  NEW.so_phieu := format(
    'TN-%s-%s',
    to_char(COALESCE(NEW.ngay_tiep_nhan, CURRENT_DATE), 'YYYY'),
    lpad(nextval('public.tn_tiep_nhan_so_phieu_seq')::text, 4, '0')
  );
  RETURN NEW;
END;
$$;


--
-- Name: fn_var_phong_ban_doi_cha(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_var_phong_ban_doi_cha() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  p_duong text;
  p_cap   int;
BEGIN
  IF NEW.cha_id IS NOT DISTINCT FROM OLD.cha_id THEN
    RETURN NEW;
  END IF;

  IF NEW.cha_id IS NULL THEN
    NEW.duong_dan := '/' || NEW.id::text;
    NEW.cap_do    := 1;
    RETURN NEW;
  END IF;

  SELECT p.duong_dan, p.cap_do INTO p_duong, p_cap
  FROM public.var_phong_ban p
  WHERE p.id = NEW.cha_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'var_phong_ban: cha_id % không tồn tại', NEW.cha_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.cha_id = NEW.id OR p_duong = OLD.duong_dan OR p_duong LIKE OLD.duong_dan || '/%' THEN
    RAISE EXCEPTION 'Không được chọn chính phòng này hoặc một phòng cấp dưới của nó làm phòng cấp trên.'
      USING ERRCODE = '23514';
  END IF;

  NEW.duong_dan := p_duong || '/' || NEW.id::text;
  NEW.cap_do    := p_cap + 1;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_var_phong_ban_doi_cha(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_var_phong_ban_doi_cha() IS 'BEFORE UPDATE OF cha_id: tính lại duong_dan/cap_do từ phòng cha mới, chặn vòng lặp cha–con.';


--
-- Name: fn_var_phong_ban_lan_nhanh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_var_phong_ban_lan_nhanh() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Các dòng con cháu được cập nhật ngay trong câu lệnh dưới; trigger này bắn
  -- lại cho từng dòng đó thì không làm gì nữa.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.var_phong_ban
     SET duong_dan = NEW.duong_dan || substr(duong_dan, length(OLD.duong_dan) + 1),
         cap_do    = cap_do + (NEW.cap_do - OLD.cap_do)
   WHERE duong_dan LIKE OLD.duong_dan || '/%';
  RETURN NULL;
END;
$$;


--
-- Name: FUNCTION fn_var_phong_ban_lan_nhanh(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_var_phong_ban_lan_nhanh() IS 'AFTER UPDATE khi duong_dan đổi: thay tiền tố đường dẫn và cap_do cho toàn bộ phòng con cháu.';


--
-- Name: fn_vnn_kiem_truong_bat_buoc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_vnn_kiem_truong_bat_buoc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  thieu text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.trang_thai IS NOT DISTINCT FROM NEW.trang_thai THEN
    RETURN NEW;
  END IF;

  IF NEW.trang_thai = 'Đã nhận' THEN
    IF NULLIF(btrim(NEW.bien_ban_ban_giao->>'ngay_ban_giao'), '') IS NULL THEN
      thieu := array_append(thieu, 'ngày bàn giao');
    END IF;
    IF NEW.nguon_ho_tro IN ('Cấp tỉnh', 'Cấp xã', 'Trung ương') THEN
      IF NULLIF(btrim(NEW.bien_ban_ban_giao->>'so_quyet_dinh'), '') IS NULL THEN
        thieu := array_append(thieu, 'số quyết định');
      END IF;
      IF NULLIF(btrim(NEW.bien_ban_ban_giao->>'ngay_quyet_dinh'), '') IS NULL THEN
        thieu := array_append(thieu, 'ngày quyết định');
      END IF;
    END IF;
  END IF;

  IF cardinality(thieu) > 0 THEN
    RAISE EXCEPTION 'VNN_THIEU_TRUONG_BAT_BUOC: Trạng thái "%" phải nhập %.',
      NEW.trang_thai, array_to_string(thieu, ', ');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_vnn_kiem_truong_bat_buoc(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_vnn_kiem_truong_bat_buoc() IS 'Chặn thêm mới / đổi trạng thái khoản hỗ trợ sang "Đã nhận" khi biên bản bàn giao thiếu ngày bàn giao (và số + ngày quyết định với nguồn Cấp tỉnh/Cấp xã/Trung ương). Bản sao client: vi-nguoi-ngheo/core/luat-truong-bat-buoc.ts.';


--
-- Name: fn_vnn_set_ngay_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_vnn_set_ngay_trang_thai() RETURNS trigger
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


--
-- Name: fn_xa_phuong_dong_bo_ten_kho(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_xa_phuong_dong_bo_ten_kho() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.kho_danh_sach_kho
  SET ten_kho = public.fn_ten_kho_theo_xa(NEW.ten)
  WHERE don_vi_id = NEW.id
    AND public.fn_ten_kho_theo_xa(NEW.ten) IS NOT NULL
    AND ten_kho IS DISTINCT FROM public.fn_ten_kho_theo_xa(NEW.ten);
  RETURN NULL;
END;
$$;


--
-- Name: get_bai_viet_nguoi_tao_filter_options(text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bai_viet_nguoi_tao_filter_options(p_scope text DEFAULT 'all'::text, p_viewer_don_vi_id bigint DEFAULT NULL::bigint) RETURNS TABLE(id bigint, label text, cnt bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    b.id_nguoi_tao AS id,
    MAX(COALESCE(NULLIF(trim(nv.ho_va_ten), ''), NULLIF(trim(nv.ten_tai_khoan), ''), b.id_nguoi_tao::text)) AS label,
    COUNT(*)::bigint AS cnt
  FROM public.bai_viet_danh_sach b
  JOIN public.var_nhan_vien nv ON nv.id = b.id_nguoi_tao
  WHERE (
      p_scope = 'all'
      OR (p_scope = 'all_don_vi' AND p_viewer_don_vi_id IS NOT NULL AND nv.don_vi_id = p_viewer_don_vi_id)
    )
  GROUP BY b.id_nguoi_tao
  ORDER BY label;
$$;


--
-- Name: FUNCTION get_bai_viet_nguoi_tao_filter_options(p_scope text, p_viewer_don_vi_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bai_viet_nguoi_tao_filter_options(p_scope text, p_viewer_don_vi_id bigint) IS 'Distinct người tạo bài viết (id, label, count) theo scope tab Tất cả.';


--
-- Name: get_bai_viet_page(text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[], text, text, date, date, bigint[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bai_viet_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_scope text DEFAULT 'all'::text, p_viewer_nhan_vien_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_the_loai_ids bigint[] DEFAULT NULL::bigint[], p_nguon_dang_ids bigint[] DEFAULT NULL::bigint[], p_trang_dang_ids bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_sort text DEFAULT NULL::text, p_truc_ngay text DEFAULT 'ngay_dang'::text, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_don_vi_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_include_null boolean DEFAULT false) RETURNS TABLE(id bigint, ten_bai text, id_the_loai bigint, don_gia numeric, ngay_dang date, id_nguon_dang bigint, id_trang_dang bigint, link text, id_nguoi_tao bigint, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, ten_the_loai text, ten_nguon_dang text, ten_trang_dang text, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, id_phong_ban_nguoi_tao bigint, don_vi_id_nguoi_tao bigint, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    b.id, b.ten_bai, b.id_the_loai, b.don_gia, b.ngay_dang,
    b.id_nguon_dang, b.id_trang_dang, b.link, b.id_nguoi_tao,
    b.tg_tao, b.tg_cap_nhat,
    tl.ten_the_loai,
    nd.ten AS ten_nguon_dang,
    td.ten AS ten_trang_dang,
    nv.ho_va_ten     AS ho_va_ten_nguoi_tao,
    nv.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
    nv.id_phong_ban  AS id_phong_ban_nguoi_tao,
    nv.don_vi_id     AS don_vi_id_nguoi_tao,
    COUNT(*) OVER () AS total_count
  FROM public.bai_viet_danh_sach b
  LEFT JOIN public.bai_viet_thiet_lap_the_loai tl ON tl.id = b.id_the_loai
  LEFT JOIN public.bai_viet_thiet_lap_khac     nd ON nd.id = b.id_nguon_dang
  LEFT JOIN public.bai_viet_thiet_lap_khac     td ON td.id = b.id_trang_dang
  LEFT JOIN public.var_nhan_vien               nv ON nv.id = b.id_nguoi_tao
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        b.ten_bai,
        tl.ten_the_loai,
        b.don_gia::text, replace(to_char(round(b.don_gia), 'FM999,999,999,999,990'), ',', '.'),
        b.ngay_dang::text,
        to_char(b.ngay_dang, 'DD/MM/YYYY'),
        nd.ten,
        td.ten,
        b.link,
        nv.ho_va_ten,
        nv.ten_tai_khoan,
        to_char(b.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      p_scope = 'all'
      OR (p_scope = 'mine' AND p_viewer_nhan_vien_id IS NOT NULL AND b.id_nguoi_tao = p_viewer_nhan_vien_id)
      OR (p_scope = 'all_don_vi' AND p_viewer_don_vi_id IS NOT NULL AND nv.don_vi_id = p_viewer_don_vi_id)
    )
    AND (p_the_loai_ids   IS NULL OR cardinality(p_the_loai_ids)   = 0 OR b.id_the_loai   = ANY (p_the_loai_ids))
    AND (p_nguon_dang_ids IS NULL OR cardinality(p_nguon_dang_ids) = 0 OR b.id_nguon_dang = ANY (p_nguon_dang_ids))
    AND (p_trang_dang_ids IS NULL OR cardinality(p_trang_dang_ids) = 0 OR b.id_trang_dang = ANY (p_trang_dang_ids))
    AND (p_id_nguoi_tao   IS NULL OR cardinality(p_id_nguoi_tao)   = 0 OR b.id_nguoi_tao  = ANY (p_id_nguoi_tao))
    AND (
      (p_tu_ngay IS NULL AND p_den_ngay IS NULL)
      OR (
        CASE WHEN p_truc_ngay = 'tg_tao' THEN (b.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date ELSE b.ngay_dang END
          BETWEEN COALESCE(p_tu_ngay, '-infinity'::date) AND COALESCE(p_den_ngay, 'infinity'::date)
      )
    )
    AND (
      -- Không chọn đơn vị nào ⇒ không lọc. `p_don_vi_include_null` = nhóm "người tạo chưa gắn đơn vị".
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR nv.don_vi_id = ANY (p_don_vi_ids)
      OR (COALESCE(p_don_vi_include_null, false) AND nv.don_vi_id IS NULL)
    )
  ORDER BY
    CASE WHEN p_sort = 'ten_bai_asc'              THEN b.ten_bai       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_bai_desc'             THEN b.ten_bai       END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_the_loai_asc'         THEN tl.ten_the_loai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_the_loai_desc'        THEN tl.ten_the_loai END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_gia_asc'              THEN b.don_gia       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_gia_desc'             THEN b.don_gia       END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_dang_asc'            THEN b.ngay_dang     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_dang_desc'           THEN b.ngay_dang     END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nguon_dang_asc'       THEN nd.ten          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nguon_dang_desc'      THEN nd.ten          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_trang_dang_asc'       THEN td.ten          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_trang_dang_desc'      THEN td.ten          END DESC NULLS LAST,
    CASE WHEN p_sort = 'link_asc'                 THEN b.link          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'link_desc'                THEN b.link          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN nv.ho_va_ten    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN nv.ho_va_ten    END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'          THEN b.tg_cap_nhat   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'         THEN b.tg_cap_nhat   END DESC NULLS LAST,
    b.ngay_dang DESC NULLS LAST, b.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_bai_viet_thong_ke_nhom(text, date, date, text, text, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bai_viet_thong_ke_nhom(p_truc_ngay text DEFAULT 'tg_tao'::text, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_bucket text DEFAULT 'month'::text, p_scope text DEFAULT 'all'::text, p_viewer_nhan_vien_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      b.id_the_loai, b.id_nguon_dang, b.id_trang_dang, b.id_nguoi_tao,
      nv.don_vi_id,
      COALESCE(b.don_gia, 0) AS don_gia,
      -- Thống kê lọc theo NGÀY TẠO (giờ VN), Nhuận bút lọc theo NGÀY ĐĂNG.
      CASE WHEN p_truc_ngay = 'ngay_dang' THEN b.ngay_dang
           ELSE (b.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      END AS ngay
    FROM public.bai_viet_danh_sach b
    LEFT JOIN public.var_nhan_vien nv ON nv.id = b.id_nguoi_tao
    WHERE (
        p_scope = 'all'
        OR (p_scope = 'mine' AND p_viewer_nhan_vien_id IS NOT NULL AND b.id_nguoi_tao = p_viewer_nhan_vien_id)
        OR (p_scope = 'all_don_vi' AND p_viewer_don_vi_id IS NOT NULL AND nv.don_vi_id = p_viewer_don_vi_id)
      )
  ),
  loc AS (
    SELECT * FROM src
    WHERE (p_tu_ngay IS NULL OR ngay >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR ngay <= p_den_ngay)
  ),
  nhom AS (
    SELECT
      CASE WHEN p_bucket = 'day' THEN to_char(ngay, 'YYYY-MM-DD') ELSE to_char(ngay, 'YYYY-MM') END AS k,
      id_the_loai, id_nguon_dang, id_trang_dang, id_nguoi_tao, don_vi_id,
      count(*) AS so_bai,
      sum(don_gia) AS so_tien
    FROM loc
    GROUP BY 1, 2, 3, 4, 5, 6
  )
  SELECT jsonb_build_object(
    -- Mảng vị trí [k, the_loai, nguon, trang, nguoi_tao, don_vi, so_bai, so_tien]:
    -- lặp tên khoá cho hàng nghìn nhóm sẽ gấp đôi dung lượng.
    'nhom', COALESCE((
      SELECT jsonb_agg(jsonb_build_array(
        k, id_the_loai, id_nguon_dang, id_trang_dang, id_nguoi_tao, don_vi_id, so_bai, so_tien))
      FROM nhom), '[]'::jsonb),
    'ngay_min', (SELECT min(ngay) FROM loc),
    'ngay_max', (SELECT max(ngay) FROM loc),
    'the_loai', COALESCE((
      SELECT jsonb_object_agg(tl.id::text, tl.ten_the_loai)
      FROM public.bai_viet_thiet_lap_the_loai tl
      WHERE tl.id IN (SELECT id_the_loai FROM nhom)), '{}'::jsonb),
    'khac', COALESCE((
      SELECT jsonb_object_agg(k.id::text, k.ten)
      FROM public.bai_viet_thiet_lap_khac k
      WHERE k.id IN (SELECT id_nguon_dang FROM nhom UNION SELECT id_trang_dang FROM nhom)), '{}'::jsonb),
    'nguoi_tao', COALESCE((
      SELECT jsonb_object_agg(nv.id::text, jsonb_build_array(nv.ho_va_ten, nv.ten_tai_khoan))
      FROM public.var_nhan_vien nv
      WHERE nv.id IN (SELECT id_nguoi_tao FROM nhom)), '{}'::jsonb)
  );
$$;


--
-- Name: FUNCTION get_bai_viet_thong_ke_nhom(p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_bucket text, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bai_viet_thong_ke_nhom(p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_bucket text, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint) IS 'BC thống kê bài viết + Nhuận bút: số bài/tiền gộp theo kỳ × thể loại × nguồn × trang × người tạo (kèm đơn vị người tạo).';


--
-- Name: get_cong_viec_page(text, integer, integer, text, bigint, text[], text[], bigint[], boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cong_viec_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_list_scope text DEFAULT 'mine_do'::text, p_viewer_nhan_vien_id bigint DEFAULT NULL::bigint, p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_id_chuong_trinh bigint[] DEFAULT NULL::bigint[], p_chuong_trinh_include_null boolean DEFAULT false, p_sort text DEFAULT NULL::text) RETURNS TABLE(id bigint, muc_do text, ten_cong_viec text, ghi_chu text, link_tai_lieu text, thoi_han date, tien_do smallint, id_trach_nhiem bigint, ids_ho_tro bigint[], trang_thai text, ket_qua text, link_kq text, ngay_hoan_thanh date, id_nguoi_tao bigint, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_chuong_trinh bigint, ho_va_ten_trach_nhiem text, ten_tai_khoan_trach_nhiem text, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, ten_chuong_trinh text, ho_tro_display text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    c.id, c.muc_do, c.ten_cong_viec, c.ghi_chu, c.link_tai_lieu, c.thoi_han,
    c.tien_do, c.id_trach_nhiem, c.ids_ho_tro, c.trang_thai, c.ket_qua,
    c.link_kq, c.ngay_hoan_thanh, c.id_nguoi_tao, c.tg_tao, c.tg_cap_nhat,
    c.id_chuong_trinh,
    tn.ho_va_ten     AS ho_va_ten_trach_nhiem,
    tn.ten_tai_khoan AS ten_tai_khoan_trach_nhiem,
    nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
    nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
    ct.ten_chuong_trinh,
    COALESCE(ht.display, '') AS ho_tro_display,
    COUNT(*) OVER () AS total_count
  FROM public.cong_viec_danh_sach c
  LEFT JOIN public.var_nhan_vien   tn ON tn.id = c.id_trach_nhiem
  LEFT JOIN public.var_nhan_vien   nt ON nt.id = c.id_nguoi_tao
  LEFT JOIN public.chuong_trinh_nam ct ON ct.id = c.id_chuong_trinh
  LEFT JOIN LATERAL (
    SELECT string_agg(COALESCE(nv2.ho_va_ten, u.nv_id::text), ', ' ORDER BY u.ord) AS display
    FROM unnest(c.ids_ho_tro) WITH ORDINALITY AS u(nv_id, ord)
    LEFT JOIN public.var_nhan_vien nv2 ON nv2.id = u.nv_id
  ) ht ON true
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        c.ten_cong_viec,
        ct.ten_chuong_trinh,
        c.muc_do,
        c.thoi_han::text,
        to_char(c.thoi_han, 'DD/MM/YYYY'),
        CASE
          WHEN c.trang_thai = 'Hủy'        THEN 'Đã hủy'
          WHEN c.trang_thai = 'Hoàn thành' THEN 'Đã hoàn thành'
          WHEN c.thoi_han IS NULL          THEN 'Chưa có thời hạn'
          WHEN c.thoi_han < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'Quá hạn ' || ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - c.thoi_han) || ' ngày'
          WHEN c.thoi_han = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'Hết hạn hôm nay'
          ELSE 'Còn ' || (c.thoi_han - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) || ' ngày'
        END,
        c.trang_thai,
        tn.ho_va_ten,
        tn.ten_tai_khoan,
        ht.display,
        nt.ho_va_ten,
        nt.ten_tai_khoan,
        c.ket_qua,
        to_char(c.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      p_viewer_nhan_vien_id IS NULL
      OR (p_list_scope = 'mine_do' AND c.id_trach_nhiem = p_viewer_nhan_vien_id)
      OR (p_list_scope = 'mine_related' AND p_viewer_nhan_vien_id = ANY (c.ids_ho_tro))
      OR (p_list_scope = 'mine_assign' AND c.id_nguoi_tao = p_viewer_nhan_vien_id)
    )
    AND (p_trang_thai IS NULL OR cardinality(p_trang_thai) = 0 OR c.trang_thai = ANY (p_trang_thai))
    AND (p_muc_do IS NULL OR cardinality(p_muc_do) = 0 OR c.muc_do = ANY (p_muc_do))
    AND (
      (
        (p_id_chuong_trinh IS NULL OR cardinality(p_id_chuong_trinh) = 0)
        AND NOT COALESCE(p_chuong_trinh_include_null, false)
      )
      OR (
        (
          p_id_chuong_trinh IS NOT NULL
          AND cardinality(p_id_chuong_trinh) > 0
          AND c.id_chuong_trinh = ANY (p_id_chuong_trinh)
        )
        OR (COALESCE(p_chuong_trinh_include_null, false) AND c.id_chuong_trinh IS NULL)
      )
    )
  ORDER BY
    CASE WHEN p_sort = 'ten_cong_viec_asc'             THEN c.ten_cong_viec      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_cong_viec_desc'            THEN c.ten_cong_viec      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_asc'          THEN ct.ten_chuong_trinh  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_desc'         THEN ct.ten_chuong_trinh  END DESC NULLS LAST,
    CASE WHEN p_sort = 'muc_do_asc'                    THEN c.muc_do             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'muc_do_desc'                   THEN c.muc_do             END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_han_asc'                  THEN c.thoi_han           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_han_desc'                 THEN c.thoi_han           END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'                THEN c.trang_thai         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'               THEN c.trang_thai         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_trach_nhiem_asc'     THEN tn.ho_va_ten         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_trach_nhiem_desc'    THEN tn.ho_va_ten         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_tro_display_asc'            THEN ht.display           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_tro_display_desc'           THEN ht.display           END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'       THEN nt.ho_va_ten         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc'      THEN nt.ho_va_ten         END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'               THEN c.tg_cap_nhat        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'              THEN c.tg_cap_nhat        END DESC NULLS LAST,
    -- Cột "tiến độ": nhỏ hơn = gấp hơn. Khớp deadlineProgressSortKey().
    CASE WHEN p_sort = 'tien_do_asc' THEN
      CASE c.trang_thai
        WHEN 'Hủy'        THEN 400000
        WHEN 'Hoàn thành' THEN 300000
        ELSE COALESCE((c.thoi_han - CURRENT_DATE), 200000)
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc' THEN
      CASE c.trang_thai
        WHEN 'Hủy'        THEN 400000
        WHEN 'Hoàn thành' THEN 300000
        ELSE COALESCE((c.thoi_han - CURRENT_DATE), 200000)
      END
    END DESC NULLS LAST,
    c.thoi_han DESC NULLS LAST, c.ten_cong_viec ASC, c.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_diem_danh_for_nhiem_ky(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_diem_danh_for_nhiem_ky(p_nhiem_ky_id text) RETURNS TABLE(ky_hop_id text, uy_vien_id text, trang_thai text)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    d.ky_hop_id::text,
    d.uy_vien_id::text,
    d.trang_thai
  FROM mttq_diem_danh_uy_vien d
  JOIN mttq_ky_hop             k ON k.id = d.ky_hop_id
  WHERE k.nhiem_ky_id::text = p_nhiem_ky_id;
$$;


--
-- Name: get_dttg_tham_hoi_ca_nhan_page(text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], bigint[], bigint[], boolean, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dttg_tham_hoi_ca_nhan_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_trang_thai text[] DEFAULT NULL::text[], p_ca_nhan_ids bigint[] DEFAULT NULL::bigint[], p_phong_ban_ids bigint[] DEFAULT NULL::bigint[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_dip_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_include_null boolean DEFAULT false, p_column_search jsonb DEFAULT NULL::jsonb, p_labels jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, ca_nhan_id bigint, ho_va_ten text, doi_tuong text, chuc_vu_vi_tri text, phong_ban_tham_muu_id bigint, ten_phong_ban text, dip_tham_hoi_id bigint, dip_tham_hoi text, ten_dip_tham_hoi text, thoi_gian_du_kien date, thoi_gian_thuc_te date, don_vi_tham_hoi_id bigint, ten_don_vi_tham_hoi text, qua_tang text, xa_phuong_id bigint, ten_xa_phuong text, trang_thai text, ket_qua_ghi_chu text, link_ket_qua text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      cn.ho_va_ten,
      COALESCE(NULLIF(btrim(t.doi_tuong), ''), cn.doi_tuong)           AS doi_tuong_display,
      COALESCE(NULLIF(btrim(t.chuc_vu_vi_tri), ''), cn.chuc_vu_vi_tri) AS chuc_vu_display,
      pb.ten_phong_ban,
      dp.ten_dip        AS ten_dip_tham_hoi,
      dvt.ten           AS ten_don_vi_tham_hoi,
      xp.ten            AS ten_xa_phuong,
      nt.ho_va_ten      AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan  AS ten_tai_khoan_nguoi_tao,
      -- Cột "Đơn vị thăm hỏi": trống ⇒ cơ quan MTTQ tỉnh (formatDonViThamHoiDisplay).
      CASE
        WHEN t.don_vi_tham_hoi_id IS NULL THEN COALESCE(p_labels->>'don_vi_cqmttq', '')
        ELSE COALESCE(NULLIF(btrim(dvt.ten), ''), t.don_vi_tham_hoi_id::text)
      END AS don_vi_tham_hoi_display,
      -- Cột "Thời gian dự kiến": hiển thị MM/YYYY (formatMonthYear).
      COALESCE(to_char(t.thoi_gian_du_kien, 'MM/YYYY'), '') AS thoi_gian_du_kien_display
    FROM public.dttg_tham_hoi_ca_nhan t
    LEFT JOIN public.dttg_thong_tin_ca_nhan_tieu_bieu cn  ON cn.id  = t.ca_nhan_id
    LEFT JOIN public.var_phong_ban                    pb  ON pb.id  = t.phong_ban_tham_muu_id
    LEFT JOIN public.dttg_dip_tham_hoi                dp  ON dp.id  = t.dip_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                dvt ON dvt.id = t.don_vi_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                xp  ON xp.id  = t.xa_phuong_id
    LEFT JOIN public.var_nhan_vien                    nt  ON nt.id  = t.id_nguoi_tao
  )
  SELECT
    s.id, s.ca_nhan_id, s.ho_va_ten, s.doi_tuong_display, s.chuc_vu_display,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.dip_tham_hoi_id, s.dip_tham_hoi, s.ten_dip_tham_hoi,
    s.thoi_gian_du_kien, s.thoi_gian_thuc_te,
    s.don_vi_tham_hoi_id, s.ten_don_vi_tham_hoi,
    s.qua_tang, s.xa_phuong_id, s.ten_xa_phuong,
    s.trang_thai, s.ket_qua_ghi_chu, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.ho_va_ten,
        s.doi_tuong_display,
        s.chuc_vu_display,
        s.dip_tham_hoi,
        s.ten_dip_tham_hoi,
        s.thoi_gian_du_kien_display,
        s.don_vi_tham_hoi_display,
        s.ten_phong_ban,
        s.qua_tang,
        s.ten_xa_phuong,
        s.trang_thai,
        s.ket_qua_ghi_chu,
        s.link_ket_qua,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG có nhánh "p_viewer_don_vi_id IS NULL thì cho xem hết": cán bộ cấp Xã
    -- phường chưa được gán đơn vị phải thấy RỖNG, đúng như hàm gate ở client.
    -- Cấp khác (không bị giới hạn theo đơn vị) thì client gửi p_view_all = true.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_tham_hoi_id = p_viewer_don_vi_id
      OR s.xa_phuong_id       = p_viewer_don_vi_id
    )
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai            = ANY (p_trang_thai))
    AND (p_ca_nhan_ids   IS NULL OR cardinality(p_ca_nhan_ids)   = 0 OR s.ca_nhan_id            = ANY (p_ca_nhan_ids))
    AND (p_phong_ban_ids IS NULL OR cardinality(p_phong_ban_ids) = 0 OR s.phong_ban_tham_muu_id = ANY (p_phong_ban_ids))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id          = ANY (p_xa_phuong_ids))
    AND (p_dip_ids       IS NULL OR cardinality(p_dip_ids)       = 0 OR s.dip_tham_hoi_id       = ANY (p_dip_ids))
    AND (
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR (p_don_vi_ids IS NOT NULL AND cardinality(p_don_vi_ids) > 0 AND s.don_vi_tham_hoi_id = ANY (p_don_vi_ids))
      OR (COALESCE(p_don_vi_include_null, false) AND s.don_vi_tham_hoi_id IS NULL)
    )
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten','')),'') IS NULL
         OR s.ho_va_ten ILIKE '%'||btrim(p_column_search->>'ho_va_ten')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong_display ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'chuc_vu_vi_tri','')),'') IS NULL
         OR s.chuc_vu_display ILIKE '%'||btrim(p_column_search->>'chuc_vu_vi_tri')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dip_tham_hoi','')),'') IS NULL
         OR s.dip_tham_hoi ILIKE '%'||btrim(p_column_search->>'dip_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thoi_gian_du_kien','')),'') IS NULL
         OR s.thoi_gian_du_kien_display ILIKE '%'||btrim(p_column_search->>'thoi_gian_du_kien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tham_hoi','')),'') IS NULL
         OR s.don_vi_tham_hoi_display ILIKE '%'||btrim(p_column_search->>'don_vi_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_phong_ban','')),'') IS NULL
         OR s.ten_phong_ban ILIKE '%'||btrim(p_column_search->>'ten_phong_ban')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'qua_tang','')),'') IS NULL
         OR s.qua_tang ILIKE '%'||btrim(p_column_search->>'qua_tang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_ghi_chu','')),'') IS NULL
         OR s.ket_qua_ghi_chu ILIKE '%'||btrim(p_column_search->>'ket_qua_ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ho_va_ten_asc'          THEN s.ho_va_ten                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_desc'         THEN s.ho_va_ten                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_asc'       THEN s.dip_tham_hoi              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_desc'      THEN s.dip_tham_hoi              END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_asc'  THEN s.thoi_gian_du_kien         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_desc' THEN s.thoi_gian_du_kien         END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_asc'    THEN s.don_vi_tham_hoi_display   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_desc'   THEN s.don_vi_tham_hoi_display   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_asc'      THEN s.ten_phong_ban             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_desc'     THEN s.ten_phong_ban             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'      THEN s.ten_xa_phuong             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'     THEN s.ten_xa_phuong             END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'         THEN s.trang_thai                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'        THEN s.trang_thai                END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_ghi_chu_asc'    THEN s.ket_qua_ghi_chu           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_ghi_chu_desc'   THEN s.ket_qua_ghi_chu           END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'        THEN s.tg_cap_nhat               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'       THEN s.tg_cap_nhat               END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_dttg_tham_hoi_to_chuc_page(text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], boolean, bigint[], jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dttg_tham_hoi_to_chuc_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_tien_do text[] DEFAULT NULL::text[], p_to_chuc_ids bigint[] DEFAULT NULL::bigint[], p_dip_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_include_null boolean DEFAULT false, p_phong_ban_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb, p_labels jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, to_chuc_id bigint, ten_co_so text, loai_hinh text, dip_tham_hoi_id bigint, dip_tham_hoi text, ten_dip_tham_hoi text, thoi_gian_du_kien text, thoi_gian_thuc_te date, don_vi_tham_hoi_id bigint, ten_don_vi_tham_hoi text, phong_ban_tham_muu_id bigint, ten_phong_ban text, noi_dung_tham_hoi text, thanh_phan_doan text, qua_tang text, tien_do text, ket_qua_thuc_hien text, link_ket_qua text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      tc.ten_co_so,
      tc.loai_hinh,
      dp.ten_dip       AS ten_dip_tham_hoi,
      dvt.ten          AS ten_don_vi_tham_hoi,
      pb.ten_phong_ban,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      CASE
        WHEN t.don_vi_tham_hoi_id IS NULL THEN COALESCE(p_labels->>'don_vi_cqmttq', '')
        ELSE COALESCE(NULLIF(btrim(dvt.ten), ''), t.don_vi_tham_hoi_id::text)
      END AS don_vi_tham_hoi_display
    FROM public.dttg_tham_hoi_to_chuc t
    LEFT JOIN public.dttg_thong_tin_to_chuc_quan_trong tc  ON tc.id  = t.to_chuc_id
    LEFT JOIN public.dttg_dip_tham_hoi                 dp  ON dp.id  = t.dip_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                 dvt ON dvt.id = t.don_vi_tham_hoi_id
    LEFT JOIN public.var_phong_ban                     pb  ON pb.id  = t.phong_ban_tham_muu_id
    LEFT JOIN public.var_nhan_vien                     nt  ON nt.id  = t.id_nguoi_tao
  )
  SELECT
    s.id, s.to_chuc_id, s.ten_co_so, s.loai_hinh,
    s.dip_tham_hoi_id, s.dip_tham_hoi, s.ten_dip_tham_hoi,
    s.thoi_gian_du_kien, s.thoi_gian_thuc_te,
    s.don_vi_tham_hoi_id, s.ten_don_vi_tham_hoi,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.noi_dung_tham_hoi, s.thanh_phan_doan, s.qua_tang, s.tien_do,
    s.ket_qua_thuc_hien, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.ten_co_so,
        s.loai_hinh,
        s.dip_tham_hoi,
        s.ten_dip_tham_hoi,
        s.thoi_gian_du_kien,
        s.don_vi_tham_hoi_display,
        s.ten_phong_ban,
        s.noi_dung_tham_hoi,
        s.thanh_phan_doan,
        s.qua_tang,
        s.tien_do,
        s.ket_qua_thuc_hien,
        s.link_ket_qua,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- Xem ghi chú ở RPC cá nhân: không nới lỏng khi thiếu đơn vị.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_tham_hoi_id = p_viewer_don_vi_id
    )
    AND (p_tien_do       IS NULL OR cardinality(p_tien_do)       = 0 OR s.tien_do               = ANY (p_tien_do))
    AND (p_to_chuc_ids   IS NULL OR cardinality(p_to_chuc_ids)   = 0 OR s.to_chuc_id            = ANY (p_to_chuc_ids))
    AND (p_dip_ids       IS NULL OR cardinality(p_dip_ids)       = 0 OR s.dip_tham_hoi_id       = ANY (p_dip_ids))
    AND (
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR (p_don_vi_ids IS NOT NULL AND cardinality(p_don_vi_ids) > 0 AND s.don_vi_tham_hoi_id = ANY (p_don_vi_ids))
      OR (COALESCE(p_don_vi_include_null, false) AND s.don_vi_tham_hoi_id IS NULL)
    )
    AND (p_phong_ban_ids IS NULL OR cardinality(p_phong_ban_ids) = 0 OR s.phong_ban_tham_muu_id = ANY (p_phong_ban_ids))
    AND (nullif(btrim(coalesce(p_column_search->>'ten_co_so','')),'') IS NULL
         OR s.ten_co_so ILIKE '%'||btrim(p_column_search->>'ten_co_so')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dip_tham_hoi','')),'') IS NULL
         OR s.dip_tham_hoi ILIKE '%'||btrim(p_column_search->>'dip_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thoi_gian_du_kien','')),'') IS NULL
         OR s.thoi_gian_du_kien ILIKE '%'||btrim(p_column_search->>'thoi_gian_du_kien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tham_hoi','')),'') IS NULL
         OR s.don_vi_tham_hoi_display ILIKE '%'||btrim(p_column_search->>'don_vi_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_tham_hoi','')),'') IS NULL
         OR s.noi_dung_tham_hoi ILIKE '%'||btrim(p_column_search->>'noi_dung_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thanh_phan_doan','')),'') IS NULL
         OR s.thanh_phan_doan ILIKE '%'||btrim(p_column_search->>'thanh_phan_doan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'qua_tang','')),'') IS NULL
         OR s.qua_tang ILIKE '%'||btrim(p_column_search->>'qua_tang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tien_do','')),'') IS NULL
         OR s.tien_do ILIKE '%'||btrim(p_column_search->>'tien_do')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_thuc_hien','')),'') IS NULL
         OR s.ket_qua_thuc_hien ILIKE '%'||btrim(p_column_search->>'ket_qua_thuc_hien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ten_co_so_asc'          THEN s.ten_co_so               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_co_so_desc'         THEN s.ten_co_so               END DESC NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_asc'       THEN s.dip_tham_hoi            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_desc'      THEN s.dip_tham_hoi            END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_asc'  THEN s.thoi_gian_du_kien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_desc' THEN s.thoi_gian_du_kien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_asc'    THEN s.don_vi_tham_hoi_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_desc'   THEN s.don_vi_tham_hoi_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tien_do_asc'            THEN s.tien_do                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc'           THEN s.tien_do                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_thuc_hien_asc'  THEN s.ket_qua_thuc_hien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_thuc_hien_desc' THEN s.ket_qua_thuc_hien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'        THEN s.tg_cap_nhat             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'       THEN s.tg_cap_nhat             END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_hngh_nhan_ho_tro_page(text, integer, integer, text, integer[], bigint[], text[], boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hngh_nhan_ho_tro_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_nam integer[] DEFAULT NULL::integer[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_doi_tuong text[] DEFAULT NULL::text[], p_chi_ho_da_nhan boolean DEFAULT true, p_ho_ngheo_id bigint DEFAULT NULL::bigint) RETURNS TABLE(id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, vnn_tien numeric, vnn_hien_vat numeric, vnn_so_khoan bigint, nddk_tien numeric, nddk_so_can bigint, kho_gia_tri numeric, kho_so_phieu bigint, tong_gia_tri numeric, total_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT s.*, COUNT(*) OVER () AS total_count
  FROM public.fn_hngh_nhan_ho_tro_nguon(p_search, p_nam, p_xa_phuong_ids, p_doi_tuong, p_ho_ngheo_id) s
  WHERE NOT COALESCE(p_chi_ho_da_nhan, true) OR s.tong_gia_tri > 0
  ORDER BY
    CASE WHEN p_sort = 'ho_ten_dai_dien_asc'  THEN s.ho_ten_dai_dien END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_dai_dien_desc' THEN s.ho_ten_dai_dien END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'    THEN s.ten_xa_phuong   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'   THEN s.ten_xa_phuong   END DESC NULLS LAST,
    CASE WHEN p_sort = 'vnn_tong_asc'  THEN s.vnn_tien + s.vnn_hien_vat END ASC  NULLS LAST,
    CASE WHEN p_sort = 'vnn_tong_desc' THEN s.vnn_tien + s.vnn_hien_vat END DESC NULLS LAST,
    CASE WHEN p_sort = 'nddk_tien_asc'        THEN s.nddk_tien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nddk_tien_desc'       THEN s.nddk_tien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'kho_gia_tri_asc'      THEN s.kho_gia_tri     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'kho_gia_tri_desc'     THEN s.kho_gia_tri     END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_asc'     THEN s.tong_gia_tri    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_desc'    THEN s.tong_gia_tri    END DESC NULLS LAST,
    -- Mặc định: hộ nhận nhiều nhất lên trước. Kết thúc bằng khoá chính.
    s.tong_gia_tri DESC, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_hngh_nhan_ho_tro_tong(text, integer[], bigint[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hngh_nhan_ho_tro_tong(p_search text DEFAULT NULL::text, p_nam integer[] DEFAULT NULL::integer[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_doi_tuong text[] DEFAULT NULL::text[]) RETURNS TABLE(so_ho bigint, so_ho_da_nhan bigint, vnn_tien numeric, vnn_hien_vat numeric, nddk_tien numeric, kho_gia_tri numeric, tong_gia_tri numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT count(*)::bigint,
         count(*) FILTER (WHERE s.tong_gia_tri > 0)::bigint,
         COALESCE(sum(s.vnn_tien), 0), COALESCE(sum(s.vnn_hien_vat), 0),
         COALESCE(sum(s.nddk_tien), 0), COALESCE(sum(s.kho_gia_tri), 0),
         COALESCE(sum(s.tong_gia_tri), 0)
  FROM public.fn_hngh_nhan_ho_tro_nguon(p_search, p_nam, p_xa_phuong_ids, p_doi_tuong, NULL) s;
$$;


--
-- Name: get_hngh_page(text, integer, integer, text, boolean, bigint, text[], text[], text[], bigint[], bigint[], jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hngh_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_doi_tuong text[] DEFAULT NULL::text[], p_ton_giao text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_dan_toc_ids bigint[] DEFAULT NULL::bigint[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, dien_thoai text, dan_toc_id bigint, ten_dan_toc text, ton_giao text, so_tai_khoan text, ngan_hang text, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      dt.ten           AS ten_dan_toc,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.hngh_thong_tin_ho_ngheo t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.mttq_thiet_lap    dt ON dt.id = t.dan_toc_id
    LEFT JOIN public.var_nhan_vien     nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien      nc ON nc.id = t.id_nguoi_cap_nhat
  )
  SELECT
    s.id, s.ho_ten_dai_dien, s.so_cccd,
    s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.dien_thoai,
    s.dan_toc_id, s.ten_dan_toc, s.ton_giao,
    s.so_tai_khoan, s.ngan_hang,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.ho_ten_dai_dien,
        s.so_cccd,
        s.ten_xa_phuong,
        s.khoi_xom,
        s.doi_tuong,
        s.dien_thoai,
        s.ten_dan_toc,
        s.ton_giao,
        s.so_tai_khoan,
        s.ngan_hang,
        s.trang_thai,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewHnghRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong    = ANY (p_doi_tuong))
    AND (p_ton_giao      IS NULL OR cardinality(p_ton_giao)      = 0 OR s.ton_giao     = ANY (p_ton_giao))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai   = ANY (p_trang_thai))
    AND (p_dan_toc_ids   IS NULL OR cardinality(p_dan_toc_ids)   = 0 OR s.dan_toc_id   = ANY (p_dan_toc_ids))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id = ANY (p_xa_phuong_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_dai_dien','')),'') IS NULL
         OR s.ho_ten_dai_dien ILIKE '%'||btrim(p_column_search->>'ho_ten_dai_dien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_cccd','')),'') IS NULL
         OR s.so_cccd ILIKE '%'||btrim(p_column_search->>'so_cccd')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dien_thoai','')),'') IS NULL
         OR s.dien_thoai ILIKE '%'||btrim(p_column_search->>'dien_thoai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dan_toc','')),'') IS NULL
         OR s.ten_dan_toc ILIKE '%'||btrim(p_column_search->>'ten_dan_toc')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ton_giao','')),'') IS NULL
         OR s.ton_giao ILIKE '%'||btrim(p_column_search->>'ton_giao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tai_khoan','')),'') IS NULL
         OR s.so_tai_khoan ILIKE '%'||btrim(p_column_search->>'so_tai_khoan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngan_hang','')),'') IS NULL
         OR s.ngan_hang ILIKE '%'||btrim(p_column_search->>'ngan_hang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY')
            ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ho_ten_dai_dien_asc'  THEN lower(btrim(s.ho_ten_dai_dien)) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_dai_dien_desc' THEN lower(btrim(s.ho_ten_dai_dien)) END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_cccd_asc'          THEN s.so_cccd        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_cccd_desc'         THEN s.so_cccd        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'    THEN s.ten_xa_phuong  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'   THEN s.ten_xa_phuong  END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc'         THEN s.khoi_xom       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc'        THEN s.khoi_xom       END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc'        THEN s.doi_tuong      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc'       THEN s.doi_tuong      END DESC NULLS LAST,
    CASE WHEN p_sort = 'dien_thoai_asc'       THEN s.dien_thoai     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dien_thoai_desc'      THEN s.dien_thoai     END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_dan_toc_asc'      THEN s.ten_dan_toc    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_dan_toc_desc'     THEN s.ten_dan_toc    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ton_giao_asc'         THEN s.ton_giao       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ton_giao_desc'        THEN s.ton_giao       END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tai_khoan_asc'     THEN s.so_tai_khoan   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tai_khoan_desc'    THEN s.so_tai_khoan   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngan_hang_asc'        THEN s.ngan_hang      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngan_hang_desc'       THEN s.ngan_hang      END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'       THEN s.trang_thai     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'      THEN s.trang_thai     END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc'          THEN s.ghi_chu        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc'         THEN s.ghi_chu        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN s.nguoi_tao_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.nguoi_tao_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc'  THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_asc'           THEN s.tg_tao         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_desc'          THEN s.tg_tao         END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'      THEN s.tg_cap_nhat    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'     THEN s.tg_cap_nhat    END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST,
    s.id DESC
  LIMIT greatest(p_limit, 1) OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_hngh_thong_ke_nhom(boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hngh_thong_ke_nhom(p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'xa_phuong_id', g.xa_phuong_id,
    'ten_xa_phuong', g.ten_xa_phuong,
    'doi_tuong', g.doi_tuong,
    'dan_toc_id', g.dan_toc_id,
    'ten_dan_toc', g.ten_dan_toc,
    'ton_giao', g.ton_giao,
    'trang_thai', g.trang_thai,
    'so_ho', g.so_ho
  )), '[]'::jsonb)
  FROM (
    SELECT t.xa_phuong_id, xp.ten AS ten_xa_phuong, t.doi_tuong,
           t.dan_toc_id, dt.ten AS ten_dan_toc, t.ton_giao, t.trang_thai,
           count(*) AS so_ho
    FROM public.hngh_thong_tin_ho_ngheo t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.mttq_thiet_lap    dt ON dt.id = t.dan_toc_id
    WHERE COALESCE(p_view_all, true) OR t.xa_phuong_id = p_viewer_xa_phuong_id
    GROUP BY 1, 2, 3, 4, 5, 6, 7
  ) g;
$$;


--
-- Name: FUNCTION get_hngh_thong_ke_nhom(p_view_all boolean, p_viewer_xa_phuong_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_hngh_thong_ke_nhom(p_view_all boolean, p_viewer_xa_phuong_id bigint) IS 'Tab Thống kê hộ nghèo: số hộ gộp theo xã × đối tượng × dân tộc × tôn giáo × trạng thái.';


--
-- Name: get_kho_don_vi_cuu_tro_ket_qua(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kho_don_vi_cuu_tro_ket_qua(p_don_vi_id bigint DEFAULT NULL::bigint) RETURNS TABLE(don_vi_id bigint, ket_qua_ung_ho numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT dv.id, COALESCE(sum(n.tien_mat + n.hien_vat), 0)
  FROM public.kho_don_vi_cuu_tro dv
  LEFT JOIN public.get_kho_don_vi_cuu_tro_ung_ho_nhom(NULL, NULL) n ON n.don_vi_id = dv.id
  WHERE p_don_vi_id IS NULL OR dv.id = p_don_vi_id
  GROUP BY dv.id;
$$;


--
-- Name: get_kho_don_vi_cuu_tro_ung_ho_nhom(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date) RETURNS TABLE(don_vi_id bigint, nguon text, nhom_key text, nhom_ten text, tien_mat numeric, hien_vat numeric, so_luot bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.don_vi_cuu_tro_id,
         'kho'::text,
         'dot:' || COALESCE(p.dot_cuu_tro_id::text, 'none'),
         max(d.ten),
         0::numeric,
         COALESCE(sum(ct.thanh_tien), 0),
         count(DISTINCT p.id)
  FROM public.kho_nhap_xuat_kho p
  JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
  LEFT JOIN public.kho_dot_cuu_tro d ON d.id = p.dot_cuu_tro_id
  WHERE p.loai_phieu = 'nhap_ngoai'
    AND p.don_vi_cuu_tro_id IS NOT NULL
    AND (p_tu_ngay  IS NULL OR p.ngay_phieu >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR p.ngay_phieu <= p_den_ngay)
  GROUP BY p.don_vi_cuu_tro_id, p.dot_cuu_tro_id

  UNION ALL

  SELECT t.nha_tai_tro_id,
         'tiep_nhan'::text,
         'dot:' || t.chuong_trinh_id::text,
         max(d.ten),
         COALESCE(sum(t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0)), 0),
         COALESCE(sum(COALESCE(t.hien_vat_khac_gia_tri, 0)), 0),
         count(*)
  FROM public.tn_tiep_nhan t
  JOIN public.kho_dot_cuu_tro d ON d.id = t.chuong_trinh_id
  WHERE (p_tu_ngay  IS NULL OR t.ngay_tiep_nhan >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR t.ngay_tiep_nhan <= p_den_ngay)
  GROUP BY t.nha_tai_tro_id, t.chuong_trinh_id

  UNION ALL

  SELECT v.don_vi_ho_tro_id,
         'chuong_trinh'::text,
         'nd:' || lower(regexp_replace(btrim(v.noi_dung_ho_tro), '\s+', ' ', 'g')),
         min(regexp_replace(btrim(v.noi_dung_ho_tro), '\s+', ' ', 'g')),
         COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro =  'Tiền mặt'), 0),
         COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro <> 'Tiền mặt'), 0),
         count(*)
  FROM public.vnn_chuong_trinh v
  WHERE v.don_vi_ho_tro_id IS NOT NULL
    AND v.nguon_ho_tro = 'Ủng hộ trực tiếp'
    AND (p_tu_ngay  IS NULL OR (v.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR (v.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= p_den_ngay)
  GROUP BY v.don_vi_ho_tro_id, lower(regexp_replace(btrim(v.noi_dung_ho_tro), '\s+', ' ', 'g'))

  UNION ALL

  SELECT n.nha_tai_tro_id,
         'nddk'::text,
         'nd:' || lower(regexp_replace(btrim(n.noi_dung_ho_tro), '\s+', ' ', 'g')),
         min(regexp_replace(btrim(n.noi_dung_ho_tro), '\s+', ' ', 'g')),
         COALESCE(sum(n.so_tien), 0),
         0::numeric,
         count(*)
  FROM public.nddk_nha_dai_doan_ket n
  WHERE n.nha_tai_tro_id IS NOT NULL
    AND n.nguon_ho_tro = 'Ủng hộ trực tiếp'
    AND (p_tu_ngay  IS NULL OR (n.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR (n.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= p_den_ngay)
  GROUP BY n.nha_tai_tro_id, lower(regexp_replace(btrim(n.noi_dung_ho_tro), '\s+', ' ', 'g'));
$$;


--
-- Name: get_kho_don_vi_cuu_tro_ung_ho_theo_ky(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_theo_ky(p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date) RETURNS TABLE(don_vi_id bigint, tien_kho numeric, tien_chuong_trinh numeric, so_luot bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  -- tien_kho = hàng nhập kho; tien_chuong_trinh = mọi nguồn còn lại (tiếp nhận + trực tiếp).
  SELECT n.don_vi_id,
         COALESCE(sum(n.hien_vat) FILTER (WHERE n.nguon = 'kho'), 0),
         COALESCE(sum(n.tien_mat + n.hien_vat) FILTER (WHERE n.nguon <> 'kho'), 0),
         COALESCE(sum(n.so_luot), 0)::bigint
  FROM public.get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay, p_den_ngay) n
  GROUP BY n.don_vi_id;
$$;


--
-- Name: get_kho_nhap_xuat_kho_ct_page(text, integer, integer, text, boolean, bigint, text, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kho_nhap_xuat_kho_ct_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_loai_phieu text DEFAULT NULL::text, p_kho_id bigint DEFAULT NULL::bigint, p_hang_hoa_id bigint DEFAULT NULL::bigint, p_column_search jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, phieu_id bigint, so_phieu text, loai_phieu text, ngay_phieu date, kho_xuat_id bigint, ten_kho_xuat text, kho_xuat_don_vi_id bigint, kho_nhap_id bigint, ten_kho_nhap text, kho_nhap_don_vi_id bigint, don_vi_cuu_tro_id bigint, ten_don_vi_cuu_tro text, dot_cuu_tro_id bigint, ten_dot_cuu_tro text, hang_hoa_id bigint, ten_hang_hoa text, don_vi_tinh text, so_luong numeric, don_gia numeric, thanh_tien numeric, ghi_chu text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    c.id, c.phieu_id, p.so_phieu, p.loai_phieu, p.ngay_phieu,
    p.kho_xuat_id, kx.ten_kho AS ten_kho_xuat, kx.don_vi_id AS kho_xuat_don_vi_id,
    p.kho_nhap_id, kn.ten_kho AS ten_kho_nhap, kn.don_vi_id AS kho_nhap_don_vi_id,
    p.don_vi_cuu_tro_id, dv.ten AS ten_don_vi_cuu_tro,
    p.dot_cuu_tro_id,    dt.ten AS ten_dot_cuu_tro,
    c.hang_hoa_id, hh.ten_hang_hoa,
    c.don_vi_tinh, c.so_luong, c.don_gia, c.thanh_tien, c.ghi_chu,
    COUNT(*) OVER () AS total_count
  FROM public.kho_nhap_xuat_kho_ct c
  JOIN      public.kho_nhap_xuat_kho      p  ON p.id  = c.phieu_id
  LEFT JOIN public.kho_danh_sach_kho      kx ON kx.id = p.kho_xuat_id
  LEFT JOIN public.kho_danh_sach_kho      kn ON kn.id = p.kho_nhap_id
  LEFT JOIN public.kho_don_vi_cuu_tro     dv ON dv.id = p.don_vi_cuu_tro_id
  LEFT JOIN public.kho_dot_cuu_tro        dt ON dt.id = p.dot_cuu_tro_id
  LEFT JOIN public.kho_danh_sach_hang_hoa hh ON hh.id = c.hang_hoa_id
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        p.so_phieu,
        CASE p.loai_phieu WHEN 'nhap_ngoai' THEN 'Nhập từ ngoài' WHEN 'xuat_ngoai' THEN 'Xuất ra ngoài' WHEN 'chuyen_kho' THEN 'Chuyển kho' END,
        p.ngay_phieu::text,
        to_char(p.ngay_phieu, 'DD/MM/YYYY'),
        hh.ten_hang_hoa,
        c.don_vi_tinh,
        trim_scale(c.so_luong)::text, replace(trim_scale(c.so_luong)::text, '.', ','),
        c.don_gia::text, replace(to_char(round(c.don_gia), 'FM999,999,999,999,990'), ',', '.'),
        c.thanh_tien::text, replace(to_char(round(c.thanh_tien), 'FM999,999,999,999,990'), ',', '.'),
        kx.ten_kho,
        kn.ten_kho,
        dv.ten,
        dt.ten,
        c.ghi_chu
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán
      -- đơn vị phải thấy RỖNG, đúng như canViewNhapXuatKhoRow ở client.
      COALESCE(p_view_all, true)
      OR kx.don_vi_id = p_viewer_don_vi_id
      OR kn.don_vi_id = p_viewer_don_vi_id
    )
    AND (p_loai_phieu  IS NULL OR p.loai_phieu = p_loai_phieu)
    AND (p_kho_id      IS NULL OR p.kho_xuat_id = p_kho_id OR p.kho_nhap_id = p_kho_id)
    AND (p_hang_hoa_id IS NULL OR c.hang_hoa_id = p_hang_hoa_id)
    AND (nullif(btrim(coalesce(p_column_search->>'so_phieu','')),'') IS NULL
         OR p.so_phieu ILIKE '%'||btrim(p_column_search->>'so_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_phieu','')),'') IS NULL
         OR p.loai_phieu ILIKE '%'||btrim(p_column_search->>'loai_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_phieu','')),'') IS NULL
         OR p.ngay_phieu::text ILIKE '%'||btrim(p_column_search->>'ngay_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_hang_hoa','')),'') IS NULL
         OR hh.ten_hang_hoa ILIKE '%'||btrim(p_column_search->>'ten_hang_hoa')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tinh','')),'') IS NULL
         OR c.don_vi_tinh ILIKE '%'||btrim(p_column_search->>'don_vi_tinh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_luong','')),'') IS NULL
         OR c.so_luong::text ILIKE '%'||btrim(p_column_search->>'so_luong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_gia','')),'') IS NULL
         OR c.don_gia::text ILIKE '%'||btrim(p_column_search->>'don_gia')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thanh_tien','')),'') IS NULL
         OR c.thanh_tien::text ILIKE '%'||btrim(p_column_search->>'thanh_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_xuat','')),'') IS NULL
         OR kx.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_xuat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_nhap','')),'') IS NULL
         OR kn.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_nhap')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_cuu_tro','')),'') IS NULL
         OR dv.ten ILIKE '%'||btrim(p_column_search->>'ten_don_vi_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dot_cuu_tro','')),'') IS NULL
         OR dt.ten ILIKE '%'||btrim(p_column_search->>'ten_dot_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR c.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
  ORDER BY
    CASE WHEN p_sort = 'so_phieu_asc'      THEN p.so_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'     THEN p.so_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_asc'    THEN p.loai_phieu    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_desc'   THEN p.loai_phieu    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_asc'    THEN p.ngay_phieu    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_desc'   THEN p.ngay_phieu    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_hang_hoa_asc'  THEN hh.ten_hang_hoa END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_hang_hoa_desc' THEN hh.ten_hang_hoa END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tinh_asc'   THEN c.don_vi_tinh   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tinh_desc'  THEN c.don_vi_tinh   END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_luong_asc'      THEN c.so_luong      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_luong_desc'     THEN c.so_luong      END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_gia_asc'       THEN c.don_gia       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_gia_desc'      THEN c.don_gia       END DESC NULLS LAST,
    CASE WHEN p_sort = 'thanh_tien_asc'    THEN c.thanh_tien    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thanh_tien_desc'   THEN c.thanh_tien    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_asc'  THEN kx.ten_kho      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_desc' THEN kx.ten_kho      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_asc'  THEN kn.ten_kho      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_desc' THEN kn.ten_kho      END DESC NULLS LAST,
    p.ngay_phieu DESC NULLS LAST, p.so_phieu DESC NULLS LAST, c.thu_tu ASC NULLS LAST, c.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_kho_nhap_xuat_kho_page(text, integer, integer, text, boolean, bigint, text, bigint, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kho_nhap_xuat_kho_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_loai_phieu text DEFAULT NULL::text, p_kho_id bigint DEFAULT NULL::bigint, p_don_vi_cuu_tro_id bigint DEFAULT NULL::bigint, p_dot_cuu_tro_id bigint DEFAULT NULL::bigint, p_column_search jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, tt integer, so_phieu text, loai_phieu text, ngay_phieu date, kho_xuat_id bigint, ten_kho_xuat text, kho_xuat_don_vi_id bigint, kho_nhap_id bigint, ten_kho_nhap text, kho_nhap_don_vi_id bigint, don_vi_cuu_tro_id bigint, ten_don_vi_cuu_tro text, dot_cuu_tro_id bigint, ten_dot_cuu_tro text, muc_dich text, so_dong bigint, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    p.id, p.tt, p.so_phieu, p.loai_phieu, p.ngay_phieu,
    p.kho_xuat_id, kx.ten_kho AS ten_kho_xuat, kx.don_vi_id AS kho_xuat_don_vi_id,
    p.kho_nhap_id, kn.ten_kho AS ten_kho_nhap, kn.don_vi_id AS kho_nhap_don_vi_id,
    p.don_vi_cuu_tro_id, dv.ten AS ten_don_vi_cuu_tro,
    p.dot_cuu_tro_id,    dt.ten AS ten_dot_cuu_tro,
    p.muc_dich,
    COALESCE(ct.so_dong, 0) AS so_dong,
    p.id_nguoi_tao,
    COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), '')) AS ho_va_ten_nguoi_tao,
    p.tg_tao, p.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM public.kho_nhap_xuat_kho p
  LEFT JOIN public.kho_danh_sach_kho  kx ON kx.id = p.kho_xuat_id
  LEFT JOIN public.kho_danh_sach_kho  kn ON kn.id = p.kho_nhap_id
  LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = p.don_vi_cuu_tro_id
  LEFT JOIN public.kho_dot_cuu_tro    dt ON dt.id = p.dot_cuu_tro_id
  LEFT JOIN public.var_nhan_vien      nt ON nt.id = p.id_nguoi_tao
  LEFT JOIN LATERAL (
    SELECT count(*) AS so_dong
    FROM public.kho_nhap_xuat_kho_ct c
    WHERE c.phieu_id = p.id
  ) ct ON true
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        p.tt::text,
        p.so_phieu,
        CASE p.loai_phieu WHEN 'nhap_ngoai' THEN 'Nhập từ ngoài' WHEN 'xuat_ngoai' THEN 'Xuất ra ngoài' WHEN 'chuyen_kho' THEN 'Chuyển kho' END,
        p.ngay_phieu::text,
        to_char(p.ngay_phieu, 'DD/MM/YYYY'),
        kx.ten_kho,
        kn.ten_kho,
        dv.ten,
        dt.ten,
        p.muc_dich,
        COALESCE(ct.so_dong, 0)::text,
        nt.ho_va_ten,
        nt.ten_tai_khoan,
        to_char(p.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán
      -- đơn vị phải thấy RỖNG, đúng như canViewNhapXuatKhoRow ở client.
      COALESCE(p_view_all, true)
      OR kx.don_vi_id = p_viewer_don_vi_id
      OR kn.don_vi_id = p_viewer_don_vi_id
    )
    AND (p_loai_phieu        IS NULL OR p.loai_phieu = p_loai_phieu)
    AND (p_kho_id            IS NULL OR p.kho_xuat_id = p_kho_id OR p.kho_nhap_id = p_kho_id)
    AND (p_don_vi_cuu_tro_id IS NULL OR p.don_vi_cuu_tro_id = p_don_vi_cuu_tro_id)
    AND (p_dot_cuu_tro_id    IS NULL OR p.dot_cuu_tro_id = p_dot_cuu_tro_id)
    -- Tìm theo từng cột. Ô trống/thiếu khoá ⇒ không lọc cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'tt','')),'') IS NULL
         OR p.tt::text ILIKE '%'||btrim(p_column_search->>'tt')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_phieu','')),'') IS NULL
         OR p.so_phieu ILIKE '%'||btrim(p_column_search->>'so_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_phieu','')),'') IS NULL
         OR p.loai_phieu ILIKE '%'||btrim(p_column_search->>'loai_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_phieu','')),'') IS NULL
         OR p.ngay_phieu::text ILIKE '%'||btrim(p_column_search->>'ngay_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_xuat','')),'') IS NULL
         OR kx.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_xuat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_nhap','')),'') IS NULL
         OR kn.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_nhap')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_cuu_tro','')),'') IS NULL
         OR dv.ten ILIKE '%'||btrim(p_column_search->>'ten_don_vi_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dot_cuu_tro','')),'') IS NULL
         OR dt.ten ILIKE '%'||btrim(p_column_search->>'ten_dot_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'muc_dich','')),'') IS NULL
         OR p.muc_dich ILIKE '%'||btrim(p_column_search->>'muc_dich')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR COALESCE(nt.ho_va_ten, nt.ten_tai_khoan) ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_dong','')),'') IS NULL
         OR COALESCE(ct.so_dong, 0)::text ILIKE '%'||btrim(p_column_search->>'so_dong')||'%')
    -- Cột thời gian: người dùng gõ ngày, nên so theo YYYY-MM-DD.
    AND (nullif(btrim(coalesce(p_column_search->>'tg_tao','')),'') IS NULL
         OR to_char(p.tg_tao, 'YYYY-MM-DD') ILIKE '%'||btrim(p_column_search->>'tg_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(p.tg_cap_nhat, 'YYYY-MM-DD') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'tt_asc'                  THEN p.tt              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tt_desc'                 THEN p.tt              END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_asc'            THEN p.so_phieu        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'           THEN p.so_phieu        END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_asc'          THEN p.loai_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_desc'         THEN p.loai_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_asc'          THEN p.ngay_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_desc'         THEN p.ngay_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_asc'        THEN kx.ten_kho        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_desc'       THEN kx.ten_kho        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_asc'        THEN kn.ten_kho        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_desc'       THEN kn.ten_kho        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_cuu_tro_asc'  THEN dv.ten            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_cuu_tro_desc' THEN dv.ten            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_dot_cuu_tro_asc'     THEN dt.ten            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_dot_cuu_tro_desc'    THEN dt.ten            END DESC NULLS LAST,
    CASE WHEN p_sort = 'muc_dich_asc'            THEN p.muc_dich        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'muc_dich_desc'           THEN p.muc_dich        END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_dong_asc'             THEN COALESCE(ct.so_dong, 0) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_dong_desc'            THEN COALESCE(ct.so_dong, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN nt.ho_va_ten      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN nt.ho_va_ten      END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_asc'              THEN p.tg_tao          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_desc'             THEN p.tg_tao          END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'         THEN p.tg_cap_nhat     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'        THEN p.tg_cap_nhat     END DESC NULLS LAST,
    p.ngay_phieu DESC NULLS LAST, p.so_phieu DESC NULLS LAST, p.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_kho_nxk_muc_dich_goi_y(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kho_nxk_muc_dich_goi_y(p_loai_phieu text) RETURNS SETOF text
    LANGUAGE sql STABLE
    AS $$
  SELECT DISTINCT btrim(p.muc_dich)
  FROM public.kho_nhap_xuat_kho p
  WHERE p.loai_phieu = p_loai_phieu
    AND p.muc_dich IS NOT NULL
    AND btrim(p.muc_dich) <> ''
  ORDER BY 1;
$$;


--
-- Name: get_ktnt_page(text, integer, integer, text, boolean, bigint, integer[], text[], text[], bigint[], bigint[], text[], jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ktnt_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_cap_khen text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_nha_tai_tro_ids bigint[] DEFAULT NULL::bigint[], p_loai_nha_tai_tro text[] DEFAULT NULL::text[], p_column_search jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, noi_dung_khen text, ngay_khen date, so_quyet_dinh text, cap_khen text, don_vi_khen text, xa_phuong_id bigint, ten_xa_phuong text, nha_tai_tro_id bigint, ten_nha_tai_tro text, loai_nha_tai_tro text, nam_thanh_tich_tu integer, nam_thanh_tich_den integer, gia_tri_dong_gop_khac numeric, so_khoan_ho_tro bigint, so_nguoi_duoc_ho_tro bigint, tong_tien_ho_tro numeric, hien_vat_quy_doi numeric, gia_tri_nhap_kho numeric, so_phieu_nhap_kho bigint, tong_gia_tri numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, nguoi_duyet_id bigint, ho_va_ten_nguoi_duyet text, tg_duyet timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      dv.ten           AS ten_nha_tai_tro,
      dv.loai          AS loai_nha_tai_tro,
      nd.ho_va_ten     AS ho_va_ten_nguoi_duyet,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display,
      tt.so_khoan_ho_tro,
      tt.so_nguoi_duoc_ho_tro,
      tt.tien_mat AS tong_tien_ho_tro,
      tt.hien_vat_quy_doi,
      tt.gia_tri_nhap_kho,
      tt.so_phieu_nhap_kho,
      tt.tien_mat + tt.hien_vat_quy_doi + tt.gia_tri_nhap_kho
        + COALESCE(t.gia_tri_dong_gop_khac, 0) AS tong_gia_tri
    FROM public.ktnt_khen_thuong_nha_tai_tro t
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = t.nha_tai_tro_id
    LEFT JOIN public.var_nhan_vien      nd ON nd.id = t.nguoi_duyet_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien      nc ON nc.id = t.id_nguoi_cap_nhat
    -- Thành tích: một nguồn sự thật với màn chi tiết / form (get_ktnt_thanh_tich).
    CROSS JOIN LATERAL public.get_ktnt_thanh_tich(
      t.nha_tai_tro_id, t.nam_thanh_tich_tu, t.nam_thanh_tich_den
    ) tt
  )
  SELECT
    s.id, s.noi_dung_khen, s.ngay_khen, s.so_quyet_dinh, s.cap_khen, s.don_vi_khen,
    s.xa_phuong_id, s.ten_xa_phuong, s.nha_tai_tro_id, s.ten_nha_tai_tro, s.loai_nha_tai_tro,
    s.nam_thanh_tich_tu, s.nam_thanh_tich_den, s.gia_tri_dong_gop_khac,
    s.so_khoan_ho_tro, s.so_nguoi_duoc_ho_tro, s.tong_tien_ho_tro,
    s.hien_vat_quy_doi, s.gia_tri_nhap_kho, s.so_phieu_nhap_kho, s.tong_gia_tri,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.nguoi_duyet_id, s.ho_va_ten_nguoi_duyet, s.tg_duyet,
    s.ghi_chu, s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR s.noi_dung_khen   ILIKE '%' || p_search || '%'
      OR s.so_quyet_dinh   ILIKE '%' || p_search || '%'
      OR s.don_vi_khen     ILIKE '%' || p_search || '%'
      OR s.ten_nha_tai_tro ILIKE '%' || p_search || '%'
      OR s.ten_xa_phuong   ILIKE '%' || p_search || '%'
      OR s.ghi_chu         ILIKE '%' || p_search || '%'
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa gán đơn vị thấy RỖNG.
    AND (COALESCE(p_view_all, true) OR s.xa_phuong_id = p_viewer_xa_phuong_id)
    AND (p_nam              IS NULL OR cardinality(p_nam)              = 0 OR extract(year FROM s.ngay_khen)::int = ANY (p_nam))
    AND (p_cap_khen         IS NULL OR cardinality(p_cap_khen)         = 0 OR s.cap_khen         = ANY (p_cap_khen))
    AND (p_trang_thai       IS NULL OR cardinality(p_trang_thai)       = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids    IS NULL OR cardinality(p_xa_phuong_ids)    = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    AND (p_nha_tai_tro_ids  IS NULL OR cardinality(p_nha_tai_tro_ids)  = 0 OR s.nha_tai_tro_id   = ANY (p_nha_tai_tro_ids))
    AND (p_loai_nha_tai_tro IS NULL OR cardinality(p_loai_nha_tai_tro) = 0 OR s.loai_nha_tai_tro = ANY (p_loai_nha_tai_tro))
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_khen','')),'') IS NULL
         OR s.noi_dung_khen ILIKE '%'||btrim(p_column_search->>'noi_dung_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_quyet_dinh','')),'') IS NULL
         OR s.so_quyet_dinh ILIKE '%'||btrim(p_column_search->>'so_quyet_dinh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'cap_khen','')),'') IS NULL
         OR s.cap_khen ILIKE '%'||btrim(p_column_search->>'cap_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_khen','')),'') IS NULL
         OR s.don_vi_khen ILIKE '%'||btrim(p_column_search->>'don_vi_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_nha_tai_tro','')),'') IS NULL
         OR s.ten_nha_tai_tro ILIKE '%'||btrim(p_column_search->>'ten_nha_tai_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_nha_tai_tro','')),'') IS NULL
         OR s.loai_nha_tai_tro ILIKE '%'||btrim(p_column_search->>'loai_nha_tai_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_khen','')),'') IS NULL
         OR to_char(s.ngay_khen, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tong_gia_tri','')),'') IS NULL
         OR s.tong_gia_tri::text ILIKE '%'||btrim(p_column_search->>'tong_gia_tri')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_nguoi_duoc_ho_tro','')),'') IS NULL
         OR s.so_nguoi_duoc_ho_tro::text ILIKE '%'||btrim(p_column_search->>'so_nguoi_duoc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_duyet','')),'') IS NULL
         OR s.ho_va_ten_nguoi_duyet ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_duyet')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ngay_khen_asc' THEN s.ngay_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_khen_desc' THEN s.ngay_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_khen_asc' THEN s.noi_dung_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_khen_desc' THEN s.noi_dung_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_quyet_dinh_asc' THEN s.so_quyet_dinh END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_quyet_dinh_desc' THEN s.so_quyet_dinh END DESC NULLS LAST,
    CASE WHEN p_sort = 'cap_khen_asc' THEN s.cap_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'cap_khen_desc' THEN s.cap_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_khen_asc' THEN s.don_vi_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_khen_desc' THEN s.don_vi_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc' THEN s.ten_xa_phuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc' THEN s.ten_xa_phuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_asc' THEN s.ten_nha_tai_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_desc' THEN s.ten_nha_tai_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_nha_tai_tro_asc' THEN s.loai_nha_tai_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_nha_tai_tro_desc' THEN s.loai_nha_tai_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_khoan_ho_tro_asc' THEN s.so_khoan_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_khoan_ho_tro_desc' THEN s.so_khoan_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_nguoi_duoc_ho_tro_asc' THEN s.so_nguoi_duoc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_nguoi_duoc_ho_tro_desc' THEN s.so_nguoi_duoc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ho_tro_asc' THEN s.tong_tien_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ho_tro_desc' THEN s.tong_tien_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'hien_vat_quy_doi_asc' THEN s.hien_vat_quy_doi END ASC  NULLS LAST,
    CASE WHEN p_sort = 'hien_vat_quy_doi_desc' THEN s.hien_vat_quy_doi END DESC NULLS LAST,
    CASE WHEN p_sort = 'gia_tri_nhap_kho_asc' THEN s.gia_tri_nhap_kho END ASC  NULLS LAST,
    CASE WHEN p_sort = 'gia_tri_nhap_kho_desc' THEN s.gia_tri_nhap_kho END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_asc' THEN s.tong_gia_tri END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_desc' THEN s.tong_gia_tri END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc' THEN s.trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc' THEN s.trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc' THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_duyet_asc' THEN s.ho_va_ten_nguoi_duyet END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_duyet_desc' THEN s.ho_va_ten_nguoi_duyet END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc' THEN s.ghi_chu END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc' THEN s.ghi_chu END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc' THEN s.nguoi_tao_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.nguoi_tao_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc' THEN s.tg_cap_nhat END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc' THEN s.tg_cap_nhat END DESC NULLS LAST,
    -- Mặc định: ngày khen mới nhất lên trước. BẮT BUỘC kết thúc bằng khoá chính.
    s.ngay_khen DESC, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_ktnt_thanh_tich(bigint, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ktnt_thanh_tich(p_nha_tai_tro_id bigint, p_tu_nam integer DEFAULT NULL::integer, p_den_nam integer DEFAULT NULL::integer) RETURNS TABLE(tien_mat numeric, hien_vat_quy_doi numeric, gia_tri_nhap_kho numeric, so_khoan_ho_tro bigint, so_nguoi_duoc_ho_tro bigint, so_phieu_nhap_kho bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH truc_tiep AS (
    SELECT CASE WHEN v.hinh_thuc_ho_tro =  'Tiền mặt' THEN v.so_tien END AS so_tien,
           CASE WHEN v.hinh_thuc_ho_tro <> 'Tiền mặt' THEN v.so_tien END AS hien_vat,
           COALESCE('ho:' || v.ho_ngheo_id::text,
                    'ten:' || lower(regexp_replace(btrim(v.ho_ten_nguoi_nhan), '\s+', ' ', 'g'))
                      || '|' || COALESCE(v.xa_phuong_id::text, '')) AS nguoi
    FROM public.vnn_chuong_trinh v
    WHERE v.don_vi_ho_tro_id = p_nha_tai_tro_id
      AND v.nguon_ho_tro = 'Ủng hộ trực tiếp'
      AND (p_tu_nam  IS NULL OR v.nam >= p_tu_nam)
      AND (p_den_nam IS NULL OR v.nam <= p_den_nam)
    UNION ALL
    SELECT n.so_tien, NULL::numeric,
           COALESCE('ho:' || n.ho_ngheo_id::text,
                    'ten:' || lower(regexp_replace(btrim(n.ho_ten_chu_ho), '\s+', ' ', 'g'))
                      || '|' || COALESCE(n.xa_phuong_id::text, ''))
    FROM public.nddk_nha_dai_doan_ket n
    WHERE n.nha_tai_tro_id = p_nha_tai_tro_id
      AND n.nguon_ho_tro = 'Ủng hộ trực tiếp'
      AND (p_tu_nam  IS NULL OR n.nam >= p_tu_nam)
      AND (p_den_nam IS NULL OR n.nam <= p_den_nam)
  ),
  tt AS (
    SELECT COALESCE(sum(so_tien), 0)::numeric  AS tien,
           COALESCE(sum(hien_vat), 0)::numeric AS hien_vat,
           count(*)::bigint                    AS so_khoan,
           count(DISTINCT nguoi)::bigint       AS so_nguoi
    FROM truc_tiep
  ),
  tn AS (
    SELECT COALESCE(sum(t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0)), 0)::numeric AS tien,
           COALESCE(sum(COALESCE(t.hien_vat_khac_gia_tri, 0)), 0)::numeric           AS hien_vat
    FROM public.tn_tiep_nhan t
    WHERE t.nha_tai_tro_id = p_nha_tai_tro_id
      AND (p_tu_nam  IS NULL OR extract(year FROM t.ngay_tiep_nhan)::int >= p_tu_nam)
      AND (p_den_nam IS NULL OR extract(year FROM t.ngay_tiep_nhan)::int <= p_den_nam)
  ),
  kho AS (
    SELECT COALESCE(sum(ct.thanh_tien), 0)::numeric AS gia_tri,
           count(DISTINCT p.id)::bigint             AS so_phieu
    FROM public.kho_nhap_xuat_kho p
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
    WHERE p.loai_phieu = 'nhap_ngoai'
      AND p.don_vi_cuu_tro_id = p_nha_tai_tro_id
      AND (p_tu_nam  IS NULL OR extract(year FROM p.ngay_phieu)::int >= p_tu_nam)
      AND (p_den_nam IS NULL OR extract(year FROM p.ngay_phieu)::int <= p_den_nam)
  )
  SELECT tt.tien + tn.tien, tt.hien_vat + tn.hien_vat, kho.gia_tri,
         tt.so_khoan, tt.so_nguoi, kho.so_phieu
  FROM tt CROSS JOIN tn CROSS JOIN kho;
$$;


--
-- Name: get_nddk_page(text, integer, integer, text, boolean, bigint, integer[], text[], text[], text[], text[], text[], bigint[], jsonb, bigint[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_nddk_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_nguon text[] DEFAULT NULL::text[], p_nguon_ho_tro text[] DEFAULT NULL::text[], p_doi_tuong text[] DEFAULT NULL::text[], p_loai_hinh text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb, p_nha_tai_tro_ids bigint[] DEFAULT NULL::bigint[]) RETURNS TABLE(id bigint, noi_dung_ho_tro text, nam integer, nguon text, nguon_ho_tro text, ho_ngheo_id bigint, ho_ten_chu_ho text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, loai_hinh_ho_tro text, so_tien numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text, nha_tai_tro_id bigint, ten_nha_tai_tro text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat,
      ntt.ten          AS ten_nha_tai_tro,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.nddk_nha_dai_doan_ket t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.var_nhan_vien     nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien     nc ON nc.id = t.id_nguoi_cap_nhat
    LEFT JOIN public.kho_don_vi_cuu_tro ntt ON ntt.id = t.nha_tai_tro_id
  )
  SELECT
    s.id, s.noi_dung_ho_tro, s.nam, s.nguon, s.nguon_ho_tro,
    s.ho_ngheo_id, s.ho_ten_chu_ho, s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.loai_hinh_ho_tro, s.so_tien,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    s.nha_tai_tro_id, s.ten_nha_tai_tro,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.nam::text,
        s.ho_ten_chu_ho,
        s.ten_xa_phuong,
        s.khoi_xom,
        s.loai_hinh_ho_tro,
        s.so_tien::text, replace(to_char(round(s.so_tien), 'FM999,999,999,999,990'), ',', '.'),
        s.trang_thai,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.noi_dung_ho_tro,
        s.nguon,
        s.nguon_ho_tro,
        s.ten_nha_tai_tro,
        s.doi_tuong,
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewNddkRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_nam           IS NULL OR cardinality(p_nam)           = 0 OR s.nam              = ANY (p_nam))
    AND (p_nguon         IS NULL OR cardinality(p_nguon)         = 0 OR s.nguon            = ANY (p_nguon))
    AND (p_nguon_ho_tro  IS NULL OR cardinality(p_nguon_ho_tro)  = 0 OR s.nguon_ho_tro     = ANY (p_nguon_ho_tro))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong        = ANY (p_doi_tuong))
    AND (p_loai_hinh     IS NULL OR cardinality(p_loai_hinh)     = 0 OR s.loai_hinh_ho_tro = ANY (p_loai_hinh))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    AND (p_nha_tai_tro_ids IS NULL OR cardinality(p_nha_tai_tro_ids) = 0 OR s.nha_tai_tro_id = ANY (p_nha_tai_tro_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'nam','')),'') IS NULL
         OR s.nam::text ILIKE '%'||btrim(p_column_search->>'nam')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_ho_tro','')),'') IS NULL
         OR s.noi_dung_ho_tro ILIKE '%'||btrim(p_column_search->>'noi_dung_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon','')),'') IS NULL
         OR s.nguon ILIKE '%'||btrim(p_column_search->>'nguon')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon_ho_tro','')),'') IS NULL
         OR s.nguon_ho_tro ILIKE '%'||btrim(p_column_search->>'nguon_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_nha_tai_tro','')),'') IS NULL
         OR s.ten_nha_tai_tro ILIKE '%'||btrim(p_column_search->>'ten_nha_tai_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_chu_ho','')),'') IS NULL
         OR s.ho_ten_chu_ho ILIKE '%'||btrim(p_column_search->>'ho_ten_chu_ho')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_hinh_ho_tro','')),'') IS NULL
         OR s.loai_hinh_ho_tro ILIKE '%'||btrim(p_column_search->>'loai_hinh_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tien','')),'') IS NULL
         OR s.so_tien::text ILIKE '%'||btrim(p_column_search->>'so_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY')
            ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'nam_asc'                      THEN s.nam                      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nam_desc'                     THEN s.nam                      END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_asc'          THEN s.noi_dung_ho_tro          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_desc'         THEN s.noi_dung_ho_tro          END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_asc'                    THEN s.nguon                    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_desc'                   THEN s.nguon                    END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_asc'             THEN s.nguon_ho_tro             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_desc'            THEN s.nguon_ho_tro             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_asc'          THEN s.ten_nha_tai_tro          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_desc'         THEN s.ten_nha_tai_tro          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_chu_ho_asc'            THEN s.ho_ten_chu_ho            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_chu_ho_desc'           THEN s.ho_ten_chu_ho            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'            THEN s.ten_xa_phuong            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'           THEN s.ten_xa_phuong            END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc'                 THEN s.khoi_xom                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc'                THEN s.khoi_xom                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc'                THEN s.doi_tuong                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc'               THEN s.doi_tuong                END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_ho_tro_asc'         THEN s.loai_hinh_ho_tro         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_ho_tro_desc'        THEN s.loai_hinh_ho_tro         END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc'                  THEN s.so_tien                  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc'                 THEN s.so_tien                  END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'               THEN s.trang_thai               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'              THEN s.trang_thai               END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc'  THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc'                  THEN s.ghi_chu                  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc'                 THEN s.ghi_chu                  END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'      THEN s.nguoi_tao_display        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc'     THEN s.nguoi_tao_display        END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'              THEN s.tg_cap_nhat              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'             THEN s.tg_cap_nhat              END DESC NULLS LAST,
    -- Mặc định: mới cập nhật lên trước. BẮT BUỘC kết thúc bằng khoá chính,
    -- nếu không hai trang liền nhau có thể trùng dòng hoặc bỏ sót dòng.
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_nhan_vien_count_by_chuc_vu(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_nhan_vien_count_by_chuc_vu() RETURNS TABLE(id_chuc_vu bigint, so_nhan_vien bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT id_chuc_vu, COUNT(*)::BIGINT AS so_nhan_vien
  FROM var_nhan_vien
  WHERE id_chuc_vu IS NOT NULL
  GROUP BY id_chuc_vu;
$$;


--
-- Name: FUNCTION get_nhan_vien_count_by_chuc_vu(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_nhan_vien_count_by_chuc_vu() IS 'Egress optim P2.1: thay vòng count client-side trong phan-quyen-service.';


--
-- Name: get_pbxh_thuc_hien_page(text, integer, integer, text, boolean, bigint, text[], text[], text[], bigint[], jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pbxh_thuc_hien_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_cap_thuc_hien text[] DEFAULT NULL::text[], p_loai_hinh text[] DEFAULT NULL::text[], p_tinh_trang text[] DEFAULT NULL::text[], p_don_vi_chu_tri_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb, p_labels jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, cap_thuc_hien text, loai_hinh text, noi_dung text, doi_tuong_id bigint, ten_doi_tuong text, hinh_thuc_id bigint, ten_hinh_thuc text, ngay_bat_dau date, ngay_ket_thuc date, mo_ta_thoi_gian text, tinh_trang text, don_vi_chu_tri_id bigint, ten_don_vi_chu_tri text, phong_ban_tham_muu_id bigint, ten_phong_ban text, don_vi_thuc_hien_id bigint, ten_don_vi_thuc_hien text, ket_qua_kien_nghi text, so_lan_hoan_thanh integer, so_lan_khao_sat integer, phan_tram_hoan_thanh smallint, link_ket_qua text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      dt.ten  AS ten_doi_tuong,
      hf.ten  AS ten_hinh_thuc,
      ct.ten  AS ten_don_vi_chu_tri,
      pb.ten_phong_ban,
      xp.ten  AS ten_don_vi_thuc_hien,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      -- Chuỗi hiển thị cột "Đơn vị thực hiện" (khớp formatTenDonViThucHien).
      CASE
        WHEN t.don_vi_thuc_hien_id IS NULL THEN COALESCE(p_labels->>'don_vi_tinh', '')
        ELSE COALESCE(NULLIF(btrim(xp.ten), ''), COALESCE(p_labels->>'empty_cell', ''))
      END AS don_vi_thuc_hien_display,
      -- Chuỗi hiển thị cột "Tiến độ thực hiện" (khớp tinhTienDo + fallback).
      CASE
        WHEN t.ngay_ket_thuc IS NULL THEN COALESCE(NULLIF(btrim(t.mo_ta_thoi_gian), ''), '')
        WHEN t.ngay_ket_thuc > CURRENT_DATE THEN
          replace(COALESCE(p_labels->>'tien_do_con', ''), '{{count}}', (t.ngay_ket_thuc - CURRENT_DATE)::text)
        WHEN t.ngay_ket_thuc = CURRENT_DATE THEN COALESCE(p_labels->>'tien_do_hom_nay', '')
        ELSE
          replace(COALESCE(p_labels->>'tien_do_qua_han', ''), '{{count}}', (CURRENT_DATE - t.ngay_ket_thuc)::text)
      END AS tien_do_display,
      -- Khoá sắp xếp cột tiến độ: nhỏ hơn = gấp hơn; không có hạn xếp cuối.
      COALESCE(t.ngay_ket_thuc - CURRENT_DATE, 2147483647) AS tien_do_sort,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '') AS nguoi_tao_display
    FROM public.pbxh_thuc_hien_phan_bien_xa_hoi t
    LEFT JOIN public.pbxh_thiet_lap     dt ON dt.id = t.doi_tuong_id
    LEFT JOIN public.pbxh_thiet_lap     hf ON hf.id = t.hinh_thuc_id
    LEFT JOIN public.pbxh_thiet_lap     ct ON ct.id = t.don_vi_chu_tri_id
    LEFT JOIN public.var_phong_ban      pb ON pb.id = t.phong_ban_tham_muu_id
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.don_vi_thuc_hien_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
  )
  SELECT
    s.id, s.cap_thuc_hien, s.loai_hinh, s.noi_dung,
    s.doi_tuong_id, s.ten_doi_tuong,
    s.hinh_thuc_id, s.ten_hinh_thuc,
    s.ngay_bat_dau, s.ngay_ket_thuc, s.mo_ta_thoi_gian, s.tinh_trang,
    s.don_vi_chu_tri_id, s.ten_don_vi_chu_tri,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.don_vi_thuc_hien_id, s.ten_don_vi_thuc_hien,
    s.ket_qua_kien_nghi, s.so_lan_hoan_thanh, s.so_lan_khao_sat,
    s.phan_tram_hoan_thanh, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.loai_hinh,
        s.don_vi_thuc_hien_display,
        s.ten_don_vi_thuc_hien,
        s.noi_dung,
        s.tien_do_display,
        s.tinh_trang,
        s.ten_don_vi_chu_tri,
        s.so_lan_hoan_thanh::text,
        s.so_lan_khao_sat::text,
        s.phan_tram_hoan_thanh::text,
        s.cap_thuc_hien,
        s.ten_doi_tuong,
        s.ten_hinh_thuc,
        to_char(s.ngay_bat_dau, 'DD/MM/YYYY'),
        to_char(s.ngay_ket_thuc, 'DD/MM/YYYY'),
        s.mo_ta_thoi_gian,
        s.ten_phong_ban,
        s.ket_qua_kien_nghi,
        s.link_ket_qua,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewPbxhThucHienRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_thuc_hien_id = p_viewer_don_vi_id
    )
    AND (p_cap_thuc_hien      IS NULL OR cardinality(p_cap_thuc_hien)      = 0 OR s.cap_thuc_hien = ANY (p_cap_thuc_hien))
    AND (p_loai_hinh          IS NULL OR cardinality(p_loai_hinh)          = 0 OR s.loai_hinh     = ANY (p_loai_hinh))
    AND (p_tinh_trang         IS NULL OR cardinality(p_tinh_trang)         = 0 OR s.tinh_trang    = ANY (p_tinh_trang))
    AND (p_don_vi_chu_tri_ids IS NULL OR cardinality(p_don_vi_chu_tri_ids) = 0 OR s.don_vi_chu_tri_id = ANY (p_don_vi_chu_tri_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'loai_hinh','')),'') IS NULL
         OR s.loai_hinh ILIKE '%'||btrim(p_column_search->>'loai_hinh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'cap_thuc_hien','')),'') IS NULL
         OR s.cap_thuc_hien ILIKE '%'||btrim(p_column_search->>'cap_thuc_hien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung','')),'') IS NULL
         OR s.noi_dung ILIKE '%'||btrim(p_column_search->>'noi_dung')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tinh_trang','')),'') IS NULL
         OR s.tinh_trang ILIKE '%'||btrim(p_column_search->>'tinh_trang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_thuc_hien','')),'') IS NULL
         OR s.don_vi_thuc_hien_display ILIKE '%'||btrim(p_column_search->>'don_vi_thuc_hien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tien_do','')),'') IS NULL
         OR s.tien_do_display ILIKE '%'||btrim(p_column_search->>'tien_do')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_chu_tri','')),'') IS NULL
         OR s.ten_don_vi_chu_tri ILIKE '%'||btrim(p_column_search->>'ten_don_vi_chu_tri')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_doi_tuong','')),'') IS NULL
         OR s.ten_doi_tuong ILIKE '%'||btrim(p_column_search->>'ten_doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_hinh_thuc','')),'') IS NULL
         OR s.ten_hinh_thuc ILIKE '%'||btrim(p_column_search->>'ten_hinh_thuc')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_phong_ban','')),'') IS NULL
         OR s.ten_phong_ban ILIKE '%'||btrim(p_column_search->>'ten_phong_ban')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_kien_nghi','')),'') IS NULL
         OR s.ket_qua_kien_nghi ILIKE '%'||btrim(p_column_search->>'ket_qua_kien_nghi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'mo_ta_thoi_gian','')),'') IS NULL
         OR s.mo_ta_thoi_gian ILIKE '%'||btrim(p_column_search->>'mo_ta_thoi_gian')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_lan_hoan_thanh','')),'') IS NULL
         OR s.so_lan_hoan_thanh::text ILIKE '%'||btrim(p_column_search->>'so_lan_hoan_thanh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_lan_khao_sat','')),'') IS NULL
         OR s.so_lan_khao_sat::text ILIKE '%'||btrim(p_column_search->>'so_lan_khao_sat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'phan_tram_hoan_thanh','')),'') IS NULL
         OR (s.phan_tram_hoan_thanh::text || '%') ILIKE '%'||btrim(p_column_search->>'phan_tram_hoan_thanh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_bat_dau','')),'') IS NULL
         OR to_char(s.ngay_bat_dau, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_bat_dau')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_ket_thuc','')),'') IS NULL
         OR to_char(s.ngay_ket_thuc, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_ket_thuc')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'loai_hinh_asc'             THEN s.loai_hinh                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_desc'            THEN s.loai_hinh                END DESC NULLS LAST,
    CASE WHEN p_sort = 'cap_thuc_hien_asc'         THEN s.cap_thuc_hien            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'cap_thuc_hien_desc'        THEN s.cap_thuc_hien            END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_asc'              THEN s.noi_dung                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_desc'             THEN s.noi_dung                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'tinh_trang_asc'            THEN s.tinh_trang               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tinh_trang_desc'           THEN s.tinh_trang               END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_thuc_hien_asc'      THEN s.don_vi_thuc_hien_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_thuc_hien_desc'     THEN s.don_vi_thuc_hien_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tien_do_asc'               THEN s.tien_do_sort             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc'              THEN s.tien_do_sort             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_chu_tri_asc'    THEN s.ten_don_vi_chu_tri       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_chu_tri_desc'   THEN s.ten_don_vi_chu_tri       END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_doi_tuong_asc'         THEN s.ten_doi_tuong            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_doi_tuong_desc'        THEN s.ten_doi_tuong            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_hinh_thuc_asc'         THEN s.ten_hinh_thuc            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_hinh_thuc_desc'        THEN s.ten_hinh_thuc            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_asc'         THEN s.ten_phong_ban            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_desc'        THEN s.ten_phong_ban            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_kien_nghi_asc'     THEN s.ket_qua_kien_nghi        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_kien_nghi_desc'    THEN s.ket_qua_kien_nghi        END DESC NULLS LAST,
    CASE WHEN p_sort = 'link_ket_qua_asc'          THEN s.link_ket_qua             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'link_ket_qua_desc'         THEN s.link_ket_qua             END DESC NULLS LAST,
    CASE WHEN p_sort = 'mo_ta_thoi_gian_asc'       THEN s.mo_ta_thoi_gian          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'mo_ta_thoi_gian_desc'      THEN s.mo_ta_thoi_gian          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'   THEN s.nguoi_tao_display        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc'  THEN s.nguoi_tao_display        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_bat_dau_asc'          THEN s.ngay_bat_dau             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_bat_dau_desc'         THEN s.ngay_bat_dau             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_ket_thuc_asc'         THEN s.ngay_ket_thuc            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_ket_thuc_desc'        THEN s.ngay_ket_thuc            END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_lan_hoan_thanh_asc'     THEN s.so_lan_hoan_thanh        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_lan_hoan_thanh_desc'    THEN s.so_lan_hoan_thanh        END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_lan_khao_sat_asc'       THEN s.so_lan_khao_sat          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_lan_khao_sat_desc'      THEN s.so_lan_khao_sat          END DESC NULLS LAST,
    CASE WHEN p_sort = 'phan_tram_hoan_thanh_asc'  THEN s.phan_tram_hoan_thanh     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'phan_tram_hoan_thanh_desc' THEN s.phan_tram_hoan_thanh     END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'           THEN s.tg_cap_nhat              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'          THEN s.tg_cap_nhat              END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_phong_ban_path_level(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_phong_ban_path_level(p_id bigint, p_cha_id bigint) RETURNS TABLE(duong_dan text, cap_do integer)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  parent_path TEXT;
  parent_level INT;
BEGIN
  IF p_cha_id IS NULL THEN
    RETURN QUERY SELECT ('/' || p_id::TEXT)::TEXT, 1;
    RETURN;
  END IF;

  SELECT vp.duong_dan, vp.cap_do
    INTO parent_path, parent_level
    FROM var_phong_ban vp
   WHERE vp.id = p_cha_id;

  IF parent_path IS NULL THEN
    RETURN QUERY SELECT ('/' || p_id::TEXT)::TEXT, 1;
    RETURN;
  END IF;

  RETURN QUERY SELECT (parent_path || '/' || p_id::TEXT)::TEXT, parent_level + 1;
END;
$$;


--
-- Name: FUNCTION get_phong_ban_path_level(p_id bigint, p_cha_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_phong_ban_path_level(p_id bigint, p_cha_id bigint) IS 'Egress optim P2.3: path/level phòng ban không cần kéo getAll() client.';


--
-- Name: get_tang_luong_sap_den_han_count(integer, text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tang_luong_sap_den_han_count(p_so_ngay integer DEFAULT 90, p_scope text DEFAULT 'all'::text, p_viewer_don_vi_id bigint DEFAULT NULL::bigint) RETURNS TABLE(so_luong bigint, gan_nhat date)
    LANGUAGE sql STABLE
    AS $$
  WITH lan_gan_nhat AS (
    -- Mỗi cán bộ một dòng: lần nâng lương gần nhất.
    SELECT DISTINCT ON (tl.can_bo_id)
      tl.can_bo_id,
      tl.ngay_nang_luong,
      cb.don_vi_id
    FROM public.mttq_tang_luong tl
    JOIN public.mttq_can_bo cb ON cb.id = tl.can_bo_id
    WHERE tl.ngay_nang_luong IS NOT NULL
      AND (
        COALESCE(p_scope, 'all') = 'all'
        OR (p_scope = 'tinh' AND 'Tỉnh' = ANY (COALESCE(cb.cap_quan_ly, ARRAY[]::text[])))
        OR (p_scope = 'xa_phuong' AND cb.don_vi_id = p_viewer_don_vi_id)
      )
    ORDER BY tl.can_bo_id, tl.ngay_nang_luong DESC
  ),
  den_han AS (
    SELECT (ngay_nang_luong + INTERVAL '3 years')::date AS ngay_den_han
    FROM lan_gan_nhat
  )
  SELECT count(*) AS so_luong, min(ngay_den_han) AS gan_nhat
  FROM den_han
  WHERE ngay_den_han >= CURRENT_DATE
    AND ngay_den_han <= CURRENT_DATE + greatest(coalesce(p_so_ngay, 90), 0);
$$;


--
-- Name: FUNCTION get_tang_luong_sap_den_han_count(p_so_ngay integer, p_scope text, p_viewer_don_vi_id bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_tang_luong_sap_den_han_count(p_so_ngay integer, p_scope text, p_viewer_don_vi_id bigint) IS 'Đếm cán bộ có kỳ nâng bậc lương đến hạn trong N ngày tới (lần nâng gần nhất + 3 năm).';


--
-- Name: get_tn_phieu_kho_cua_nha_tai_tro(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tn_phieu_kho_cua_nha_tai_tro(p_nha_tai_tro_id bigint) RETURNS TABLE(phieu_id bigint, so_phieu text, ngay_phieu date, ten_kho text, ten_chuong_trinh text, tong_tien numeric, so_dong bigint, tiep_nhan_id bigint, so_phieu_tiep_nhan text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT
    p.id, p.so_phieu, p.ngay_phieu, k.ten_kho, d.ten,
    COALESCE(sum(ct.thanh_tien), 0), count(ct.id),
    l.tiep_nhan_id, t.so_phieu
  FROM public.kho_nhap_xuat_kho p
  LEFT JOIN public.kho_danh_sach_kho k ON k.id = p.kho_nhap_id
  LEFT JOIN public.kho_dot_cuu_tro d ON d.id = p.dot_cuu_tro_id
  LEFT JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
  LEFT JOIN public.tn_tiep_nhan_phieu_kho l ON l.phieu_id = p.id
  LEFT JOIN public.tn_tiep_nhan t ON t.id = l.tiep_nhan_id
  WHERE p.loai_phieu = 'nhap_ngoai'
    AND p.don_vi_cuu_tro_id = p_nha_tai_tro_id
    AND ((SELECT public.fn_kho_xem_tat_ca()) OR p.kho_nhap_id = ANY ((SELECT public.fn_kho_cua_toi())::bigint[]))
  GROUP BY p.id, k.ten_kho, d.ten, l.tiep_nhan_id, t.so_phieu
  ORDER BY p.ngay_phieu DESC, p.id DESC;
$$;


--
-- Name: get_tn_tiep_nhan_page(text, integer, integer, text, bigint[], bigint[], text[], text[], date, date, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tn_tiep_nhan_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_nha_tai_tro_ids bigint[] DEFAULT NULL::bigint[], p_chuong_trinh_ids bigint[] DEFAULT NULL::bigint[], p_hinh_thuc text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_id bigint DEFAULT NULL::bigint) RETURNS TABLE(id bigint, so_phieu text, ngay_tiep_nhan date, nha_tai_tro_id bigint, ten_nha_tai_tro text, loai_nha_tai_tro text, chuong_trinh_id bigint, ten_chuong_trinh text, don_vi_chu_tri_loai text, don_vi_chu_tri_id bigint, ten_don_vi_tiep_nhan text, hinh_thuc text, so_tien numeric, giay_to_co_gia_gia_tri numeric, hien_vat_khac_gia_tri numeric, gia_tri_phieu_kho numeric, so_phieu_kho bigint, tong_gia_tri numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  WITH kho AS (
    SELECT l.tiep_nhan_id, sum(ct.thanh_tien) AS gia_tri, count(DISTINCT l.phieu_id) AS so_phieu
    FROM public.tn_tiep_nhan_phieu_kho l
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = l.phieu_id
    GROUP BY l.tiep_nhan_id
  ),
  src AS (
    SELECT
      t.*,
      ntt.ten  AS ten_nha_tai_tro,
      ntt.loai AS loai_nha_tai_tro,
      d.ten    AS ten_chuong_trinh,
      d.don_vi_chu_tri_loai,
      d.don_vi_chu_tri_id,
      CASE WHEN d.don_vi_chu_tri_loai = 'xa_phuong' THEN xp.ten ELSE 'MTTQ tỉnh' END AS ten_don_vi_tiep_nhan,
      COALESCE(kho.gia_tri, 0)  AS gia_tri_phieu_kho,
      COALESCE(kho.so_phieu, 0) AS so_phieu_kho,
      t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0) + COALESCE(t.hien_vat_khac_gia_tri, 0)
        + COALESCE(kho.gia_tri, 0) AS tong_gia_tri,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat
    FROM public.tn_tiep_nhan t
    JOIN public.kho_don_vi_cuu_tro ntt ON ntt.id = t.nha_tai_tro_id
    JOIN public.kho_dot_cuu_tro d      ON d.id = t.chuong_trinh_id
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = d.don_vi_chu_tri_id
    LEFT JOIN kho ON kho.tiep_nhan_id = t.id
    LEFT JOIN public.var_nhan_vien nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien nc ON nc.id = t.id_nguoi_cap_nhat
    -- Cùng luật policy tn_tiep_nhan_xem (hàm định nghĩa nên phải lọc tường minh).
    WHERE (SELECT public.fn_kho_xem_tat_ca())
       OR (d.don_vi_chu_tri_loai = 'xa_phuong' AND d.don_vi_chu_tri_id = (SELECT public.fn_don_vi_cua_toi()))
  )
  SELECT
    s.id, s.so_phieu, s.ngay_tiep_nhan,
    s.nha_tai_tro_id, s.ten_nha_tai_tro, s.loai_nha_tai_tro,
    s.chuong_trinh_id, s.ten_chuong_trinh,
    s.don_vi_chu_tri_loai, s.don_vi_chu_tri_id, s.ten_don_vi_tiep_nhan,
    s.hinh_thuc, s.so_tien,
    s.giay_to_co_gia_gia_tri, s.hien_vat_khac_gia_tri,
    s.gia_tri_phieu_kho, s.so_phieu_kho, s.tong_gia_tri,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (p_id IS NULL OR s.id = p_id)
    AND (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.so_phieu, s.ten_nha_tai_tro, s.ten_chuong_trinh, s.ten_don_vi_tiep_nhan,
        s.hinh_thuc, s.trang_thai, s.ghi_chu,
        s.tong_gia_tri::text, replace(to_char(round(s.tong_gia_tri), 'FM999,999,999,999,990'), ',', '.'),
        to_char(s.ngay_tiep_nhan, 'DD/MM/YYYY')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (p_nha_tai_tro_ids  IS NULL OR cardinality(p_nha_tai_tro_ids)  = 0 OR s.nha_tai_tro_id  = ANY (p_nha_tai_tro_ids))
    AND (p_chuong_trinh_ids IS NULL OR cardinality(p_chuong_trinh_ids) = 0 OR s.chuong_trinh_id = ANY (p_chuong_trinh_ids))
    AND (p_hinh_thuc        IS NULL OR cardinality(p_hinh_thuc)        = 0 OR s.hinh_thuc       = ANY (p_hinh_thuc))
    AND (p_trang_thai       IS NULL OR cardinality(p_trang_thai)       = 0 OR s.trang_thai      = ANY (p_trang_thai))
    AND (p_tu_ngay  IS NULL OR s.ngay_tiep_nhan >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR s.ngay_tiep_nhan <= p_den_ngay)
  ORDER BY
    CASE WHEN p_sort = 'so_phieu_asc'         THEN s.so_phieu         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'        THEN s.so_phieu         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_tiep_nhan_asc'   THEN s.ngay_tiep_nhan   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_tiep_nhan_desc'  THEN s.ngay_tiep_nhan   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_asc'  THEN s.ten_nha_tai_tro  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_desc' THEN s.ten_nha_tai_tro  END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_asc' THEN s.ten_chuong_trinh END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_desc' THEN s.ten_chuong_trinh END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc'          THEN s.so_tien          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc'         THEN s.so_tien          END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_asc'     THEN s.tong_gia_tri     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_desc'    THEN s.tong_gia_tri     END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'       THEN s.trang_thai       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'      THEN s.trang_thai       END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'      THEN s.tg_cap_nhat      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'     THEN s.tg_cap_nhat      END DESC NULLS LAST,
    s.ngay_tiep_nhan DESC, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_uy_vien_diem_danh_summary_for_don_vi(bigint[], bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_uy_vien_diem_danh_summary_for_don_vi(p_uy_vien_ids bigint[], p_don_vi_id bigint) RETURNS TABLE(uy_vien_id bigint, so_ky_hop bigint, co_mat bigint, vang_mat bigint, chua_diem_danh bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    u.id,
    COUNT(kh.id)::bigint,
    COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Có mặt')::bigint,
    COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Vắng mặt')::bigint,
    GREATEST(COUNT(kh.id) - COUNT(dd.id), 0)::bigint
  FROM public.mttq_uy_vien_uy_ban u
  LEFT JOIN public.mttq_ky_hop kh
         ON kh.nhiem_ky_id = u.nhiem_ky_id
        AND kh.don_vi_id = p_don_vi_id
  LEFT JOIN public.mttq_diem_danh_uy_vien dd
         ON dd.ky_hop_id = kh.id AND dd.uy_vien_id = u.id
  WHERE u.id = ANY(p_uy_vien_ids)
  GROUP BY u.id;
$$;


--
-- Name: get_vnn_page(text, integer, integer, text, boolean, bigint, integer[], text[], text[], text[], text[], text[], text[], bigint[], jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_vnn_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_linh_vuc text[] DEFAULT NULL::text[], p_nguon text[] DEFAULT NULL::text[], p_nguon_ho_tro text[] DEFAULT NULL::text[], p_doi_tuong text[] DEFAULT NULL::text[], p_hinh_thuc text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, noi_dung_ho_tro text, nam integer, linh_vuc_ho_tro text, nguon text, nguon_ho_tro text, ho_ngheo_id bigint, ho_ten_nguoi_nhan text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, hinh_thuc_ho_tro text, so_tien numeric, so_luong integer, tong_tien_quy_doi numeric, tong_tien_ban_giao numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, don_vi_ho_tro_id bigint, ten_don_vi_ho_tro text, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      dv.ten           AS ten_don_vi_ho_tro,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.vnn_chuong_trinh t
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = t.don_vi_ho_tro_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien      nc ON nc.id = t.id_nguoi_cap_nhat
  )
  SELECT
    s.id, s.noi_dung_ho_tro, s.nam, s.linh_vuc_ho_tro, s.nguon, s.nguon_ho_tro,
    s.ho_ngheo_id, s.ho_ten_nguoi_nhan, s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.hinh_thuc_ho_tro, s.so_tien,
    s.so_luong, s.tong_tien_quy_doi, s.tong_tien_ban_giao,
    s.trang_thai, s.ngay_cap_nhat_trang_thai,
    s.don_vi_ho_tro_id, s.ten_don_vi_ho_tro, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.nam::text,
        s.ho_ten_nguoi_nhan,
        s.ten_xa_phuong,
        s.linh_vuc_ho_tro,
        s.hinh_thuc_ho_tro,
        s.so_tien::text, replace(to_char(round(s.so_tien), 'FM999,999,999,999,990'), ',', '.'),
        s.trang_thai,
        s.ten_don_vi_ho_tro,
        s.noi_dung_ho_tro,
        s.khoi_xom,
        s.doi_tuong,
        s.nguon,
        s.nguon_ho_tro,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewVnnRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_nam           IS NULL OR cardinality(p_nam)           = 0 OR s.nam              = ANY (p_nam))
    AND (p_linh_vuc      IS NULL OR cardinality(p_linh_vuc)      = 0 OR s.linh_vuc_ho_tro  = ANY (p_linh_vuc))
    AND (p_nguon         IS NULL OR cardinality(p_nguon)         = 0 OR s.nguon            = ANY (p_nguon))
    AND (p_nguon_ho_tro  IS NULL OR cardinality(p_nguon_ho_tro)  = 0 OR s.nguon_ho_tro     = ANY (p_nguon_ho_tro))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong        = ANY (p_doi_tuong))
    AND (p_hinh_thuc     IS NULL OR cardinality(p_hinh_thuc)     = 0 OR s.hinh_thuc_ho_tro = ANY (p_hinh_thuc))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'nam','')),'') IS NULL
         OR s.nam::text ILIKE '%'||btrim(p_column_search->>'nam')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_ho_tro','')),'') IS NULL
         OR s.noi_dung_ho_tro ILIKE '%'||btrim(p_column_search->>'noi_dung_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'linh_vuc_ho_tro','')),'') IS NULL
         OR s.linh_vuc_ho_tro ILIKE '%'||btrim(p_column_search->>'linh_vuc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon','')),'') IS NULL
         OR s.nguon ILIKE '%'||btrim(p_column_search->>'nguon')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon_ho_tro','')),'') IS NULL
         OR s.nguon_ho_tro ILIKE '%'||btrim(p_column_search->>'nguon_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_nguoi_nhan','')),'') IS NULL
         OR s.ho_ten_nguoi_nhan ILIKE '%'||btrim(p_column_search->>'ho_ten_nguoi_nhan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'hinh_thuc_ho_tro','')),'') IS NULL
         OR s.hinh_thuc_ho_tro ILIKE '%'||btrim(p_column_search->>'hinh_thuc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_ho_tro','')),'') IS NULL
         OR s.ten_don_vi_ho_tro ILIKE '%'||btrim(p_column_search->>'ten_don_vi_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tien','')),'') IS NULL
         OR s.so_tien::text ILIKE '%'||btrim(p_column_search->>'so_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY')
            ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_luong','')),'') IS NULL
         OR s.so_luong::text ILIKE '%'||btrim(p_column_search->>'so_luong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tong_tien_quy_doi','')),'') IS NULL
         OR s.tong_tien_quy_doi::text ILIKE '%'||btrim(p_column_search->>'tong_tien_quy_doi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tong_tien_ban_giao','')),'') IS NULL
         OR s.tong_tien_ban_giao::text ILIKE '%'||btrim(p_column_search->>'tong_tien_ban_giao')||'%')
  ORDER BY
    CASE WHEN p_sort = 'nam_asc' THEN s.nam END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nam_desc' THEN s.nam END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_asc' THEN s.noi_dung_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_desc' THEN s.noi_dung_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'linh_vuc_ho_tro_asc' THEN s.linh_vuc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'linh_vuc_ho_tro_desc' THEN s.linh_vuc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_asc' THEN s.nguon END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_desc' THEN s.nguon END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_asc' THEN s.nguon_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_desc' THEN s.nguon_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_nguoi_nhan_asc' THEN s.ho_ten_nguoi_nhan END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_nguoi_nhan_desc' THEN s.ho_ten_nguoi_nhan END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc' THEN s.ten_xa_phuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc' THEN s.ten_xa_phuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc' THEN s.khoi_xom END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc' THEN s.khoi_xom END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc' THEN s.doi_tuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc' THEN s.doi_tuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'hinh_thuc_ho_tro_asc' THEN s.hinh_thuc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'hinh_thuc_ho_tro_desc' THEN s.hinh_thuc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc' THEN s.so_tien END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc' THEN s.so_tien END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc' THEN s.trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc' THEN s.trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc' THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_ho_tro_asc' THEN s.ten_don_vi_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_ho_tro_desc' THEN s.ten_don_vi_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc' THEN s.ghi_chu END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc' THEN s.ghi_chu END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc' THEN s.nguoi_tao_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.nguoi_tao_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc' THEN s.tg_cap_nhat END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc' THEN s.tg_cap_nhat END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_luong_asc'  THEN s.so_luong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_luong_desc' THEN s.so_luong END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_quy_doi_asc'  THEN s.tong_tien_quy_doi END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_quy_doi_desc' THEN s.tong_tien_quy_doi END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ban_giao_asc'  THEN s.tong_tien_ban_giao END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ban_giao_desc' THEN s.tong_tien_ban_giao END DESC NULLS LAST,
    -- Mặc định: mới cập nhật lên trước. BẮT BUỘC kết thúc bằng khoá chính,
    -- nếu không hai trang liền nhau có thể trùng dòng hoặc bỏ sót dòng.
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;


--
-- Name: get_xa_counts_by_tinh_thanh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_xa_counts_by_tinh_thanh() RETURNS TABLE(id_tinh_thanh text, so_xa bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT id_tinh_thanh::TEXT, COUNT(*)::BIGINT AS so_xa
  FROM var_ssn_xa_phuong
  GROUP BY id_tinh_thanh;
$$;


--
-- Name: luong_thiet_lap_ngach_seed_bac(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.luong_thiet_lap_ngach_seed_bac() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  i INTEGER;
  lbl TEXT;
BEGIN
  FOR i IN 1..9 LOOP
    lbl := 'B' || i::text;
    INSERT INTO public.luong_thiet_lap_bac_luong (ngach_id, ma_bac, he_so, thu_tu)
    VALUES (NEW.id, lbl, 1.0, i);
  END LOOP;
  RETURN NEW;
END;
$$;


--
-- Name: mttq_can_bo_validate_thiet_lap_loai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.dan_toc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.dan_toc_id AND t.loai = 'dan_toc'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.dan_toc_id must reference mttq_thiet_lap with loai = dan_toc';
    END IF;
  END IF;
  IF NEW.trinh_do_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.trinh_do_id AND t.loai = 'trinh_do'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.trinh_do_id must reference mttq_thiet_lap with loai = trinh_do';
    END IF;
  END IF;
  IF NEW.ly_luan_chinh_tri_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.ly_luan_chinh_tri_id AND t.loai = 'ly_luan_chinh_tri'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.ly_luan_chinh_tri_id must reference mttq_thiet_lap with loai = ly_luan_chinh_tri';
    END IF;
  END IF;
  IF NEW.trang_thai_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.trang_thai_id AND t.loai = 'trang_thai'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.trang_thai_id must reference mttq_thiet_lap with loai = trang_thai';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: mttq_khen_thuong_ct_touch_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mttq_khen_thuong_ct_touch_parent() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  pid bigint;
BEGIN
  pid := COALESCE(NEW.id_khen_thuong, OLD.id_khen_thuong);
  IF pid IS NOT NULL THEN
    UPDATE public.mttq_khen_thuong SET tg_cap_nhat = now() WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: mttq_lop_tap_huan_ct_touch_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mttq_lop_tap_huan_ct_touch_parent() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  pid bigint;
BEGIN
  pid := COALESCE(NEW.id_lop_tap_huan, OLD.id_lop_tap_huan);
  IF pid IS NOT NULL THEN
    UPDATE public.mttq_lop_tap_huan SET tg_cap_nhat = now() WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: mttq_lop_tap_huan_validate_to_chuc_loai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mttq_lop_tap_huan_validate_to_chuc_loai() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.to_chuc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t
      WHERE t.id = NEW.to_chuc_id AND t.loai = 'to_chuc'
    ) THEN
      RAISE EXCEPTION 'mttq_lop_tap_huan.to_chuc_id must reference mttq_thiet_lap with loai = to_chuc';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: mttq_uy_vien_uy_ban_touch_nhiem_ky(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mttq_uy_vien_uy_ban_touch_nhiem_ky() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  pid bigint;
BEGIN
  pid := COALESCE(NEW.nhiem_ky_id, OLD.nhiem_ky_id);
  IF pid IS NOT NULL THEN
    UPDATE public.mttq_nhiem_ky SET tg_cap_nhat = now() WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: pbxh_thuc_hien_sync_phan_tram_hoan_thanh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pbxh_thuc_hien_sync_phan_tram_hoan_thanh() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.so_lan_khao_sat > 0 THEN
    NEW.phan_tram_hoan_thanh := LEAST(
      100,
      GREATEST(0, ROUND(NEW.so_lan_hoan_thanh::numeric / NEW.so_lan_khao_sat * 100))
    )::smallint;
  ELSE
    NEW.phan_tram_hoan_thanh := 0;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: rpc_khen_thuong_cap_nhat_quyet_dinh(bigint, text, date, text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(p_id bigint, p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_chi_tiet jsonb, p_noi_dung_khen text) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_dong_la BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'KHEN_THUONG_CHI_TIET_RONG: Quyết định khen thưởng phải có ít nhất 1 cán bộ được khen.';
  END IF;

  UPDATE public.mttq_khen_thuong SET
    so_qd            = NULLIF(btrim(p_so_qd), ''),
    noi_dung_khen    = NULLIF(btrim(p_noi_dung_khen), ''),
    ngay_khen_thuong = p_ngay_khen_thuong,
    don_vi_de_xuat   = p_don_vi_de_xuat,
    ghi_chu          = p_ghi_chu,
    trang_thai       = p_trang_thai
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KHEN_THUONG_KHONG_TON_TAI: Không tìm thấy quyết định khen thưởng %.', p_id;
  END IF;

  -- Dòng cũ client gửi lên phải đúng là dòng của quyết định này.
  SELECT NULLIF(line->>'id', '')::BIGINT INTO v_dong_la
  FROM jsonb_array_elements(p_chi_tiet) AS line
  WHERE NULLIF(line->>'id', '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.mttq_khen_thuong_ct c
      WHERE c.id = NULLIF(line->>'id', '')::BIGINT AND c.id_khen_thuong = p_id
    )
  LIMIT 1;

  IF v_dong_la IS NOT NULL THEN
    RAISE EXCEPTION 'KHEN_THUONG_DONG_LA: Dòng chi tiết % không thuộc quyết định %.', v_dong_la, p_id;
  END IF;

  DELETE FROM public.mttq_khen_thuong_ct c
  WHERE c.id_khen_thuong = p_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_chi_tiet) AS line
      WHERE NULLIF(line->>'id', '')::BIGINT = c.id
    );

  UPDATE public.mttq_khen_thuong_ct c SET
    can_bo_id       = (l.line->>'can_bo_id')::BIGINT,
    cap_khen_thuong = l.line->>'cap_khen_thuong',
    hinh_thuc_khen  = l.line->>'hinh_thuc_khen',
    danh_hieu       = l.line->>'danh_hieu',
    noi_dung_khen   = NULLIF(l.line->>'noi_dung_khen', ''),
    ho_so_khen      = NULLIF(l.line->>'ho_so_khen', '')
  FROM (
    SELECT line FROM jsonb_array_elements(p_chi_tiet) AS line
    WHERE NULLIF(line->>'id', '') IS NOT NULL
  ) AS l
  WHERE c.id_khen_thuong = p_id
    AND c.id = NULLIF(l.line->>'id', '')::BIGINT;

  INSERT INTO public.mttq_khen_thuong_ct
    (id_khen_thuong, can_bo_id, cap_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen)
  SELECT
    p_id,
    (t.line->>'can_bo_id')::BIGINT,
    t.line->>'cap_khen_thuong',
    t.line->>'hinh_thuc_khen',
    t.line->>'danh_hieu',
    NULLIF(t.line->>'noi_dung_khen', ''),
    NULLIF(t.line->>'ho_so_khen', '')
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  WHERE NULLIF(t.line->>'id', '') IS NULL
  ORDER BY t.thu_tu;

  RETURN p_id;
END;
$$;


--
-- Name: rpc_khen_thuong_tao_quyet_dinh(text, date, text, text, text, bigint, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_id_nguoi_tao bigint, p_chi_tiet jsonb, p_noi_dung_khen text) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'KHEN_THUONG_CHI_TIET_RONG: Quyết định khen thưởng phải có ít nhất 1 cán bộ được khen.';
  END IF;

  INSERT INTO public.mttq_khen_thuong (
    so_qd, noi_dung_khen, ngay_khen_thuong, don_vi_de_xuat, ghi_chu, trang_thai, id_nguoi_tao
  ) VALUES (
    NULLIF(btrim(p_so_qd), ''), NULLIF(btrim(p_noi_dung_khen), ''),
    p_ngay_khen_thuong, p_don_vi_de_xuat, p_ghi_chu, p_trang_thai, p_id_nguoi_tao
  )
  RETURNING id INTO v_id;

  INSERT INTO public.mttq_khen_thuong_ct
    (id_khen_thuong, can_bo_id, cap_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen)
  SELECT
    v_id,
    (line->>'can_bo_id')::BIGINT,
    line->>'cap_khen_thuong',
    line->>'hinh_thuc_khen',
    line->>'danh_hieu',
    NULLIF(line->>'noi_dung_khen', ''),
    NULLIF(line->>'ho_so_khen', '')
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  ORDER BY t.thu_tu;

  RETURN v_id;
END;
$$;


--
-- Name: rpc_kho_cap_nhat_phieu_nhap_xuat(bigint, text, date, bigint, bigint, bigint, bigint, text, text, text, text, text, jsonb, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(p_id bigint, p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint DEFAULT NULL::bigint) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'CHI_TIET_RONG: Phiếu phải có ít nhất 1 dòng chi tiết.';
  END IF;

  UPDATE public.kho_nhap_xuat_kho SET
    loai_phieu        = p_loai_phieu,
    ngay_phieu        = p_ngay_phieu,
    kho_xuat_id       = p_kho_xuat_id,
    kho_nhap_id       = p_kho_nhap_id,
    don_vi_cuu_tro_id = p_don_vi_cuu_tro_id,
    dot_cuu_tro_id    = p_dot_cuu_tro_id,
    ghi_chu           = p_ghi_chu,
    nguoi_giao_nhan   = NULLIF(trim(p_nguoi_giao_nhan), ''),
    bo_phan           = NULLIF(trim(p_bo_phan), ''),
    chung_tu_goc      = NULLIF(trim(p_chung_tu_goc), ''),
    muc_dich          = NULLIF(trim(p_muc_dich), ''),
    ho_ngheo_id       = p_ho_ngheo_id
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PHIEU_KHONG_TON_TAI: Không tìm thấy phiếu %.', p_id;
  END IF;

  DELETE FROM public.kho_nhap_xuat_kho_ct WHERE phieu_id = p_id;

  INSERT INTO public.kho_nhap_xuat_kho_ct
    (phieu_id, hang_hoa_id, don_vi_tinh, so_luong, don_gia, ghi_chu, thu_tu)
  SELECT
    p_id,
    (line->>'hang_hoa_id')::BIGINT,
    line->>'don_vi_tinh',
    (line->>'so_luong')::NUMERIC,
    COALESCE((line->>'don_gia')::NUMERIC, 0),
    NULLIF(line->>'ghi_chu', ''),
    COALESCE((line->>'thu_tu')::INTEGER, 0)
  FROM jsonb_array_elements(p_chi_tiet) AS line;

  RETURN p_id;
END;
$$;


--
-- Name: rpc_kho_tao_phieu_nhap_xuat(text, date, bigint, bigint, bigint, bigint, text, text, text, text, text, jsonb, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint DEFAULT NULL::bigint) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_phieu_id BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'CHI_TIET_RONG: Phiếu phải có ít nhất 1 dòng chi tiết.';
  END IF;

  INSERT INTO public.kho_nhap_xuat_kho (
    loai_phieu, ngay_phieu, kho_xuat_id, kho_nhap_id, don_vi_cuu_tro_id, dot_cuu_tro_id,
    ghi_chu, nguoi_giao_nhan, bo_phan, chung_tu_goc, muc_dich, ho_ngheo_id
  )
  VALUES (
    p_loai_phieu, p_ngay_phieu, p_kho_xuat_id, p_kho_nhap_id, p_don_vi_cuu_tro_id, p_dot_cuu_tro_id,
    p_ghi_chu,
    NULLIF(trim(p_nguoi_giao_nhan), ''),
    NULLIF(trim(p_bo_phan), ''),
    NULLIF(trim(p_chung_tu_goc), ''),
    NULLIF(trim(p_muc_dich), ''),
    p_ho_ngheo_id
  )
  RETURNING id INTO v_phieu_id;

  INSERT INTO public.kho_nhap_xuat_kho_ct
    (phieu_id, hang_hoa_id, don_vi_tinh, so_luong, don_gia, ghi_chu, thu_tu)
  SELECT
    v_phieu_id,
    (line->>'hang_hoa_id')::BIGINT,
    line->>'don_vi_tinh',
    (line->>'so_luong')::NUMERIC,
    COALESCE((line->>'don_gia')::NUMERIC, 0),
    NULLIF(line->>'ghi_chu', ''),
    COALESCE((line->>'thu_tu')::INTEGER, 0)
  FROM jsonb_array_elements(p_chi_tiet) AS line;

  RETURN v_phieu_id;
END;
$$;


--
-- Name: rpc_phan_quyen_cap_nhat_module(text, text[], jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_phan_quyen_cap_nhat_module(p_module_key text, p_legacy_keys text[], p_updates jsonb) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_keys    text[];
  v_so_dong integer := 0;
  v_them    integer := 0;
  v_xoa     integer := 0;
BEGIN
  IF p_module_key IS NULL OR btrim(p_module_key) = '' THEN
    RAISE EXCEPTION 'PHAN_QUYEN_MODULE_RONG: Chưa xác định được phần cần phân quyền.';
  END IF;

  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RAISE EXCEPTION 'PHAN_QUYEN_KHONG_CO_CHUC_VU: Chưa chọn chức vụ nào để phân quyền.';
  END IF;

  v_keys := COALESCE(p_legacy_keys, ARRAY[]::text[]) || ARRAY[p_module_key];

  -- 1) Dọn các khoá module CŨ của đúng những chức vụ đang gửi lên. Đây là việc
  --    một lần khi đổi tên đường dẫn module, không phải đường đi thường ngày.
  IF array_length(COALESCE(p_legacy_keys, ARRAY[]::text[]), 1) > 0 THEN
    DELETE FROM public.var_phan_quyen pq
    WHERE pq.module_key = ANY (COALESCE(p_legacy_keys, ARRAY[]::text[]))
      AND pq.module_key <> p_module_key
      AND pq.chuc_vu_id IN (
        SELECT (u->>'chuc_vu_id')::bigint FROM jsonb_array_elements(p_updates) AS u
      );
  END IF;

  -- 2) Chức vụ bị gỡ hết quyền → xoá dòng.
  DELETE FROM public.var_phan_quyen pq
  WHERE pq.module_key = p_module_key
    AND pq.chuc_vu_id IN (
      SELECT (u->>'chuc_vu_id')::bigint
      FROM jsonb_array_elements(p_updates) AS u
      WHERE COALESCE(btrim(u->>'quyen'), '') = ''
    );
  GET DIAGNOSTICS v_xoa = ROW_COUNT;

  -- 3) Chức vụ có quyền → thêm mới hoặc sửa, và CHỈ khi chuỗi quyền khác đi.
  INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
  SELECT (u->>'chuc_vu_id')::bigint, p_module_key, btrim(u->>'quyen')
  FROM jsonb_array_elements(p_updates) AS u
  WHERE COALESCE(btrim(u->>'quyen'), '') <> ''
  ON CONFLICT (chuc_vu_id, module_key) DO UPDATE
    SET quyen = EXCLUDED.quyen
    WHERE public.var_phan_quyen.quyen IS DISTINCT FROM EXCLUDED.quyen;
  GET DIAGNOSTICS v_them = ROW_COUNT;

  v_so_dong := v_them + v_xoa;
  RETURN v_so_dong;
END;
$$;


--
-- Name: FUNCTION rpc_phan_quyen_cap_nhat_module(p_module_key text, p_legacy_keys text[], p_updates jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_phan_quyen_cap_nhat_module(p_module_key text, p_legacy_keys text[], p_updates jsonb) IS 'Cập nhật quyền của một module trong cùng một giao dịch, chỉ ghi những dòng thực sự đổi (tránh làm nhật ký thay đổi ngập vì mỗi tích chuột ghi lại cả ma trận).';


--
-- Name: rpc_tap_huan_cap_nhat_lop(bigint, text, integer, text, bigint, bigint, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_tap_huan_cap_nhat_lop(p_id bigint, p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_chi_tiet jsonb) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_dong_la BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'TAP_HUAN_CHI_TIET_RONG: Lớp tập huấn phải có ít nhất 1 cán bộ tham gia.';
  END IF;

  UPDATE public.mttq_lop_tap_huan SET
    ten_lop_tap_huan = p_ten_lop_tap_huan,
    nam_tap_huan     = p_nam_tap_huan,
    cap_tap_huan     = p_cap_tap_huan,
    don_vi_id        = p_don_vi_id,
    to_chuc_id       = p_to_chuc_id,
    ghi_chu          = p_ghi_chu
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TAP_HUAN_KHONG_TON_TAI: Không tìm thấy lớp tập huấn %.', p_id;
  END IF;

  SELECT NULLIF(line->>'id', '')::BIGINT INTO v_dong_la
  FROM jsonb_array_elements(p_chi_tiet) AS line
  WHERE NULLIF(line->>'id', '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.mttq_lop_tap_huan_ct c
      WHERE c.id = NULLIF(line->>'id', '')::BIGINT AND c.id_lop_tap_huan = p_id
    )
  LIMIT 1;

  IF v_dong_la IS NOT NULL THEN
    RAISE EXCEPTION 'TAP_HUAN_DONG_LA: Dòng cán bộ % không thuộc lớp tập huấn %.', v_dong_la, p_id;
  END IF;

  DELETE FROM public.mttq_lop_tap_huan_ct c
  WHERE c.id_lop_tap_huan = p_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_chi_tiet) AS line
      WHERE NULLIF(line->>'id', '')::BIGINT = c.id
    );

  UPDATE public.mttq_lop_tap_huan_ct c SET
    can_bo_id  = (l.line->>'can_bo_id')::BIGINT,
    thuoc_dien = l.line->>'thuoc_dien'
  FROM (
    SELECT line FROM jsonb_array_elements(p_chi_tiet) AS line
    WHERE NULLIF(line->>'id', '') IS NOT NULL
  ) AS l
  WHERE c.id_lop_tap_huan = p_id
    AND c.id = NULLIF(l.line->>'id', '')::BIGINT;

  INSERT INTO public.mttq_lop_tap_huan_ct (id_lop_tap_huan, can_bo_id, thuoc_dien)
  SELECT
    p_id,
    (t.line->>'can_bo_id')::BIGINT,
    t.line->>'thuoc_dien'
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  WHERE NULLIF(t.line->>'id', '') IS NULL
  ORDER BY t.thu_tu;

  RETURN p_id;
END;
$$;


--
-- Name: rpc_tap_huan_tao_lop(text, integer, text, bigint, bigint, text, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_tap_huan_tao_lop(p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_id_nguoi_tao bigint, p_chi_tiet jsonb) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'TAP_HUAN_CHI_TIET_RONG: Lớp tập huấn phải có ít nhất 1 cán bộ tham gia.';
  END IF;

  INSERT INTO public.mttq_lop_tap_huan (
    ten_lop_tap_huan, nam_tap_huan, cap_tap_huan, don_vi_id, to_chuc_id, ghi_chu, id_nguoi_tao
  ) VALUES (
    p_ten_lop_tap_huan, p_nam_tap_huan, p_cap_tap_huan, p_don_vi_id, p_to_chuc_id, p_ghi_chu, p_id_nguoi_tao
  )
  RETURNING id INTO v_id;

  INSERT INTO public.mttq_lop_tap_huan_ct (id_lop_tap_huan, can_bo_id, thuoc_dien)
  SELECT
    v_id,
    (t.line->>'can_bo_id')::BIGINT,
    t.line->>'thuoc_dien'
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  ORDER BY t.thu_tu;

  RETURN v_id;
END;
$$;


--
-- Name: rpc_thong_bao_danh_dau_tat_ca_da_doc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: FUNCTION rpc_thong_bao_danh_dau_tat_ca_da_doc(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() IS 'Đánh dấu đã đọc toàn bộ thông báo chưa đọc của người đang đăng nhập (1 request).';


--
-- Name: rpc_tn_luu_tiep_nhan(bigint, jsonb, bigint[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_tn_luu_tiep_nhan(p_id bigint, p_data jsonb, p_phieu_ids bigint[] DEFAULT ARRAY[]::bigint[]) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id bigint := p_id;
  v_tong numeric;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO public.tn_tiep_nhan (
      ngay_tiep_nhan, nha_tai_tro_id, chuong_trinh_id, hinh_thuc, so_tien,
      giay_to_co_gia_mo_ta, giay_to_co_gia_gia_tri, hien_vat_khac_mo_ta, hien_vat_khac_gia_tri,
      muc_dich, dia_diem_lap, phu_luc, trang_thai, ghi_chu
    ) VALUES (
      COALESCE((p_data->>'ngay_tiep_nhan')::date, CURRENT_DATE),
      (p_data->>'nha_tai_tro_id')::bigint,
      (p_data->>'chuong_trinh_id')::bigint,
      NULLIF(p_data->>'hinh_thuc', ''),
      COALESCE((p_data->>'so_tien')::numeric, 0),
      NULLIF(btrim(p_data->>'giay_to_co_gia_mo_ta'), ''),
      (p_data->>'giay_to_co_gia_gia_tri')::numeric,
      NULLIF(btrim(p_data->>'hien_vat_khac_mo_ta'), ''),
      (p_data->>'hien_vat_khac_gia_tri')::numeric,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_data->'muc_dich')), ARRAY[]::text[]),
      NULLIF(btrim(p_data->>'dia_diem_lap'), ''),
      CASE WHEN jsonb_typeof(p_data->'phu_luc') = 'array' AND jsonb_array_length(p_data->'phu_luc') > 0
           THEN p_data->'phu_luc' END,
      COALESCE(NULLIF(p_data->>'trang_thai', ''), 'Đăng ký'),
      NULLIF(btrim(p_data->>'ghi_chu'), '')
    )
    RETURNING id INTO v_id;
  ELSE
    -- Gỡ liên kết TRƯỚC khi sửa đầu phiếu: đổi nhà tài trợ bị chặn nếu còn phiếu gắn.
    DELETE FROM public.tn_tiep_nhan_phieu_kho WHERE tiep_nhan_id = v_id;
    UPDATE public.tn_tiep_nhan SET
      ngay_tiep_nhan         = COALESCE((p_data->>'ngay_tiep_nhan')::date, ngay_tiep_nhan),
      nha_tai_tro_id         = (p_data->>'nha_tai_tro_id')::bigint,
      chuong_trinh_id        = (p_data->>'chuong_trinh_id')::bigint,
      hinh_thuc              = NULLIF(p_data->>'hinh_thuc', ''),
      so_tien                = COALESCE((p_data->>'so_tien')::numeric, 0),
      giay_to_co_gia_mo_ta   = NULLIF(btrim(p_data->>'giay_to_co_gia_mo_ta'), ''),
      giay_to_co_gia_gia_tri = (p_data->>'giay_to_co_gia_gia_tri')::numeric,
      hien_vat_khac_mo_ta    = NULLIF(btrim(p_data->>'hien_vat_khac_mo_ta'), ''),
      hien_vat_khac_gia_tri  = (p_data->>'hien_vat_khac_gia_tri')::numeric,
      muc_dich               = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_data->'muc_dich')), ARRAY[]::text[]),
      dia_diem_lap           = NULLIF(btrim(p_data->>'dia_diem_lap'), ''),
      phu_luc                = CASE WHEN jsonb_typeof(p_data->'phu_luc') = 'array'
                                     AND jsonb_array_length(p_data->'phu_luc') > 0
                                    THEN p_data->'phu_luc' END,
      ghi_chu                = NULLIF(btrim(p_data->>'ghi_chu'), '')
    WHERE id = v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TN_KHONG_TIM_THAY: Không tìm thấy khoản tiếp nhận hoặc không có quyền sửa.';
    END IF;
  END IF;

  INSERT INTO public.tn_tiep_nhan_phieu_kho (tiep_nhan_id, phieu_id)
  SELECT v_id, x FROM unnest(COALESCE(p_phieu_ids, ARRAY[]::bigint[])) AS x;

  -- Khoản tiếp nhận phải có giá trị — bản sao luật `tongGiaTriTiepNhan > 0` ở client.
  SELECT t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0) + COALESCE(t.hien_vat_khac_gia_tri, 0)
         + public.fn_tn_gia_tri_phieu_kho(t.id)
    INTO v_tong
  FROM public.tn_tiep_nhan t WHERE t.id = v_id;
  IF COALESCE(v_tong, 0) <= 0 THEN
    RAISE EXCEPTION 'TN_GIA_TRI_RONG: Khoản tiếp nhận phải có số tiền, giấy tờ có giá, hiện vật hoặc phiếu nhập kho.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN v_id;
END;
$$;


--
-- Name: set_tg_cap_nhat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_tg_cap_nhat() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.tg_cap_nhat = now();
  RETURN NEW;
END;
$$;


--
-- Name: var_phong_ban_path_after_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.var_phong_ban_path_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  p_duong text;
  p_cap   int;
BEGIN
  IF NEW.cha_id IS NULL THEN
    UPDATE public.var_phong_ban
    SET duong_dan = '/' || NEW.id::text, cap_do = 1
    WHERE id = NEW.id;
  ELSE
    SELECT p.duong_dan, p.cap_do INTO p_duong, p_cap
    FROM public.var_phong_ban p
    WHERE p.id = NEW.cha_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'var_phong_ban: cha_id % không tồn tại', NEW.cha_id;
    END IF;
    UPDATE public.var_phong_ban
    SET duong_dan = p_duong || '/' || NEW.id::text, cap_do = p_cap + 1
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    bang text NOT NULL,
    ban_ghi_id text,
    hanh_dong text NOT NULL,
    nguoi_thuc_hien_id bigint,
    auth_user_id uuid,
    tg timestamp with time zone DEFAULT now() NOT NULL,
    du_lieu_cu jsonb,
    du_lieu_moi jsonb,
    CONSTRAINT audit_log_hanh_dong_check CHECK ((hanh_dong = ANY (ARRAY['them'::text, 'sua'::text, 'xoa'::text])))
);


--
-- Name: TABLE audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log IS 'Nhật ký thay đổi các bảng nhạy cảm (lương, nhân viên, phân quyền, kho cứu trợ). Chỉ đọc với người dùng; chỉ trigger fn_ghi_nhat_ky() được ghi vào.';


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: bai_viet_danh_sach; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bai_viet_danh_sach (
    id bigint NOT NULL,
    ten_bai text NOT NULL,
    id_the_loai bigint NOT NULL,
    don_gia numeric(14,2) DEFAULT 0 NOT NULL,
    ngay_dang date NOT NULL,
    id_nguon_dang bigint NOT NULL,
    id_trang_dang bigint NOT NULL,
    link text NOT NULL,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bai_viet_danh_sach_don_gia_check CHECK ((don_gia >= (0)::numeric))
);


--
-- Name: bai_viet_danh_sach_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bai_viet_danh_sach ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bai_viet_danh_sach_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bai_viet_thiet_lap_khac; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bai_viet_thiet_lap_khac (
    id bigint NOT NULL,
    loai text NOT NULL,
    ten text NOT NULL,
    mo_ta text,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bai_viet_thiet_lap_khac_loai_check CHECK ((loai = ANY (ARRAY['trang_dang'::text, 'nguon_dang'::text])))
);


--
-- Name: bai_viet_thiet_lap_khac_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bai_viet_thiet_lap_khac ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bai_viet_thiet_lap_khac_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bai_viet_thiet_lap_the_loai; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bai_viet_thiet_lap_the_loai (
    id bigint NOT NULL,
    ten_the_loai text NOT NULL,
    mo_ta text,
    don_gia numeric(14,2) DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bai_viet_thiet_lap_the_loai_don_gia_check CHECK ((don_gia >= (0)::numeric))
);


--
-- Name: bai_viet_thiet_lap_the_loai_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bai_viet_thiet_lap_the_loai ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bai_viet_thiet_lap_the_loai_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chuong_trinh_nam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chuong_trinh_nam (
    id bigint NOT NULL,
    ten_chuong_trinh text NOT NULL,
    mo_ta text,
    ngay_bat_dau date NOT NULL,
    ngay_ket_thuc date NOT NULL,
    trang_thai text DEFAULT 'Hoạt động'::text NOT NULL,
    id_phong_ban bigint,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    ghi_chu text,
    CONSTRAINT chk_chuong_trinh_nam_dates CHECK ((ngay_ket_thuc >= ngay_bat_dau)),
    CONSTRAINT chuong_trinh_nam_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Hoạt động'::text, 'Tạm dừng'::text, 'Kết thúc'::text])))
);


--
-- Name: chuong_trinh_nam_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.chuong_trinh_nam ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.chuong_trinh_nam_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cong_viec_danh_sach; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cong_viec_danh_sach (
    id bigint NOT NULL,
    muc_do text NOT NULL,
    ten_cong_viec text NOT NULL,
    ghi_chu text,
    link_tai_lieu text,
    thoi_han date,
    tien_do smallint DEFAULT 0 NOT NULL,
    id_trach_nhiem bigint NOT NULL,
    ids_ho_tro bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    trang_thai text DEFAULT 'Mới'::text NOT NULL,
    ket_qua text,
    link_kq text,
    ngay_hoan_thanh date,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    id_chuong_trinh bigint,
    CONSTRAINT cong_viec_danh_sach_muc_do_check CHECK ((muc_do = ANY (ARRAY['Thấp'::text, 'Trung bình'::text, 'Cao'::text, 'Khẩn'::text]))),
    CONSTRAINT cong_viec_danh_sach_tien_do_check CHECK (((tien_do >= 0) AND (tien_do <= 100))),
    CONSTRAINT cong_viec_danh_sach_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Mới'::text, 'Đang thực hiện'::text, 'Hoàn thành'::text, 'Tạm dừng'::text, 'Hủy'::text])))
);


--
-- Name: cong_viec_danh_sach_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cong_viec_danh_sach ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cong_viec_danh_sach_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dttg_dip_tham_hoi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dttg_dip_tham_hoi (
    id bigint NOT NULL,
    ten_dip text NOT NULL,
    mo_ta text,
    thoi_gian_du_kien text,
    thoi_gian_thuc_te date,
    don_vi_to_chuc_id bigint,
    phong_ban_tham_muu_id bigint,
    so_luong_to_chuc_du_kien integer DEFAULT 0 NOT NULL,
    so_luong_ca_nhan_du_kien integer DEFAULT 0 NOT NULL,
    trang_thai text DEFAULT 'Chưa thực hiện'::text NOT NULL,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dttg_dip_tham_hoi_so_luong_ca_nhan_du_kien_check CHECK ((so_luong_ca_nhan_du_kien >= 0)),
    CONSTRAINT dttg_dip_tham_hoi_so_luong_to_chuc_du_kien_check CHECK ((so_luong_to_chuc_du_kien >= 0)),
    CONSTRAINT dttg_dip_tham_hoi_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Chưa thực hiện'::text, 'Đang thực hiện'::text, 'Đã hoàn thành'::text])))
);


--
-- Name: dttg_dip_tham_hoi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dttg_dip_tham_hoi ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dttg_dip_tham_hoi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dttg_tham_hoi_ca_nhan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dttg_tham_hoi_ca_nhan (
    id bigint NOT NULL,
    ca_nhan_id bigint NOT NULL,
    phong_ban_tham_muu_id bigint,
    doi_tuong text,
    chuc_vu_vi_tri text,
    dip_tham_hoi text NOT NULL,
    qua_tang text,
    trang_thai text DEFAULT 'Chưa thực hiện'::text NOT NULL,
    ket_qua_ghi_chu text,
    link_ket_qua text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    don_vi_tham_hoi_id bigint,
    xa_phuong_id bigint,
    thoi_gian_du_kien date,
    dip_tham_hoi_id bigint,
    thoi_gian_thuc_te date,
    CONSTRAINT dttg_tham_hoi_ca_nhan_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Chưa thực hiện'::text, 'Đang thực hiện'::text, 'Đã hoàn thành'::text])))
);


--
-- Name: dttg_tham_hoi_to_chuc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dttg_tham_hoi_to_chuc (
    id bigint NOT NULL,
    to_chuc_id bigint NOT NULL,
    dip_tham_hoi text NOT NULL,
    thoi_gian_du_kien text,
    noi_dung_tham_hoi text,
    thanh_phan_doan text,
    qua_tang text,
    tien_do text DEFAULT 'Chưa thực hiện'::text NOT NULL,
    ket_qua_thuc_hien text,
    link_ket_qua text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    don_vi_tham_hoi_id bigint,
    dip_tham_hoi_id bigint,
    thoi_gian_thuc_te date,
    phong_ban_tham_muu_id bigint,
    CONSTRAINT dttg_tham_hoi_to_chuc_tien_do_check CHECK ((tien_do = ANY (ARRAY['Chưa thực hiện'::text, 'Đang thực hiện'::text, 'Đã hoàn thành'::text])))
);


--
-- Name: dttg_dip_tham_hoi_with_counts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.dttg_dip_tham_hoi_with_counts WITH (security_invoker='true') AS
 SELECT d.id,
    d.ten_dip,
    d.mo_ta,
    d.thoi_gian_du_kien,
    d.thoi_gian_thuc_te,
    d.don_vi_to_chuc_id,
    d.phong_ban_tham_muu_id,
    d.so_luong_to_chuc_du_kien,
    d.so_luong_ca_nhan_du_kien,
    d.trang_thai,
    d.ghi_chu,
    d.id_nguoi_tao,
    d.tg_tao,
    d.tg_cap_nhat,
    COALESCE(tc_stats.so_thuc_hien_to_chuc, 0) AS so_thuc_hien_to_chuc,
    COALESCE(cn_stats.so_thuc_hien_ca_nhan, 0) AS so_thuc_hien_ca_nhan,
    COALESCE(tc_stats.so_hoan_thanh_to_chuc, 0) AS so_hoan_thanh_to_chuc,
    COALESCE(cn_stats.so_hoan_thanh_ca_nhan, 0) AS so_hoan_thanh_ca_nhan,
    (d.so_luong_to_chuc_du_kien + d.so_luong_ca_nhan_du_kien) AS so_luong_du_kien_tong,
    (COALESCE(tc_stats.so_hoan_thanh_to_chuc, 0) + COALESCE(cn_stats.so_hoan_thanh_ca_nhan, 0)) AS so_luong_thuc_te_tong
   FROM ((public.dttg_dip_tham_hoi d
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS so_thuc_hien_to_chuc,
            (count(*) FILTER (WHERE (tc.tien_do = 'Đã hoàn thành'::text)))::integer AS so_hoan_thanh_to_chuc
           FROM public.dttg_tham_hoi_to_chuc tc
          WHERE (tc.dip_tham_hoi_id = d.id)) tc_stats ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS so_thuc_hien_ca_nhan,
            (count(*) FILTER (WHERE (cn.trang_thai = 'Đã hoàn thành'::text)))::integer AS so_hoan_thanh_ca_nhan
           FROM public.dttg_tham_hoi_ca_nhan cn
          WHERE (cn.dip_tham_hoi_id = d.id)) cn_stats ON (true));


--
-- Name: dttg_tham_hoi_ca_nhan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dttg_tham_hoi_ca_nhan ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dttg_tham_hoi_ca_nhan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dttg_tham_hoi_to_chuc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dttg_tham_hoi_to_chuc ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dttg_tham_hoi_to_chuc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dttg_thong_tin_ca_nhan_tieu_bieu (
    id bigint NOT NULL,
    ho_va_ten text NOT NULL,
    ngay_sinh date,
    doi_tuong text NOT NULL,
    chuc_vu_vi_tri text,
    ton_giao_dan_toc text,
    dia_chi text,
    don_vi_id bigint,
    so_dien_thoai text,
    dong_gop_noi_bat text,
    trang_thai text DEFAULT 'Đang hoạt động'::text NOT NULL,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dttg_thong_tin_ca_nhan_tieu_bieu_doi_tuong_check CHECK ((doi_tuong = ANY (ARRAY['Chức sắc'::text, 'Người uy tín'::text, 'Người có công'::text]))),
    CONSTRAINT dttg_thong_tin_ca_nhan_tieu_bieu_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang hoạt động'::text, 'Ngừng hoạt động'::text])))
);


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dttg_thong_tin_ca_nhan_tieu_bieu ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dttg_thong_tin_ca_nhan_tieu_bieu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dttg_thong_tin_to_chuc_quan_trong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dttg_thong_tin_to_chuc_quan_trong (
    id bigint NOT NULL,
    loai_hinh text NOT NULL,
    ten_co_so text NOT NULL,
    chu_tri text,
    lich_su_hinh_thanh text,
    cong_tac_an_sinh text,
    don_vi_id bigint,
    dia_chi text,
    so_dien_thoai text,
    trang_thai text DEFAULT 'Đang hoạt động'::text NOT NULL,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dttg_thong_tin_to_chuc_quan_trong_loai_hinh_check CHECK ((loai_hinh = ANY (ARRAY['Chùa'::text, 'Giáo xứ'::text, 'Nghĩa trang'::text, 'Khác'::text]))),
    CONSTRAINT dttg_thong_tin_to_chuc_quan_trong_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang hoạt động'::text, 'Ngừng hoạt động'::text])))
);


--
-- Name: dttg_thong_tin_to_chuc_quan_trong_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dttg_thong_tin_to_chuc_quan_trong ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dttg_thong_tin_to_chuc_quan_trong_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: hngh_thong_tin_ho_ngheo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hngh_thong_tin_ho_ngheo (
    id bigint NOT NULL,
    ho_ten_dai_dien text NOT NULL,
    so_cccd text,
    xa_phuong_id bigint,
    khoi_xom text,
    doi_tuong text,
    dien_thoai text,
    dan_toc_id bigint,
    ton_giao text DEFAULT 'Không'::text NOT NULL,
    so_tai_khoan text,
    ngan_hang text,
    trang_thai text DEFAULT 'Đang khó khăn'::text NOT NULL,
    ngay_cap_nhat_trang_thai timestamp with time zone DEFAULT now() NOT NULL,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    gioi_tinh text,
    nam_sinh integer,
    ngay_cap_cccd date,
    noi_cap_cccd text,
    ho_ten_vo_chong text,
    so_nhan_khau integer,
    nghe_nghiep text,
    trinh_do_hoc_van text,
    tinh_trang_viec_lam text,
    doi_tuong_uu_tien text,
    tinh_trang_dat text,
    id_nguoi_cap_nhat bigint,
    CONSTRAINT hngh_gioi_tinh_chk CHECK (((gioi_tinh IS NULL) OR (gioi_tinh = ANY (ARRAY['Nam'::text, 'Nữ'::text])))),
    CONSTRAINT hngh_ho_ten_dai_dien_chk CHECK ((btrim(ho_ten_dai_dien) <> ''::text)),
    CONSTRAINT hngh_nam_sinh_chk CHECK (((nam_sinh IS NULL) OR ((nam_sinh >= 1900) AND (nam_sinh <= 2100)))),
    CONSTRAINT hngh_so_cccd_chk CHECK (((so_cccd IS NULL) OR (so_cccd ~ '^([0-9]{9}|[0-9]{12})$'::text))),
    CONSTRAINT hngh_so_nhan_khau_chk CHECK (((so_nhan_khau IS NULL) OR ((so_nhan_khau >= 0) AND (so_nhan_khau <= 100)))),
    CONSTRAINT hngh_thong_tin_ho_ngheo_doi_tuong_check CHECK (((doi_tuong IS NULL) OR (doi_tuong = ANY (ARRAY['Hộ nghèo'::text, 'Cận nghèo'::text, 'Khó khăn'::text, 'Trẻ mồ côi'::text, 'Khuyết tật'::text, 'Nạn nhân CĐDC'::text])))),
    CONSTRAINT hngh_thong_tin_ho_ngheo_ton_giao_check CHECK ((ton_giao = ANY (ARRAY['Có'::text, 'Không'::text]))),
    CONSTRAINT hngh_thong_tin_ho_ngheo_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang khó khăn'::text, 'Hết khó khăn'::text]))),
    CONSTRAINT hngh_tinh_trang_dat_chk CHECK (((tinh_trang_dat IS NULL) OR (tinh_trang_dat = ANY (ARRAY['Có GCN QSDĐ'::text, 'Chưa có GCN QSDĐ'::text])))),
    CONSTRAINT hngh_tinh_trang_viec_lam_chk CHECK (((tinh_trang_viec_lam IS NULL) OR (tinh_trang_viec_lam = ANY (ARRAY['Có việc làm'::text, 'Không có việc làm'::text, 'Đang đi học'::text]))))
);


--
-- Name: TABLE hngh_thong_tin_ho_ngheo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hngh_thong_tin_ho_ngheo IS 'Thông tin hộ nghèo — mỗi dòng một hộ; các khoản hỗ trợ ở bảng con hngh_ho_tro_ct.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.so_cccd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.so_cccd IS 'Số căn cước người đại diện hộ. Để trống được; đã nhập thì không trùng hộ khác.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.dan_toc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.dan_toc_id IS 'FK mttq_thiet_lap, bắt buộc trỏ dòng có loai = ''dan_toc'' (trigger kiểm).';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.ngay_cap_nhat_trang_thai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.ngay_cap_nhat_trang_thai IS 'Thời gian trạng thái — máy chủ gán, form không có ô nhập.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.gioi_tinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.gioi_tinh IS 'Giới tính chủ hộ: Nam / Nữ.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.nam_sinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.nam_sinh IS 'Năm sinh chủ hộ.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.ngay_cap_cccd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.ngay_cap_cccd IS 'Ngày cấp căn cước — in ở biên bản bàn giao.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.noi_cap_cccd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.noi_cap_cccd IS 'Nơi cấp căn cước — in ở biên bản bàn giao.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.ho_ten_vo_chong; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.ho_ten_vo_chong IS 'Họ tên vợ hoặc chồng của chủ hộ.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.so_nhan_khau; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.so_nhan_khau IS 'Số lượng nhân khẩu của hộ.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.nghe_nghiep; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.nghe_nghiep IS 'Nghề nghiệp chủ hộ.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.trinh_do_hoc_van; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.trinh_do_hoc_van IS 'Trình độ học vấn chủ hộ.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.tinh_trang_viec_lam; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.tinh_trang_viec_lam IS 'Có việc làm / Không có việc làm / Đang đi học.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.doi_tuong_uu_tien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.doi_tuong_uu_tien IS 'Đối tượng ưu tiên (người có công, dân tộc thiểu số…), gõ tự do.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.tinh_trang_dat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.tinh_trang_dat IS 'Tình trạng đất ở: Có / Chưa có giấy chứng nhận quyền sử dụng đất.';


--
-- Name: COLUMN hngh_thong_tin_ho_ngheo.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hngh_thong_tin_ho_ngheo.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: CONSTRAINT hngh_so_cccd_chk ON hngh_thong_tin_ho_ngheo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT hngh_so_cccd_chk ON public.hngh_thong_tin_ho_ngheo IS 'Số giấy tờ: để trống, CCCD 12 chữ số hoặc CMND cũ 9 chữ số (sau khi trigger bóc khoảng trắng). Bản sao ở client: thong-tin-ho-ngheo/utils/so-cccd.ts.';


--
-- Name: hngh_thong_tin_ho_ngheo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.hngh_thong_tin_ho_ngheo ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.hngh_thong_tin_ho_ngheo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_danh_muc_hang_hoa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kho_danh_muc_hang_hoa (
    id bigint NOT NULL,
    ten_danh_muc text NOT NULL,
    mo_ta text,
    thu_tu integer DEFAULT 0 NOT NULL,
    trang_thai text DEFAULT 'Đang hoạt động'::text NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    id_nguoi_tao bigint,
    id_nguoi_cap_nhat bigint,
    CONSTRAINT kho_danh_muc_hang_hoa_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang hoạt động'::text, 'Ngừng hoạt động'::text])))
);


--
-- Name: COLUMN kho_danh_muc_hang_hoa.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_danh_muc_hang_hoa.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: kho_danh_muc_hang_hoa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kho_danh_muc_hang_hoa ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kho_danh_muc_hang_hoa_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_danh_sach_hang_hoa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kho_danh_sach_hang_hoa (
    id bigint NOT NULL,
    id_danh_muc bigint NOT NULL,
    ten_hang_hoa text NOT NULL,
    don_vi_tinh text NOT NULL,
    mo_ta text,
    quy_cach text,
    thu_tu integer DEFAULT 0 NOT NULL,
    trang_thai text DEFAULT 'Đang hoạt động'::text NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    id_nguoi_tao bigint,
    id_nguoi_cap_nhat bigint,
    CONSTRAINT kho_danh_sach_hang_hoa_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang hoạt động'::text, 'Ngừng hoạt động'::text])))
);


--
-- Name: COLUMN kho_danh_sach_hang_hoa.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_danh_sach_hang_hoa.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: kho_danh_sach_hang_hoa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kho_danh_sach_hang_hoa ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kho_danh_sach_hang_hoa_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_danh_sach_kho; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kho_danh_sach_kho (
    id bigint NOT NULL,
    ten_kho text NOT NULL,
    don_vi_id bigint,
    mo_ta text,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    tt integer NOT NULL,
    id_nguoi_tao bigint,
    id_nguoi_cap_nhat bigint
);


--
-- Name: COLUMN kho_danh_sach_kho.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_danh_sach_kho.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: kho_danh_sach_kho_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kho_danh_sach_kho ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kho_danh_sach_kho_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_danh_sach_kho_tt_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kho_danh_sach_kho_tt_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kho_danh_sach_kho_tt_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kho_danh_sach_kho_tt_seq OWNED BY public.kho_danh_sach_kho.tt;


--
-- Name: kho_don_vi_cuu_tro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kho_don_vi_cuu_tro (
    id bigint NOT NULL,
    tt integer NOT NULL,
    loai text DEFAULT 'doanh_nghiep'::text NOT NULL,
    ten text NOT NULL,
    dia_chi text,
    dien_thoai text,
    email text,
    ghi_chu text,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    so_nguoi integer,
    nguoi_dai_dien text,
    chuc_vu text,
    don_vi_gioi_thieu_loai text DEFAULT 'tinh'::text NOT NULL,
    don_vi_gioi_thieu_id bigint,
    id_nguoi_tao bigint,
    id_nguoi_cap_nhat bigint,
    ma_so_thue text,
    CONSTRAINT kho_don_vi_cuu_tro_dv_gioi_thieu_chk CHECK ((((don_vi_gioi_thieu_loai = 'tinh'::text) AND (don_vi_gioi_thieu_id IS NULL)) OR ((don_vi_gioi_thieu_loai = 'xa_phuong'::text) AND (don_vi_gioi_thieu_id IS NOT NULL)))),
    CONSTRAINT kho_don_vi_cuu_tro_loai_chk CHECK ((loai = ANY (ARRAY['doanh_nghiep'::text, 'cau_lac_bo'::text, 'cq_cap_tinh'::text, 'ca_nhan'::text, 'co_so_ton_giao'::text, 'nhom_thien_nguyen'::text, 'don_vi_su_nghiep'::text, 'cq_cap_xa'::text]))),
    CONSTRAINT kho_don_vi_cuu_tro_so_nguoi_chk CHECK (((so_nguoi IS NULL) OR (so_nguoi >= 0)))
);


--
-- Name: COLUMN kho_don_vi_cuu_tro.so_nguoi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.so_nguoi IS 'Số thành viên của nhóm / câu lạc bộ / tập thể tài trợ. Để trống với cá nhân.';


--
-- Name: COLUMN kho_don_vi_cuu_tro.nguoi_dai_dien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.nguoi_dai_dien IS 'Họ tên người đại diện đứng ra liên hệ, ủng hộ.';


--
-- Name: COLUMN kho_don_vi_cuu_tro.chuc_vu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.chuc_vu IS 'Chức vụ của người đại diện.';


--
-- Name: COLUMN kho_don_vi_cuu_tro.don_vi_gioi_thieu_loai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.don_vi_gioi_thieu_loai IS 'Bắt buộc: ''tinh'' (MTTQ tỉnh — mặc định) | ''xa_phuong'' (kèm don_vi_gioi_thieu_id).';


--
-- Name: COLUMN kho_don_vi_cuu_tro.don_vi_gioi_thieu_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.don_vi_gioi_thieu_id IS 'FK var_ssn_xa_phuong — chỉ có giá trị khi don_vi_gioi_thieu_loai = ''xa_phuong''.';


--
-- Name: COLUMN kho_don_vi_cuu_tro.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: kho_don_vi_cuu_tro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kho_don_vi_cuu_tro ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kho_don_vi_cuu_tro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_don_vi_cuu_tro_tt_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kho_don_vi_cuu_tro_tt_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kho_don_vi_cuu_tro_tt_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kho_don_vi_cuu_tro_tt_seq OWNED BY public.kho_don_vi_cuu_tro.tt;


--
-- Name: kho_dot_cuu_tro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kho_dot_cuu_tro (
    id bigint NOT NULL,
    tt integer NOT NULL,
    ten text NOT NULL,
    mo_ta text,
    link text,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    id_nguoi_tao bigint,
    id_nguoi_cap_nhat bigint,
    loai text DEFAULT 'Cứu trợ'::text NOT NULL,
    don_vi_chu_tri_loai text DEFAULT 'tinh'::text NOT NULL,
    don_vi_chu_tri_id bigint,
    tu_ngay date,
    den_ngay date,
    tai_khoan_tiep_nhan text,
    ngan_hang text,
    trang_thai text DEFAULT 'Đang triển khai'::text NOT NULL,
    ngay_cap_nhat_trang_thai timestamp with time zone DEFAULT now() NOT NULL,
    tien_do text,
    CONSTRAINT kho_dot_cuu_tro_don_vi_chu_tri_chk CHECK ((((don_vi_chu_tri_loai = 'tinh'::text) AND (don_vi_chu_tri_id IS NULL)) OR ((don_vi_chu_tri_loai = 'xa_phuong'::text) AND (don_vi_chu_tri_id IS NOT NULL)))),
    CONSTRAINT kho_dot_cuu_tro_loai_chk CHECK ((loai = ANY (ARRAY['Nghĩa tình dòng Lam'::text, 'Cứu trợ'::text]))),
    CONSTRAINT kho_dot_cuu_tro_thoi_gian_chk CHECK (((tu_ngay IS NULL) OR (den_ngay IS NULL) OR (den_ngay >= tu_ngay))),
    CONSTRAINT kho_dot_cuu_tro_trang_thai_chk CHECK ((trang_thai = ANY (ARRAY['Đang triển khai'::text, 'Kết thúc'::text])))
);


--
-- Name: COLUMN kho_dot_cuu_tro.link; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_dot_cuu_tro.link IS 'Văn bản phát động (URL).';


--
-- Name: COLUMN kho_dot_cuu_tro.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_dot_cuu_tro.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: COLUMN kho_dot_cuu_tro.tien_do; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_dot_cuu_tro.tien_do IS 'Ghi chú tiến độ, nhập tay.';


--
-- Name: kho_dot_cuu_tro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kho_dot_cuu_tro ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kho_dot_cuu_tro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_dot_cuu_tro_tt_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kho_dot_cuu_tro_tt_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kho_dot_cuu_tro_tt_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kho_dot_cuu_tro_tt_seq OWNED BY public.kho_dot_cuu_tro.tt;


--
-- Name: kho_nhap_xuat_kho; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kho_nhap_xuat_kho (
    id bigint NOT NULL,
    tt integer NOT NULL,
    so_phieu text NOT NULL,
    loai_phieu text NOT NULL,
    ngay_phieu date DEFAULT CURRENT_DATE NOT NULL,
    kho_xuat_id bigint,
    kho_nhap_id bigint,
    don_vi_cuu_tro_id bigint,
    dot_cuu_tro_id bigint,
    ghi_chu text,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    nguoi_giao_nhan text,
    bo_phan text,
    chung_tu_goc text,
    id_nguoi_tao bigint,
    muc_dich text,
    ho_ngheo_id bigint,
    id_nguoi_cap_nhat bigint,
    CONSTRAINT chk_kho_nxk_consistency CHECK ((((loai_phieu = 'nhap_ngoai'::text) AND (don_vi_cuu_tro_id IS NOT NULL) AND (kho_nhap_id IS NOT NULL) AND (kho_xuat_id IS NULL)) OR ((loai_phieu = 'xuat_ngoai'::text) AND (kho_xuat_id IS NOT NULL) AND (dot_cuu_tro_id IS NOT NULL) AND (kho_nhap_id IS NULL) AND (don_vi_cuu_tro_id IS NULL)) OR ((loai_phieu = 'chuyen_kho'::text) AND (kho_xuat_id IS NOT NULL) AND (kho_nhap_id IS NOT NULL) AND (kho_xuat_id <> kho_nhap_id) AND (don_vi_cuu_tro_id IS NULL) AND (dot_cuu_tro_id IS NULL)))),
    CONSTRAINT kho_nhap_xuat_kho_loai_phieu_check CHECK ((loai_phieu = ANY (ARRAY['nhap_ngoai'::text, 'xuat_ngoai'::text, 'chuyen_kho'::text]))),
    CONSTRAINT kho_nhap_xuat_kho_muc_dich_len_chk CHECK (((muc_dich IS NULL) OR (char_length(muc_dich) <= 500))),
    CONSTRAINT kho_nxk_ho_ngheo_chk CHECK ((((ho_ngheo_id IS NULL) OR (loai_phieu = 'xuat_ngoai'::text)) AND ((loai_phieu <> 'xuat_ngoai'::text) OR (lower(regexp_replace(btrim(COALESCE(muc_dich, ''::text)), '\s+'::text, ' '::text, 'g'::text)) <> 'xuất cho hộ nghèo'::text) OR (ho_ngheo_id IS NOT NULL))))
);


--
-- Name: COLUMN kho_nhap_xuat_kho.id_nguoi_tao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_nhap_xuat_kho.id_nguoi_tao IS 'Nhân viên LẬP phiếu — do trigger gán từ phiên đăng nhập, không tin payload. Khác hẳn nguoi_giao_nhan (chuỗi tự do in lên phiếu).';


--
-- Name: COLUMN kho_nhap_xuat_kho.muc_dich; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_nhap_xuat_kho.muc_dich IS 'Mục đích nhập/xuất — chữ tự do, có gợi ý theo loại phiếu.';


--
-- Name: COLUMN kho_nhap_xuat_kho.ho_ngheo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_nhap_xuat_kho.ho_ngheo_id IS 'Đối tượng hỗ trợ nhận hàng — bắt buộc khi phiếu xuất có mục đích "Xuất cho hộ nghèo". RESTRICT: hộ đã nhận hàng thì không xoá mất vết.';


--
-- Name: COLUMN kho_nhap_xuat_kho.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kho_nhap_xuat_kho.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: kho_nhap_xuat_kho_ct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kho_nhap_xuat_kho_ct (
    id bigint NOT NULL,
    phieu_id bigint NOT NULL,
    hang_hoa_id bigint NOT NULL,
    don_vi_tinh text NOT NULL,
    so_luong numeric(18,3) NOT NULL,
    don_gia numeric(18,2) DEFAULT 0 NOT NULL,
    thanh_tien numeric(18,2) GENERATED ALWAYS AS ((so_luong * don_gia)) STORED,
    ghi_chu text,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kho_nhap_xuat_kho_ct_don_gia_check CHECK ((don_gia >= (0)::numeric)),
    CONSTRAINT kho_nhap_xuat_kho_ct_so_luong_check CHECK ((so_luong > (0)::numeric))
);


--
-- Name: kho_nhap_xuat_kho_ct_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kho_nhap_xuat_kho_ct ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kho_nhap_xuat_kho_ct_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_nhap_xuat_kho_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kho_nhap_xuat_kho ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kho_nhap_xuat_kho_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kho_nhap_xuat_kho_pc_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kho_nhap_xuat_kho_pc_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kho_nhap_xuat_kho_pn_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kho_nhap_xuat_kho_pn_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kho_nhap_xuat_kho_px_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kho_nhap_xuat_kho_px_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kho_nhap_xuat_kho_tt_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kho_nhap_xuat_kho_tt_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kho_nhap_xuat_kho_tt_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kho_nhap_xuat_kho_tt_seq OWNED BY public.kho_nhap_xuat_kho.tt;


--
-- Name: kho_ton_kho_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.kho_ton_kho_view WITH (security_invoker='true') AS
 WITH movements AS (
         SELECT m.kho_nhap_id AS kho_id,
            ct.hang_hoa_id,
            ct.so_luong AS qty
           FROM (public.kho_nhap_xuat_kho m
             JOIN public.kho_nhap_xuat_kho_ct ct ON ((ct.phieu_id = m.id)))
          WHERE (m.kho_nhap_id IS NOT NULL)
        UNION ALL
         SELECT m.kho_xuat_id AS kho_id,
            ct.hang_hoa_id,
            (- ct.so_luong) AS qty
           FROM (public.kho_nhap_xuat_kho m
             JOIN public.kho_nhap_xuat_kho_ct ct ON ((ct.phieu_id = m.id)))
          WHERE (m.kho_xuat_id IS NOT NULL)
        )
 SELECT kho_id,
    hang_hoa_id,
    (sum(qty))::numeric(18,3) AS ton_kho
   FROM movements
  WHERE (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (kho_id = ANY (( SELECT public.fn_kho_cua_toi() AS fn_kho_cua_toi)::bigint[])))
  GROUP BY kho_id, hang_hoa_id;


--
-- Name: ktnt_khen_thuong_nha_tai_tro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ktnt_khen_thuong_nha_tai_tro (
    id bigint NOT NULL,
    noi_dung_khen text NOT NULL,
    ngay_khen date NOT NULL,
    so_quyet_dinh text,
    cap_khen text DEFAULT 'Cấp tỉnh'::text NOT NULL,
    don_vi_khen text,
    xa_phuong_id bigint,
    nha_tai_tro_id bigint NOT NULL,
    nam_thanh_tich_tu integer,
    nam_thanh_tich_den integer,
    gia_tri_dong_gop_khac numeric(15,0),
    trang_thai text DEFAULT 'Chờ duyệt'::text NOT NULL,
    ngay_cap_nhat_trang_thai timestamp with time zone DEFAULT now() NOT NULL,
    nguoi_duyet_id bigint,
    tg_duyet timestamp with time zone,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    id_nguoi_cap_nhat bigint,
    CONSTRAINT ktnt_khen_thuong_nha_tai_tro_cap_khen_check CHECK ((cap_khen = ANY (ARRAY['Trung ương'::text, 'Cấp tỉnh'::text, 'Cấp xã'::text]))),
    CONSTRAINT ktnt_khen_thuong_nha_tai_tro_gia_tri_dong_gop_khac_check CHECK (((gia_tri_dong_gop_khac IS NULL) OR (gia_tri_dong_gop_khac >= (0)::numeric))),
    CONSTRAINT ktnt_khen_thuong_nha_tai_tro_nam_thanh_tich_den_check CHECK (((nam_thanh_tich_den >= 2000) AND (nam_thanh_tich_den <= 2100))),
    CONSTRAINT ktnt_khen_thuong_nha_tai_tro_nam_thanh_tich_tu_check CHECK (((nam_thanh_tich_tu >= 2000) AND (nam_thanh_tich_tu <= 2100))),
    CONSTRAINT ktnt_khen_thuong_nha_tai_tro_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Chờ duyệt'::text, 'Đã duyệt'::text, 'Không duyệt'::text, 'Hủy'::text]))),
    CONSTRAINT ktnt_ky_thanh_tich_chk CHECK (((nam_thanh_tich_tu IS NULL) OR (nam_thanh_tich_den IS NULL) OR (nam_thanh_tich_tu <= nam_thanh_tich_den))),
    CONSTRAINT ktnt_xa_phuong_theo_cap_chk CHECK ((((cap_khen = 'Cấp xã'::text) AND (xa_phuong_id IS NOT NULL)) OR ((cap_khen <> 'Cấp xã'::text) AND (xa_phuong_id IS NULL))))
);


--
-- Name: TABLE ktnt_khen_thuong_nha_tai_tro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ktnt_khen_thuong_nha_tai_tro IS 'Khen thưởng nhà tài trợ — mỗi dòng một quyết định khen; thành tích đọc từ vnn_chuong_trinh.';


--
-- Name: COLUMN ktnt_khen_thuong_nha_tai_tro.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ktnt_khen_thuong_nha_tai_tro.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: ktnt_khen_thuong_nha_tai_tro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ktnt_khen_thuong_nha_tai_tro ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ktnt_khen_thuong_nha_tai_tro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lich_su_trang_thai; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lich_su_trang_thai (
    id bigint NOT NULL,
    bang text NOT NULL,
    ban_ghi_id text NOT NULL,
    tu_trang_thai text,
    den_trang_thai text NOT NULL,
    ly_do text,
    nguoi_thuc_hien_id bigint,
    auth_user_id uuid,
    tg timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE lich_su_trang_thai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lich_su_trang_thai IS 'Vết mọi lần đổi trạng thái: từ đâu sang đâu, ai đổi, lúc nào, vì sao.';


--
-- Name: lich_su_trang_thai_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lich_su_trang_thai ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lich_su_trang_thai_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: luong_thiet_lap_bac_luong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luong_thiet_lap_bac_luong (
    id bigint NOT NULL,
    ngach_id bigint NOT NULL,
    ma_bac text NOT NULL,
    he_so numeric(10,4) NOT NULL,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT luong_thiet_lap_bac_luong_he_so_chk CHECK ((he_so > (0)::numeric)),
    CONSTRAINT luong_thiet_lap_bac_luong_ma_bac_chk CHECK ((ma_bac = ANY (ARRAY['B1'::text, 'B2'::text, 'B3'::text, 'B4'::text, 'B5'::text, 'B6'::text, 'B7'::text, 'B8'::text, 'B9'::text])))
);


--
-- Name: luong_thiet_lap_bac_luong_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.luong_thiet_lap_bac_luong ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.luong_thiet_lap_bac_luong_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: luong_thiet_lap_cau_hinh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luong_thiet_lap_cau_hinh (
    id bigint DEFAULT 1 NOT NULL,
    muc_luong_co_so numeric(14,2) DEFAULT 2340000 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT luong_thiet_lap_cau_hinh_muc_luong_co_so_check CHECK ((muc_luong_co_so > (0)::numeric)),
    CONSTRAINT luong_thiet_lap_cau_hinh_singleton_chk CHECK ((id = 1))
);


--
-- Name: luong_thiet_lap_ngach_luong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luong_thiet_lap_ngach_luong (
    id bigint NOT NULL,
    ma text,
    ten text NOT NULL,
    mo_ta text,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: luong_thiet_lap_ngach_luong_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.luong_thiet_lap_ngach_luong ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.luong_thiet_lap_ngach_luong_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_can_bo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_can_bo (
    id bigint NOT NULL,
    ho_ten text NOT NULL,
    ngay_sinh date,
    gioi_tinh text NOT NULL,
    dan_toc_id bigint,
    ton_giao text,
    dia_chi text,
    dang_vien boolean DEFAULT false NOT NULL,
    trinh_do_id bigint,
    ly_luan_chinh_tri_id bigint,
    dien_thoai text,
    chuc_vu_id bigint,
    ngay_tham_gia_to_chuc date,
    trang_thai_id bigint,
    ngay_nhap_trang_thai date,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    don_vi_id bigint,
    phong_ban_id bigint,
    van_hoa text,
    ngay_vao_dang date,
    que_quan text,
    noi_o_hien_nay text,
    cap_quan_ly text[] DEFAULT '{}'::text[] NOT NULL,
    to_chuc_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    CONSTRAINT mttq_can_bo_cap_quan_ly_check CHECK ((cap_quan_ly <@ ARRAY['Tỉnh'::text, 'Xã phường'::text])),
    CONSTRAINT mttq_can_bo_gioi_tinh_check CHECK ((gioi_tinh = ANY (ARRAY['Nam'::text, 'Nữ'::text, 'Khác'::text])))
);


--
-- Name: mttq_can_bo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_can_bo ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_can_bo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_diem_danh_uy_vien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_diem_danh_uy_vien (
    id bigint NOT NULL,
    ky_hop_id bigint NOT NULL,
    uy_vien_id bigint NOT NULL,
    trang_thai text NOT NULL,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mttq_diem_danh_uy_vien_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Có mặt'::text, 'Vắng mặt'::text])))
);


--
-- Name: mttq_diem_danh_uy_vien_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_diem_danh_uy_vien ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_diem_danh_uy_vien_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_khen_thuong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_khen_thuong (
    id bigint NOT NULL,
    so_qd text,
    ngay_khen_thuong date NOT NULL,
    don_vi_de_xuat text,
    ghi_chu text,
    trang_thai text DEFAULT 'Mới'::text NOT NULL,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    nguoi_duyet_id bigint,
    tg_duyet timestamp with time zone,
    noi_dung_khen text,
    CONSTRAINT chk_mttq_khen_thuong_so_qd_khong_rong CHECK (((so_qd IS NULL) OR ((btrim(so_qd) = so_qd) AND (so_qd <> ''::text)))),
    CONSTRAINT mttq_khen_thuong_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Mới'::text, 'Đang xử lý'::text, 'Đã ban hành'::text, 'Hủy'::text])))
);


--
-- Name: COLUMN mttq_khen_thuong.so_qd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_khen_thuong.so_qd IS 'Số / ký hiệu quyết định (vd 12/QĐ-MTTQ-BTT). NULL = chưa có số. Duy nhất khi có giá trị.';


--
-- Name: COLUMN mttq_khen_thuong.noi_dung_khen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_khen_thuong.noi_dung_khen IS 'Nội dung / lý do khen thưởng chung của cả quyết định. Tách khỏi so_qd tháng 8/2026 vì nhãn giao diện đặt sai.';


--
-- Name: mttq_khen_thuong_ct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_khen_thuong_ct (
    id bigint NOT NULL,
    id_khen_thuong bigint NOT NULL,
    can_bo_id bigint NOT NULL,
    hinh_thuc_khen text NOT NULL,
    danh_hieu text NOT NULL,
    noi_dung_khen text,
    ho_so_khen text,
    cap_khen_thuong text DEFAULT 'Xã'::text NOT NULL,
    CONSTRAINT mttq_khen_thuong_ct_cap_khen_thuong_check CHECK ((cap_khen_thuong = ANY (ARRAY['Tỉnh'::text, 'Trung ương'::text, 'Xã'::text]))),
    CONSTRAINT mttq_khen_thuong_ct_danh_hieu_check CHECK ((danh_hieu = ANY (ARRAY['Giấy khen'::text, 'Bằng khen'::text]))),
    CONSTRAINT mttq_khen_thuong_ct_hinh_thuc_khen_check CHECK ((hinh_thuc_khen = ANY (ARRAY['Thường xuyên'::text, 'Chuyên đề'::text])))
);


--
-- Name: mttq_khen_thuong_ct_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_khen_thuong_ct ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_khen_thuong_ct_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_khen_thuong_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_khen_thuong ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_khen_thuong_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_ky_hop; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_ky_hop (
    id bigint NOT NULL,
    nhiem_ky_id bigint NOT NULL,
    don_vi_id bigint,
    ky_thu text NOT NULL,
    ngay_hop date,
    noi_dung_ky_hop text,
    tai_lieu_hop text,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    da_khoa boolean DEFAULT false NOT NULL,
    tg_khoa timestamp with time zone,
    nguoi_khoa_id bigint
);


--
-- Name: COLUMN mttq_ky_hop.da_khoa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_ky_hop.da_khoa IS 'Đã khoá sổ kỳ họp: chặn ghi vào chính kỳ họp và bảng điểm danh của nó.';


--
-- Name: COLUMN mttq_ky_hop.tg_khoa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_ky_hop.tg_khoa IS 'Thời điểm khoá sổ — máy chủ gán.';


--
-- Name: COLUMN mttq_ky_hop.nguoi_khoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_ky_hop.nguoi_khoa_id IS 'Người khoá sổ — máy chủ gán từ phiên đăng nhập.';


--
-- Name: mttq_ky_hop_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_ky_hop ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_ky_hop_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_lop_tap_huan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_lop_tap_huan (
    id bigint NOT NULL,
    ten_lop_tap_huan text NOT NULL,
    nam_tap_huan integer NOT NULL,
    cap_tap_huan text NOT NULL,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    don_vi_id bigint,
    to_chuc_id bigint,
    CONSTRAINT mttq_lop_tap_huan_cap_tap_huan_check CHECK ((cap_tap_huan = ANY (ARRAY['TW'::text, 'Cấp tỉnh'::text, 'Cấp xã'::text]))),
    CONSTRAINT mttq_lop_tap_huan_nam_tap_huan_check CHECK (((nam_tap_huan >= 2000) AND (nam_tap_huan <= 2100)))
);


--
-- Name: mttq_lop_tap_huan_ct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_lop_tap_huan_ct (
    id bigint NOT NULL,
    id_lop_tap_huan bigint NOT NULL,
    can_bo_id bigint NOT NULL,
    thuoc_dien text NOT NULL,
    CONSTRAINT mttq_lop_tap_huan_ct_thuoc_dien_check CHECK ((thuoc_dien = ANY (ARRAY['Biên chế'::text, 'Ngoài biên chế'::text])))
);


--
-- Name: mttq_lop_tap_huan_ct_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_lop_tap_huan_ct ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_lop_tap_huan_ct_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_lop_tap_huan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_lop_tap_huan ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_lop_tap_huan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_nhiem_ky; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_nhiem_ky (
    id bigint NOT NULL,
    ten_nhiem_ky text NOT NULL,
    tu_nam integer,
    den_nam integer,
    thong_tin text,
    sl_dau_nhiem_ky integer DEFAULT 0 NOT NULL,
    sl_dang_tham_gia integer DEFAULT 0 NOT NULL,
    sl_thoi_tham_gia integer DEFAULT 0 NOT NULL,
    sl_can_bo_sung integer DEFAULT 0 NOT NULL,
    sl_thieu integer DEFAULT 0 NOT NULL,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    da_khoa boolean DEFAULT false NOT NULL,
    tg_khoa timestamp with time zone,
    nguoi_khoa_id bigint,
    CONSTRAINT mttq_nhiem_ky_den_nam_check CHECK (((den_nam IS NULL) OR ((den_nam >= 2000) AND (den_nam <= 2100)))),
    CONSTRAINT mttq_nhiem_ky_tu_den_nam_chk CHECK (((tu_nam IS NULL) OR (den_nam IS NULL) OR (tu_nam <= den_nam))),
    CONSTRAINT mttq_nhiem_ky_tu_nam_check CHECK (((tu_nam IS NULL) OR ((tu_nam >= 2000) AND (tu_nam <= 2100))))
);


--
-- Name: COLUMN mttq_nhiem_ky.da_khoa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_nhiem_ky.da_khoa IS 'Đã khoá sổ nhiệm kỳ: chặn mọi thao tác ghi vào uỷ viên, kỳ họp và điểm danh thuộc nhiệm kỳ.';


--
-- Name: COLUMN mttq_nhiem_ky.tg_khoa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_nhiem_ky.tg_khoa IS 'Thời điểm khoá sổ — máy chủ gán.';


--
-- Name: COLUMN mttq_nhiem_ky.nguoi_khoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mttq_nhiem_ky.nguoi_khoa_id IS 'Người khoá sổ — máy chủ gán từ phiên đăng nhập.';


--
-- Name: mttq_nhiem_ky_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_nhiem_ky ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_nhiem_ky_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_tang_luong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_tang_luong (
    id bigint NOT NULL,
    can_bo_id bigint NOT NULL,
    ngay_nang_luong date NOT NULL,
    loai_ky text NOT NULL,
    ngach_luong_id_cu bigint,
    bac_luong_id_cu bigint,
    ngach_luong_id_moi bigint NOT NULL,
    bac_luong_id_moi bigint NOT NULL,
    so_thang_rut_ngan smallint,
    ngay_den_han_goc date,
    ghi_chu text,
    file_quyet_dinh text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    luong bigint DEFAULT 0 NOT NULL,
    CONSTRAINT mttq_tang_luong_loai_ky_chk CHECK ((loai_ky = ANY (ARRAY['dung_han'::text, 'truoc_han_6'::text, 'truoc_han_9'::text, 'truoc_han_12'::text]))),
    CONSTRAINT mttq_tang_luong_luong_chk CHECK ((luong >= 0)),
    CONSTRAINT mttq_tang_luong_so_thang_chk CHECK (((so_thang_rut_ngan IS NULL) OR (so_thang_rut_ngan = ANY (ARRAY[6, 9, 12])))),
    CONSTRAINT mttq_tang_luong_truoc_han_thang_chk CHECK ((((loai_ky = 'dung_han'::text) AND (so_thang_rut_ngan IS NULL)) OR ((loai_ky = 'truoc_han_6'::text) AND (so_thang_rut_ngan = 6)) OR ((loai_ky = 'truoc_han_9'::text) AND (so_thang_rut_ngan = 9)) OR ((loai_ky = 'truoc_han_12'::text) AND (so_thang_rut_ngan = 12))))
);


--
-- Name: mttq_tang_luong_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_tang_luong ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_tang_luong_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_thiet_lap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_thiet_lap (
    id bigint NOT NULL,
    loai text NOT NULL,
    ten text NOT NULL,
    mo_ta text,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mttq_thiet_lap_loai_check CHECK ((loai = ANY (ARRAY['cap_quan_ly'::text, 'to_chuc'::text, 'dan_toc'::text, 'trinh_do'::text, 'ly_luan_chinh_tri'::text, 'trang_thai'::text])))
);


--
-- Name: mttq_thiet_lap_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_thiet_lap ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_thiet_lap_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mttq_uy_vien_uy_ban; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mttq_uy_vien_uy_ban (
    id bigint NOT NULL,
    ma_uv text,
    nhiem_ky_id bigint NOT NULL,
    don_vi_id bigint,
    trang_thai_tham_gia text,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    can_bo_id bigint NOT NULL
);


--
-- Name: mttq_uy_vien_uy_ban_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mttq_uy_vien_uy_ban ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mttq_uy_vien_uy_ban_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: nddk_nha_dai_doan_ket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nddk_nha_dai_doan_ket (
    id bigint NOT NULL,
    noi_dung_ho_tro text NOT NULL,
    nam integer NOT NULL,
    nguon text NOT NULL,
    nguon_ho_tro text NOT NULL,
    ho_ten_chu_ho text NOT NULL,
    xa_phuong_id bigint,
    khoi_xom text,
    doi_tuong text,
    loai_hinh_ho_tro text NOT NULL,
    so_tien numeric(15,0) NOT NULL,
    trang_thai text DEFAULT 'Đang khảo sát'::text NOT NULL,
    ngay_cap_nhat_trang_thai timestamp with time zone DEFAULT now() NOT NULL,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    ho_ngheo_id bigint,
    ngay_khao_sat date,
    hien_trang_nha text,
    hoan_canh_gia_dinh text,
    nhu_cau_ho_tro text,
    ghi_chu_khao_sat text,
    ngay_kiem_tra_hoan_thanh date,
    thanh_phan_kiem_tra jsonb,
    dien_tich_san numeric(10,2),
    phan_nen text,
    phan_mai text,
    phan_khung_tuong text,
    tong_gia_tri numeric(15,0),
    nguon_khac jsonb,
    ngay_ban_giao date,
    dia_diem_ban_giao text,
    ban_giao_ho_ten text,
    ban_giao_chuc_vu text,
    lam_chung_ho_ten text,
    lam_chung_chuc_vu text,
    so_quyet_dinh text,
    ngay_quyet_dinh date,
    id_nguoi_cap_nhat bigint,
    nha_tai_tro_id bigint,
    CONSTRAINT nddk_dien_tich_san_chk CHECK (((dien_tich_san IS NULL) OR (dien_tich_san >= (0)::numeric))),
    CONSTRAINT nddk_nguon_khac_chk CHECK (((nguon_khac IS NULL) OR ((jsonb_typeof(nguon_khac) = 'array'::text) AND (jsonb_array_length(nguon_khac) <= 3)))),
    CONSTRAINT nddk_nha_dai_doan_ket_doi_tuong_check CHECK (((doi_tuong IS NULL) OR (doi_tuong = ANY (ARRAY['Hộ nghèo'::text, 'Cận nghèo'::text, 'Khó khăn'::text, 'Trẻ mồ côi'::text, 'Khuyết tật'::text, 'Nạn nhân CĐDC'::text])))),
    CONSTRAINT nddk_nha_dai_doan_ket_loai_hinh_ho_tro_check CHECK ((loai_hinh_ho_tro = ANY (ARRAY['Xây mới'::text, 'Sửa chữa'::text]))),
    CONSTRAINT nddk_nha_dai_doan_ket_nam_check CHECK (((nam >= 2000) AND (nam <= 2100))),
    CONSTRAINT nddk_nha_dai_doan_ket_nguon_check CHECK ((nguon = ANY (ARRAY['Vì người nghèo'::text, 'Cứu trợ'::text, 'Ngân sách'::text, 'Giới thiệu'::text]))),
    CONSTRAINT nddk_nha_dai_doan_ket_nguon_ho_tro_check CHECK ((nguon_ho_tro = ANY (ARRAY['Cấp tỉnh'::text, 'Cấp xã'::text, 'Ủng hộ trực tiếp'::text, 'Trung ương'::text]))),
    CONSTRAINT nddk_nha_dai_doan_ket_so_tien_check CHECK (((so_tien IS NULL) OR (so_tien >= (0)::numeric))),
    CONSTRAINT nddk_nha_dai_doan_ket_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang khảo sát'::text, 'Đang thực hiện'::text, 'Đã bàn giao'::text, 'Tạm dừng'::text]))),
    CONSTRAINT nddk_nha_tai_tro_theo_nguon_chk CHECK (((nha_tai_tro_id IS NULL) OR ((nguon = 'Giới thiệu'::text) AND (nguon_ho_tro = 'Ủng hộ trực tiếp'::text)))),
    CONSTRAINT nddk_nhu_cau_ho_tro_chk CHECK (((nhu_cau_ho_tro IS NULL) OR (nhu_cau_ho_tro = ANY (ARRAY['Xây dựng nhà lắp ghép'::text, 'Gia đình tự xây mới'::text, 'Gia đình tự sửa chữa'::text])))),
    CONSTRAINT nddk_thanh_phan_kiem_tra_chk CHECK (((thanh_phan_kiem_tra IS NULL) OR ((jsonb_typeof(thanh_phan_kiem_tra) = 'object'::text) AND ((NOT (thanh_phan_kiem_tra ? 'thon'::text)) OR ((jsonb_typeof((thanh_phan_kiem_tra -> 'thon'::text)) = 'array'::text) AND (jsonb_array_length((thanh_phan_kiem_tra -> 'thon'::text)) <= 3)))))),
    CONSTRAINT nddk_tong_gia_tri_chk CHECK (((tong_gia_tri IS NULL) OR (tong_gia_tri >= (0)::numeric)))
);


--
-- Name: TABLE nddk_nha_dai_doan_ket; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nddk_nha_dai_doan_ket IS 'Nhà đại đoàn kết — mỗi dòng một căn nhà được hỗ trợ xây mới hoặc sửa chữa.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ho_ngheo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ho_ngheo_id IS 'Hộ nghèo được hỗ trợ căn nhà này (tuỳ chọn) — FK hngh_thong_tin_ho_ngheo.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ngay_khao_sat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_khao_sat IS 'Ngày lập phiếu khảo sát.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.hien_trang_nha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.hien_trang_nha IS 'Hiện trạng nhà ở lúc khảo sát.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.hoan_canh_gia_dinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.hoan_canh_gia_dinh IS 'Hoàn cảnh gia đình lúc khảo sát.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.nhu_cau_ho_tro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.nhu_cau_ho_tro IS 'Nhu cầu cần hỗ trợ (phiếu khảo sát).';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ghi_chu_khao_sat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ghi_chu_khao_sat IS 'Mục "Ghi chú" của phiếu khảo sát — khác ghi_chu (lý do đổi trạng thái).';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ngay_kiem_tra_hoan_thanh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_kiem_tra_hoan_thanh IS 'Ngày lập biên bản kiểm tra hoàn thành.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.thanh_phan_kiem_tra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.thanh_phan_kiem_tra IS 'Thành phần kiểm tra: đại diện BCĐ, UBND, MTTQ xã và tối đa 3 đại diện thôn.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.dien_tich_san; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.dien_tich_san IS 'Diện tích sàn đã hoàn thành (m2).';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.phan_nen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.phan_nen IS 'Mô tả phần nền.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.phan_mai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.phan_mai IS 'Mô tả phần mái.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.phan_khung_tuong; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.phan_khung_tuong IS 'Mô tả phần khung, tường bao.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.tong_gia_tri; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.tong_gia_tri IS 'Tổng giá trị xây dựng/sửa chữa (VND), gồm cả phần Chương trình hỗ trợ (so_tien).';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.nguon_khac; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.nguon_khac IS 'Các nguồn khác ngoài Chương trình: [{ten, so_tien}], tối đa 3.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ngay_ban_giao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_ban_giao IS 'Ngày lập biên bản bàn giao tiền.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.dia_diem_ban_giao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.dia_diem_ban_giao IS 'Địa điểm bàn giao.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ban_giao_ho_ten; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ban_giao_ho_ten IS 'Đại diện bên giao tiền (Ban Vận động Quỹ Vì người nghèo).';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ban_giao_chuc_vu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ban_giao_chuc_vu IS 'Chức vụ đại diện bên giao tiền.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.lam_chung_ho_ten; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.lam_chung_ho_ten IS 'Bên làm chứng (cán bộ khối, xóm, thôn, bản).';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.lam_chung_chuc_vu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.lam_chung_chuc_vu IS 'Chức vụ bên làm chứng.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.so_quyet_dinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.so_quyet_dinh IS 'Số quyết định hỗ trợ của Ban Vận động (vd 12/QĐ-BVĐ).';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.ngay_quyet_dinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ngay_quyet_dinh IS 'Ngày quyết định hỗ trợ.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_nddk_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: COLUMN nddk_nha_dai_doan_ket.nha_tai_tro_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.nha_tai_tro_id IS 'Nhà tài trợ (kho_don_vi_cuu_tro). Chỉ có khi nguon = ''Giới thiệu'' và nguon_ho_tro = ''Ủng hộ trực tiếp'' (CHECK nddk_nha_tai_tro_theo_nguon_chk).';


--
-- Name: nddk_nha_dai_doan_ket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.nddk_nha_dai_doan_ket ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.nddk_nha_dai_doan_ket_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pbxh_thiet_lap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pbxh_thiet_lap (
    id bigint NOT NULL,
    loai text NOT NULL,
    ten text NOT NULL,
    mo_ta text,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pbxh_thiet_lap_loai_check CHECK ((loai = ANY (ARRAY['doi_tuong'::text, 'don_vi_chu_tri'::text, 'hinh_thuc'::text])))
);


--
-- Name: pbxh_thiet_lap_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pbxh_thiet_lap ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pbxh_thiet_lap_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi (
    id bigint NOT NULL,
    cap_thuc_hien text NOT NULL,
    loai_hinh text NOT NULL,
    noi_dung text NOT NULL,
    doi_tuong_id bigint,
    hinh_thuc_id bigint,
    ngay_bat_dau date,
    ngay_ket_thuc date,
    mo_ta_thoi_gian text,
    tinh_trang text DEFAULT 'Đã lập kế hoạch'::text NOT NULL,
    don_vi_chu_tri_id bigint,
    phong_ban_tham_muu_id bigint,
    don_vi_thuc_hien_id bigint,
    ket_qua_kien_nghi text,
    phan_tram_hoan_thanh smallint DEFAULT 0 NOT NULL,
    link_ket_qua text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    so_lan_hoan_thanh integer DEFAULT 0 NOT NULL,
    so_lan_khao_sat integer DEFAULT 0 NOT NULL,
    CONSTRAINT chk_pbxh_so_lan_hoan_thanh CHECK (((so_lan_khao_sat IS NULL) OR (so_lan_hoan_thanh IS NULL) OR (so_lan_khao_sat = 0) OR (so_lan_hoan_thanh <= so_lan_khao_sat))),
    CONSTRAINT chk_pbxh_thuc_hien_ngay CHECK (((ngay_bat_dau IS NULL) OR (ngay_ket_thuc IS NULL) OR (ngay_ket_thuc >= ngay_bat_dau))),
    CONSTRAINT pbxh_thuc_hien_phan_bien_xa_hoi_cap_thuc_hien_check CHECK ((cap_thuc_hien = ANY (ARRAY['Cấp tỉnh'::text, 'Cấp xã'::text]))),
    CONSTRAINT pbxh_thuc_hien_phan_bien_xa_hoi_loai_hinh_check CHECK ((loai_hinh = ANY (ARRAY['Giám sát'::text, 'Phản biện'::text, 'Kiểm tra'::text, 'Giám sát cộng đồng'::text]))),
    CONSTRAINT pbxh_thuc_hien_phan_bien_xa_hoi_phan_tram_hoan_thanh_check CHECK (((phan_tram_hoan_thanh >= 0) AND (phan_tram_hoan_thanh <= 100))),
    CONSTRAINT pbxh_thuc_hien_phan_bien_xa_hoi_so_lan_hoan_thanh_check CHECK ((so_lan_hoan_thanh >= 0)),
    CONSTRAINT pbxh_thuc_hien_phan_bien_xa_hoi_so_lan_khao_sat_check CHECK ((so_lan_khao_sat >= 0)),
    CONSTRAINT pbxh_thuc_hien_phan_bien_xa_hoi_tinh_trang_check CHECK ((tinh_trang = ANY (ARRAY['Đang thực hiện'::text, 'Đã lập kế hoạch'::text, 'Đã hoàn thành'::text, 'Dự kiến'::text, 'Tạm dừng'::text])))
);


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pbxh_thuc_hien_phan_bien_xa_hoi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: thong_bao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thong_bao (
    id bigint NOT NULL,
    nhan_vien_id bigint NOT NULL,
    loai text NOT NULL,
    muc_do text DEFAULT 'tin'::text NOT NULL,
    tieu_de text NOT NULL,
    noi_dung text DEFAULT ''::text NOT NULL,
    duong_dan text,
    khoa_chong_trung text NOT NULL,
    da_doc boolean DEFAULT false NOT NULL,
    tg_doc timestamp with time zone,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT thong_bao_loai_check CHECK ((loai = ANY (ARRAY['cong_viec_qua_han'::text, 'cong_viec_sap_den_han'::text, 'tang_luong_sap_den_han'::text]))),
    CONSTRAINT thong_bao_muc_do_check CHECK ((muc_do = ANY (ARRAY['canh_bao'::text, 'sap_toi'::text, 'tin'::text]))),
    CONSTRAINT thong_bao_tieu_de_khong_rong CHECK ((btrim(tieu_de) <> ''::text))
);

ALTER TABLE ONLY public.thong_bao FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE thong_bao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.thong_bao IS 'Hộp thông báo nhắc việc của từng người. RLS: chỉ chủ sở hữu đọc/đánh dấu đã đọc.';


--
-- Name: COLUMN thong_bao.khoa_chong_trung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.thong_bao.khoa_chong_trung IS 'Khoá duy nhất theo người nhận — chặn nhắc trùng khi hàm sinh chạy lại trong ngày.';


--
-- Name: thong_bao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.thong_bao ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.thong_bao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tn_tiep_nhan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tn_tiep_nhan (
    id bigint NOT NULL,
    so_phieu text NOT NULL,
    ngay_tiep_nhan date DEFAULT CURRENT_DATE NOT NULL,
    nha_tai_tro_id bigint NOT NULL,
    chuong_trinh_id bigint NOT NULL,
    hinh_thuc text,
    so_tien numeric(15,0) DEFAULT 0 NOT NULL,
    giay_to_co_gia_mo_ta text,
    giay_to_co_gia_gia_tri numeric(15,0),
    hien_vat_khac_mo_ta text,
    hien_vat_khac_gia_tri numeric(15,0),
    muc_dich text[] DEFAULT ARRAY[]::text[] NOT NULL,
    dia_diem_lap text,
    phu_luc jsonb,
    trang_thai text DEFAULT 'Đăng ký'::text NOT NULL,
    ngay_cap_nhat_trang_thai timestamp with time zone DEFAULT now() NOT NULL,
    ghi_chu text,
    id_nguoi_tao bigint,
    id_nguoi_cap_nhat bigint,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tn_gtcg_chk CHECK (((giay_to_co_gia_gia_tri IS NULL) OR (giay_to_co_gia_gia_tri >= (0)::numeric))),
    CONSTRAINT tn_hinh_thuc_chk CHECK (((hinh_thuc IS NULL) OR (hinh_thuc = ANY (ARRAY['Chuyển khoản'::text, 'Tiền mặt'::text])))),
    CONSTRAINT tn_hinh_thuc_theo_tien_chk CHECK (((so_tien > (0)::numeric) = (hinh_thuc IS NOT NULL))),
    CONSTRAINT tn_hv_khac_chk CHECK (((hien_vat_khac_gia_tri IS NULL) OR (hien_vat_khac_gia_tri >= (0)::numeric))),
    CONSTRAINT tn_muc_dich_chk CHECK ((muc_dich <@ ARRAY['giao_duc_y_te_van_hoa'::text, 'thien_tai_dich_benh'::text, 'nha_dai_doan_ket'::text, 'dia_ban_dbkk'::text, 'khoa_hoc_cong_nghe'::text])),
    CONSTRAINT tn_phu_luc_chk CHECK (((phu_luc IS NULL) OR ((jsonb_typeof(phu_luc) = 'array'::text) AND (jsonb_array_length(phu_luc) <= 30)))),
    CONSTRAINT tn_so_tien_chk CHECK ((so_tien >= (0)::numeric)),
    CONSTRAINT tn_trang_thai_chk CHECK ((trang_thai = ANY (ARRAY['Đăng ký'::text, 'Đã bàn giao'::text])))
);


--
-- Name: TABLE tn_tiep_nhan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tn_tiep_nhan IS 'Khoản tài trợ tiếp nhận (module Tiếp nhận). Giá trị = so_tien + giay_to_co_gia_gia_tri + hien_vat_khac_gia_tri + Σ phiếu nhập kho gắn qua tn_tiep_nhan_phieu_kho.';


--
-- Name: tn_tiep_nhan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tn_tiep_nhan ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tn_tiep_nhan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tn_tiep_nhan_phieu_kho; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tn_tiep_nhan_phieu_kho (
    tiep_nhan_id bigint NOT NULL,
    phieu_id bigint NOT NULL
);


--
-- Name: TABLE tn_tiep_nhan_phieu_kho; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tn_tiep_nhan_phieu_kho IS 'Phiếu "Nhập từ ngoài" thuộc khoản tiếp nhận. Phiếu phải cùng nhà tài trợ; mỗi phiếu chỉ gắn một lần.';


--
-- Name: tn_tiep_nhan_so_phieu_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tn_tiep_nhan_so_phieu_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: var_nhan_vien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.var_nhan_vien (
    id bigint NOT NULL,
    ten_tai_khoan text NOT NULL,
    ho_va_ten text NOT NULL,
    hinh_anh text,
    id_phong_ban bigint,
    id_bo_phan bigint,
    id_chuc_vu bigint,
    trang_thai text DEFAULT 'Hoạt động'::text NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    don_vi_id bigint,
    cap_quan_ly text[] DEFAULT '{}'::text[] NOT NULL,
    to_chuc_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    CONSTRAINT var_nhan_vien_cap_quan_ly_check CHECK ((cap_quan_ly <@ ARRAY['Tỉnh'::text, 'Xã phường'::text])),
    CONSTRAINT var_nhan_vien_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Hoạt động'::text, 'Khóa'::text])))
);


--
-- Name: v_cong_viec_bao_cao; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cong_viec_bao_cao WITH (security_invoker='true') AS
 SELECT cv.id,
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
    tr.ho_va_ten AS ho_va_ten_trach_nhiem,
    tr.ten_tai_khoan AS ten_tai_khoan_trach_nhiem,
    ng.ho_va_ten AS ho_va_ten_nguoi_tao,
    ng.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
        CASE
            WHEN (cv.trang_thai = ANY (ARRAY['Hủy'::text, 'Hoàn thành'::text])) THEN NULL::integer
            WHEN (cv.thoi_han IS NULL) THEN NULL::integer
            ELSE (cv.thoi_han - CURRENT_DATE)
        END AS days_to_deadline
   FROM ((public.cong_viec_danh_sach cv
     LEFT JOIN public.var_nhan_vien tr ON ((tr.id = cv.id_trach_nhiem)))
     LEFT JOIN public.var_nhan_vien ng ON ((ng.id = cv.id_nguoi_tao)));


--
-- Name: v_diem_danh_ky_hop_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_diem_danh_ky_hop_summary WITH (security_invoker='true') AS
 SELECT kh.id AS ky_hop_id,
    kh.nhiem_ky_id,
    kh.ky_thu,
    kh.ngay_hop,
    count(dd.id) AS tong_diem_danh,
    count(dd.id) FILTER (WHERE (dd.trang_thai = 'Có mặt'::text)) AS co_mat,
    count(dd.id) FILTER (WHERE (dd.trang_thai = 'Vắng mặt'::text)) AS vang_mat,
    COALESCE(uv.cnt, (0)::bigint) AS sl_uy_vien_nhiem_ky,
    GREATEST((COALESCE(uv.cnt, (0)::bigint) - count(dd.id)), (0)::bigint) AS chua_diem_danh
   FROM ((public.mttq_ky_hop kh
     LEFT JOIN public.mttq_diem_danh_uy_vien dd ON (((dd.ky_hop_id = kh.id) AND (EXISTS ( SELECT 1
           FROM public.mttq_uy_vien_uy_ban u2
          WHERE ((u2.id = dd.uy_vien_id) AND
                CASE
                    WHEN (kh.don_vi_id IS NULL) THEN (u2.don_vi_id IS NULL)
                    ELSE (u2.don_vi_id = kh.don_vi_id)
                END))))))
     LEFT JOIN LATERAL ( SELECT count(*) AS cnt
           FROM public.mttq_uy_vien_uy_ban u
          WHERE ((u.nhiem_ky_id = kh.nhiem_ky_id) AND
                CASE
                    WHEN (kh.don_vi_id IS NULL) THEN (u.don_vi_id IS NULL)
                    ELSE (u.don_vi_id = kh.don_vi_id)
                END)) uv ON (true))
  GROUP BY kh.id, kh.nhiem_ky_id, kh.ky_thu, kh.ngay_hop, uv.cnt;


--
-- Name: v_diem_danh_uy_vien_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_diem_danh_uy_vien_summary WITH (security_invoker='true') AS
 SELECT u.id AS uy_vien_id,
    u.nhiem_ky_id,
    count(kh.id) AS so_ky_hop,
    count(dd.id) FILTER (WHERE (dd.trang_thai = 'Có mặt'::text)) AS co_mat,
    count(dd.id) FILTER (WHERE (dd.trang_thai = 'Vắng mặt'::text)) AS vang_mat,
    GREATEST((count(kh.id) - count(dd.id)), (0)::bigint) AS chua_diem_danh
   FROM ((public.mttq_uy_vien_uy_ban u
     LEFT JOIN public.mttq_ky_hop kh ON (((kh.nhiem_ky_id = u.nhiem_ky_id) AND ((kh.don_vi_id IS NULL) OR (kh.don_vi_id = u.don_vi_id)))))
     LEFT JOIN public.mttq_diem_danh_uy_vien dd ON (((dd.ky_hop_id = kh.id) AND (dd.uy_vien_id = u.id))))
  GROUP BY u.id, u.nhiem_ky_id;


--
-- Name: var_ssn_xa_phuong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.var_ssn_xa_phuong (
    id bigint NOT NULL,
    id_tinh_thanh bigint NOT NULL,
    ten text NOT NULL,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: v_xa_phuong_min; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_xa_phuong_min WITH (security_invoker='on') AS
 SELECT id,
    id_tinh_thanh,
    ten
   FROM public.var_ssn_xa_phuong;


--
-- Name: VIEW v_xa_phuong_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_xa_phuong_min IS 'Egress optim P2.4: lookup xã/phường tối thiểu (3 cột) cho import resolver.';


--
-- Name: var_chuc_vu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.var_chuc_vu (
    id bigint NOT NULL,
    ten_chuc_vu text NOT NULL,
    mo_ta text,
    phong_ban_id bigint,
    cap_bac smallint,
    trang_thai text DEFAULT 'Đang hoạt động'::text NOT NULL,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT var_chuc_vu_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang hoạt động'::text, 'Ngừng hoạt động'::text])))
);


--
-- Name: var_chuc_vu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.var_chuc_vu ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.var_chuc_vu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: var_nhan_vien_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.var_nhan_vien ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.var_nhan_vien_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: var_phan_quyen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.var_phan_quyen (
    id bigint NOT NULL,
    module_key text NOT NULL,
    chuc_vu_id bigint NOT NULL,
    quyen text DEFAULT ''::text NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: var_phan_quyen_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.var_phan_quyen ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.var_phan_quyen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: var_phong_ban; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.var_phong_ban (
    id bigint NOT NULL,
    ten_phong_ban text NOT NULL,
    mo_ta text,
    cha_id bigint,
    cap_do integer DEFAULT 0 NOT NULL,
    duong_dan text DEFAULT ''::text NOT NULL,
    trang_thai text DEFAULT 'Đang hoạt động'::text NOT NULL,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT var_phong_ban_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang hoạt động'::text, 'Ngừng hoạt động'::text])))
);


--
-- Name: var_phong_ban_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.var_phong_ban ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.var_phong_ban_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: var_ssn_tinh_thanh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.var_ssn_tinh_thanh (
    id bigint NOT NULL,
    ten text NOT NULL,
    thu_tu integer DEFAULT 0 NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: var_ssn_tinh_thanh_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.var_ssn_tinh_thanh ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.var_ssn_tinh_thanh_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: var_ssn_xa_phuong_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.var_ssn_xa_phuong ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.var_ssn_xa_phuong_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: var_thong_tin_to_chuc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.var_thong_tin_to_chuc (
    id bigint DEFAULT 1 NOT NULL,
    ten_ung_dung text DEFAULT 'MTTQVN'::text NOT NULL,
    mo_ta_ngan text,
    url_logo text,
    ten_to_chuc text NOT NULL,
    dia_chi text,
    dien_thoai text,
    email text,
    website text,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT var_thong_tin_to_chuc_singleton CHECK ((id = 1))
);


--
-- Name: vnn_chuong_trinh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vnn_chuong_trinh (
    id bigint NOT NULL,
    noi_dung_ho_tro text NOT NULL,
    nam integer NOT NULL,
    linh_vuc_ho_tro text NOT NULL,
    nguon text DEFAULT 'Vì người nghèo'::text NOT NULL,
    nguon_ho_tro text DEFAULT 'Cấp tỉnh'::text NOT NULL,
    ho_ngheo_id bigint,
    ho_ten_nguoi_nhan text NOT NULL,
    xa_phuong_id bigint,
    khoi_xom text,
    doi_tuong text,
    hinh_thuc_ho_tro text DEFAULT 'Tiền mặt'::text NOT NULL,
    so_tien numeric(15,0) NOT NULL,
    trang_thai text DEFAULT 'Đang khảo sát'::text NOT NULL,
    ngay_cap_nhat_trang_thai timestamp with time zone DEFAULT now() NOT NULL,
    don_vi_ho_tro_id bigint,
    ghi_chu text,
    id_nguoi_tao bigint NOT NULL,
    tg_tao timestamp with time zone DEFAULT now() NOT NULL,
    tg_cap_nhat timestamp with time zone DEFAULT now() NOT NULL,
    so_luong integer,
    tong_tien_quy_doi numeric(15,0),
    tong_tien_ban_giao numeric(15,0),
    phieu_khao_sat jsonb,
    bien_ban_ban_giao jsonb,
    id_nguoi_cap_nhat bigint,
    CONSTRAINT vnn_bien_ban_ban_giao_chk CHECK (((bien_ban_ban_giao IS NULL) OR (jsonb_typeof(bien_ban_ban_giao) = 'object'::text))),
    CONSTRAINT vnn_chuong_trinh_doi_tuong_check CHECK (((doi_tuong IS NULL) OR (doi_tuong = ANY (ARRAY['Hộ nghèo'::text, 'Cận nghèo'::text, 'Khó khăn'::text, 'Trẻ mồ côi'::text, 'Khuyết tật'::text, 'Nạn nhân CĐDC'::text])))),
    CONSTRAINT vnn_chuong_trinh_hinh_thuc_check CHECK ((hinh_thuc_ho_tro = ANY (ARRAY['Tiền mặt'::text, 'Hiện vật và Tiền'::text, 'Hiện vật'::text]))),
    CONSTRAINT vnn_chuong_trinh_linh_vuc_ho_tro_check CHECK ((linh_vuc_ho_tro = ANY (ARRAY['Tết vì người nghèo'::text, 'Cứu trợ'::text, 'Mô hình sinh kế'::text, 'Học sinh nghèo'::text, 'Chữa bệnh'::text, 'Nhà bị sập'::text, 'Người chết'::text, 'Hoả hoạn'::text, 'Con nuôi'::text]))),
    CONSTRAINT vnn_chuong_trinh_nam_check CHECK (((nam >= 2000) AND (nam <= 2100))),
    CONSTRAINT vnn_chuong_trinh_nguon_check CHECK ((nguon = ANY (ARRAY['Vì người nghèo'::text, 'Cứu trợ'::text, 'Ngân sách'::text]))),
    CONSTRAINT vnn_chuong_trinh_nguon_ho_tro_check CHECK ((nguon_ho_tro = ANY (ARRAY['Cấp tỉnh'::text, 'Cấp xã'::text, 'Ủng hộ trực tiếp'::text, 'Trung ương'::text]))),
    CONSTRAINT vnn_chuong_trinh_so_luong_check CHECK (((so_luong IS NULL) OR (so_luong >= 0))),
    CONSTRAINT vnn_chuong_trinh_so_tien_check CHECK (((so_tien IS NULL) OR (so_tien >= (0)::numeric))),
    CONSTRAINT vnn_chuong_trinh_tong_tien_ban_giao_check CHECK (((tong_tien_ban_giao IS NULL) OR (tong_tien_ban_giao >= (0)::numeric))),
    CONSTRAINT vnn_chuong_trinh_tong_tien_quy_doi_check CHECK (((tong_tien_quy_doi IS NULL) OR (tong_tien_quy_doi >= (0)::numeric))),
    CONSTRAINT vnn_chuong_trinh_trang_thai_check CHECK ((trang_thai = ANY (ARRAY['Đang khảo sát'::text, 'Đã nhận'::text]))),
    CONSTRAINT vnn_don_vi_ho_tro_theo_nguon_chk CHECK (((don_vi_ho_tro_id IS NULL) OR (nguon_ho_tro = 'Ủng hộ trực tiếp'::text))),
    CONSTRAINT vnn_phieu_khao_sat_chk CHECK (((phieu_khao_sat IS NULL) OR (jsonb_typeof(phieu_khao_sat) = 'object'::text)))
);


--
-- Name: TABLE vnn_chuong_trinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vnn_chuong_trinh IS 'Chương trình vì người nghèo — mỗi dòng một khoản hỗ trợ trao cho một người/hộ.';


--
-- Name: COLUMN vnn_chuong_trinh.ho_ngheo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.ho_ngheo_id IS 'Hộ nghèo nhận khoản này (tuỳ chọn) — FK hngh_thong_tin_ho_ngheo.';


--
-- Name: COLUMN vnn_chuong_trinh.ngay_cap_nhat_trang_thai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.ngay_cap_nhat_trang_thai IS 'Ngày cập nhật trạng thái — máy chủ gán, form không có ô nhập.';


--
-- Name: COLUMN vnn_chuong_trinh.don_vi_ho_tro_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.don_vi_ho_tro_id IS 'Đơn vị, cá nhân hỗ trợ — FK kho_don_vi_cuu_tro.';


--
-- Name: COLUMN vnn_chuong_trinh.so_luong; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.so_luong IS 'Số lượng hiện vật.';


--
-- Name: COLUMN vnn_chuong_trinh.tong_tien_quy_doi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.tong_tien_quy_doi IS 'Tổng tiền quy đổi của hiện vật (VND).';


--
-- Name: COLUMN vnn_chuong_trinh.tong_tien_ban_giao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.tong_tien_ban_giao IS 'Tổng tiền khi bàn giao hiện vật (VND).';


--
-- Name: COLUMN vnn_chuong_trinh.phieu_khao_sat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.phieu_khao_sat IS 'Dữ liệu phiếu khảo sát in: {chung, thien_tai|benh_tat|sinh_ke|hoc_sinh}. NULL khi lĩnh vực không có phiếu.';


--
-- Name: COLUMN vnn_chuong_trinh.bien_ban_ban_giao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.bien_ban_ban_giao IS 'Dữ liệu biên bản bàn giao in: ngày/địa điểm, bên giao, làm chứng, căn cứ, hiện vật[], mục đích. NULL khi chưa nhập.';


--
-- Name: COLUMN vnn_chuong_trinh.id_nguoi_cap_nhat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vnn_chuong_trinh.id_nguoi_cap_nhat IS 'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.';


--
-- Name: vnn_chuong_trinh_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.vnn_chuong_trinh ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.vnn_chuong_trinh_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: kho_danh_sach_kho tt; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_kho ALTER COLUMN tt SET DEFAULT nextval('public.kho_danh_sach_kho_tt_seq'::regclass);


--
-- Name: kho_don_vi_cuu_tro tt; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_don_vi_cuu_tro ALTER COLUMN tt SET DEFAULT nextval('public.kho_don_vi_cuu_tro_tt_seq'::regclass);


--
-- Name: kho_dot_cuu_tro tt; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_dot_cuu_tro ALTER COLUMN tt SET DEFAULT nextval('public.kho_dot_cuu_tro_tt_seq'::regclass);


--
-- Name: kho_nhap_xuat_kho tt; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho ALTER COLUMN tt SET DEFAULT nextval('public.kho_nhap_xuat_kho_tt_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bai_viet_danh_sach bai_viet_danh_sach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bai_viet_danh_sach
    ADD CONSTRAINT bai_viet_danh_sach_pkey PRIMARY KEY (id);


--
-- Name: bai_viet_thiet_lap_khac bai_viet_thiet_lap_khac_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bai_viet_thiet_lap_khac
    ADD CONSTRAINT bai_viet_thiet_lap_khac_pkey PRIMARY KEY (id);


--
-- Name: bai_viet_thiet_lap_the_loai bai_viet_thiet_lap_the_loai_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bai_viet_thiet_lap_the_loai
    ADD CONSTRAINT bai_viet_thiet_lap_the_loai_pkey PRIMARY KEY (id);


--
-- Name: chuong_trinh_nam chuong_trinh_nam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuong_trinh_nam
    ADD CONSTRAINT chuong_trinh_nam_pkey PRIMARY KEY (id);


--
-- Name: cong_viec_danh_sach cong_viec_danh_sach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cong_viec_danh_sach
    ADD CONSTRAINT cong_viec_danh_sach_pkey PRIMARY KEY (id);


--
-- Name: dttg_dip_tham_hoi dttg_dip_tham_hoi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_dip_tham_hoi
    ADD CONSTRAINT dttg_dip_tham_hoi_pkey PRIMARY KEY (id);


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_ca_nhan
    ADD CONSTRAINT dttg_tham_hoi_ca_nhan_pkey PRIMARY KEY (id);


--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_to_chuc
    ADD CONSTRAINT dttg_tham_hoi_to_chuc_pkey PRIMARY KEY (id);


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu dttg_thong_tin_ca_nhan_tieu_bieu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_thong_tin_ca_nhan_tieu_bieu
    ADD CONSTRAINT dttg_thong_tin_ca_nhan_tieu_bieu_pkey PRIMARY KEY (id);


--
-- Name: dttg_thong_tin_to_chuc_quan_trong dttg_thong_tin_to_chuc_quan_trong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_thong_tin_to_chuc_quan_trong
    ADD CONSTRAINT dttg_thong_tin_to_chuc_quan_trong_pkey PRIMARY KEY (id);


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hngh_thong_tin_ho_ngheo
    ADD CONSTRAINT hngh_thong_tin_ho_ngheo_pkey PRIMARY KEY (id);


--
-- Name: kho_danh_muc_hang_hoa kho_danh_muc_hang_hoa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_muc_hang_hoa
    ADD CONSTRAINT kho_danh_muc_hang_hoa_pkey PRIMARY KEY (id);


--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_hang_hoa
    ADD CONSTRAINT kho_danh_sach_hang_hoa_pkey PRIMARY KEY (id);


--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_kho
    ADD CONSTRAINT kho_danh_sach_kho_pkey PRIMARY KEY (id);


--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_don_vi_cuu_tro
    ADD CONSTRAINT kho_don_vi_cuu_tro_pkey PRIMARY KEY (id);


--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_dot_cuu_tro
    ADD CONSTRAINT kho_dot_cuu_tro_pkey PRIMARY KEY (id);


--
-- Name: kho_nhap_xuat_kho_ct kho_nhap_xuat_kho_ct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho_ct
    ADD CONSTRAINT kho_nhap_xuat_kho_ct_pkey PRIMARY KEY (id);


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_pkey PRIMARY KEY (id);


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_khen_thuong_nha_tai_tro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ktnt_khen_thuong_nha_tai_tro
    ADD CONSTRAINT ktnt_khen_thuong_nha_tai_tro_pkey PRIMARY KEY (id);


--
-- Name: lich_su_trang_thai lich_su_trang_thai_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lich_su_trang_thai
    ADD CONSTRAINT lich_su_trang_thai_pkey PRIMARY KEY (id);


--
-- Name: luong_thiet_lap_bac_luong luong_thiet_lap_bac_luong_ngach_ma_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luong_thiet_lap_bac_luong
    ADD CONSTRAINT luong_thiet_lap_bac_luong_ngach_ma_uq UNIQUE (ngach_id, ma_bac);


--
-- Name: luong_thiet_lap_bac_luong luong_thiet_lap_bac_luong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luong_thiet_lap_bac_luong
    ADD CONSTRAINT luong_thiet_lap_bac_luong_pkey PRIMARY KEY (id);


--
-- Name: luong_thiet_lap_cau_hinh luong_thiet_lap_cau_hinh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luong_thiet_lap_cau_hinh
    ADD CONSTRAINT luong_thiet_lap_cau_hinh_pkey PRIMARY KEY (id);


--
-- Name: luong_thiet_lap_ngach_luong luong_thiet_lap_ngach_luong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luong_thiet_lap_ngach_luong
    ADD CONSTRAINT luong_thiet_lap_ngach_luong_pkey PRIMARY KEY (id);


--
-- Name: mttq_can_bo mttq_can_bo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_pkey PRIMARY KEY (id);


--
-- Name: mttq_diem_danh_uy_vien mttq_diem_danh_uy_vien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_diem_danh_uy_vien
    ADD CONSTRAINT mttq_diem_danh_uy_vien_pkey PRIMARY KEY (id);


--
-- Name: mttq_khen_thuong_ct mttq_khen_thuong_ct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_khen_thuong_ct
    ADD CONSTRAINT mttq_khen_thuong_ct_pkey PRIMARY KEY (id);


--
-- Name: mttq_khen_thuong mttq_khen_thuong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_khen_thuong
    ADD CONSTRAINT mttq_khen_thuong_pkey PRIMARY KEY (id);


--
-- Name: mttq_ky_hop mttq_ky_hop_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_ky_hop
    ADD CONSTRAINT mttq_ky_hop_pkey PRIMARY KEY (id);


--
-- Name: mttq_lop_tap_huan_ct mttq_lop_tap_huan_ct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_lop_tap_huan_ct
    ADD CONSTRAINT mttq_lop_tap_huan_ct_pkey PRIMARY KEY (id);


--
-- Name: mttq_lop_tap_huan mttq_lop_tap_huan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_lop_tap_huan
    ADD CONSTRAINT mttq_lop_tap_huan_pkey PRIMARY KEY (id);


--
-- Name: mttq_nhiem_ky mttq_nhiem_ky_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_nhiem_ky
    ADD CONSTRAINT mttq_nhiem_ky_pkey PRIMARY KEY (id);


--
-- Name: mttq_tang_luong mttq_tang_luong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_tang_luong
    ADD CONSTRAINT mttq_tang_luong_pkey PRIMARY KEY (id);


--
-- Name: mttq_thiet_lap mttq_thiet_lap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_thiet_lap
    ADD CONSTRAINT mttq_thiet_lap_pkey PRIMARY KEY (id);


--
-- Name: mttq_uy_vien_uy_ban mttq_uy_vien_uy_ban_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_uy_vien_uy_ban
    ADD CONSTRAINT mttq_uy_vien_uy_ban_pkey PRIMARY KEY (id);


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nddk_nha_dai_doan_ket
    ADD CONSTRAINT nddk_nha_dai_doan_ket_pkey PRIMARY KEY (id);


--
-- Name: pbxh_thiet_lap pbxh_thiet_lap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thiet_lap
    ADD CONSTRAINT pbxh_thiet_lap_pkey PRIMARY KEY (id);


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_phan_bien_xa_hoi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thuc_hien_phan_bien_xa_hoi
    ADD CONSTRAINT pbxh_thuc_hien_phan_bien_xa_hoi_pkey PRIMARY KEY (id);


--
-- Name: thong_bao thong_bao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thong_bao
    ADD CONSTRAINT thong_bao_pkey PRIMARY KEY (id);


--
-- Name: tn_tiep_nhan_phieu_kho tn_phieu_kho_phieu_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan_phieu_kho
    ADD CONSTRAINT tn_phieu_kho_phieu_uq UNIQUE (phieu_id);


--
-- Name: tn_tiep_nhan tn_so_phieu_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan
    ADD CONSTRAINT tn_so_phieu_uq UNIQUE (so_phieu);


--
-- Name: tn_tiep_nhan_phieu_kho tn_tiep_nhan_phieu_kho_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan_phieu_kho
    ADD CONSTRAINT tn_tiep_nhan_phieu_kho_pkey PRIMARY KEY (tiep_nhan_id, phieu_id);


--
-- Name: tn_tiep_nhan tn_tiep_nhan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan
    ADD CONSTRAINT tn_tiep_nhan_pkey PRIMARY KEY (id);


--
-- Name: var_chuc_vu var_chuc_vu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_chuc_vu
    ADD CONSTRAINT var_chuc_vu_pkey PRIMARY KEY (id);


--
-- Name: var_nhan_vien var_nhan_vien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_nhan_vien
    ADD CONSTRAINT var_nhan_vien_pkey PRIMARY KEY (id);


--
-- Name: var_nhan_vien var_nhan_vien_ten_tai_khoan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_nhan_vien
    ADD CONSTRAINT var_nhan_vien_ten_tai_khoan_key UNIQUE (ten_tai_khoan);


--
-- Name: var_phan_quyen var_phan_quyen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_phan_quyen
    ADD CONSTRAINT var_phan_quyen_pkey PRIMARY KEY (id);


--
-- Name: var_phong_ban var_phong_ban_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_phong_ban
    ADD CONSTRAINT var_phong_ban_pkey PRIMARY KEY (id);


--
-- Name: var_ssn_tinh_thanh var_ssn_tinh_thanh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_ssn_tinh_thanh
    ADD CONSTRAINT var_ssn_tinh_thanh_pkey PRIMARY KEY (id);


--
-- Name: var_ssn_xa_phuong var_ssn_xa_phuong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_ssn_xa_phuong
    ADD CONSTRAINT var_ssn_xa_phuong_pkey PRIMARY KEY (id);


--
-- Name: var_thong_tin_to_chuc var_thong_tin_to_chuc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_thong_tin_to_chuc
    ADD CONSTRAINT var_thong_tin_to_chuc_pkey PRIMARY KEY (id);


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vnn_chuong_trinh
    ADD CONSTRAINT vnn_chuong_trinh_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_log_bang_ban_ghi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_bang_ban_ghi ON public.audit_log USING btree (bang, ban_ghi_id, tg DESC);


--
-- Name: idx_audit_log_nguoi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_nguoi ON public.audit_log USING btree (nguoi_thuc_hien_id, tg DESC);


--
-- Name: idx_audit_log_tg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_tg ON public.audit_log USING btree (tg DESC);


--
-- Name: idx_bai_viet_danh_sach_ngay_dang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bai_viet_danh_sach_ngay_dang ON public.bai_viet_danh_sach USING btree (ngay_dang DESC);


--
-- Name: idx_bai_viet_danh_sach_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bai_viet_danh_sach_nguoi_tao ON public.bai_viet_danh_sach USING btree (id_nguoi_tao);


--
-- Name: idx_bai_viet_danh_sach_the_loai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bai_viet_danh_sach_the_loai ON public.bai_viet_danh_sach USING btree (id_the_loai);


--
-- Name: idx_bai_viet_thiet_lap_khac_loai_thu_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bai_viet_thiet_lap_khac_loai_thu_tu ON public.bai_viet_thiet_lap_khac USING btree (loai, thu_tu);


--
-- Name: idx_chuong_trinh_nam_ngay_bd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chuong_trinh_nam_ngay_bd ON public.chuong_trinh_nam USING btree (ngay_bat_dau DESC);


--
-- Name: idx_chuong_trinh_nam_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chuong_trinh_nam_phong_ban ON public.chuong_trinh_nam USING btree (id_phong_ban);


--
-- Name: idx_chuong_trinh_nam_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chuong_trinh_nam_trang_thai ON public.chuong_trinh_nam USING btree (trang_thai);


--
-- Name: idx_cong_viec_danh_sach_chuong_trinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cong_viec_danh_sach_chuong_trinh ON public.cong_viec_danh_sach USING btree (id_chuong_trinh) WHERE (id_chuong_trinh IS NOT NULL);


--
-- Name: idx_cong_viec_danh_sach_ids_ho_tro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cong_viec_danh_sach_ids_ho_tro ON public.cong_viec_danh_sach USING gin (ids_ho_tro);


--
-- Name: idx_cong_viec_danh_sach_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cong_viec_danh_sach_nguoi_tao ON public.cong_viec_danh_sach USING btree (id_nguoi_tao);


--
-- Name: idx_cong_viec_danh_sach_thoi_han; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cong_viec_danh_sach_thoi_han ON public.cong_viec_danh_sach USING btree (thoi_han DESC);


--
-- Name: idx_cong_viec_danh_sach_trach_nhiem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cong_viec_danh_sach_trach_nhiem ON public.cong_viec_danh_sach USING btree (id_trach_nhiem);


--
-- Name: idx_dttg_dip_tham_hoi_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_dip_tham_hoi_don_vi ON public.dttg_dip_tham_hoi USING btree (don_vi_to_chuc_id);


--
-- Name: idx_dttg_dip_tham_hoi_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_dip_tham_hoi_phong_ban ON public.dttg_dip_tham_hoi USING btree (phong_ban_tham_muu_id);


--
-- Name: idx_dttg_dip_tham_hoi_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dttg_dip_tham_hoi_ten_lower ON public.dttg_dip_tham_hoi USING btree (lower(TRIM(BOTH FROM ten_dip)));


--
-- Name: idx_dttg_dip_tham_hoi_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_dip_tham_hoi_trang_thai ON public.dttg_dip_tham_hoi USING btree (trang_thai);


--
-- Name: idx_dttg_tham_hoi_ca_nhan_ca_nhan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_ca_nhan ON public.dttg_tham_hoi_ca_nhan USING btree (ca_nhan_id);


--
-- Name: idx_dttg_tham_hoi_ca_nhan_dip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_dip ON public.dttg_tham_hoi_ca_nhan USING btree (dip_tham_hoi_id);


--
-- Name: idx_dttg_tham_hoi_ca_nhan_dip_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_dip_lower ON public.dttg_tham_hoi_ca_nhan USING btree (lower(TRIM(BOTH FROM dip_tham_hoi)));


--
-- Name: idx_dttg_tham_hoi_ca_nhan_don_vi_tham_hoi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_don_vi_tham_hoi ON public.dttg_tham_hoi_ca_nhan USING btree (don_vi_tham_hoi_id);


--
-- Name: idx_dttg_tham_hoi_ca_nhan_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_phong_ban ON public.dttg_tham_hoi_ca_nhan USING btree (phong_ban_tham_muu_id);


--
-- Name: idx_dttg_tham_hoi_ca_nhan_thoi_gian; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_thoi_gian ON public.dttg_tham_hoi_ca_nhan USING btree (thoi_gian_du_kien);


--
-- Name: idx_dttg_tham_hoi_ca_nhan_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_trang_thai ON public.dttg_tham_hoi_ca_nhan USING btree (trang_thai);


--
-- Name: idx_dttg_tham_hoi_ca_nhan_xa_phuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_ca_nhan_xa_phuong ON public.dttg_tham_hoi_ca_nhan USING btree (xa_phuong_id);


--
-- Name: idx_dttg_tham_hoi_to_chuc_dip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_to_chuc_dip ON public.dttg_tham_hoi_to_chuc USING btree (dip_tham_hoi_id);


--
-- Name: idx_dttg_tham_hoi_to_chuc_dip_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_to_chuc_dip_lower ON public.dttg_tham_hoi_to_chuc USING btree (lower(TRIM(BOTH FROM dip_tham_hoi)));


--
-- Name: idx_dttg_tham_hoi_to_chuc_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_to_chuc_don_vi ON public.dttg_tham_hoi_to_chuc USING btree (don_vi_tham_hoi_id);


--
-- Name: idx_dttg_tham_hoi_to_chuc_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_to_chuc_phong_ban ON public.dttg_tham_hoi_to_chuc USING btree (phong_ban_tham_muu_id);


--
-- Name: idx_dttg_tham_hoi_to_chuc_tien_do; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_to_chuc_tien_do ON public.dttg_tham_hoi_to_chuc USING btree (tien_do);


--
-- Name: idx_dttg_tham_hoi_to_chuc_to_chuc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tham_hoi_to_chuc_to_chuc ON public.dttg_tham_hoi_to_chuc USING btree (to_chuc_id);


--
-- Name: idx_dttg_tt_cntb_doi_tuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_cntb_doi_tuong ON public.dttg_thong_tin_ca_nhan_tieu_bieu USING btree (doi_tuong);


--
-- Name: idx_dttg_tt_cntb_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_cntb_don_vi ON public.dttg_thong_tin_ca_nhan_tieu_bieu USING btree (don_vi_id);


--
-- Name: idx_dttg_tt_cntb_ho_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_cntb_ho_ten_lower ON public.dttg_thong_tin_ca_nhan_tieu_bieu USING btree (lower(TRIM(BOTH FROM ho_va_ten)));


--
-- Name: idx_dttg_tt_cntb_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_cntb_trang_thai ON public.dttg_thong_tin_ca_nhan_tieu_bieu USING btree (trang_thai);


--
-- Name: idx_dttg_tt_tcqt_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_tcqt_don_vi ON public.dttg_thong_tin_to_chuc_quan_trong USING btree (don_vi_id);


--
-- Name: idx_dttg_tt_tcqt_loai_hinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_tcqt_loai_hinh ON public.dttg_thong_tin_to_chuc_quan_trong USING btree (loai_hinh);


--
-- Name: idx_dttg_tt_tcqt_ten_co_so_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_tcqt_ten_co_so_lower ON public.dttg_thong_tin_to_chuc_quan_trong USING btree (lower(TRIM(BOTH FROM ten_co_so)));


--
-- Name: idx_dttg_tt_tcqt_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dttg_tt_tcqt_trang_thai ON public.dttg_thong_tin_to_chuc_quan_trong USING btree (trang_thai);


--
-- Name: idx_hngh_dai_dien_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hngh_dai_dien_lower ON public.hngh_thong_tin_ho_ngheo USING btree (lower(btrim(ho_ten_dai_dien)));


--
-- Name: idx_hngh_dan_toc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hngh_dan_toc ON public.hngh_thong_tin_ho_ngheo USING btree (dan_toc_id);


--
-- Name: idx_hngh_doi_tuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hngh_doi_tuong ON public.hngh_thong_tin_ho_ngheo USING btree (doi_tuong);


--
-- Name: idx_hngh_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hngh_nguoi_tao ON public.hngh_thong_tin_ho_ngheo USING btree (id_nguoi_tao);


--
-- Name: idx_hngh_ton_giao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hngh_ton_giao ON public.hngh_thong_tin_ho_ngheo USING btree (ton_giao);


--
-- Name: idx_hngh_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hngh_trang_thai ON public.hngh_thong_tin_ho_ngheo USING btree (trang_thai);


--
-- Name: idx_hngh_xa_phuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hngh_xa_phuong ON public.hngh_thong_tin_ho_ngheo USING btree (xa_phuong_id);


--
-- Name: idx_kho_danh_muc_hang_hoa_thu_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_danh_muc_hang_hoa_thu_tu ON public.kho_danh_muc_hang_hoa USING btree (thu_tu);


--
-- Name: idx_kho_danh_sach_hang_hoa_danh_muc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_danh_sach_hang_hoa_danh_muc ON public.kho_danh_sach_hang_hoa USING btree (id_danh_muc);


--
-- Name: idx_kho_danh_sach_kho_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_danh_sach_kho_don_vi ON public.kho_danh_sach_kho USING btree (don_vi_id);


--
-- Name: idx_kho_danh_sach_kho_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_danh_sach_kho_ten_lower ON public.kho_danh_sach_kho USING btree (lower(TRIM(BOTH FROM ten_kho)));


--
-- Name: idx_kho_danh_sach_kho_tt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_danh_sach_kho_tt ON public.kho_danh_sach_kho USING btree (tt);


--
-- Name: idx_kho_don_vi_cuu_tro_dv_gioi_thieu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_don_vi_cuu_tro_dv_gioi_thieu ON public.kho_don_vi_cuu_tro USING btree (don_vi_gioi_thieu_id);


--
-- Name: idx_kho_don_vi_cuu_tro_loai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_don_vi_cuu_tro_loai ON public.kho_don_vi_cuu_tro USING btree (loai);


--
-- Name: idx_kho_don_vi_cuu_tro_tt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_don_vi_cuu_tro_tt ON public.kho_don_vi_cuu_tro USING btree (tt);


--
-- Name: idx_kho_dot_cuu_tro_don_vi_chu_tri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_dot_cuu_tro_don_vi_chu_tri ON public.kho_dot_cuu_tro USING btree (don_vi_chu_tri_id);


--
-- Name: idx_kho_dot_cuu_tro_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_dot_cuu_tro_ten_lower ON public.kho_dot_cuu_tro USING btree (lower(TRIM(BOTH FROM ten)));


--
-- Name: idx_kho_dot_cuu_tro_tt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_dot_cuu_tro_tt ON public.kho_dot_cuu_tro USING btree (tt);


--
-- Name: idx_kho_nhap_xuat_kho_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_don_vi ON public.kho_nhap_xuat_kho USING btree (don_vi_cuu_tro_id);


--
-- Name: idx_kho_nhap_xuat_kho_dot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_dot ON public.kho_nhap_xuat_kho USING btree (dot_cuu_tro_id);


--
-- Name: idx_kho_nhap_xuat_kho_kho_nhap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_kho_nhap ON public.kho_nhap_xuat_kho USING btree (kho_nhap_id);


--
-- Name: idx_kho_nhap_xuat_kho_kho_xuat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_kho_xuat ON public.kho_nhap_xuat_kho USING btree (kho_xuat_id);


--
-- Name: idx_kho_nhap_xuat_kho_loai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_loai ON public.kho_nhap_xuat_kho USING btree (loai_phieu);


--
-- Name: idx_kho_nhap_xuat_kho_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_ngay ON public.kho_nhap_xuat_kho USING btree (ngay_phieu);


--
-- Name: idx_kho_nhap_xuat_kho_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_nguoi_tao ON public.kho_nhap_xuat_kho USING btree (id_nguoi_tao);


--
-- Name: idx_kho_nhap_xuat_kho_tt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nhap_xuat_kho_tt ON public.kho_nhap_xuat_kho USING btree (tt);


--
-- Name: idx_kho_nxk_ct_hang_hoa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nxk_ct_hang_hoa ON public.kho_nhap_xuat_kho_ct USING btree (hang_hoa_id);


--
-- Name: idx_kho_nxk_ct_phieu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nxk_ct_phieu ON public.kho_nhap_xuat_kho_ct USING btree (phieu_id);


--
-- Name: idx_kho_nxk_ho_ngheo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_nxk_ho_ngheo ON public.kho_nhap_xuat_kho USING btree (ho_ngheo_id);


--
-- Name: idx_ktnt_cap_khen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ktnt_cap_khen ON public.ktnt_khen_thuong_nha_tai_tro USING btree (cap_khen);


--
-- Name: idx_ktnt_ngay_khen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ktnt_ngay_khen ON public.ktnt_khen_thuong_nha_tai_tro USING btree (ngay_khen DESC);


--
-- Name: idx_ktnt_nguoi_duyet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ktnt_nguoi_duyet ON public.ktnt_khen_thuong_nha_tai_tro USING btree (nguoi_duyet_id);


--
-- Name: idx_ktnt_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ktnt_nguoi_tao ON public.ktnt_khen_thuong_nha_tai_tro USING btree (id_nguoi_tao);


--
-- Name: idx_ktnt_nha_tai_tro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ktnt_nha_tai_tro ON public.ktnt_khen_thuong_nha_tai_tro USING btree (nha_tai_tro_id);


--
-- Name: idx_ktnt_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ktnt_trang_thai ON public.ktnt_khen_thuong_nha_tai_tro USING btree (trang_thai);


--
-- Name: idx_ktnt_xa_phuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ktnt_xa_phuong ON public.ktnt_khen_thuong_nha_tai_tro USING btree (xa_phuong_id);


--
-- Name: idx_lich_su_trang_thai_ban_ghi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lich_su_trang_thai_ban_ghi ON public.lich_su_trang_thai USING btree (bang, ban_ghi_id, tg DESC);


--
-- Name: idx_luong_thiet_lap_bac_luong_ngach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_luong_thiet_lap_bac_luong_ngach ON public.luong_thiet_lap_bac_luong USING btree (ngach_id, thu_tu);


--
-- Name: idx_luong_thiet_lap_ngach_luong_thu_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_luong_thiet_lap_ngach_luong_thu_tu ON public.luong_thiet_lap_ngach_luong USING btree (thu_tu);


--
-- Name: idx_mttq_can_bo_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_can_bo_don_vi ON public.mttq_can_bo USING btree (don_vi_id);


--
-- Name: idx_mttq_can_bo_ho_ten; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_can_bo_ho_ten ON public.mttq_can_bo USING btree (ho_ten);


--
-- Name: idx_mttq_can_bo_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_can_bo_nguoi_tao ON public.mttq_can_bo USING btree (id_nguoi_tao);


--
-- Name: idx_mttq_can_bo_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_can_bo_phong_ban ON public.mttq_can_bo USING btree (phong_ban_id);


--
-- Name: idx_mttq_can_bo_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_can_bo_trang_thai ON public.mttq_can_bo USING btree (trang_thai_id);


--
-- Name: idx_mttq_diem_danh_ky_hop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_diem_danh_ky_hop ON public.mttq_diem_danh_uy_vien USING btree (ky_hop_id);


--
-- Name: idx_mttq_diem_danh_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_diem_danh_nguoi_tao ON public.mttq_diem_danh_uy_vien USING btree (id_nguoi_tao);


--
-- Name: idx_mttq_diem_danh_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_diem_danh_trang_thai ON public.mttq_diem_danh_uy_vien USING btree (trang_thai);


--
-- Name: idx_mttq_diem_danh_uy_vien; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_diem_danh_uy_vien ON public.mttq_diem_danh_uy_vien USING btree (uy_vien_id);


--
-- Name: idx_mttq_khen_thuong_ct_can_bo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_khen_thuong_ct_can_bo ON public.mttq_khen_thuong_ct USING btree (can_bo_id);


--
-- Name: idx_mttq_khen_thuong_ct_khen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_khen_thuong_ct_khen ON public.mttq_khen_thuong_ct USING btree (id_khen_thuong);


--
-- Name: idx_mttq_khen_thuong_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_khen_thuong_ngay ON public.mttq_khen_thuong USING btree (ngay_khen_thuong DESC);


--
-- Name: idx_mttq_khen_thuong_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_khen_thuong_nguoi_tao ON public.mttq_khen_thuong USING btree (id_nguoi_tao);


--
-- Name: idx_mttq_khen_thuong_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_khen_thuong_trang_thai ON public.mttq_khen_thuong USING btree (trang_thai);


--
-- Name: idx_mttq_ky_hop_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_ky_hop_don_vi ON public.mttq_ky_hop USING btree (don_vi_id);


--
-- Name: idx_mttq_ky_hop_ngay_hop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_ky_hop_ngay_hop ON public.mttq_ky_hop USING btree (ngay_hop DESC);


--
-- Name: idx_mttq_ky_hop_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_ky_hop_nguoi_tao ON public.mttq_ky_hop USING btree (id_nguoi_tao);


--
-- Name: idx_mttq_ky_hop_nhiem_ky; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_ky_hop_nhiem_ky ON public.mttq_ky_hop USING btree (nhiem_ky_id);


--
-- Name: idx_mttq_lop_tap_huan_cap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_cap ON public.mttq_lop_tap_huan USING btree (cap_tap_huan);


--
-- Name: idx_mttq_lop_tap_huan_ct_can_bo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_ct_can_bo ON public.mttq_lop_tap_huan_ct USING btree (can_bo_id);


--
-- Name: idx_mttq_lop_tap_huan_ct_lop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_ct_lop ON public.mttq_lop_tap_huan_ct USING btree (id_lop_tap_huan);


--
-- Name: idx_mttq_lop_tap_huan_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_don_vi ON public.mttq_lop_tap_huan USING btree (don_vi_id);


--
-- Name: idx_mttq_lop_tap_huan_nam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_nam ON public.mttq_lop_tap_huan USING btree (nam_tap_huan DESC);


--
-- Name: idx_mttq_lop_tap_huan_nguoi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_nguoi ON public.mttq_lop_tap_huan USING btree (id_nguoi_tao);


--
-- Name: idx_mttq_lop_tap_huan_ten; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_ten ON public.mttq_lop_tap_huan USING btree (ten_lop_tap_huan);


--
-- Name: idx_mttq_lop_tap_huan_to_chuc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_lop_tap_huan_to_chuc ON public.mttq_lop_tap_huan USING btree (to_chuc_id);


--
-- Name: idx_mttq_nhiem_ky_den_nam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_nhiem_ky_den_nam ON public.mttq_nhiem_ky USING btree (den_nam DESC);


--
-- Name: idx_mttq_nhiem_ky_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_nhiem_ky_nguoi_tao ON public.mttq_nhiem_ky USING btree (id_nguoi_tao);


--
-- Name: idx_mttq_nhiem_ky_tu_nam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_nhiem_ky_tu_nam ON public.mttq_nhiem_ky USING btree (tu_nam DESC);


--
-- Name: idx_mttq_tang_luong_can_bo_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_tang_luong_can_bo_ngay ON public.mttq_tang_luong USING btree (can_bo_id, ngay_nang_luong DESC);


--
-- Name: idx_mttq_tang_luong_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_tang_luong_ngay ON public.mttq_tang_luong USING btree (ngay_nang_luong DESC);


--
-- Name: idx_mttq_thiet_lap_loai_thu_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_thiet_lap_loai_thu_tu ON public.mttq_thiet_lap USING btree (loai, thu_tu);


--
-- Name: idx_mttq_uy_vien_uy_ban_can_bo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_uy_vien_uy_ban_can_bo ON public.mttq_uy_vien_uy_ban USING btree (can_bo_id);


--
-- Name: idx_mttq_uy_vien_uy_ban_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_uy_vien_uy_ban_don_vi ON public.mttq_uy_vien_uy_ban USING btree (don_vi_id);


--
-- Name: idx_mttq_uy_vien_uy_ban_nguoi_t; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_uy_vien_uy_ban_nguoi_t ON public.mttq_uy_vien_uy_ban USING btree (id_nguoi_tao);


--
-- Name: idx_mttq_uy_vien_uy_ban_nhiem_ky; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mttq_uy_vien_uy_ban_nhiem_ky ON public.mttq_uy_vien_uy_ban USING btree (nhiem_ky_id);


--
-- Name: idx_nddk_chu_ho_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_chu_ho_lower ON public.nddk_nha_dai_doan_ket USING btree (lower(btrim(ho_ten_chu_ho)));


--
-- Name: idx_nddk_ho_ngheo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_ho_ngheo ON public.nddk_nha_dai_doan_ket USING btree (ho_ngheo_id);


--
-- Name: idx_nddk_loai_hinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_loai_hinh ON public.nddk_nha_dai_doan_ket USING btree (loai_hinh_ho_tro);


--
-- Name: idx_nddk_nam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_nam ON public.nddk_nha_dai_doan_ket USING btree (nam DESC);


--
-- Name: idx_nddk_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_nguoi_tao ON public.nddk_nha_dai_doan_ket USING btree (id_nguoi_tao);


--
-- Name: idx_nddk_nguon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_nguon ON public.nddk_nha_dai_doan_ket USING btree (nguon);


--
-- Name: idx_nddk_nha_tai_tro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_nha_tai_tro ON public.nddk_nha_dai_doan_ket USING btree (nha_tai_tro_id);


--
-- Name: idx_nddk_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_trang_thai ON public.nddk_nha_dai_doan_ket USING btree (trang_thai);


--
-- Name: idx_nddk_xa_phuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nddk_xa_phuong ON public.nddk_nha_dai_doan_ket USING btree (xa_phuong_id);


--
-- Name: idx_pbxh_thiet_lap_loai_thu_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pbxh_thiet_lap_loai_thu_tu ON public.pbxh_thiet_lap USING btree (loai, thu_tu);


--
-- Name: idx_pbxh_thuc_hien_cap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pbxh_thuc_hien_cap ON public.pbxh_thuc_hien_phan_bien_xa_hoi USING btree (cap_thuc_hien);


--
-- Name: idx_pbxh_thuc_hien_don_vi_chu_tri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pbxh_thuc_hien_don_vi_chu_tri ON public.pbxh_thuc_hien_phan_bien_xa_hoi USING btree (don_vi_chu_tri_id);


--
-- Name: idx_pbxh_thuc_hien_loai_hinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pbxh_thuc_hien_loai_hinh ON public.pbxh_thuc_hien_phan_bien_xa_hoi USING btree (loai_hinh);


--
-- Name: idx_pbxh_thuc_hien_ngay_ket_thuc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pbxh_thuc_hien_ngay_ket_thuc ON public.pbxh_thuc_hien_phan_bien_xa_hoi USING btree (ngay_ket_thuc);


--
-- Name: idx_pbxh_thuc_hien_tinh_trang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pbxh_thuc_hien_tinh_trang ON public.pbxh_thuc_hien_phan_bien_xa_hoi USING btree (tinh_trang);


--
-- Name: idx_thong_bao_hop_cua_toi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thong_bao_hop_cua_toi ON public.thong_bao USING btree (nhan_vien_id, da_doc, tg_tao DESC);


--
-- Name: idx_tn_chuong_trinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tn_chuong_trinh ON public.tn_tiep_nhan USING btree (chuong_trinh_id);


--
-- Name: idx_tn_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tn_ngay ON public.tn_tiep_nhan USING btree (ngay_tiep_nhan);


--
-- Name: idx_tn_nha_tai_tro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tn_nha_tai_tro ON public.tn_tiep_nhan USING btree (nha_tai_tro_id);


--
-- Name: idx_var_chuc_vu_cap_bac; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_chuc_vu_cap_bac ON public.var_chuc_vu USING btree (cap_bac);


--
-- Name: idx_var_chuc_vu_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_chuc_vu_phong_ban ON public.var_chuc_vu USING btree (phong_ban_id);


--
-- Name: idx_var_chuc_vu_thu_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_chuc_vu_thu_tu ON public.var_chuc_vu USING btree (thu_tu);


--
-- Name: idx_var_nhan_vien_chuc_vu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_nhan_vien_chuc_vu ON public.var_nhan_vien USING btree (id_chuc_vu);


--
-- Name: idx_var_nhan_vien_don_vi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_nhan_vien_don_vi ON public.var_nhan_vien USING btree (don_vi_id);


--
-- Name: idx_var_nhan_vien_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_nhan_vien_phong_ban ON public.var_nhan_vien USING btree (id_phong_ban);


--
-- Name: idx_var_nhan_vien_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_nhan_vien_username ON public.var_nhan_vien USING btree (lower(ten_tai_khoan));


--
-- Name: idx_var_phan_quyen_chuc_vu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_phan_quyen_chuc_vu ON public.var_phan_quyen USING btree (chuc_vu_id);


--
-- Name: idx_var_phong_ban_cha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_phong_ban_cha ON public.var_phong_ban USING btree (cha_id);


--
-- Name: idx_var_phong_ban_duong_dan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_phong_ban_duong_dan ON public.var_phong_ban USING btree (duong_dan);


--
-- Name: idx_var_ssn_tinh_thanh_thu_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_ssn_tinh_thanh_thu_tu ON public.var_ssn_tinh_thanh USING btree (thu_tu);


--
-- Name: idx_var_ssn_xa_phuong_id_tinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_ssn_xa_phuong_id_tinh ON public.var_ssn_xa_phuong USING btree (id_tinh_thanh);


--
-- Name: idx_var_ssn_xa_phuong_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_ssn_xa_phuong_order ON public.var_ssn_xa_phuong USING btree (id_tinh_thanh, thu_tu);


--
-- Name: idx_vnn_don_vi_ho_tro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_don_vi_ho_tro ON public.vnn_chuong_trinh USING btree (don_vi_ho_tro_id);


--
-- Name: idx_vnn_ho_ngheo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_ho_ngheo ON public.vnn_chuong_trinh USING btree (ho_ngheo_id);


--
-- Name: idx_vnn_linh_vuc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_linh_vuc ON public.vnn_chuong_trinh USING btree (linh_vuc_ho_tro);


--
-- Name: idx_vnn_nam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_nam ON public.vnn_chuong_trinh USING btree (nam DESC);


--
-- Name: idx_vnn_nguoi_nhan_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_nguoi_nhan_lower ON public.vnn_chuong_trinh USING btree (lower(btrim(ho_ten_nguoi_nhan)));


--
-- Name: idx_vnn_nguoi_tao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_nguoi_tao ON public.vnn_chuong_trinh USING btree (id_nguoi_tao);


--
-- Name: idx_vnn_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_trang_thai ON public.vnn_chuong_trinh USING btree (trang_thai);


--
-- Name: idx_vnn_xa_phuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vnn_xa_phuong ON public.vnn_chuong_trinh USING btree (xa_phuong_id);


--
-- Name: uq_bai_viet_danh_sach_link_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bai_viet_danh_sach_link_lower ON public.bai_viet_danh_sach USING btree (lower(TRIM(BOTH FROM link)));


--
-- Name: uq_bai_viet_thiet_lap_khac_loai_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bai_viet_thiet_lap_khac_loai_ten_lower ON public.bai_viet_thiet_lap_khac USING btree (loai, lower(TRIM(BOTH FROM ten)));


--
-- Name: uq_bai_viet_thiet_lap_the_loai_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bai_viet_thiet_lap_the_loai_ten_lower ON public.bai_viet_thiet_lap_the_loai USING btree (lower(TRIM(BOTH FROM ten_the_loai)));


--
-- Name: uq_hngh_so_cccd; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_hngh_so_cccd ON public.hngh_thong_tin_ho_ngheo USING btree (btrim(so_cccd)) WHERE ((so_cccd IS NOT NULL) AND (btrim(so_cccd) <> ''::text));


--
-- Name: uq_kho_danh_muc_hang_hoa_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_kho_danh_muc_hang_hoa_ten_lower ON public.kho_danh_muc_hang_hoa USING btree (lower(TRIM(BOTH FROM ten_danh_muc)));


--
-- Name: uq_kho_danh_sach_hang_hoa_dm_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_kho_danh_sach_hang_hoa_dm_ten_lower ON public.kho_danh_sach_hang_hoa USING btree (id_danh_muc, lower(TRIM(BOTH FROM ten_hang_hoa)));


--
-- Name: uq_kho_don_vi_cuu_tro_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_kho_don_vi_cuu_tro_ten_lower ON public.kho_don_vi_cuu_tro USING btree (lower(regexp_replace(btrim(ten), '\s+'::text, ' '::text, 'g'::text)));


--
-- Name: uq_kho_nhap_xuat_kho_so_phieu; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_kho_nhap_xuat_kho_so_phieu ON public.kho_nhap_xuat_kho USING btree (so_phieu);


--
-- Name: uq_luong_thiet_lap_ngach_luong_ma_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_luong_thiet_lap_ngach_luong_ma_lower ON public.luong_thiet_lap_ngach_luong USING btree (lower(TRIM(BOTH FROM ma))) WHERE ((ma IS NOT NULL) AND (TRIM(BOTH FROM ma) <> ''::text));


--
-- Name: uq_luong_thiet_lap_ngach_luong_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_luong_thiet_lap_ngach_luong_ten_lower ON public.luong_thiet_lap_ngach_luong USING btree (lower(TRIM(BOTH FROM ten)));


--
-- Name: uq_mttq_diem_danh_ky_hop_uy_vien; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mttq_diem_danh_ky_hop_uy_vien ON public.mttq_diem_danh_uy_vien USING btree (ky_hop_id, uy_vien_id);


--
-- Name: uq_mttq_khen_thuong_so_qd; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mttq_khen_thuong_so_qd ON public.mttq_khen_thuong USING btree (so_qd) WHERE (so_qd IS NOT NULL);


--
-- Name: uq_mttq_lop_tap_huan_ct_lop_can_bo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mttq_lop_tap_huan_ct_lop_can_bo ON public.mttq_lop_tap_huan_ct USING btree (id_lop_tap_huan, can_bo_id);


--
-- Name: uq_mttq_tang_luong_can_bo_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mttq_tang_luong_can_bo_ngay ON public.mttq_tang_luong USING btree (can_bo_id, ngay_nang_luong);


--
-- Name: uq_mttq_thiet_lap_loai_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mttq_thiet_lap_loai_ten_lower ON public.mttq_thiet_lap USING btree (loai, lower(TRIM(BOTH FROM ten)));


--
-- Name: uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo ON public.mttq_uy_vien_uy_ban USING btree (nhiem_ky_id, can_bo_id);


--
-- Name: uq_mttq_uy_vien_uy_ban_nhiem_ky_ma_uv; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mttq_uy_vien_uy_ban_nhiem_ky_ma_uv ON public.mttq_uy_vien_uy_ban USING btree (nhiem_ky_id, lower(TRIM(BOTH FROM ma_uv))) WHERE ((ma_uv IS NOT NULL) AND (btrim(ma_uv) <> ''::text));


--
-- Name: uq_pbxh_thiet_lap_loai_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_pbxh_thiet_lap_loai_ten_lower ON public.pbxh_thiet_lap USING btree (loai, lower(TRIM(BOTH FROM ten)));


--
-- Name: uq_var_chuc_vu_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_var_chuc_vu_ten_lower ON public.var_chuc_vu USING btree (lower(TRIM(BOTH FROM ten_chuc_vu)));


--
-- Name: uq_var_phan_quyen_chuc_vu_module; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_var_phan_quyen_chuc_vu_module ON public.var_phan_quyen USING btree (chuc_vu_id, module_key);


--
-- Name: uq_var_phong_ban_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_var_phong_ban_ten_lower ON public.var_phong_ban USING btree (lower(TRIM(BOTH FROM ten_phong_ban)));


--
-- Name: uq_var_ssn_tinh_thanh_ten_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_var_ssn_tinh_thanh_ten_lower ON public.var_ssn_tinh_thanh USING btree (lower(TRIM(BOTH FROM ten)));


--
-- Name: uq_var_ssn_xa_phuong_ten_lower_per_tinh; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_var_ssn_xa_phuong_ten_lower_per_tinh ON public.var_ssn_xa_phuong USING btree (id_tinh_thanh, lower(TRIM(BOTH FROM ten)));


--
-- Name: ux_thong_bao_chong_trung; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_thong_bao_chong_trung ON public.thong_bao USING btree (nhan_vien_id, khoa_chong_trung);


--
-- Name: hngh_thong_tin_ho_ngheo tg_audit_hngh_thong_tin_ho_ngheo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_hngh_thong_tin_ho_ngheo AFTER INSERT OR DELETE OR UPDATE ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: kho_nhap_xuat_kho tg_audit_kho_nhap_xuat_kho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_kho_nhap_xuat_kho AFTER INSERT OR DELETE OR UPDATE ON public.kho_nhap_xuat_kho FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: kho_nhap_xuat_kho_ct tg_audit_kho_nhap_xuat_kho_ct; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_kho_nhap_xuat_kho_ct AFTER INSERT OR DELETE OR UPDATE ON public.kho_nhap_xuat_kho_ct FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: ktnt_khen_thuong_nha_tai_tro tg_audit_ktnt_khen_thuong_nha_tai_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_ktnt_khen_thuong_nha_tai_tro AFTER INSERT OR DELETE OR UPDATE ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: mttq_tang_luong tg_audit_mttq_tang_luong; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_mttq_tang_luong AFTER INSERT OR DELETE OR UPDATE ON public.mttq_tang_luong FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: tn_tiep_nhan tg_audit_tn_tiep_nhan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_tn_tiep_nhan AFTER INSERT OR DELETE OR UPDATE ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: var_chuc_vu tg_audit_var_chuc_vu; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_var_chuc_vu AFTER INSERT OR DELETE OR UPDATE ON public.var_chuc_vu FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: var_nhan_vien tg_audit_var_nhan_vien; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_var_nhan_vien AFTER INSERT OR DELETE OR UPDATE ON public.var_nhan_vien FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: var_phan_quyen tg_audit_var_phan_quyen; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_var_phan_quyen AFTER INSERT OR DELETE OR UPDATE ON public.var_phan_quyen FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: vnn_chuong_trinh tg_audit_vnn_chuong_trinh; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_audit_vnn_chuong_trinh AFTER INSERT OR DELETE OR UPDATE ON public.vnn_chuong_trinh FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();


--
-- Name: bai_viet_danh_sach tg_gan_id_nguoi_tao_bai_viet_danh_sach; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_bai_viet_danh_sach BEFORE INSERT ON public.bai_viet_danh_sach FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: chuong_trinh_nam tg_gan_id_nguoi_tao_chuong_trinh_nam; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_chuong_trinh_nam BEFORE INSERT ON public.chuong_trinh_nam FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: cong_viec_danh_sach tg_gan_id_nguoi_tao_cong_viec_danh_sach; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_cong_viec_danh_sach BEFORE INSERT ON public.cong_viec_danh_sach FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: dttg_dip_tham_hoi tg_gan_id_nguoi_tao_dttg_dip_tham_hoi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_dttg_dip_tham_hoi BEFORE INSERT ON public.dttg_dip_tham_hoi FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: dttg_tham_hoi_ca_nhan tg_gan_id_nguoi_tao_dttg_tham_hoi_ca_nhan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_dttg_tham_hoi_ca_nhan BEFORE INSERT ON public.dttg_tham_hoi_ca_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: dttg_tham_hoi_to_chuc tg_gan_id_nguoi_tao_dttg_tham_hoi_to_chuc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_dttg_tham_hoi_to_chuc BEFORE INSERT ON public.dttg_tham_hoi_to_chuc FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu tg_gan_id_nguoi_tao_dttg_thong_tin_ca_nhan_tieu_bieu; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_dttg_thong_tin_ca_nhan_tieu_bieu BEFORE INSERT ON public.dttg_thong_tin_ca_nhan_tieu_bieu FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: dttg_thong_tin_to_chuc_quan_trong tg_gan_id_nguoi_tao_dttg_thong_tin_to_chuc_quan_trong; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_dttg_thong_tin_to_chuc_quan_trong BEFORE INSERT ON public.dttg_thong_tin_to_chuc_quan_trong FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: hngh_thong_tin_ho_ngheo tg_gan_id_nguoi_tao_hngh_thong_tin_ho_ngheo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_hngh_thong_tin_ho_ngheo BEFORE INSERT ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: kho_danh_muc_hang_hoa tg_gan_id_nguoi_tao_kho_danh_muc_hang_hoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_kho_danh_muc_hang_hoa BEFORE INSERT ON public.kho_danh_muc_hang_hoa FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: kho_danh_sach_hang_hoa tg_gan_id_nguoi_tao_kho_danh_sach_hang_hoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_kho_danh_sach_hang_hoa BEFORE INSERT ON public.kho_danh_sach_hang_hoa FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: kho_danh_sach_kho tg_gan_id_nguoi_tao_kho_danh_sach_kho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_kho_danh_sach_kho BEFORE INSERT ON public.kho_danh_sach_kho FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: kho_don_vi_cuu_tro tg_gan_id_nguoi_tao_kho_don_vi_cuu_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_kho_don_vi_cuu_tro BEFORE INSERT ON public.kho_don_vi_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: kho_dot_cuu_tro tg_gan_id_nguoi_tao_kho_dot_cuu_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_kho_dot_cuu_tro BEFORE INSERT ON public.kho_dot_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: kho_nhap_xuat_kho tg_gan_id_nguoi_tao_kho_nhap_xuat_kho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_kho_nhap_xuat_kho BEFORE INSERT ON public.kho_nhap_xuat_kho FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: ktnt_khen_thuong_nha_tai_tro tg_gan_id_nguoi_tao_ktnt_khen_thuong_nha_tai_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_ktnt_khen_thuong_nha_tai_tro BEFORE INSERT ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_can_bo tg_gan_id_nguoi_tao_mttq_can_bo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_can_bo BEFORE INSERT ON public.mttq_can_bo FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_diem_danh_uy_vien tg_gan_id_nguoi_tao_mttq_diem_danh_uy_vien; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_diem_danh_uy_vien BEFORE INSERT ON public.mttq_diem_danh_uy_vien FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_khen_thuong tg_gan_id_nguoi_tao_mttq_khen_thuong; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_khen_thuong BEFORE INSERT ON public.mttq_khen_thuong FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_ky_hop tg_gan_id_nguoi_tao_mttq_ky_hop; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_ky_hop BEFORE INSERT ON public.mttq_ky_hop FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_lop_tap_huan tg_gan_id_nguoi_tao_mttq_lop_tap_huan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_lop_tap_huan BEFORE INSERT ON public.mttq_lop_tap_huan FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_nhiem_ky tg_gan_id_nguoi_tao_mttq_nhiem_ky; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_nhiem_ky BEFORE INSERT ON public.mttq_nhiem_ky FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_tang_luong tg_gan_id_nguoi_tao_mttq_tang_luong; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_tang_luong BEFORE INSERT ON public.mttq_tang_luong FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: mttq_uy_vien_uy_ban tg_gan_id_nguoi_tao_mttq_uy_vien_uy_ban; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_mttq_uy_vien_uy_ban BEFORE INSERT ON public.mttq_uy_vien_uy_ban FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: nddk_nha_dai_doan_ket tg_gan_id_nguoi_tao_nddk_nha_dai_doan_ket; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_nddk_nha_dai_doan_ket BEFORE INSERT ON public.nddk_nha_dai_doan_ket FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi tg_gan_id_nguoi_tao_pbxh_thuc_hien_phan_bien_xa_hoi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_pbxh_thuc_hien_phan_bien_xa_hoi BEFORE INSERT ON public.pbxh_thuc_hien_phan_bien_xa_hoi FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: tn_tiep_nhan tg_gan_id_nguoi_tao_tn_tiep_nhan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_tn_tiep_nhan BEFORE INSERT ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: vnn_chuong_trinh tg_gan_id_nguoi_tao_vnn_chuong_trinh; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_id_nguoi_tao_vnn_chuong_trinh BEFORE INSERT ON public.vnn_chuong_trinh FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();


--
-- Name: hngh_thong_tin_ho_ngheo tg_gan_nguoi_cap_nhat_hngh_thong_tin_ho_ngheo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_hngh_thong_tin_ho_ngheo BEFORE INSERT OR UPDATE ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: kho_danh_muc_hang_hoa tg_gan_nguoi_cap_nhat_kho_danh_muc_hang_hoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_kho_danh_muc_hang_hoa BEFORE INSERT OR UPDATE ON public.kho_danh_muc_hang_hoa FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: kho_danh_sach_hang_hoa tg_gan_nguoi_cap_nhat_kho_danh_sach_hang_hoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_kho_danh_sach_hang_hoa BEFORE INSERT OR UPDATE ON public.kho_danh_sach_hang_hoa FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: kho_danh_sach_kho tg_gan_nguoi_cap_nhat_kho_danh_sach_kho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_kho_danh_sach_kho BEFORE INSERT OR UPDATE ON public.kho_danh_sach_kho FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: kho_don_vi_cuu_tro tg_gan_nguoi_cap_nhat_kho_don_vi_cuu_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_kho_don_vi_cuu_tro BEFORE INSERT OR UPDATE ON public.kho_don_vi_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: kho_dot_cuu_tro tg_gan_nguoi_cap_nhat_kho_dot_cuu_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_kho_dot_cuu_tro BEFORE INSERT OR UPDATE ON public.kho_dot_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: kho_nhap_xuat_kho tg_gan_nguoi_cap_nhat_kho_nhap_xuat_kho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_kho_nhap_xuat_kho BEFORE INSERT OR UPDATE ON public.kho_nhap_xuat_kho FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: ktnt_khen_thuong_nha_tai_tro tg_gan_nguoi_cap_nhat_ktnt_khen_thuong_nha_tai_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_ktnt_khen_thuong_nha_tai_tro BEFORE INSERT OR UPDATE ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: nddk_nha_dai_doan_ket tg_gan_nguoi_cap_nhat_nddk_nha_dai_doan_ket; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_nddk_nha_dai_doan_ket BEFORE INSERT OR UPDATE ON public.nddk_nha_dai_doan_ket FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: tn_tiep_nhan tg_gan_nguoi_cap_nhat_tn_tiep_nhan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_tn_tiep_nhan BEFORE INSERT OR UPDATE ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: vnn_chuong_trinh tg_gan_nguoi_cap_nhat_vnn_chuong_trinh; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_cap_nhat_vnn_chuong_trinh BEFORE INSERT OR UPDATE ON public.vnn_chuong_trinh FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();


--
-- Name: mttq_khen_thuong tg_gan_nguoi_duyet_khen_thuong; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_gan_nguoi_duyet_khen_thuong BEFORE UPDATE OF trang_thai ON public.mttq_khen_thuong FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_duyet_khen_thuong();


--
-- Name: chuong_trinh_nam tg_lich_su_trang_thai_chuong_trinh_nam; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_chuong_trinh_nam AFTER UPDATE OF trang_thai ON public.chuong_trinh_nam FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: cong_viec_danh_sach tg_lich_su_trang_thai_cong_viec_danh_sach; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_cong_viec_danh_sach AFTER UPDATE OF trang_thai ON public.cong_viec_danh_sach FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: hngh_thong_tin_ho_ngheo tg_lich_su_trang_thai_hngh_thong_tin_ho_ngheo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_hngh_thong_tin_ho_ngheo AFTER UPDATE OF trang_thai ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: kho_dot_cuu_tro tg_lich_su_trang_thai_kho_dot_cuu_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_kho_dot_cuu_tro AFTER UPDATE OF trang_thai ON public.kho_dot_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: ktnt_khen_thuong_nha_tai_tro tg_lich_su_trang_thai_ktnt_khen_thuong_nha_tai_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_ktnt_khen_thuong_nha_tai_tro AFTER UPDATE OF trang_thai ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: mttq_khen_thuong tg_lich_su_trang_thai_mttq_khen_thuong; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_mttq_khen_thuong AFTER UPDATE OF trang_thai ON public.mttq_khen_thuong FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: nddk_nha_dai_doan_ket tg_lich_su_trang_thai_nddk_nha_dai_doan_ket; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_nddk_nha_dai_doan_ket AFTER UPDATE OF trang_thai ON public.nddk_nha_dai_doan_ket FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: tn_tiep_nhan tg_lich_su_trang_thai_tn_tiep_nhan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_tn_tiep_nhan AFTER UPDATE OF trang_thai ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: vnn_chuong_trinh tg_lich_su_trang_thai_vnn_chuong_trinh; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lich_su_trang_thai_vnn_chuong_trinh AFTER UPDATE OF trang_thai ON public.vnn_chuong_trinh FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();


--
-- Name: ktnt_khen_thuong_nha_tai_tro tg_luat_trang_thai_ktnt_khen_thuong_nha_tai_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_luat_trang_thai_ktnt_khen_thuong_nha_tai_tro BEFORE UPDATE OF trang_thai ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.fn_kiem_luat_trang_thai();


--
-- Name: mttq_khen_thuong tg_luat_trang_thai_mttq_khen_thuong; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_luat_trang_thai_mttq_khen_thuong BEFORE UPDATE OF trang_thai ON public.mttq_khen_thuong FOR EACH ROW EXECUTE FUNCTION public.fn_kiem_luat_trang_thai();


--
-- Name: thong_bao tg_thong_bao_chi_cho_danh_dau_doc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_thong_bao_chi_cho_danh_dau_doc BEFORE UPDATE ON public.thong_bao FOR EACH ROW EXECUTE FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc();


--
-- Name: bai_viet_danh_sach trg_bai_viet_danh_sach_enforce_don_gia; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bai_viet_danh_sach_enforce_don_gia BEFORE INSERT OR UPDATE OF id_the_loai, don_gia ON public.bai_viet_danh_sach FOR EACH ROW EXECUTE FUNCTION public.bai_viet_danh_sach_enforce_don_gia();


--
-- Name: bai_viet_danh_sach trg_bai_viet_danh_sach_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bai_viet_danh_sach_updated BEFORE UPDATE ON public.bai_viet_danh_sach FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: bai_viet_danh_sach trg_bai_viet_danh_sach_validate_khac; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bai_viet_danh_sach_validate_khac BEFORE INSERT OR UPDATE OF id_nguon_dang, id_trang_dang ON public.bai_viet_danh_sach FOR EACH ROW EXECUTE FUNCTION public.bai_viet_danh_sach_validate_khac_loai();


--
-- Name: bai_viet_thiet_lap_khac trg_bai_viet_thiet_lap_khac_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bai_viet_thiet_lap_khac_updated BEFORE UPDATE ON public.bai_viet_thiet_lap_khac FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: bai_viet_thiet_lap_the_loai trg_bai_viet_thiet_lap_the_loai_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bai_viet_thiet_lap_the_loai_updated BEFORE UPDATE ON public.bai_viet_thiet_lap_the_loai FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: chuong_trinh_nam trg_chuong_trinh_nam_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_chuong_trinh_nam_updated BEFORE UPDATE ON public.chuong_trinh_nam FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: cong_viec_danh_sach trg_cong_viec_danh_sach_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cong_viec_danh_sach_updated BEFORE UPDATE ON public.cong_viec_danh_sach FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: dttg_dip_tham_hoi trg_dttg_dip_tham_hoi_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dttg_dip_tham_hoi_updated BEFORE UPDATE ON public.dttg_dip_tham_hoi FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: dttg_tham_hoi_ca_nhan trg_dttg_tham_hoi_ca_nhan_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dttg_tham_hoi_ca_nhan_updated BEFORE UPDATE ON public.dttg_tham_hoi_ca_nhan FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: dttg_tham_hoi_to_chuc trg_dttg_tham_hoi_to_chuc_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dttg_tham_hoi_to_chuc_updated BEFORE UPDATE ON public.dttg_tham_hoi_to_chuc FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu trg_dttg_thong_tin_ca_nhan_tieu_bieu_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dttg_thong_tin_ca_nhan_tieu_bieu_updated BEFORE UPDATE ON public.dttg_thong_tin_ca_nhan_tieu_bieu FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: dttg_thong_tin_to_chuc_quan_trong trg_dttg_thong_tin_to_chuc_quan_trong_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dttg_thong_tin_to_chuc_quan_trong_updated BEFORE UPDATE ON public.dttg_thong_tin_to_chuc_quan_trong FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: hngh_thong_tin_ho_ngheo trg_hngh_chuan_hoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hngh_chuan_hoa BEFORE INSERT OR UPDATE ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_chuan_hoa();


--
-- Name: hngh_thong_tin_ho_ngheo trg_hngh_kiem_dan_toc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hngh_kiem_dan_toc BEFORE INSERT OR UPDATE OF dan_toc_id ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_kiem_dan_toc_loai();


--
-- Name: hngh_thong_tin_ho_ngheo trg_hngh_lan_sang_nddk; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hngh_lan_sang_nddk AFTER UPDATE OF ho_ten_dai_dien, xa_phuong_id, khoi_xom, doi_tuong ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW WHEN (((old.ho_ten_dai_dien IS DISTINCT FROM new.ho_ten_dai_dien) OR (old.xa_phuong_id IS DISTINCT FROM new.xa_phuong_id) OR (old.khoi_xom IS DISTINCT FROM new.khoi_xom) OR (old.doi_tuong IS DISTINCT FROM new.doi_tuong))) EXECUTE FUNCTION public.fn_hngh_lan_sang_nddk();


--
-- Name: hngh_thong_tin_ho_ngheo trg_hngh_ngay_trang_thai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hngh_ngay_trang_thai BEFORE INSERT OR UPDATE ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.fn_hngh_set_ngay_trang_thai();


--
-- Name: hngh_thong_tin_ho_ngheo trg_hngh_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hngh_updated BEFORE UPDATE ON public.hngh_thong_tin_ho_ngheo FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_danh_muc_hang_hoa trg_kho_danh_muc_hang_hoa_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_danh_muc_hang_hoa_updated BEFORE UPDATE ON public.kho_danh_muc_hang_hoa FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_danh_sach_hang_hoa trg_kho_danh_sach_hang_hoa_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_danh_sach_hang_hoa_updated BEFORE UPDATE ON public.kho_danh_sach_hang_hoa FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_danh_sach_kho trg_kho_danh_sach_kho_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_danh_sach_kho_updated BEFORE UPDATE ON public.kho_danh_sach_kho FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_don_vi_cuu_tro trg_kho_don_vi_cuu_tro_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_don_vi_cuu_tro_updated BEFORE UPDATE ON public.kho_don_vi_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_dot_cuu_tro trg_kho_dot_cuu_tro_ngay_trang_thai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_dot_cuu_tro_ngay_trang_thai BEFORE INSERT OR UPDATE ON public.kho_dot_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.fn_gan_ngay_trang_thai();


--
-- Name: kho_dot_cuu_tro trg_kho_dot_cuu_tro_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_dot_cuu_tro_updated BEFORE UPDATE ON public.kho_dot_cuu_tro FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_danh_sach_kho trg_kho_gan_ten_theo_xa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_gan_ten_theo_xa BEFORE INSERT OR UPDATE OF ten_kho, don_vi_id ON public.kho_danh_sach_kho FOR EACH ROW EXECUTE FUNCTION public.fn_kho_gan_ten_theo_xa();


--
-- Name: kho_nhap_xuat_kho_ct trg_kho_nhap_xuat_kho_ct_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_nhap_xuat_kho_ct_updated BEFORE UPDATE ON public.kho_nhap_xuat_kho_ct FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_nhap_xuat_kho trg_kho_nhap_xuat_kho_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_nhap_xuat_kho_updated BEFORE UPDATE ON public.kho_nhap_xuat_kho FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: kho_nhap_xuat_kho trg_kho_nxk_chan_doi_loai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_nxk_chan_doi_loai BEFORE UPDATE OF loai_phieu ON public.kho_nhap_xuat_kho FOR EACH ROW EXECUTE FUNCTION public.fn_kho_chan_doi_loai_phieu();


--
-- Name: kho_nhap_xuat_kho_ct trg_kho_nxk_ct_kiem_tra_ton; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_nxk_ct_kiem_tra_ton BEFORE INSERT OR UPDATE ON public.kho_nhap_xuat_kho_ct FOR EACH ROW EXECUTE FUNCTION public.fn_kho_kiem_tra_ton_kho();


--
-- Name: kho_nhap_xuat_kho_ct trg_kho_nxk_ct_ton_am; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_kho_nxk_ct_ton_am AFTER INSERT OR DELETE OR UPDATE ON public.kho_nhap_xuat_kho_ct DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_kho_kiem_tra_ton_am_ct();


--
-- Name: kho_nhap_xuat_kho trg_kho_nxk_sinh_so_phieu; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kho_nxk_sinh_so_phieu BEFORE INSERT ON public.kho_nhap_xuat_kho FOR EACH ROW EXECUTE FUNCTION public.fn_kho_sinh_so_phieu();


--
-- Name: kho_nhap_xuat_kho trg_kho_nxk_ton_am; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_kho_nxk_ton_am AFTER INSERT OR DELETE OR UPDATE ON public.kho_nhap_xuat_kho DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_kho_kiem_tra_ton_am_phieu();


--
-- Name: ktnt_khen_thuong_nha_tai_tro trg_ktnt_gan_trang_thai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ktnt_gan_trang_thai BEFORE INSERT OR UPDATE ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.fn_ktnt_gan_trang_thai();


--
-- Name: ktnt_khen_thuong_nha_tai_tro trg_ktnt_kiem_quyen_phe_duyet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ktnt_kiem_quyen_phe_duyet BEFORE INSERT OR UPDATE OF trang_thai ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.fn_ktnt_kiem_quyen_phe_duyet();


--
-- Name: ktnt_khen_thuong_nha_tai_tro trg_ktnt_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ktnt_updated BEFORE UPDATE ON public.ktnt_khen_thuong_nha_tai_tro FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: luong_thiet_lap_bac_luong trg_luong_thiet_lap_bac_luong_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_luong_thiet_lap_bac_luong_updated BEFORE UPDATE ON public.luong_thiet_lap_bac_luong FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: luong_thiet_lap_cau_hinh trg_luong_thiet_lap_cau_hinh_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_luong_thiet_lap_cau_hinh_updated BEFORE UPDATE ON public.luong_thiet_lap_cau_hinh FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: luong_thiet_lap_ngach_luong trg_luong_thiet_lap_ngach_luong_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_luong_thiet_lap_ngach_luong_updated BEFORE UPDATE ON public.luong_thiet_lap_ngach_luong FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: luong_thiet_lap_ngach_luong trg_luong_thiet_lap_ngach_seed_bac; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_luong_thiet_lap_ngach_seed_bac AFTER INSERT ON public.luong_thiet_lap_ngach_luong FOR EACH ROW EXECUTE FUNCTION public.luong_thiet_lap_ngach_seed_bac();


--
-- Name: mttq_can_bo trg_mttq_can_bo_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_can_bo_updated BEFORE UPDATE ON public.mttq_can_bo FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_can_bo trg_mttq_can_bo_validate_refs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_can_bo_validate_refs BEFORE INSERT OR UPDATE ON public.mttq_can_bo FOR EACH ROW EXECUTE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai();


--
-- Name: mttq_diem_danh_uy_vien trg_mttq_diem_danh_uy_vien_khoa_ky; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_diem_danh_uy_vien_khoa_ky BEFORE INSERT OR DELETE OR UPDATE ON public.mttq_diem_danh_uy_vien FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_diem_danh();


--
-- Name: mttq_diem_danh_uy_vien trg_mttq_diem_danh_uy_vien_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_diem_danh_uy_vien_updated BEFORE UPDATE ON public.mttq_diem_danh_uy_vien FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_khen_thuong_ct trg_mttq_khen_thuong_ct_touch_parent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_khen_thuong_ct_touch_parent AFTER INSERT OR DELETE OR UPDATE ON public.mttq_khen_thuong_ct FOR EACH ROW EXECUTE FUNCTION public.mttq_khen_thuong_ct_touch_parent();


--
-- Name: mttq_khen_thuong trg_mttq_khen_thuong_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_khen_thuong_updated BEFORE UPDATE ON public.mttq_khen_thuong FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_ky_hop trg_mttq_ky_hop_khoa_ky; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_ky_hop_khoa_ky BEFORE INSERT OR DELETE OR UPDATE ON public.mttq_ky_hop FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_ky_hop();


--
-- Name: mttq_ky_hop trg_mttq_ky_hop_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_ky_hop_updated BEFORE UPDATE ON public.mttq_ky_hop FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_lop_tap_huan_ct trg_mttq_lop_tap_huan_ct_touch_parent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_lop_tap_huan_ct_touch_parent AFTER INSERT OR DELETE OR UPDATE ON public.mttq_lop_tap_huan_ct FOR EACH ROW EXECUTE FUNCTION public.mttq_lop_tap_huan_ct_touch_parent();


--
-- Name: mttq_lop_tap_huan trg_mttq_lop_tap_huan_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_lop_tap_huan_updated BEFORE UPDATE ON public.mttq_lop_tap_huan FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_lop_tap_huan trg_mttq_lop_tap_huan_validate_to_chuc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_lop_tap_huan_validate_to_chuc BEFORE INSERT OR UPDATE ON public.mttq_lop_tap_huan FOR EACH ROW EXECUTE FUNCTION public.mttq_lop_tap_huan_validate_to_chuc_loai();


--
-- Name: mttq_nhiem_ky trg_mttq_nhiem_ky_khoa_ky; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_nhiem_ky_khoa_ky BEFORE INSERT OR DELETE OR UPDATE ON public.mttq_nhiem_ky FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_nhiem_ky();


--
-- Name: mttq_nhiem_ky trg_mttq_nhiem_ky_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_nhiem_ky_updated BEFORE UPDATE ON public.mttq_nhiem_ky FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_tang_luong trg_mttq_tang_luong_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_tang_luong_updated BEFORE UPDATE ON public.mttq_tang_luong FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_thiet_lap trg_mttq_thiet_lap_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_thiet_lap_updated BEFORE UPDATE ON public.mttq_thiet_lap FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: mttq_uy_vien_uy_ban trg_mttq_uy_vien_uy_ban_khoa_ky; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_uy_vien_uy_ban_khoa_ky BEFORE INSERT OR DELETE OR UPDATE ON public.mttq_uy_vien_uy_ban FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_uy_vien();


--
-- Name: mttq_uy_vien_uy_ban trg_mttq_uy_vien_uy_ban_touch_nhiem_ky; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_uy_vien_uy_ban_touch_nhiem_ky AFTER INSERT OR DELETE OR UPDATE ON public.mttq_uy_vien_uy_ban FOR EACH ROW EXECUTE FUNCTION public.mttq_uy_vien_uy_ban_touch_nhiem_ky();


--
-- Name: mttq_uy_vien_uy_ban trg_mttq_uy_vien_uy_ban_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mttq_uy_vien_uy_ban_updated BEFORE UPDATE ON public.mttq_uy_vien_uy_ban FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: nddk_nha_dai_doan_ket trg_nddk_dong_bo_tu_ho_ngheo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nddk_dong_bo_tu_ho_ngheo BEFORE INSERT OR UPDATE OF ho_ngheo_id, ho_ten_chu_ho, xa_phuong_id, khoi_xom, doi_tuong ON public.nddk_nha_dai_doan_ket FOR EACH ROW WHEN ((pg_trigger_depth() < 2)) EXECUTE FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo();


--
-- Name: nddk_nha_dai_doan_ket trg_nddk_kiem_truong_bat_buoc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nddk_kiem_truong_bat_buoc BEFORE INSERT OR UPDATE OF trang_thai ON public.nddk_nha_dai_doan_ket FOR EACH ROW EXECUTE FUNCTION public.fn_nddk_kiem_truong_bat_buoc();


--
-- Name: nddk_nha_dai_doan_ket trg_nddk_ngay_trang_thai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nddk_ngay_trang_thai BEFORE INSERT OR UPDATE ON public.nddk_nha_dai_doan_ket FOR EACH ROW EXECUTE FUNCTION public.fn_nddk_set_ngay_trang_thai();


--
-- Name: nddk_nha_dai_doan_ket trg_nddk_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nddk_updated BEFORE UPDATE ON public.nddk_nha_dai_doan_ket FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: pbxh_thiet_lap trg_pbxh_thiet_lap_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pbxh_thiet_lap_updated BEFORE UPDATE ON public.pbxh_thiet_lap FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi trg_pbxh_thuc_hien_sync_phan_tram; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pbxh_thuc_hien_sync_phan_tram BEFORE INSERT OR UPDATE OF so_lan_hoan_thanh, so_lan_khao_sat ON public.pbxh_thuc_hien_phan_bien_xa_hoi FOR EACH ROW EXECUTE FUNCTION public.pbxh_thuc_hien_sync_phan_tram_hoan_thanh();


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi trg_pbxh_thuc_hien_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pbxh_thuc_hien_updated BEFORE UPDATE ON public.pbxh_thuc_hien_phan_bien_xa_hoi FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: tn_tiep_nhan trg_tn_chan_doi_nha_tai_tro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tn_chan_doi_nha_tai_tro BEFORE UPDATE OF nha_tai_tro_id ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_tn_chan_doi_nha_tai_tro();


--
-- Name: tn_tiep_nhan_phieu_kho trg_tn_kiem_phieu_kho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tn_kiem_phieu_kho BEFORE INSERT OR UPDATE ON public.tn_tiep_nhan_phieu_kho FOR EACH ROW EXECUTE FUNCTION public.fn_tn_kiem_phieu_kho();


--
-- Name: tn_tiep_nhan trg_tn_ngay_trang_thai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tn_ngay_trang_thai BEFORE INSERT OR UPDATE ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_gan_ngay_trang_thai();


--
-- Name: tn_tiep_nhan trg_tn_sinh_so_phieu; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tn_sinh_so_phieu BEFORE INSERT ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.fn_tn_sinh_so_phieu();


--
-- Name: tn_tiep_nhan trg_tn_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tn_updated BEFORE UPDATE ON public.tn_tiep_nhan FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_chuc_vu trg_var_chuc_vu_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_chuc_vu_updated BEFORE UPDATE ON public.var_chuc_vu FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_nhan_vien trg_var_nhan_vien_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_nhan_vien_updated BEFORE UPDATE ON public.var_nhan_vien FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_phan_quyen trg_var_phan_quyen_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_phan_quyen_updated BEFORE UPDATE ON public.var_phan_quyen FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_phong_ban trg_var_phong_ban_doi_cha; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_phong_ban_doi_cha BEFORE UPDATE OF cha_id ON public.var_phong_ban FOR EACH ROW EXECUTE FUNCTION public.fn_var_phong_ban_doi_cha();


--
-- Name: var_phong_ban trg_var_phong_ban_lan_nhanh; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_phong_ban_lan_nhanh AFTER UPDATE ON public.var_phong_ban FOR EACH ROW WHEN ((old.duong_dan IS DISTINCT FROM new.duong_dan)) EXECUTE FUNCTION public.fn_var_phong_ban_lan_nhanh();


--
-- Name: var_phong_ban trg_var_phong_ban_path_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_phong_ban_path_ins AFTER INSERT ON public.var_phong_ban FOR EACH ROW EXECUTE FUNCTION public.var_phong_ban_path_after_insert();


--
-- Name: var_phong_ban trg_var_phong_ban_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_phong_ban_updated BEFORE UPDATE ON public.var_phong_ban FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_ssn_tinh_thanh trg_var_ssn_tinh_thanh_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_ssn_tinh_thanh_updated BEFORE UPDATE ON public.var_ssn_tinh_thanh FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_ssn_xa_phuong trg_var_ssn_xa_phuong_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_ssn_xa_phuong_updated BEFORE UPDATE ON public.var_ssn_xa_phuong FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_thong_tin_to_chuc trg_var_thong_tin_to_chuc_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_var_thong_tin_to_chuc_updated BEFORE UPDATE ON public.var_thong_tin_to_chuc FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: vnn_chuong_trinh trg_vnn_kiem_truong_bat_buoc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vnn_kiem_truong_bat_buoc BEFORE INSERT OR UPDATE OF trang_thai ON public.vnn_chuong_trinh FOR EACH ROW EXECUTE FUNCTION public.fn_vnn_kiem_truong_bat_buoc();


--
-- Name: vnn_chuong_trinh trg_vnn_ngay_trang_thai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vnn_ngay_trang_thai BEFORE INSERT OR UPDATE ON public.vnn_chuong_trinh FOR EACH ROW EXECUTE FUNCTION public.fn_vnn_set_ngay_trang_thai();


--
-- Name: vnn_chuong_trinh trg_vnn_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vnn_updated BEFORE UPDATE ON public.vnn_chuong_trinh FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();


--
-- Name: var_ssn_xa_phuong trg_xa_phuong_dong_bo_ten_kho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_xa_phuong_dong_bo_ten_kho AFTER UPDATE OF ten ON public.var_ssn_xa_phuong FOR EACH ROW WHEN ((old.ten IS DISTINCT FROM new.ten)) EXECUTE FUNCTION public.fn_xa_phuong_dong_bo_ten_kho();


--
-- Name: bai_viet_danh_sach bai_viet_danh_sach_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bai_viet_danh_sach
    ADD CONSTRAINT bai_viet_danh_sach_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bai_viet_danh_sach bai_viet_danh_sach_id_nguon_dang_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bai_viet_danh_sach
    ADD CONSTRAINT bai_viet_danh_sach_id_nguon_dang_fkey FOREIGN KEY (id_nguon_dang) REFERENCES public.bai_viet_thiet_lap_khac(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bai_viet_danh_sach bai_viet_danh_sach_id_the_loai_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bai_viet_danh_sach
    ADD CONSTRAINT bai_viet_danh_sach_id_the_loai_fkey FOREIGN KEY (id_the_loai) REFERENCES public.bai_viet_thiet_lap_the_loai(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bai_viet_danh_sach bai_viet_danh_sach_id_trang_dang_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bai_viet_danh_sach
    ADD CONSTRAINT bai_viet_danh_sach_id_trang_dang_fkey FOREIGN KEY (id_trang_dang) REFERENCES public.bai_viet_thiet_lap_khac(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chuong_trinh_nam chuong_trinh_nam_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuong_trinh_nam
    ADD CONSTRAINT chuong_trinh_nam_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chuong_trinh_nam chuong_trinh_nam_id_phong_ban_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuong_trinh_nam
    ADD CONSTRAINT chuong_trinh_nam_id_phong_ban_fkey FOREIGN KEY (id_phong_ban) REFERENCES public.var_phong_ban(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cong_viec_danh_sach cong_viec_danh_sach_id_chuong_trinh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cong_viec_danh_sach
    ADD CONSTRAINT cong_viec_danh_sach_id_chuong_trinh_fkey FOREIGN KEY (id_chuong_trinh) REFERENCES public.chuong_trinh_nam(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cong_viec_danh_sach cong_viec_danh_sach_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cong_viec_danh_sach
    ADD CONSTRAINT cong_viec_danh_sach_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cong_viec_danh_sach cong_viec_danh_sach_id_trach_nhiem_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cong_viec_danh_sach
    ADD CONSTRAINT cong_viec_danh_sach_id_trach_nhiem_fkey FOREIGN KEY (id_trach_nhiem) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dttg_dip_tham_hoi dttg_dip_tham_hoi_don_vi_to_chuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_dip_tham_hoi
    ADD CONSTRAINT dttg_dip_tham_hoi_don_vi_to_chuc_id_fkey FOREIGN KEY (don_vi_to_chuc_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_dip_tham_hoi dttg_dip_tham_hoi_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_dip_tham_hoi
    ADD CONSTRAINT dttg_dip_tham_hoi_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dttg_dip_tham_hoi dttg_dip_tham_hoi_phong_ban_tham_muu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_dip_tham_hoi
    ADD CONSTRAINT dttg_dip_tham_hoi_phong_ban_tham_muu_id_fkey FOREIGN KEY (phong_ban_tham_muu_id) REFERENCES public.var_phong_ban(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_ca_nhan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_ca_nhan
    ADD CONSTRAINT dttg_tham_hoi_ca_nhan_ca_nhan_id_fkey FOREIGN KEY (ca_nhan_id) REFERENCES public.dttg_thong_tin_ca_nhan_tieu_bieu(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_dip_tham_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_ca_nhan
    ADD CONSTRAINT dttg_tham_hoi_ca_nhan_dip_tham_hoi_id_fkey FOREIGN KEY (dip_tham_hoi_id) REFERENCES public.dttg_dip_tham_hoi(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_don_vi_tham_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_ca_nhan
    ADD CONSTRAINT dttg_tham_hoi_ca_nhan_don_vi_tham_hoi_id_fkey FOREIGN KEY (don_vi_tham_hoi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_ca_nhan
    ADD CONSTRAINT dttg_tham_hoi_ca_nhan_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_phong_ban_tham_muu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_ca_nhan
    ADD CONSTRAINT dttg_tham_hoi_ca_nhan_phong_ban_tham_muu_id_fkey FOREIGN KEY (phong_ban_tham_muu_id) REFERENCES public.var_phong_ban(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_xa_phuong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_ca_nhan
    ADD CONSTRAINT dttg_tham_hoi_ca_nhan_xa_phuong_id_fkey FOREIGN KEY (xa_phuong_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_dip_tham_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_to_chuc
    ADD CONSTRAINT dttg_tham_hoi_to_chuc_dip_tham_hoi_id_fkey FOREIGN KEY (dip_tham_hoi_id) REFERENCES public.dttg_dip_tham_hoi(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_don_vi_tham_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_to_chuc
    ADD CONSTRAINT dttg_tham_hoi_to_chuc_don_vi_tham_hoi_id_fkey FOREIGN KEY (don_vi_tham_hoi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_to_chuc
    ADD CONSTRAINT dttg_tham_hoi_to_chuc_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_phong_ban_tham_muu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_to_chuc
    ADD CONSTRAINT dttg_tham_hoi_to_chuc_phong_ban_tham_muu_id_fkey FOREIGN KEY (phong_ban_tham_muu_id) REFERENCES public.var_phong_ban(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_to_chuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_tham_hoi_to_chuc
    ADD CONSTRAINT dttg_tham_hoi_to_chuc_to_chuc_id_fkey FOREIGN KEY (to_chuc_id) REFERENCES public.dttg_thong_tin_to_chuc_quan_trong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu dttg_thong_tin_ca_nhan_tieu_bieu_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_thong_tin_ca_nhan_tieu_bieu
    ADD CONSTRAINT dttg_thong_tin_ca_nhan_tieu_bieu_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu dttg_thong_tin_ca_nhan_tieu_bieu_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_thong_tin_ca_nhan_tieu_bieu
    ADD CONSTRAINT dttg_thong_tin_ca_nhan_tieu_bieu_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dttg_thong_tin_to_chuc_quan_trong dttg_thong_tin_to_chuc_quan_trong_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_thong_tin_to_chuc_quan_trong
    ADD CONSTRAINT dttg_thong_tin_to_chuc_quan_trong_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dttg_thong_tin_to_chuc_quan_trong dttg_thong_tin_to_chuc_quan_trong_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dttg_thong_tin_to_chuc_quan_trong
    ADD CONSTRAINT dttg_thong_tin_to_chuc_quan_trong_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_dan_toc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hngh_thong_tin_ho_ngheo
    ADD CONSTRAINT hngh_thong_tin_ho_ngheo_dan_toc_id_fkey FOREIGN KEY (dan_toc_id) REFERENCES public.mttq_thiet_lap(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hngh_thong_tin_ho_ngheo
    ADD CONSTRAINT hngh_thong_tin_ho_ngheo_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hngh_thong_tin_ho_ngheo
    ADD CONSTRAINT hngh_thong_tin_ho_ngheo_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_xa_phuong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hngh_thong_tin_ho_ngheo
    ADD CONSTRAINT hngh_thong_tin_ho_ngheo_xa_phuong_id_fkey FOREIGN KEY (xa_phuong_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_danh_muc_hang_hoa kho_danh_muc_hang_hoa_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_muc_hang_hoa
    ADD CONSTRAINT kho_danh_muc_hang_hoa_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_danh_muc_hang_hoa kho_danh_muc_hang_hoa_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_muc_hang_hoa
    ADD CONSTRAINT kho_danh_muc_hang_hoa_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_id_danh_muc_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_hang_hoa
    ADD CONSTRAINT kho_danh_sach_hang_hoa_id_danh_muc_fkey FOREIGN KEY (id_danh_muc) REFERENCES public.kho_danh_muc_hang_hoa(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_hang_hoa
    ADD CONSTRAINT kho_danh_sach_hang_hoa_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_hang_hoa
    ADD CONSTRAINT kho_danh_sach_hang_hoa_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_kho
    ADD CONSTRAINT kho_danh_sach_kho_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_kho
    ADD CONSTRAINT kho_danh_sach_kho_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_danh_sach_kho
    ADD CONSTRAINT kho_danh_sach_kho_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_don_vi_gioi_thieu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_don_vi_cuu_tro
    ADD CONSTRAINT kho_don_vi_cuu_tro_don_vi_gioi_thieu_id_fkey FOREIGN KEY (don_vi_gioi_thieu_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_don_vi_cuu_tro
    ADD CONSTRAINT kho_don_vi_cuu_tro_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_don_vi_cuu_tro
    ADD CONSTRAINT kho_don_vi_cuu_tro_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_don_vi_chu_tri_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_dot_cuu_tro
    ADD CONSTRAINT kho_dot_cuu_tro_don_vi_chu_tri_id_fkey FOREIGN KEY (don_vi_chu_tri_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_dot_cuu_tro
    ADD CONSTRAINT kho_dot_cuu_tro_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_dot_cuu_tro
    ADD CONSTRAINT kho_dot_cuu_tro_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_nhap_xuat_kho_ct kho_nhap_xuat_kho_ct_hang_hoa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho_ct
    ADD CONSTRAINT kho_nhap_xuat_kho_ct_hang_hoa_fkey FOREIGN KEY (hang_hoa_id) REFERENCES public.kho_danh_sach_hang_hoa(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_nhap_xuat_kho_ct kho_nhap_xuat_kho_ct_phieu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho_ct
    ADD CONSTRAINT kho_nhap_xuat_kho_ct_phieu_fkey FOREIGN KEY (phieu_id) REFERENCES public.kho_nhap_xuat_kho(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_don_vi_cuu_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_don_vi_cuu_tro_id_fkey FOREIGN KEY (don_vi_cuu_tro_id) REFERENCES public.kho_don_vi_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_dot_cuu_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_dot_cuu_tro_id_fkey FOREIGN KEY (dot_cuu_tro_id) REFERENCES public.kho_dot_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_ho_ngheo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_ho_ngheo_id_fkey FOREIGN KEY (ho_ngheo_id) REFERENCES public.hngh_thong_tin_ho_ngheo(id) ON DELETE RESTRICT;


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_kho_nhap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_kho_nhap_id_fkey FOREIGN KEY (kho_nhap_id) REFERENCES public.kho_danh_sach_kho(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_kho_xuat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kho_nhap_xuat_kho
    ADD CONSTRAINT kho_nhap_xuat_kho_kho_xuat_id_fkey FOREIGN KEY (kho_xuat_id) REFERENCES public.kho_danh_sach_kho(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_khen_thuong_nha_tai_tro_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ktnt_khen_thuong_nha_tai_tro
    ADD CONSTRAINT ktnt_khen_thuong_nha_tai_tro_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_khen_thuong_nha_tai_tro_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ktnt_khen_thuong_nha_tai_tro
    ADD CONSTRAINT ktnt_khen_thuong_nha_tai_tro_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_khen_thuong_nha_tai_tro_nguoi_duyet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ktnt_khen_thuong_nha_tai_tro
    ADD CONSTRAINT ktnt_khen_thuong_nha_tai_tro_nguoi_duyet_id_fkey FOREIGN KEY (nguoi_duyet_id) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_khen_thuong_nha_tai_tro_nha_tai_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ktnt_khen_thuong_nha_tai_tro
    ADD CONSTRAINT ktnt_khen_thuong_nha_tai_tro_nha_tai_tro_id_fkey FOREIGN KEY (nha_tai_tro_id) REFERENCES public.kho_don_vi_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_khen_thuong_nha_tai_tro_xa_phuong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ktnt_khen_thuong_nha_tai_tro
    ADD CONSTRAINT ktnt_khen_thuong_nha_tai_tro_xa_phuong_id_fkey FOREIGN KEY (xa_phuong_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lich_su_trang_thai lich_su_trang_thai_nguoi_thuc_hien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lich_su_trang_thai
    ADD CONSTRAINT lich_su_trang_thai_nguoi_thuc_hien_id_fkey FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: luong_thiet_lap_bac_luong luong_thiet_lap_bac_luong_ngach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luong_thiet_lap_bac_luong
    ADD CONSTRAINT luong_thiet_lap_bac_luong_ngach_id_fkey FOREIGN KEY (ngach_id) REFERENCES public.luong_thiet_lap_ngach_luong(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mttq_can_bo mttq_can_bo_chuc_vu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_chuc_vu_id_fkey FOREIGN KEY (chuc_vu_id) REFERENCES public.var_chuc_vu(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_can_bo mttq_can_bo_dan_toc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_dan_toc_id_fkey FOREIGN KEY (dan_toc_id) REFERENCES public.mttq_thiet_lap(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_can_bo mttq_can_bo_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mttq_can_bo mttq_can_bo_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_can_bo mttq_can_bo_ly_luan_chinh_tri_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_ly_luan_chinh_tri_id_fkey FOREIGN KEY (ly_luan_chinh_tri_id) REFERENCES public.mttq_thiet_lap(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_can_bo mttq_can_bo_phong_ban_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_phong_ban_id_fkey FOREIGN KEY (phong_ban_id) REFERENCES public.var_phong_ban(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mttq_can_bo mttq_can_bo_trang_thai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_trang_thai_id_fkey FOREIGN KEY (trang_thai_id) REFERENCES public.mttq_thiet_lap(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_can_bo mttq_can_bo_trinh_do_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_can_bo
    ADD CONSTRAINT mttq_can_bo_trinh_do_id_fkey FOREIGN KEY (trinh_do_id) REFERENCES public.mttq_thiet_lap(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_diem_danh_uy_vien mttq_diem_danh_uy_vien_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_diem_danh_uy_vien
    ADD CONSTRAINT mttq_diem_danh_uy_vien_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_diem_danh_uy_vien mttq_diem_danh_uy_vien_ky_hop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_diem_danh_uy_vien
    ADD CONSTRAINT mttq_diem_danh_uy_vien_ky_hop_id_fkey FOREIGN KEY (ky_hop_id) REFERENCES public.mttq_ky_hop(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_diem_danh_uy_vien mttq_diem_danh_uy_vien_uy_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_diem_danh_uy_vien
    ADD CONSTRAINT mttq_diem_danh_uy_vien_uy_vien_id_fkey FOREIGN KEY (uy_vien_id) REFERENCES public.mttq_uy_vien_uy_ban(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_khen_thuong_ct mttq_khen_thuong_ct_can_bo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_khen_thuong_ct
    ADD CONSTRAINT mttq_khen_thuong_ct_can_bo_id_fkey FOREIGN KEY (can_bo_id) REFERENCES public.mttq_can_bo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_khen_thuong_ct mttq_khen_thuong_ct_id_khen_thuong_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_khen_thuong_ct
    ADD CONSTRAINT mttq_khen_thuong_ct_id_khen_thuong_fkey FOREIGN KEY (id_khen_thuong) REFERENCES public.mttq_khen_thuong(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mttq_khen_thuong mttq_khen_thuong_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_khen_thuong
    ADD CONSTRAINT mttq_khen_thuong_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_khen_thuong mttq_khen_thuong_nguoi_duyet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_khen_thuong
    ADD CONSTRAINT mttq_khen_thuong_nguoi_duyet_id_fkey FOREIGN KEY (nguoi_duyet_id) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mttq_ky_hop mttq_ky_hop_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_ky_hop
    ADD CONSTRAINT mttq_ky_hop_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_ky_hop mttq_ky_hop_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_ky_hop
    ADD CONSTRAINT mttq_ky_hop_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_ky_hop mttq_ky_hop_nguoi_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_ky_hop
    ADD CONSTRAINT mttq_ky_hop_nguoi_khoa_id_fkey FOREIGN KEY (nguoi_khoa_id) REFERENCES public.var_nhan_vien(id);


--
-- Name: mttq_ky_hop mttq_ky_hop_nhiem_ky_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_ky_hop
    ADD CONSTRAINT mttq_ky_hop_nhiem_ky_id_fkey FOREIGN KEY (nhiem_ky_id) REFERENCES public.mttq_nhiem_ky(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_lop_tap_huan_ct mttq_lop_tap_huan_ct_can_bo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_lop_tap_huan_ct
    ADD CONSTRAINT mttq_lop_tap_huan_ct_can_bo_id_fkey FOREIGN KEY (can_bo_id) REFERENCES public.mttq_can_bo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_lop_tap_huan_ct mttq_lop_tap_huan_ct_id_lop_tap_huan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_lop_tap_huan_ct
    ADD CONSTRAINT mttq_lop_tap_huan_ct_id_lop_tap_huan_fkey FOREIGN KEY (id_lop_tap_huan) REFERENCES public.mttq_lop_tap_huan(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mttq_lop_tap_huan mttq_lop_tap_huan_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_lop_tap_huan
    ADD CONSTRAINT mttq_lop_tap_huan_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mttq_lop_tap_huan mttq_lop_tap_huan_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_lop_tap_huan
    ADD CONSTRAINT mttq_lop_tap_huan_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_lop_tap_huan mttq_lop_tap_huan_to_chuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_lop_tap_huan
    ADD CONSTRAINT mttq_lop_tap_huan_to_chuc_id_fkey FOREIGN KEY (to_chuc_id) REFERENCES public.mttq_thiet_lap(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_nhiem_ky mttq_nhiem_ky_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_nhiem_ky
    ADD CONSTRAINT mttq_nhiem_ky_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_nhiem_ky mttq_nhiem_ky_nguoi_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_nhiem_ky
    ADD CONSTRAINT mttq_nhiem_ky_nguoi_khoa_id_fkey FOREIGN KEY (nguoi_khoa_id) REFERENCES public.var_nhan_vien(id);


--
-- Name: mttq_tang_luong mttq_tang_luong_bac_cu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_tang_luong
    ADD CONSTRAINT mttq_tang_luong_bac_cu_fkey FOREIGN KEY (bac_luong_id_cu) REFERENCES public.luong_thiet_lap_bac_luong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mttq_tang_luong mttq_tang_luong_bac_moi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_tang_luong
    ADD CONSTRAINT mttq_tang_luong_bac_moi_fkey FOREIGN KEY (bac_luong_id_moi) REFERENCES public.luong_thiet_lap_bac_luong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_tang_luong mttq_tang_luong_can_bo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_tang_luong
    ADD CONSTRAINT mttq_tang_luong_can_bo_id_fkey FOREIGN KEY (can_bo_id) REFERENCES public.mttq_can_bo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_tang_luong mttq_tang_luong_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_tang_luong
    ADD CONSTRAINT mttq_tang_luong_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_tang_luong mttq_tang_luong_ngach_cu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_tang_luong
    ADD CONSTRAINT mttq_tang_luong_ngach_cu_fkey FOREIGN KEY (ngach_luong_id_cu) REFERENCES public.luong_thiet_lap_ngach_luong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mttq_tang_luong mttq_tang_luong_ngach_moi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_tang_luong
    ADD CONSTRAINT mttq_tang_luong_ngach_moi_fkey FOREIGN KEY (ngach_luong_id_moi) REFERENCES public.luong_thiet_lap_ngach_luong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_uy_vien_uy_ban mttq_uy_vien_uy_ban_can_bo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_uy_vien_uy_ban
    ADD CONSTRAINT mttq_uy_vien_uy_ban_can_bo_id_fkey FOREIGN KEY (can_bo_id) REFERENCES public.mttq_can_bo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_uy_vien_uy_ban mttq_uy_vien_uy_ban_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_uy_vien_uy_ban
    ADD CONSTRAINT mttq_uy_vien_uy_ban_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_uy_vien_uy_ban mttq_uy_vien_uy_ban_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_uy_vien_uy_ban
    ADD CONSTRAINT mttq_uy_vien_uy_ban_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: mttq_uy_vien_uy_ban mttq_uy_vien_uy_ban_nhiem_ky_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mttq_uy_vien_uy_ban
    ADD CONSTRAINT mttq_uy_vien_uy_ban_nhiem_ky_id_fkey FOREIGN KEY (nhiem_ky_id) REFERENCES public.mttq_nhiem_ky(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_ho_ngheo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nddk_nha_dai_doan_ket
    ADD CONSTRAINT nddk_nha_dai_doan_ket_ho_ngheo_id_fkey FOREIGN KEY (ho_ngheo_id) REFERENCES public.hngh_thong_tin_ho_ngheo(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nddk_nha_dai_doan_ket
    ADD CONSTRAINT nddk_nha_dai_doan_ket_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nddk_nha_dai_doan_ket
    ADD CONSTRAINT nddk_nha_dai_doan_ket_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_nha_tai_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nddk_nha_dai_doan_ket
    ADD CONSTRAINT nddk_nha_dai_doan_ket_nha_tai_tro_id_fkey FOREIGN KEY (nha_tai_tro_id) REFERENCES public.kho_don_vi_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_xa_phuong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nddk_nha_dai_doan_ket
    ADD CONSTRAINT nddk_nha_dai_doan_ket_xa_phuong_id_fkey FOREIGN KEY (xa_phuong_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_doi_tuong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thuc_hien_phan_bien_xa_hoi
    ADD CONSTRAINT pbxh_thuc_hien_doi_tuong_id_fkey FOREIGN KEY (doi_tuong_id) REFERENCES public.pbxh_thiet_lap(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_don_vi_chu_tri_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thuc_hien_phan_bien_xa_hoi
    ADD CONSTRAINT pbxh_thuc_hien_don_vi_chu_tri_id_fkey FOREIGN KEY (don_vi_chu_tri_id) REFERENCES public.pbxh_thiet_lap(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_don_vi_thuc_hien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thuc_hien_phan_bien_xa_hoi
    ADD CONSTRAINT pbxh_thuc_hien_don_vi_thuc_hien_id_fkey FOREIGN KEY (don_vi_thuc_hien_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_hinh_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thuc_hien_phan_bien_xa_hoi
    ADD CONSTRAINT pbxh_thuc_hien_hinh_thuc_id_fkey FOREIGN KEY (hinh_thuc_id) REFERENCES public.pbxh_thiet_lap(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thuc_hien_phan_bien_xa_hoi
    ADD CONSTRAINT pbxh_thuc_hien_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_phong_ban_tham_muu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbxh_thuc_hien_phan_bien_xa_hoi
    ADD CONSTRAINT pbxh_thuc_hien_phong_ban_tham_muu_id_fkey FOREIGN KEY (phong_ban_tham_muu_id) REFERENCES public.var_phong_ban(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: thong_bao thong_bao_nhan_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thong_bao
    ADD CONSTRAINT thong_bao_nhan_vien_id_fkey FOREIGN KEY (nhan_vien_id) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tn_tiep_nhan tn_tiep_nhan_chuong_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan
    ADD CONSTRAINT tn_tiep_nhan_chuong_trinh_id_fkey FOREIGN KEY (chuong_trinh_id) REFERENCES public.kho_dot_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tn_tiep_nhan tn_tiep_nhan_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan
    ADD CONSTRAINT tn_tiep_nhan_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tn_tiep_nhan tn_tiep_nhan_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan
    ADD CONSTRAINT tn_tiep_nhan_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tn_tiep_nhan tn_tiep_nhan_nha_tai_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan
    ADD CONSTRAINT tn_tiep_nhan_nha_tai_tro_id_fkey FOREIGN KEY (nha_tai_tro_id) REFERENCES public.kho_don_vi_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tn_tiep_nhan_phieu_kho tn_tiep_nhan_phieu_kho_phieu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan_phieu_kho
    ADD CONSTRAINT tn_tiep_nhan_phieu_kho_phieu_id_fkey FOREIGN KEY (phieu_id) REFERENCES public.kho_nhap_xuat_kho(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tn_tiep_nhan_phieu_kho tn_tiep_nhan_phieu_kho_tiep_nhan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tn_tiep_nhan_phieu_kho
    ADD CONSTRAINT tn_tiep_nhan_phieu_kho_tiep_nhan_id_fkey FOREIGN KEY (tiep_nhan_id) REFERENCES public.tn_tiep_nhan(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: var_chuc_vu var_chuc_vu_phong_ban_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_chuc_vu
    ADD CONSTRAINT var_chuc_vu_phong_ban_id_fkey FOREIGN KEY (phong_ban_id) REFERENCES public.var_phong_ban(id) ON DELETE SET NULL;


--
-- Name: var_nhan_vien var_nhan_vien_don_vi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_nhan_vien
    ADD CONSTRAINT var_nhan_vien_don_vi_id_fkey FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong(id) ON DELETE SET NULL;


--
-- Name: var_nhan_vien var_nhan_vien_id_chuc_vu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_nhan_vien
    ADD CONSTRAINT var_nhan_vien_id_chuc_vu_fkey FOREIGN KEY (id_chuc_vu) REFERENCES public.var_chuc_vu(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: var_nhan_vien var_nhan_vien_id_phong_ban_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_nhan_vien
    ADD CONSTRAINT var_nhan_vien_id_phong_ban_fkey FOREIGN KEY (id_phong_ban) REFERENCES public.var_phong_ban(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: var_phan_quyen var_phan_quyen_chuc_vu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_phan_quyen
    ADD CONSTRAINT var_phan_quyen_chuc_vu_id_fkey FOREIGN KEY (chuc_vu_id) REFERENCES public.var_chuc_vu(id) ON DELETE CASCADE;


--
-- Name: var_phong_ban var_phong_ban_cha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_phong_ban
    ADD CONSTRAINT var_phong_ban_cha_id_fkey FOREIGN KEY (cha_id) REFERENCES public.var_phong_ban(id) ON DELETE SET NULL;


--
-- Name: var_ssn_xa_phuong var_ssn_xa_phuong_id_tinh_thanh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.var_ssn_xa_phuong
    ADD CONSTRAINT var_ssn_xa_phuong_id_tinh_thanh_fkey FOREIGN KEY (id_tinh_thanh) REFERENCES public.var_ssn_tinh_thanh(id) ON DELETE CASCADE;


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_don_vi_ho_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vnn_chuong_trinh
    ADD CONSTRAINT vnn_chuong_trinh_don_vi_ho_tro_id_fkey FOREIGN KEY (don_vi_ho_tro_id) REFERENCES public.kho_don_vi_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_ho_ngheo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vnn_chuong_trinh
    ADD CONSTRAINT vnn_chuong_trinh_ho_ngheo_id_fkey FOREIGN KEY (ho_ngheo_id) REFERENCES public.hngh_thong_tin_ho_ngheo(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_id_nguoi_cap_nhat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vnn_chuong_trinh
    ADD CONSTRAINT vnn_chuong_trinh_id_nguoi_cap_nhat_fkey FOREIGN KEY (id_nguoi_cap_nhat) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_id_nguoi_tao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vnn_chuong_trinh
    ADD CONSTRAINT vnn_chuong_trinh_id_nguoi_tao_fkey FOREIGN KEY (id_nguoi_tao) REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_xa_phuong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vnn_chuong_trinh
    ADD CONSTRAINT vnn_chuong_trinh_xa_phuong_id_fkey FOREIGN KEY (xa_phuong_id) REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_select ON public.audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: bai_viet_danh_sach; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bai_viet_danh_sach ENABLE ROW LEVEL SECURITY;

--
-- Name: bai_viet_danh_sach bai_viet_danh_sach_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bai_viet_danh_sach_modify ON public.bai_viet_danh_sach TO authenticated USING (true) WITH CHECK (true);


--
-- Name: bai_viet_danh_sach bai_viet_danh_sach_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bai_viet_danh_sach_select ON public.bai_viet_danh_sach FOR SELECT TO authenticated USING (true);


--
-- Name: bai_viet_thiet_lap_khac; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bai_viet_thiet_lap_khac ENABLE ROW LEVEL SECURITY;

--
-- Name: bai_viet_thiet_lap_khac bai_viet_thiet_lap_khac_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bai_viet_thiet_lap_khac_modify ON public.bai_viet_thiet_lap_khac TO authenticated USING (true) WITH CHECK (true);


--
-- Name: bai_viet_thiet_lap_khac bai_viet_thiet_lap_khac_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bai_viet_thiet_lap_khac_select ON public.bai_viet_thiet_lap_khac FOR SELECT TO authenticated USING (true);


--
-- Name: bai_viet_thiet_lap_the_loai; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bai_viet_thiet_lap_the_loai ENABLE ROW LEVEL SECURITY;

--
-- Name: bai_viet_thiet_lap_the_loai bai_viet_thiet_lap_the_loai_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bai_viet_thiet_lap_the_loai_modify ON public.bai_viet_thiet_lap_the_loai TO authenticated USING (true) WITH CHECK (true);


--
-- Name: bai_viet_thiet_lap_the_loai bai_viet_thiet_lap_the_loai_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bai_viet_thiet_lap_the_loai_select ON public.bai_viet_thiet_lap_the_loai FOR SELECT TO authenticated USING (true);


--
-- Name: chuong_trinh_nam; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chuong_trinh_nam ENABLE ROW LEVEL SECURITY;

--
-- Name: chuong_trinh_nam chuong_trinh_nam_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chuong_trinh_nam_modify ON public.chuong_trinh_nam TO authenticated USING (true) WITH CHECK (true);


--
-- Name: chuong_trinh_nam chuong_trinh_nam_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chuong_trinh_nam_select ON public.chuong_trinh_nam FOR SELECT TO authenticated USING (true);


--
-- Name: cong_viec_danh_sach; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cong_viec_danh_sach ENABLE ROW LEVEL SECURITY;

--
-- Name: cong_viec_danh_sach cong_viec_danh_sach_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cong_viec_danh_sach_modify ON public.cong_viec_danh_sach TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cong_viec_danh_sach cong_viec_danh_sach_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cong_viec_danh_sach_select ON public.cong_viec_danh_sach FOR SELECT TO authenticated USING (true);


--
-- Name: dttg_dip_tham_hoi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dttg_dip_tham_hoi ENABLE ROW LEVEL SECURITY;

--
-- Name: dttg_dip_tham_hoi dttg_dip_tham_hoi_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_dip_tham_hoi_modify ON public.dttg_dip_tham_hoi TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dttg_dip_tham_hoi dttg_dip_tham_hoi_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_dip_tham_hoi_select ON public.dttg_dip_tham_hoi FOR SELECT TO authenticated USING (true);


--
-- Name: dttg_tham_hoi_ca_nhan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dttg_tham_hoi_ca_nhan ENABLE ROW LEVEL SECURITY;

--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_tham_hoi_ca_nhan_modify ON public.dttg_tham_hoi_ca_nhan TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dttg_tham_hoi_ca_nhan dttg_tham_hoi_ca_nhan_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_tham_hoi_ca_nhan_select ON public.dttg_tham_hoi_ca_nhan FOR SELECT TO authenticated USING (true);


--
-- Name: dttg_tham_hoi_to_chuc; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dttg_tham_hoi_to_chuc ENABLE ROW LEVEL SECURITY;

--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_tham_hoi_to_chuc_modify ON public.dttg_tham_hoi_to_chuc TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dttg_tham_hoi_to_chuc dttg_tham_hoi_to_chuc_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_tham_hoi_to_chuc_select ON public.dttg_tham_hoi_to_chuc FOR SELECT TO authenticated USING (true);


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dttg_thong_tin_ca_nhan_tieu_bieu ENABLE ROW LEVEL SECURITY;

--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu dttg_thong_tin_ca_nhan_tieu_bieu_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_thong_tin_ca_nhan_tieu_bieu_modify ON public.dttg_thong_tin_ca_nhan_tieu_bieu TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dttg_thong_tin_ca_nhan_tieu_bieu dttg_thong_tin_ca_nhan_tieu_bieu_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_thong_tin_ca_nhan_tieu_bieu_select ON public.dttg_thong_tin_ca_nhan_tieu_bieu FOR SELECT TO authenticated USING (true);


--
-- Name: dttg_thong_tin_to_chuc_quan_trong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dttg_thong_tin_to_chuc_quan_trong ENABLE ROW LEVEL SECURITY;

--
-- Name: dttg_thong_tin_to_chuc_quan_trong dttg_thong_tin_to_chuc_quan_trong_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_thong_tin_to_chuc_quan_trong_modify ON public.dttg_thong_tin_to_chuc_quan_trong TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dttg_thong_tin_to_chuc_quan_trong dttg_thong_tin_to_chuc_quan_trong_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dttg_thong_tin_to_chuc_quan_trong_select ON public.dttg_thong_tin_to_chuc_quan_trong FOR SELECT TO authenticated USING (true);


--
-- Name: hngh_thong_tin_ho_ngheo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hngh_thong_tin_ho_ngheo ENABLE ROW LEVEL SECURITY;

--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_doc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hngh_thong_tin_ho_ngheo_doc ON public.hngh_thong_tin_ho_ngheo FOR SELECT TO authenticated USING (true);


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hngh_thong_tin_ho_ngheo_sua ON public.hngh_thong_tin_ho_ngheo FOR UPDATE TO authenticated USING (public.fn_co_quyen('thong-tin-ho-ngheo'::text, 'sua'::text)) WITH CHECK (public.fn_co_quyen('thong-tin-ho-ngheo'::text, 'sua'::text));


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hngh_thong_tin_ho_ngheo_them ON public.hngh_thong_tin_ho_ngheo FOR INSERT TO authenticated WITH CHECK (public.fn_co_quyen('thong-tin-ho-ngheo'::text, 'them'::text));


--
-- Name: hngh_thong_tin_ho_ngheo hngh_thong_tin_ho_ngheo_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hngh_thong_tin_ho_ngheo_xoa ON public.hngh_thong_tin_ho_ngheo FOR DELETE TO authenticated USING (public.fn_co_quyen('thong-tin-ho-ngheo'::text, 'xoa'::text));


--
-- Name: kho_danh_muc_hang_hoa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kho_danh_muc_hang_hoa ENABLE ROW LEVEL SECURITY;

--
-- Name: kho_danh_muc_hang_hoa kho_danh_muc_hang_hoa_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_muc_hang_hoa_select ON public.kho_danh_muc_hang_hoa FOR SELECT TO authenticated USING (true);


--
-- Name: kho_danh_muc_hang_hoa kho_danh_muc_hang_hoa_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_muc_hang_hoa_sua ON public.kho_danh_muc_hang_hoa FOR UPDATE TO authenticated USING (( SELECT public.fn_co_quyen('hang-hoa'::text, 'sua'::text) AS fn_co_quyen)) WITH CHECK (( SELECT public.fn_co_quyen('hang-hoa'::text, 'sua'::text) AS fn_co_quyen));


--
-- Name: kho_danh_muc_hang_hoa kho_danh_muc_hang_hoa_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_muc_hang_hoa_them ON public.kho_danh_muc_hang_hoa FOR INSERT TO authenticated WITH CHECK (( SELECT public.fn_co_quyen('hang-hoa'::text, 'them'::text) AS fn_co_quyen));


--
-- Name: kho_danh_muc_hang_hoa kho_danh_muc_hang_hoa_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_muc_hang_hoa_xoa ON public.kho_danh_muc_hang_hoa FOR DELETE TO authenticated USING (( SELECT public.fn_co_quyen('hang-hoa'::text, 'xoa'::text) AS fn_co_quyen));


--
-- Name: kho_danh_sach_hang_hoa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kho_danh_sach_hang_hoa ENABLE ROW LEVEL SECURITY;

--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_hang_hoa_select ON public.kho_danh_sach_hang_hoa FOR SELECT TO authenticated USING (true);


--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_hang_hoa_sua ON public.kho_danh_sach_hang_hoa FOR UPDATE TO authenticated USING (( SELECT public.fn_co_quyen('hang-hoa'::text, 'sua'::text) AS fn_co_quyen)) WITH CHECK (( SELECT public.fn_co_quyen('hang-hoa'::text, 'sua'::text) AS fn_co_quyen));


--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_hang_hoa_them ON public.kho_danh_sach_hang_hoa FOR INSERT TO authenticated WITH CHECK (( SELECT public.fn_co_quyen('hang-hoa'::text, 'them'::text) AS fn_co_quyen));


--
-- Name: kho_danh_sach_hang_hoa kho_danh_sach_hang_hoa_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_hang_hoa_xoa ON public.kho_danh_sach_hang_hoa FOR DELETE TO authenticated USING (( SELECT public.fn_co_quyen('hang-hoa'::text, 'xoa'::text) AS fn_co_quyen));


--
-- Name: kho_danh_sach_kho; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kho_danh_sach_kho ENABLE ROW LEVEL SECURITY;

--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_kho_select ON public.kho_danh_sach_kho FOR SELECT TO authenticated USING (true);


--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_kho_sua ON public.kho_danh_sach_kho FOR UPDATE TO authenticated USING ((( SELECT public.fn_co_quyen('danh-sach-kho'::text, 'sua'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (don_vi_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi))))) WITH CHECK ((( SELECT public.fn_co_quyen('danh-sach-kho'::text, 'sua'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (don_vi_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi)))));


--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_kho_them ON public.kho_danh_sach_kho FOR INSERT TO authenticated WITH CHECK ((( SELECT public.fn_co_quyen('danh-sach-kho'::text, 'them'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (don_vi_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi)))));


--
-- Name: kho_danh_sach_kho kho_danh_sach_kho_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_danh_sach_kho_xoa ON public.kho_danh_sach_kho FOR DELETE TO authenticated USING ((( SELECT public.fn_co_quyen('danh-sach-kho'::text, 'xoa'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (don_vi_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi)))));


--
-- Name: kho_don_vi_cuu_tro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kho_don_vi_cuu_tro ENABLE ROW LEVEL SECURITY;

--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_don_vi_cuu_tro_select ON public.kho_don_vi_cuu_tro FOR SELECT TO authenticated USING (true);


--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_don_vi_cuu_tro_sua ON public.kho_don_vi_cuu_tro FOR UPDATE TO authenticated USING (( SELECT public.fn_co_quyen('don-vi-cuu-tro'::text, 'sua'::text) AS fn_co_quyen)) WITH CHECK (( SELECT public.fn_co_quyen('don-vi-cuu-tro'::text, 'sua'::text) AS fn_co_quyen));


--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_don_vi_cuu_tro_them ON public.kho_don_vi_cuu_tro FOR INSERT TO authenticated WITH CHECK (( SELECT public.fn_co_quyen('don-vi-cuu-tro'::text, 'them'::text) AS fn_co_quyen));


--
-- Name: kho_don_vi_cuu_tro kho_don_vi_cuu_tro_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_don_vi_cuu_tro_xoa ON public.kho_don_vi_cuu_tro FOR DELETE TO authenticated USING (( SELECT public.fn_co_quyen('don-vi-cuu-tro'::text, 'xoa'::text) AS fn_co_quyen));


--
-- Name: kho_dot_cuu_tro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kho_dot_cuu_tro ENABLE ROW LEVEL SECURITY;

--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_dot_cuu_tro_select ON public.kho_dot_cuu_tro FOR SELECT TO authenticated USING (true);


--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_dot_cuu_tro_sua ON public.kho_dot_cuu_tro FOR UPDATE TO authenticated USING (( SELECT public.fn_co_quyen('dot-cuu-tro'::text, 'sua'::text) AS fn_co_quyen)) WITH CHECK (( SELECT public.fn_co_quyen('dot-cuu-tro'::text, 'sua'::text) AS fn_co_quyen));


--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_dot_cuu_tro_them ON public.kho_dot_cuu_tro FOR INSERT TO authenticated WITH CHECK (( SELECT public.fn_co_quyen('dot-cuu-tro'::text, 'them'::text) AS fn_co_quyen));


--
-- Name: kho_dot_cuu_tro kho_dot_cuu_tro_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_dot_cuu_tro_xoa ON public.kho_dot_cuu_tro FOR DELETE TO authenticated USING (( SELECT public.fn_co_quyen('dot-cuu-tro'::text, 'xoa'::text) AS fn_co_quyen));


--
-- Name: kho_nhap_xuat_kho; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kho_nhap_xuat_kho ENABLE ROW LEVEL SECURITY;

--
-- Name: kho_nhap_xuat_kho_ct; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kho_nhap_xuat_kho_ct ENABLE ROW LEVEL SECURITY;

--
-- Name: kho_nhap_xuat_kho_ct kho_nhap_xuat_kho_ct_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_ct_sua ON public.kho_nhap_xuat_kho_ct FOR UPDATE TO authenticated USING ((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'sua'::text) AS fn_co_quyen) AND public.fn_kho_ct_ghi_duoc(phieu_id))) WITH CHECK ((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'sua'::text) AS fn_co_quyen) AND public.fn_kho_ct_ghi_duoc(phieu_id)));


--
-- Name: kho_nhap_xuat_kho_ct kho_nhap_xuat_kho_ct_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_ct_them ON public.kho_nhap_xuat_kho_ct FOR INSERT TO authenticated WITH CHECK (((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'them'::text) AS fn_co_quyen) OR ( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'sua'::text) AS fn_co_quyen)) AND public.fn_kho_ct_ghi_duoc(phieu_id)));


--
-- Name: kho_nhap_xuat_kho_ct kho_nhap_xuat_kho_ct_xem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_ct_xem ON public.kho_nhap_xuat_kho_ct FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.kho_nhap_xuat_kho p
  WHERE (p.id = kho_nhap_xuat_kho_ct.phieu_id))));


--
-- Name: kho_nhap_xuat_kho_ct kho_nhap_xuat_kho_ct_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_ct_xoa ON public.kho_nhap_xuat_kho_ct FOR DELETE TO authenticated USING (((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'sua'::text) AS fn_co_quyen) OR ( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'xoa'::text) AS fn_co_quyen)) AND public.fn_kho_ct_ghi_duoc(phieu_id)));


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_sua ON public.kho_nhap_xuat_kho FOR UPDATE TO authenticated USING ((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'sua'::text) AS fn_co_quyen) AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id))) WITH CHECK ((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'sua'::text) AS fn_co_quyen) AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id)));


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_them ON public.kho_nhap_xuat_kho FOR INSERT TO authenticated WITH CHECK ((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'them'::text) AS fn_co_quyen) AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id)));


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_xem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_xem ON public.kho_nhap_xuat_kho FOR SELECT TO authenticated USING ((( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (kho_xuat_id = ANY (( SELECT public.fn_kho_cua_toi() AS fn_kho_cua_toi)::bigint[])) OR (kho_nhap_id = ANY (( SELECT public.fn_kho_cua_toi() AS fn_kho_cua_toi)::bigint[]))));


--
-- Name: kho_nhap_xuat_kho kho_nhap_xuat_kho_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kho_nhap_xuat_kho_xoa ON public.kho_nhap_xuat_kho FOR DELETE TO authenticated USING ((( SELECT public.fn_co_quyen('nhap-xuat-kho'::text, 'xoa'::text) AS fn_co_quyen) AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id)));


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_doc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ktnt_doc ON public.ktnt_khen_thuong_nha_tai_tro FOR SELECT TO authenticated USING (true);


--
-- Name: ktnt_khen_thuong_nha_tai_tro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ktnt_khen_thuong_nha_tai_tro ENABLE ROW LEVEL SECURITY;

--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ktnt_sua ON public.ktnt_khen_thuong_nha_tai_tro FOR UPDATE TO authenticated USING (public.fn_co_quyen('khen-thuong-nha-tai-tro'::text, 'sua'::text)) WITH CHECK (public.fn_co_quyen('khen-thuong-nha-tai-tro'::text, 'sua'::text));


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ktnt_them ON public.ktnt_khen_thuong_nha_tai_tro FOR INSERT TO authenticated WITH CHECK (public.fn_co_quyen('khen-thuong-nha-tai-tro'::text, 'them'::text));


--
-- Name: ktnt_khen_thuong_nha_tai_tro ktnt_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ktnt_xoa ON public.ktnt_khen_thuong_nha_tai_tro FOR DELETE TO authenticated USING (public.fn_co_quyen('khen-thuong-nha-tai-tro'::text, 'xoa'::text));


--
-- Name: lich_su_trang_thai; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lich_su_trang_thai ENABLE ROW LEVEL SECURITY;

--
-- Name: lich_su_trang_thai lich_su_trang_thai_doc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lich_su_trang_thai_doc ON public.lich_su_trang_thai FOR SELECT TO authenticated USING (true);


--
-- Name: luong_thiet_lap_bac_luong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.luong_thiet_lap_bac_luong ENABLE ROW LEVEL SECURITY;

--
-- Name: luong_thiet_lap_bac_luong luong_thiet_lap_bac_luong_ghi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY luong_thiet_lap_bac_luong_ghi ON public.luong_thiet_lap_bac_luong TO authenticated USING (public.fn_co_quyen('thiet-lap-luong'::text, 'sua'::text)) WITH CHECK (public.fn_co_quyen('thiet-lap-luong'::text, 'sua'::text));


--
-- Name: luong_thiet_lap_bac_luong luong_thiet_lap_bac_luong_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY luong_thiet_lap_bac_luong_select ON public.luong_thiet_lap_bac_luong FOR SELECT TO authenticated USING (true);


--
-- Name: luong_thiet_lap_cau_hinh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.luong_thiet_lap_cau_hinh ENABLE ROW LEVEL SECURITY;

--
-- Name: luong_thiet_lap_cau_hinh luong_thiet_lap_cau_hinh_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY luong_thiet_lap_cau_hinh_modify ON public.luong_thiet_lap_cau_hinh TO authenticated USING (true) WITH CHECK (true);


--
-- Name: luong_thiet_lap_cau_hinh luong_thiet_lap_cau_hinh_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY luong_thiet_lap_cau_hinh_select ON public.luong_thiet_lap_cau_hinh FOR SELECT TO authenticated USING (true);


--
-- Name: luong_thiet_lap_ngach_luong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.luong_thiet_lap_ngach_luong ENABLE ROW LEVEL SECURITY;

--
-- Name: luong_thiet_lap_ngach_luong luong_thiet_lap_ngach_luong_ghi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY luong_thiet_lap_ngach_luong_ghi ON public.luong_thiet_lap_ngach_luong TO authenticated USING (public.fn_co_quyen('thiet-lap-luong'::text, 'sua'::text)) WITH CHECK (public.fn_co_quyen('thiet-lap-luong'::text, 'sua'::text));


--
-- Name: luong_thiet_lap_ngach_luong luong_thiet_lap_ngach_luong_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY luong_thiet_lap_ngach_luong_select ON public.luong_thiet_lap_ngach_luong FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_can_bo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_can_bo ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_can_bo mttq_can_bo_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_can_bo_modify ON public.mttq_can_bo TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_can_bo mttq_can_bo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_can_bo_select ON public.mttq_can_bo FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_diem_danh_uy_vien; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_diem_danh_uy_vien ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_diem_danh_uy_vien mttq_diem_danh_uy_vien_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_diem_danh_uy_vien_modify ON public.mttq_diem_danh_uy_vien TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_diem_danh_uy_vien mttq_diem_danh_uy_vien_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_diem_danh_uy_vien_select ON public.mttq_diem_danh_uy_vien FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_khen_thuong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_khen_thuong ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_khen_thuong_ct; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_khen_thuong_ct ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_khen_thuong_ct mttq_khen_thuong_ct_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_khen_thuong_ct_modify ON public.mttq_khen_thuong_ct TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_khen_thuong_ct mttq_khen_thuong_ct_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_khen_thuong_ct_select ON public.mttq_khen_thuong_ct FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_khen_thuong mttq_khen_thuong_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_khen_thuong_modify ON public.mttq_khen_thuong TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_khen_thuong mttq_khen_thuong_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_khen_thuong_select ON public.mttq_khen_thuong FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_ky_hop; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_ky_hop ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_ky_hop mttq_ky_hop_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_ky_hop_modify ON public.mttq_ky_hop TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_ky_hop mttq_ky_hop_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_ky_hop_select ON public.mttq_ky_hop FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_lop_tap_huan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_lop_tap_huan ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_lop_tap_huan_ct; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_lop_tap_huan_ct ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_lop_tap_huan_ct mttq_lop_tap_huan_ct_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_lop_tap_huan_ct_modify ON public.mttq_lop_tap_huan_ct TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_lop_tap_huan_ct mttq_lop_tap_huan_ct_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_lop_tap_huan_ct_select ON public.mttq_lop_tap_huan_ct FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_lop_tap_huan mttq_lop_tap_huan_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_lop_tap_huan_modify ON public.mttq_lop_tap_huan TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_lop_tap_huan mttq_lop_tap_huan_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_lop_tap_huan_select ON public.mttq_lop_tap_huan FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_nhiem_ky; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_nhiem_ky ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_nhiem_ky mttq_nhiem_ky_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_nhiem_ky_modify ON public.mttq_nhiem_ky TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_nhiem_ky mttq_nhiem_ky_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_nhiem_ky_select ON public.mttq_nhiem_ky FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_tang_luong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_tang_luong ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_tang_luong mttq_tang_luong_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_tang_luong_select ON public.mttq_tang_luong FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_tang_luong mttq_tang_luong_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_tang_luong_sua ON public.mttq_tang_luong FOR UPDATE TO authenticated USING (public.fn_co_quyen('danh-sach-tang-luong'::text, 'sua'::text)) WITH CHECK (public.fn_co_quyen('danh-sach-tang-luong'::text, 'sua'::text));


--
-- Name: mttq_tang_luong mttq_tang_luong_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_tang_luong_them ON public.mttq_tang_luong FOR INSERT TO authenticated WITH CHECK (public.fn_co_quyen('danh-sach-tang-luong'::text, 'them'::text));


--
-- Name: mttq_tang_luong mttq_tang_luong_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_tang_luong_xoa ON public.mttq_tang_luong FOR DELETE TO authenticated USING (public.fn_co_quyen('danh-sach-tang-luong'::text, 'xoa'::text));


--
-- Name: mttq_thiet_lap; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_thiet_lap ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_thiet_lap mttq_thiet_lap_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_thiet_lap_modify ON public.mttq_thiet_lap TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_thiet_lap mttq_thiet_lap_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_thiet_lap_select ON public.mttq_thiet_lap FOR SELECT TO authenticated USING (true);


--
-- Name: mttq_uy_vien_uy_ban; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mttq_uy_vien_uy_ban ENABLE ROW LEVEL SECURITY;

--
-- Name: mttq_uy_vien_uy_ban mttq_uy_vien_uy_ban_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_uy_vien_uy_ban_modify ON public.mttq_uy_vien_uy_ban TO authenticated USING (true) WITH CHECK (true);


--
-- Name: mttq_uy_vien_uy_ban mttq_uy_vien_uy_ban_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mttq_uy_vien_uy_ban_select ON public.mttq_uy_vien_uy_ban FOR SELECT TO authenticated USING (true);


--
-- Name: nddk_nha_dai_doan_ket; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nddk_nha_dai_doan_ket ENABLE ROW LEVEL SECURITY;

--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_doc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nddk_nha_dai_doan_ket_doc ON public.nddk_nha_dai_doan_ket FOR SELECT TO authenticated USING (true);


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nddk_nha_dai_doan_ket_sua ON public.nddk_nha_dai_doan_ket FOR UPDATE TO authenticated USING (public.fn_co_quyen('nha-dai-doan-ket'::text, 'sua'::text)) WITH CHECK (public.fn_co_quyen('nha-dai-doan-ket'::text, 'sua'::text));


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nddk_nha_dai_doan_ket_them ON public.nddk_nha_dai_doan_ket FOR INSERT TO authenticated WITH CHECK (public.fn_co_quyen('nha-dai-doan-ket'::text, 'them'::text));


--
-- Name: nddk_nha_dai_doan_ket nddk_nha_dai_doan_ket_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nddk_nha_dai_doan_ket_xoa ON public.nddk_nha_dai_doan_ket FOR DELETE TO authenticated USING (public.fn_co_quyen('nha-dai-doan-ket'::text, 'xoa'::text));


--
-- Name: pbxh_thiet_lap; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pbxh_thiet_lap ENABLE ROW LEVEL SECURITY;

--
-- Name: pbxh_thiet_lap pbxh_thiet_lap_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pbxh_thiet_lap_modify ON public.pbxh_thiet_lap TO authenticated USING (true) WITH CHECK (true);


--
-- Name: pbxh_thiet_lap pbxh_thiet_lap_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pbxh_thiet_lap_select ON public.pbxh_thiet_lap FOR SELECT TO authenticated USING (true);


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pbxh_thuc_hien_modify ON public.pbxh_thuc_hien_phan_bien_xa_hoi TO authenticated USING (true) WITH CHECK (true);


--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi ENABLE ROW LEVEL SECURITY;

--
-- Name: pbxh_thuc_hien_phan_bien_xa_hoi pbxh_thuc_hien_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pbxh_thuc_hien_select ON public.pbxh_thuc_hien_phan_bien_xa_hoi FOR SELECT TO authenticated USING (true);


--
-- Name: thong_bao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thong_bao ENABLE ROW LEVEL SECURITY;

--
-- Name: thong_bao thong_bao_danh_dau_doc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thong_bao_danh_dau_doc ON public.thong_bao FOR UPDATE TO authenticated USING ((nhan_vien_id = public.fn_nhan_vien_id_hien_tai())) WITH CHECK ((nhan_vien_id = public.fn_nhan_vien_id_hien_tai()));


--
-- Name: thong_bao thong_bao_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thong_bao_select ON public.thong_bao FOR SELECT TO authenticated USING ((nhan_vien_id = public.fn_nhan_vien_id_hien_tai()));


--
-- Name: tn_tiep_nhan_phieu_kho tn_phieu_kho_ghi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tn_phieu_kho_ghi ON public.tn_tiep_nhan_phieu_kho TO authenticated USING (((( SELECT public.fn_co_quyen('tiep-nhan'::text, 'them'::text) AS fn_co_quyen) OR ( SELECT public.fn_co_quyen('tiep-nhan'::text, 'sua'::text) AS fn_co_quyen)) AND (EXISTS ( SELECT 1
   FROM public.tn_tiep_nhan t
  WHERE (t.id = tn_tiep_nhan_phieu_kho.tiep_nhan_id))))) WITH CHECK (((( SELECT public.fn_co_quyen('tiep-nhan'::text, 'them'::text) AS fn_co_quyen) OR ( SELECT public.fn_co_quyen('tiep-nhan'::text, 'sua'::text) AS fn_co_quyen)) AND (EXISTS ( SELECT 1
   FROM public.tn_tiep_nhan t
  WHERE (t.id = tn_tiep_nhan_phieu_kho.tiep_nhan_id)))));


--
-- Name: tn_tiep_nhan_phieu_kho tn_phieu_kho_xem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tn_phieu_kho_xem ON public.tn_tiep_nhan_phieu_kho FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.tn_tiep_nhan t
  WHERE (t.id = tn_tiep_nhan_phieu_kho.tiep_nhan_id))));


--
-- Name: tn_tiep_nhan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tn_tiep_nhan ENABLE ROW LEVEL SECURITY;

--
-- Name: tn_tiep_nhan_phieu_kho; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tn_tiep_nhan_phieu_kho ENABLE ROW LEVEL SECURITY;

--
-- Name: tn_tiep_nhan tn_tiep_nhan_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tn_tiep_nhan_sua ON public.tn_tiep_nhan FOR UPDATE TO authenticated USING ((( SELECT public.fn_co_quyen('tiep-nhan'::text, 'sua'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (chuong_trinh_id IN ( SELECT d.id
   FROM public.kho_dot_cuu_tro d
  WHERE ((d.don_vi_chu_tri_loai = 'xa_phuong'::text) AND (d.don_vi_chu_tri_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi)))))))) WITH CHECK ((( SELECT public.fn_co_quyen('tiep-nhan'::text, 'sua'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (chuong_trinh_id IN ( SELECT d.id
   FROM public.kho_dot_cuu_tro d
  WHERE ((d.don_vi_chu_tri_loai = 'xa_phuong'::text) AND (d.don_vi_chu_tri_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi))))))));


--
-- Name: tn_tiep_nhan tn_tiep_nhan_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tn_tiep_nhan_them ON public.tn_tiep_nhan FOR INSERT TO authenticated WITH CHECK ((( SELECT public.fn_co_quyen('tiep-nhan'::text, 'them'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (chuong_trinh_id IN ( SELECT d.id
   FROM public.kho_dot_cuu_tro d
  WHERE ((d.don_vi_chu_tri_loai = 'xa_phuong'::text) AND (d.don_vi_chu_tri_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi))))))));


--
-- Name: tn_tiep_nhan tn_tiep_nhan_xem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tn_tiep_nhan_xem ON public.tn_tiep_nhan FOR SELECT TO authenticated USING ((( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (chuong_trinh_id IN ( SELECT d.id
   FROM public.kho_dot_cuu_tro d
  WHERE ((d.don_vi_chu_tri_loai = 'xa_phuong'::text) AND (d.don_vi_chu_tri_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi)))))));


--
-- Name: tn_tiep_nhan tn_tiep_nhan_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tn_tiep_nhan_xoa ON public.tn_tiep_nhan FOR DELETE TO authenticated USING ((( SELECT public.fn_co_quyen('tiep-nhan'::text, 'xoa'::text) AS fn_co_quyen) AND (( SELECT public.fn_kho_xem_tat_ca() AS fn_kho_xem_tat_ca) OR (chuong_trinh_id IN ( SELECT d.id
   FROM public.kho_dot_cuu_tro d
  WHERE ((d.don_vi_chu_tri_loai = 'xa_phuong'::text) AND (d.don_vi_chu_tri_id = ( SELECT public.fn_don_vi_cua_toi() AS fn_don_vi_cua_toi))))))));


--
-- Name: var_chuc_vu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.var_chuc_vu ENABLE ROW LEVEL SECURITY;

--
-- Name: var_chuc_vu var_chuc_vu_ghi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_chuc_vu_ghi ON public.var_chuc_vu TO authenticated USING (public.fn_la_quan_tri()) WITH CHECK (public.fn_la_quan_tri());


--
-- Name: var_chuc_vu var_chuc_vu_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_chuc_vu_select ON public.var_chuc_vu FOR SELECT TO authenticated USING (true);


--
-- Name: var_nhan_vien; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.var_nhan_vien ENABLE ROW LEVEL SECURITY;

--
-- Name: var_nhan_vien var_nhan_vien_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_nhan_vien_select ON public.var_nhan_vien FOR SELECT TO authenticated USING (true);


--
-- Name: var_nhan_vien var_nhan_vien_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_nhan_vien_sua ON public.var_nhan_vien FOR UPDATE TO authenticated USING ((public.fn_la_quan_tri() OR (lower(btrim(ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()))) WITH CHECK ((public.fn_la_quan_tri() OR (lower(btrim(ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai())));


--
-- Name: var_nhan_vien var_nhan_vien_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_nhan_vien_them ON public.var_nhan_vien FOR INSERT TO authenticated WITH CHECK (public.fn_la_quan_tri());


--
-- Name: var_nhan_vien var_nhan_vien_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_nhan_vien_xoa ON public.var_nhan_vien FOR DELETE TO authenticated USING (public.fn_la_quan_tri());


--
-- Name: var_phan_quyen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.var_phan_quyen ENABLE ROW LEVEL SECURITY;

--
-- Name: var_phan_quyen var_phan_quyen_ghi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_phan_quyen_ghi ON public.var_phan_quyen TO authenticated USING (public.fn_la_quan_tri()) WITH CHECK (public.fn_la_quan_tri());


--
-- Name: var_phan_quyen var_phan_quyen_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_phan_quyen_select ON public.var_phan_quyen FOR SELECT TO authenticated USING (true);


--
-- Name: var_phong_ban; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.var_phong_ban ENABLE ROW LEVEL SECURITY;

--
-- Name: var_phong_ban var_phong_ban_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_phong_ban_modify ON public.var_phong_ban TO authenticated USING (true) WITH CHECK (true);


--
-- Name: var_phong_ban var_phong_ban_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_phong_ban_select ON public.var_phong_ban FOR SELECT TO authenticated USING (true);


--
-- Name: var_ssn_tinh_thanh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.var_ssn_tinh_thanh ENABLE ROW LEVEL SECURITY;

--
-- Name: var_ssn_tinh_thanh var_ssn_tinh_thanh_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_ssn_tinh_thanh_modify ON public.var_ssn_tinh_thanh TO authenticated USING (true) WITH CHECK (true);


--
-- Name: var_ssn_tinh_thanh var_ssn_tinh_thanh_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_ssn_tinh_thanh_select ON public.var_ssn_tinh_thanh FOR SELECT TO authenticated USING (true);


--
-- Name: var_ssn_xa_phuong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.var_ssn_xa_phuong ENABLE ROW LEVEL SECURITY;

--
-- Name: var_ssn_xa_phuong var_ssn_xa_phuong_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_ssn_xa_phuong_modify ON public.var_ssn_xa_phuong TO authenticated USING (true) WITH CHECK (true);


--
-- Name: var_ssn_xa_phuong var_ssn_xa_phuong_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_ssn_xa_phuong_select ON public.var_ssn_xa_phuong FOR SELECT TO authenticated USING (true);


--
-- Name: var_thong_tin_to_chuc; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.var_thong_tin_to_chuc ENABLE ROW LEVEL SECURITY;

--
-- Name: var_thong_tin_to_chuc var_thong_tin_to_chuc_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_thong_tin_to_chuc_modify ON public.var_thong_tin_to_chuc TO authenticated USING (true) WITH CHECK (true);


--
-- Name: var_thong_tin_to_chuc var_thong_tin_to_chuc_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY var_thong_tin_to_chuc_select ON public.var_thong_tin_to_chuc FOR SELECT TO authenticated, anon USING (true);


--
-- Name: vnn_chuong_trinh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vnn_chuong_trinh ENABLE ROW LEVEL SECURITY;

--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_doc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vnn_chuong_trinh_doc ON public.vnn_chuong_trinh FOR SELECT TO authenticated USING (true);


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_sua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vnn_chuong_trinh_sua ON public.vnn_chuong_trinh FOR UPDATE TO authenticated USING (public.fn_co_quyen('vi-nguoi-ngheo'::text, 'sua'::text)) WITH CHECK (public.fn_co_quyen('vi-nguoi-ngheo'::text, 'sua'::text));


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vnn_chuong_trinh_them ON public.vnn_chuong_trinh FOR INSERT TO authenticated WITH CHECK (public.fn_co_quyen('vi-nguoi-ngheo'::text, 'them'::text));


--
-- Name: vnn_chuong_trinh vnn_chuong_trinh_xoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vnn_chuong_trinh_xoa ON public.vnn_chuong_trinh FOR DELETE TO authenticated USING (public.fn_co_quyen('vi-nguoi-ngheo'::text, 'xoa'::text));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION bai_viet_danh_sach_enforce_don_gia(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.bai_viet_danh_sach_enforce_don_gia() TO anon;
GRANT ALL ON FUNCTION public.bai_viet_danh_sach_enforce_don_gia() TO authenticated;
GRANT ALL ON FUNCTION public.bai_viet_danh_sach_enforce_don_gia() TO service_role;


--
-- Name: FUNCTION bai_viet_danh_sach_validate_khac_loai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.bai_viet_danh_sach_validate_khac_loai() TO anon;
GRANT ALL ON FUNCTION public.bai_viet_danh_sach_validate_khac_loai() TO authenticated;
GRANT ALL ON FUNCTION public.bai_viet_danh_sach_validate_khac_loai() TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_filter_options(p_start date, p_end date, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_filter_options(p_start date, p_end date, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_filter_options(p_start date, p_end date, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_filter_options(p_start date, p_end date, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_kpi(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_kpi(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_kpi(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_kpi(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_lookup(p_start date, p_end date, p_limit integer, p_offset integer, p_sort text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_lookup(p_start date, p_end date, p_limit integer, p_offset integer, p_sort text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_lookup(p_start date, p_end date, p_limit integer, p_offset integer, p_sort text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_lookup(p_start date, p_end date, p_limit integer, p_offset integer, p_sort text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_phan_bo_muc_do(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_phan_bo_muc_do(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_phan_bo_muc_do(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_phan_bo_muc_do(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_phan_bo_trang_thai(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_phan_bo_trang_thai(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_phan_bo_trang_thai(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_phan_bo_trang_thai(p_start date, p_end date, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_top_nguoi_tao(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_top_nguoi_tao(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_top_nguoi_tao(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_top_nguoi_tao(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_top_trach_nhiem(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_top_trach_nhiem(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_top_trach_nhiem(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_top_trach_nhiem(p_start date, p_end date, p_top integer, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION cong_viec_bao_cao_trend(p_start date, p_end date, p_bucket text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cong_viec_bao_cao_trend(p_start date, p_end date, p_bucket text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO anon;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_trend(p_start date, p_end date, p_bucket text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.cong_viec_bao_cao_trend(p_start date, p_end date, p_bucket text, p_id_trach_nhiem bigint[], p_id_nguoi_tao bigint[], p_trang_thai text[], p_muc_do text[], p_overdue_only boolean, p_viewer_id bigint, p_viewer_don_vi_id bigint, p_view_all boolean, p_viewer_phong_ban_id bigint) TO service_role;


--
-- Name: FUNCTION fn_chuan_hoa_tim_kiem(p_text text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_chuan_hoa_tim_kiem(p_text text) TO anon;
GRANT ALL ON FUNCTION public.fn_chuan_hoa_tim_kiem(p_text text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_chuan_hoa_tim_kiem(p_text text) TO service_role;


--
-- Name: FUNCTION fn_co_quyen(p_module_key text, p_hanh_dong text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_co_quyen(p_module_key text, p_hanh_dong text) TO anon;
GRANT ALL ON FUNCTION public.fn_co_quyen(p_module_key text, p_hanh_dong text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_co_quyen(p_module_key text, p_hanh_dong text) TO service_role;


--
-- Name: FUNCTION fn_co_tai_khoan_dang_nhap(p_ten_tai_khoan text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fn_co_tai_khoan_dang_nhap(p_ten_tai_khoan text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_co_tai_khoan_dang_nhap(p_ten_tai_khoan text) TO service_role;


--
-- Name: FUNCTION fn_don_vi_cua_toi(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_don_vi_cua_toi() TO anon;
GRANT ALL ON FUNCTION public.fn_don_vi_cua_toi() TO authenticated;
GRANT ALL ON FUNCTION public.fn_don_vi_cua_toi() TO service_role;


--
-- Name: FUNCTION fn_duoc_khoa_ky(p_module_key text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_duoc_khoa_ky(p_module_key text) TO anon;
GRANT ALL ON FUNCTION public.fn_duoc_khoa_ky(p_module_key text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_duoc_khoa_ky(p_module_key text) TO service_role;


--
-- Name: FUNCTION fn_gan_id_nguoi_tao(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_gan_id_nguoi_tao() TO anon;
GRANT ALL ON FUNCTION public.fn_gan_id_nguoi_tao() TO authenticated;
GRANT ALL ON FUNCTION public.fn_gan_id_nguoi_tao() TO service_role;


--
-- Name: FUNCTION fn_gan_ngay_trang_thai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_gan_ngay_trang_thai() TO anon;
GRANT ALL ON FUNCTION public.fn_gan_ngay_trang_thai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_gan_ngay_trang_thai() TO service_role;


--
-- Name: FUNCTION fn_gan_nguoi_cap_nhat(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_gan_nguoi_cap_nhat() TO anon;
GRANT ALL ON FUNCTION public.fn_gan_nguoi_cap_nhat() TO authenticated;
GRANT ALL ON FUNCTION public.fn_gan_nguoi_cap_nhat() TO service_role;


--
-- Name: FUNCTION fn_gan_nguoi_duyet_khen_thuong(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_gan_nguoi_duyet_khen_thuong() TO anon;
GRANT ALL ON FUNCTION public.fn_gan_nguoi_duyet_khen_thuong() TO authenticated;
GRANT ALL ON FUNCTION public.fn_gan_nguoi_duyet_khen_thuong() TO service_role;


--
-- Name: FUNCTION fn_ghi_lich_su_trang_thai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ghi_lich_su_trang_thai() TO anon;
GRANT ALL ON FUNCTION public.fn_ghi_lich_su_trang_thai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_ghi_lich_su_trang_thai() TO service_role;


--
-- Name: FUNCTION fn_ghi_nhat_ky(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ghi_nhat_ky() TO anon;
GRANT ALL ON FUNCTION public.fn_ghi_nhat_ky() TO authenticated;
GRANT ALL ON FUNCTION public.fn_ghi_nhat_ky() TO service_role;


--
-- Name: FUNCTION fn_hngh_chuan_hoa(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_hngh_chuan_hoa() TO anon;
GRANT ALL ON FUNCTION public.fn_hngh_chuan_hoa() TO authenticated;
GRANT ALL ON FUNCTION public.fn_hngh_chuan_hoa() TO service_role;


--
-- Name: FUNCTION fn_hngh_kiem_dan_toc_loai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_hngh_kiem_dan_toc_loai() TO anon;
GRANT ALL ON FUNCTION public.fn_hngh_kiem_dan_toc_loai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_hngh_kiem_dan_toc_loai() TO service_role;


--
-- Name: FUNCTION fn_hngh_lan_sang_nddk(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_hngh_lan_sang_nddk() TO anon;
GRANT ALL ON FUNCTION public.fn_hngh_lan_sang_nddk() TO authenticated;
GRANT ALL ON FUNCTION public.fn_hngh_lan_sang_nddk() TO service_role;


--
-- Name: FUNCTION fn_hngh_nhan_ho_tro_nguon(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_ho_ngheo_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fn_hngh_nhan_ho_tro_nguon(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_ho_ngheo_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_hngh_nhan_ho_tro_nguon(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_ho_ngheo_id bigint) TO service_role;


--
-- Name: FUNCTION fn_hngh_set_ngay_trang_thai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_hngh_set_ngay_trang_thai() TO anon;
GRANT ALL ON FUNCTION public.fn_hngh_set_ngay_trang_thai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_hngh_set_ngay_trang_thai() TO service_role;


--
-- Name: FUNCTION fn_kho_chan_doi_loai_phieu(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_chan_doi_loai_phieu() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_chan_doi_loai_phieu() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_chan_doi_loai_phieu() TO service_role;


--
-- Name: FUNCTION fn_kho_ct_ghi_duoc(p_phieu_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_ct_ghi_duoc(p_phieu_id bigint) TO anon;
GRANT ALL ON FUNCTION public.fn_kho_ct_ghi_duoc(p_phieu_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_ct_ghi_duoc(p_phieu_id bigint) TO service_role;


--
-- Name: FUNCTION fn_kho_cua_toi(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_cua_toi() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_cua_toi() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_cua_toi() TO service_role;


--
-- Name: FUNCTION fn_kho_gan_ten_theo_xa(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_gan_ten_theo_xa() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_gan_ten_theo_xa() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_gan_ten_theo_xa() TO service_role;


--
-- Name: FUNCTION fn_kho_khoa_kho(p_kho_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_khoa_kho(p_kho_id bigint) TO anon;
GRANT ALL ON FUNCTION public.fn_kho_khoa_kho(p_kho_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_khoa_kho(p_kho_id bigint) TO service_role;


--
-- Name: FUNCTION fn_kho_kiem_tra_ton_am(p_kho_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am(p_kho_id bigint) TO anon;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am(p_kho_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am(p_kho_id bigint) TO service_role;


--
-- Name: FUNCTION fn_kho_kiem_tra_ton_am_ct(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am_ct() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am_ct() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am_ct() TO service_role;


--
-- Name: FUNCTION fn_kho_kiem_tra_ton_am_phieu(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am_phieu() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am_phieu() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_am_phieu() TO service_role;


--
-- Name: FUNCTION fn_kho_kiem_tra_ton_kho(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_kho() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_kho() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_kiem_tra_ton_kho() TO service_role;


--
-- Name: FUNCTION fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint) TO anon;
GRANT ALL ON FUNCTION public.fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint) TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint) TO service_role;


--
-- Name: FUNCTION fn_kho_sinh_so_phieu(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_sinh_so_phieu() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_sinh_so_phieu() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_sinh_so_phieu() TO service_role;


--
-- Name: FUNCTION fn_kho_xem_tat_ca(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kho_xem_tat_ca() TO anon;
GRANT ALL ON FUNCTION public.fn_kho_xem_tat_ca() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kho_xem_tat_ca() TO service_role;


--
-- Name: FUNCTION fn_khoa_ky_diem_danh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_khoa_ky_diem_danh() TO anon;
GRANT ALL ON FUNCTION public.fn_khoa_ky_diem_danh() TO authenticated;
GRANT ALL ON FUNCTION public.fn_khoa_ky_diem_danh() TO service_role;


--
-- Name: FUNCTION fn_khoa_ky_ky_hop(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_khoa_ky_ky_hop() TO anon;
GRANT ALL ON FUNCTION public.fn_khoa_ky_ky_hop() TO authenticated;
GRANT ALL ON FUNCTION public.fn_khoa_ky_ky_hop() TO service_role;


--
-- Name: FUNCTION fn_khoa_ky_nhiem_ky(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_khoa_ky_nhiem_ky() TO anon;
GRANT ALL ON FUNCTION public.fn_khoa_ky_nhiem_ky() TO authenticated;
GRANT ALL ON FUNCTION public.fn_khoa_ky_nhiem_ky() TO service_role;


--
-- Name: FUNCTION fn_khoa_ky_uy_vien(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_khoa_ky_uy_vien() TO anon;
GRANT ALL ON FUNCTION public.fn_khoa_ky_uy_vien() TO authenticated;
GRANT ALL ON FUNCTION public.fn_khoa_ky_uy_vien() TO service_role;


--
-- Name: FUNCTION fn_kiem_luat_trang_thai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kiem_luat_trang_thai() TO anon;
GRANT ALL ON FUNCTION public.fn_kiem_luat_trang_thai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_kiem_luat_trang_thai() TO service_role;


--
-- Name: FUNCTION fn_ktnt_gan_trang_thai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ktnt_gan_trang_thai() TO anon;
GRANT ALL ON FUNCTION public.fn_ktnt_gan_trang_thai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_ktnt_gan_trang_thai() TO service_role;


--
-- Name: FUNCTION fn_ktnt_kiem_quyen_phe_duyet(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ktnt_kiem_quyen_phe_duyet() TO anon;
GRANT ALL ON FUNCTION public.fn_ktnt_kiem_quyen_phe_duyet() TO authenticated;
GRANT ALL ON FUNCTION public.fn_ktnt_kiem_quyen_phe_duyet() TO service_role;


--
-- Name: FUNCTION fn_ky_hop_khoa_boi(p_ky_hop_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ky_hop_khoa_boi(p_ky_hop_id bigint) TO anon;
GRANT ALL ON FUNCTION public.fn_ky_hop_khoa_boi(p_ky_hop_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.fn_ky_hop_khoa_boi(p_ky_hop_id bigint) TO service_role;


--
-- Name: FUNCTION fn_la_quan_tri(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_la_quan_tri() TO anon;
GRANT ALL ON FUNCTION public.fn_la_quan_tri() TO authenticated;
GRANT ALL ON FUNCTION public.fn_la_quan_tri() TO service_role;


--
-- Name: FUNCTION fn_mau_tim_kiem(p_search text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_mau_tim_kiem(p_search text) TO anon;
GRANT ALL ON FUNCTION public.fn_mau_tim_kiem(p_search text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_mau_tim_kiem(p_search text) TO service_role;


--
-- Name: FUNCTION fn_nddk_dong_bo_tu_ho_ngheo(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo() TO anon;
GRANT ALL ON FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo() TO authenticated;
GRANT ALL ON FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo() TO service_role;


--
-- Name: FUNCTION fn_nddk_kiem_truong_bat_buoc(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_nddk_kiem_truong_bat_buoc() TO anon;
GRANT ALL ON FUNCTION public.fn_nddk_kiem_truong_bat_buoc() TO authenticated;
GRANT ALL ON FUNCTION public.fn_nddk_kiem_truong_bat_buoc() TO service_role;


--
-- Name: FUNCTION fn_nddk_set_ngay_trang_thai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_nddk_set_ngay_trang_thai() TO anon;
GRANT ALL ON FUNCTION public.fn_nddk_set_ngay_trang_thai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_nddk_set_ngay_trang_thai() TO service_role;


--
-- Name: FUNCTION fn_nhan_vien_id_hien_tai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_nhan_vien_id_hien_tai() TO anon;
GRANT ALL ON FUNCTION public.fn_nhan_vien_id_hien_tai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_nhan_vien_id_hien_tai() TO service_role;


--
-- Name: FUNCTION fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint) TO anon;
GRANT ALL ON FUNCTION public.fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint) TO service_role;


--
-- Name: FUNCTION fn_ten_dang_nhap_hien_tai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ten_dang_nhap_hien_tai() TO anon;
GRANT ALL ON FUNCTION public.fn_ten_dang_nhap_hien_tai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_ten_dang_nhap_hien_tai() TO service_role;


--
-- Name: FUNCTION fn_ten_kho_theo_xa(p_ten_xa text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ten_kho_theo_xa(p_ten_xa text) TO anon;
GRANT ALL ON FUNCTION public.fn_ten_kho_theo_xa(p_ten_xa text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_ten_kho_theo_xa(p_ten_xa text) TO service_role;


--
-- Name: FUNCTION fn_thong_bao_chi_cho_danh_dau_doc(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc() FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc() TO service_role;


--
-- Name: FUNCTION fn_thong_bao_sinh_nhac_viec(p_ngay date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(p_ngay date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_thong_bao_sinh_nhac_viec(p_ngay date) TO service_role;


--
-- Name: FUNCTION fn_tn_chan_doi_nha_tai_tro(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_tn_chan_doi_nha_tai_tro() TO anon;
GRANT ALL ON FUNCTION public.fn_tn_chan_doi_nha_tai_tro() TO authenticated;
GRANT ALL ON FUNCTION public.fn_tn_chan_doi_nha_tai_tro() TO service_role;


--
-- Name: FUNCTION fn_tn_gia_tri_phieu_kho(p_tiep_nhan_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_tn_gia_tri_phieu_kho(p_tiep_nhan_id bigint) TO anon;
GRANT ALL ON FUNCTION public.fn_tn_gia_tri_phieu_kho(p_tiep_nhan_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.fn_tn_gia_tri_phieu_kho(p_tiep_nhan_id bigint) TO service_role;


--
-- Name: FUNCTION fn_tn_kiem_phieu_kho(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_tn_kiem_phieu_kho() TO anon;
GRANT ALL ON FUNCTION public.fn_tn_kiem_phieu_kho() TO authenticated;
GRANT ALL ON FUNCTION public.fn_tn_kiem_phieu_kho() TO service_role;


--
-- Name: FUNCTION fn_tn_sinh_so_phieu(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_tn_sinh_so_phieu() TO anon;
GRANT ALL ON FUNCTION public.fn_tn_sinh_so_phieu() TO authenticated;
GRANT ALL ON FUNCTION public.fn_tn_sinh_so_phieu() TO service_role;


--
-- Name: FUNCTION fn_var_phong_ban_doi_cha(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_var_phong_ban_doi_cha() TO anon;
GRANT ALL ON FUNCTION public.fn_var_phong_ban_doi_cha() TO authenticated;
GRANT ALL ON FUNCTION public.fn_var_phong_ban_doi_cha() TO service_role;


--
-- Name: FUNCTION fn_var_phong_ban_lan_nhanh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_var_phong_ban_lan_nhanh() TO anon;
GRANT ALL ON FUNCTION public.fn_var_phong_ban_lan_nhanh() TO authenticated;
GRANT ALL ON FUNCTION public.fn_var_phong_ban_lan_nhanh() TO service_role;


--
-- Name: FUNCTION fn_vnn_kiem_truong_bat_buoc(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_vnn_kiem_truong_bat_buoc() TO anon;
GRANT ALL ON FUNCTION public.fn_vnn_kiem_truong_bat_buoc() TO authenticated;
GRANT ALL ON FUNCTION public.fn_vnn_kiem_truong_bat_buoc() TO service_role;


--
-- Name: FUNCTION fn_vnn_set_ngay_trang_thai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_vnn_set_ngay_trang_thai() TO anon;
GRANT ALL ON FUNCTION public.fn_vnn_set_ngay_trang_thai() TO authenticated;
GRANT ALL ON FUNCTION public.fn_vnn_set_ngay_trang_thai() TO service_role;


--
-- Name: FUNCTION fn_xa_phuong_dong_bo_ten_kho(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_xa_phuong_dong_bo_ten_kho() TO anon;
GRANT ALL ON FUNCTION public.fn_xa_phuong_dong_bo_ten_kho() TO authenticated;
GRANT ALL ON FUNCTION public.fn_xa_phuong_dong_bo_ten_kho() TO service_role;


--
-- Name: FUNCTION get_bai_viet_nguoi_tao_filter_options(p_scope text, p_viewer_don_vi_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_bai_viet_nguoi_tao_filter_options(p_scope text, p_viewer_don_vi_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_bai_viet_nguoi_tao_filter_options(p_scope text, p_viewer_don_vi_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_bai_viet_nguoi_tao_filter_options(p_scope text, p_viewer_don_vi_id bigint) TO service_role;


--
-- Name: FUNCTION get_bai_viet_page(p_search text, p_limit integer, p_offset integer, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint, p_the_loai_ids bigint[], p_nguon_dang_ids bigint[], p_trang_dang_ids bigint[], p_id_nguoi_tao bigint[], p_sort text, p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_don_vi_ids bigint[], p_don_vi_include_null boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_bai_viet_page(p_search text, p_limit integer, p_offset integer, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint, p_the_loai_ids bigint[], p_nguon_dang_ids bigint[], p_trang_dang_ids bigint[], p_id_nguoi_tao bigint[], p_sort text, p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_don_vi_ids bigint[], p_don_vi_include_null boolean) TO anon;
GRANT ALL ON FUNCTION public.get_bai_viet_page(p_search text, p_limit integer, p_offset integer, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint, p_the_loai_ids bigint[], p_nguon_dang_ids bigint[], p_trang_dang_ids bigint[], p_id_nguoi_tao bigint[], p_sort text, p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_don_vi_ids bigint[], p_don_vi_include_null boolean) TO authenticated;
GRANT ALL ON FUNCTION public.get_bai_viet_page(p_search text, p_limit integer, p_offset integer, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint, p_the_loai_ids bigint[], p_nguon_dang_ids bigint[], p_trang_dang_ids bigint[], p_id_nguoi_tao bigint[], p_sort text, p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_don_vi_ids bigint[], p_don_vi_include_null boolean) TO service_role;


--
-- Name: FUNCTION get_bai_viet_thong_ke_nhom(p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_bucket text, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_bai_viet_thong_ke_nhom(p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_bucket text, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_bai_viet_thong_ke_nhom(p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_bucket text, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_bai_viet_thong_ke_nhom(p_truc_ngay text, p_tu_ngay date, p_den_ngay date, p_bucket text, p_scope text, p_viewer_nhan_vien_id bigint, p_viewer_don_vi_id bigint) TO service_role;


--
-- Name: FUNCTION get_cong_viec_page(p_search text, p_limit integer, p_offset integer, p_list_scope text, p_viewer_nhan_vien_id bigint, p_trang_thai text[], p_muc_do text[], p_id_chuong_trinh bigint[], p_chuong_trinh_include_null boolean, p_sort text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_cong_viec_page(p_search text, p_limit integer, p_offset integer, p_list_scope text, p_viewer_nhan_vien_id bigint, p_trang_thai text[], p_muc_do text[], p_id_chuong_trinh bigint[], p_chuong_trinh_include_null boolean, p_sort text) TO anon;
GRANT ALL ON FUNCTION public.get_cong_viec_page(p_search text, p_limit integer, p_offset integer, p_list_scope text, p_viewer_nhan_vien_id bigint, p_trang_thai text[], p_muc_do text[], p_id_chuong_trinh bigint[], p_chuong_trinh_include_null boolean, p_sort text) TO authenticated;
GRANT ALL ON FUNCTION public.get_cong_viec_page(p_search text, p_limit integer, p_offset integer, p_list_scope text, p_viewer_nhan_vien_id bigint, p_trang_thai text[], p_muc_do text[], p_id_chuong_trinh bigint[], p_chuong_trinh_include_null boolean, p_sort text) TO service_role;


--
-- Name: FUNCTION get_diem_danh_for_nhiem_ky(p_nhiem_ky_id text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_diem_danh_for_nhiem_ky(p_nhiem_ky_id text) TO anon;
GRANT ALL ON FUNCTION public.get_diem_danh_for_nhiem_ky(p_nhiem_ky_id text) TO authenticated;
GRANT ALL ON FUNCTION public.get_diem_danh_for_nhiem_ky(p_nhiem_ky_id text) TO service_role;


--
-- Name: FUNCTION get_dttg_tham_hoi_ca_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_trang_thai text[], p_ca_nhan_ids bigint[], p_phong_ban_ids bigint[], p_xa_phuong_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_column_search jsonb, p_labels jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_dttg_tham_hoi_ca_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_trang_thai text[], p_ca_nhan_ids bigint[], p_phong_ban_ids bigint[], p_xa_phuong_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_column_search jsonb, p_labels jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_dttg_tham_hoi_ca_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_trang_thai text[], p_ca_nhan_ids bigint[], p_phong_ban_ids bigint[], p_xa_phuong_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_column_search jsonb, p_labels jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_dttg_tham_hoi_ca_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_trang_thai text[], p_ca_nhan_ids bigint[], p_phong_ban_ids bigint[], p_xa_phuong_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_column_search jsonb, p_labels jsonb) TO service_role;


--
-- Name: FUNCTION get_dttg_tham_hoi_to_chuc_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_tien_do text[], p_to_chuc_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_phong_ban_ids bigint[], p_column_search jsonb, p_labels jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_dttg_tham_hoi_to_chuc_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_tien_do text[], p_to_chuc_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_phong_ban_ids bigint[], p_column_search jsonb, p_labels jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_dttg_tham_hoi_to_chuc_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_tien_do text[], p_to_chuc_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_phong_ban_ids bigint[], p_column_search jsonb, p_labels jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_dttg_tham_hoi_to_chuc_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_tien_do text[], p_to_chuc_ids bigint[], p_dip_ids bigint[], p_don_vi_ids bigint[], p_don_vi_include_null boolean, p_phong_ban_ids bigint[], p_column_search jsonb, p_labels jsonb) TO service_role;


--
-- Name: FUNCTION get_hngh_nhan_ho_tro_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_chi_ho_da_nhan boolean, p_ho_ngheo_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_chi_ho_da_nhan boolean, p_ho_ngheo_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_chi_ho_da_nhan boolean, p_ho_ngheo_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_chi_ho_da_nhan boolean, p_ho_ngheo_id bigint) TO service_role;


--
-- Name: FUNCTION get_hngh_nhan_ho_tro_tong(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_tong(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[]) TO anon;
GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_tong(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[]) TO authenticated;
GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_tong(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[]) TO service_role;


--
-- Name: FUNCTION get_hngh_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_doi_tuong text[], p_ton_giao text[], p_trang_thai text[], p_dan_toc_ids bigint[], p_xa_phuong_ids bigint[], p_column_search jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_hngh_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_doi_tuong text[], p_ton_giao text[], p_trang_thai text[], p_dan_toc_ids bigint[], p_xa_phuong_ids bigint[], p_column_search jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_hngh_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_doi_tuong text[], p_ton_giao text[], p_trang_thai text[], p_dan_toc_ids bigint[], p_xa_phuong_ids bigint[], p_column_search jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_hngh_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_doi_tuong text[], p_ton_giao text[], p_trang_thai text[], p_dan_toc_ids bigint[], p_xa_phuong_ids bigint[], p_column_search jsonb) TO service_role;


--
-- Name: FUNCTION get_hngh_thong_ke_nhom(p_view_all boolean, p_viewer_xa_phuong_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_hngh_thong_ke_nhom(p_view_all boolean, p_viewer_xa_phuong_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_hngh_thong_ke_nhom(p_view_all boolean, p_viewer_xa_phuong_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_hngh_thong_ke_nhom(p_view_all boolean, p_viewer_xa_phuong_id bigint) TO service_role;


--
-- Name: FUNCTION get_kho_don_vi_cuu_tro_ket_qua(p_don_vi_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ket_qua(p_don_vi_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ket_qua(p_don_vi_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ket_qua(p_don_vi_id bigint) TO service_role;


--
-- Name: FUNCTION get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay date, p_den_ngay date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay date, p_den_ngay date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay date, p_den_ngay date) TO authenticated;
GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay date, p_den_ngay date) TO service_role;


--
-- Name: FUNCTION get_kho_don_vi_cuu_tro_ung_ho_theo_ky(p_tu_ngay date, p_den_ngay date); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_theo_ky(p_tu_ngay date, p_den_ngay date) TO anon;
GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_theo_ky(p_tu_ngay date, p_den_ngay date) TO authenticated;
GRANT ALL ON FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_theo_ky(p_tu_ngay date, p_den_ngay date) TO service_role;


--
-- Name: FUNCTION get_kho_nhap_xuat_kho_ct_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_hang_hoa_id bigint, p_column_search jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_kho_nhap_xuat_kho_ct_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_hang_hoa_id bigint, p_column_search jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_kho_nhap_xuat_kho_ct_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_hang_hoa_id bigint, p_column_search jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_kho_nhap_xuat_kho_ct_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_hang_hoa_id bigint, p_column_search jsonb) TO service_role;


--
-- Name: FUNCTION get_kho_nhap_xuat_kho_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_column_search jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_kho_nhap_xuat_kho_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_column_search jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_kho_nhap_xuat_kho_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_column_search jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_kho_nhap_xuat_kho_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_loai_phieu text, p_kho_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_column_search jsonb) TO service_role;


--
-- Name: FUNCTION get_kho_nxk_muc_dich_goi_y(p_loai_phieu text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_kho_nxk_muc_dich_goi_y(p_loai_phieu text) TO anon;
GRANT ALL ON FUNCTION public.get_kho_nxk_muc_dich_goi_y(p_loai_phieu text) TO authenticated;
GRANT ALL ON FUNCTION public.get_kho_nxk_muc_dich_goi_y(p_loai_phieu text) TO service_role;


--
-- Name: FUNCTION get_ktnt_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_cap_khen text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_nha_tai_tro_ids bigint[], p_loai_nha_tai_tro text[], p_column_search jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_ktnt_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_cap_khen text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_nha_tai_tro_ids bigint[], p_loai_nha_tai_tro text[], p_column_search jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_ktnt_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_cap_khen text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_nha_tai_tro_ids bigint[], p_loai_nha_tai_tro text[], p_column_search jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_ktnt_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_cap_khen text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_nha_tai_tro_ids bigint[], p_loai_nha_tai_tro text[], p_column_search jsonb) TO service_role;


--
-- Name: FUNCTION get_ktnt_thanh_tich(p_nha_tai_tro_id bigint, p_tu_nam integer, p_den_nam integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_ktnt_thanh_tich(p_nha_tai_tro_id bigint, p_tu_nam integer, p_den_nam integer) TO anon;
GRANT ALL ON FUNCTION public.get_ktnt_thanh_tich(p_nha_tai_tro_id bigint, p_tu_nam integer, p_den_nam integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_ktnt_thanh_tich(p_nha_tai_tro_id bigint, p_tu_nam integer, p_den_nam integer) TO service_role;


--
-- Name: FUNCTION get_nddk_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_loai_hinh text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb, p_nha_tai_tro_ids bigint[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_nddk_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_loai_hinh text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb, p_nha_tai_tro_ids bigint[]) TO anon;
GRANT ALL ON FUNCTION public.get_nddk_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_loai_hinh text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb, p_nha_tai_tro_ids bigint[]) TO authenticated;
GRANT ALL ON FUNCTION public.get_nddk_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_loai_hinh text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb, p_nha_tai_tro_ids bigint[]) TO service_role;


--
-- Name: FUNCTION get_nhan_vien_count_by_chuc_vu(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_nhan_vien_count_by_chuc_vu() TO anon;
GRANT ALL ON FUNCTION public.get_nhan_vien_count_by_chuc_vu() TO authenticated;
GRANT ALL ON FUNCTION public.get_nhan_vien_count_by_chuc_vu() TO service_role;


--
-- Name: FUNCTION get_pbxh_thuc_hien_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_cap_thuc_hien text[], p_loai_hinh text[], p_tinh_trang text[], p_don_vi_chu_tri_ids bigint[], p_column_search jsonb, p_labels jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_pbxh_thuc_hien_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_cap_thuc_hien text[], p_loai_hinh text[], p_tinh_trang text[], p_don_vi_chu_tri_ids bigint[], p_column_search jsonb, p_labels jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_pbxh_thuc_hien_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_cap_thuc_hien text[], p_loai_hinh text[], p_tinh_trang text[], p_don_vi_chu_tri_ids bigint[], p_column_search jsonb, p_labels jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_pbxh_thuc_hien_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_don_vi_id bigint, p_cap_thuc_hien text[], p_loai_hinh text[], p_tinh_trang text[], p_don_vi_chu_tri_ids bigint[], p_column_search jsonb, p_labels jsonb) TO service_role;


--
-- Name: FUNCTION get_phong_ban_path_level(p_id bigint, p_cha_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_phong_ban_path_level(p_id bigint, p_cha_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_phong_ban_path_level(p_id bigint, p_cha_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_phong_ban_path_level(p_id bigint, p_cha_id bigint) TO service_role;


--
-- Name: FUNCTION get_tang_luong_sap_den_han_count(p_so_ngay integer, p_scope text, p_viewer_don_vi_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_tang_luong_sap_den_han_count(p_so_ngay integer, p_scope text, p_viewer_don_vi_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_tang_luong_sap_den_han_count(p_so_ngay integer, p_scope text, p_viewer_don_vi_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_tang_luong_sap_den_han_count(p_so_ngay integer, p_scope text, p_viewer_don_vi_id bigint) TO service_role;


--
-- Name: FUNCTION get_tn_phieu_kho_cua_nha_tai_tro(p_nha_tai_tro_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_tn_phieu_kho_cua_nha_tai_tro(p_nha_tai_tro_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_tn_phieu_kho_cua_nha_tai_tro(p_nha_tai_tro_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_tn_phieu_kho_cua_nha_tai_tro(p_nha_tai_tro_id bigint) TO service_role;


--
-- Name: FUNCTION get_tn_tiep_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nha_tai_tro_ids bigint[], p_chuong_trinh_ids bigint[], p_hinh_thuc text[], p_trang_thai text[], p_tu_ngay date, p_den_ngay date, p_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_tn_tiep_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nha_tai_tro_ids bigint[], p_chuong_trinh_ids bigint[], p_hinh_thuc text[], p_trang_thai text[], p_tu_ngay date, p_den_ngay date, p_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_tn_tiep_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nha_tai_tro_ids bigint[], p_chuong_trinh_ids bigint[], p_hinh_thuc text[], p_trang_thai text[], p_tu_ngay date, p_den_ngay date, p_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_tn_tiep_nhan_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_nha_tai_tro_ids bigint[], p_chuong_trinh_ids bigint[], p_hinh_thuc text[], p_trang_thai text[], p_tu_ngay date, p_den_ngay date, p_id bigint) TO service_role;


--
-- Name: FUNCTION get_uy_vien_diem_danh_summary_for_don_vi(p_uy_vien_ids bigint[], p_don_vi_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_uy_vien_diem_danh_summary_for_don_vi(p_uy_vien_ids bigint[], p_don_vi_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_uy_vien_diem_danh_summary_for_don_vi(p_uy_vien_ids bigint[], p_don_vi_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_uy_vien_diem_danh_summary_for_don_vi(p_uy_vien_ids bigint[], p_don_vi_id bigint) TO service_role;


--
-- Name: FUNCTION get_vnn_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_linh_vuc text[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_hinh_thuc text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_vnn_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_linh_vuc text[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_hinh_thuc text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_vnn_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_linh_vuc text[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_hinh_thuc text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_vnn_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_nam integer[], p_linh_vuc text[], p_nguon text[], p_nguon_ho_tro text[], p_doi_tuong text[], p_hinh_thuc text[], p_trang_thai text[], p_xa_phuong_ids bigint[], p_column_search jsonb) TO service_role;


--
-- Name: FUNCTION get_xa_counts_by_tinh_thanh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_xa_counts_by_tinh_thanh() TO anon;
GRANT ALL ON FUNCTION public.get_xa_counts_by_tinh_thanh() TO authenticated;
GRANT ALL ON FUNCTION public.get_xa_counts_by_tinh_thanh() TO service_role;


--
-- Name: FUNCTION luong_thiet_lap_ngach_seed_bac(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.luong_thiet_lap_ngach_seed_bac() TO anon;
GRANT ALL ON FUNCTION public.luong_thiet_lap_ngach_seed_bac() TO authenticated;
GRANT ALL ON FUNCTION public.luong_thiet_lap_ngach_seed_bac() TO service_role;


--
-- Name: FUNCTION mttq_can_bo_validate_thiet_lap_loai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mttq_can_bo_validate_thiet_lap_loai() TO anon;
GRANT ALL ON FUNCTION public.mttq_can_bo_validate_thiet_lap_loai() TO authenticated;
GRANT ALL ON FUNCTION public.mttq_can_bo_validate_thiet_lap_loai() TO service_role;


--
-- Name: FUNCTION mttq_khen_thuong_ct_touch_parent(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mttq_khen_thuong_ct_touch_parent() TO anon;
GRANT ALL ON FUNCTION public.mttq_khen_thuong_ct_touch_parent() TO authenticated;
GRANT ALL ON FUNCTION public.mttq_khen_thuong_ct_touch_parent() TO service_role;


--
-- Name: FUNCTION mttq_lop_tap_huan_ct_touch_parent(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mttq_lop_tap_huan_ct_touch_parent() TO anon;
GRANT ALL ON FUNCTION public.mttq_lop_tap_huan_ct_touch_parent() TO authenticated;
GRANT ALL ON FUNCTION public.mttq_lop_tap_huan_ct_touch_parent() TO service_role;


--
-- Name: FUNCTION mttq_lop_tap_huan_validate_to_chuc_loai(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mttq_lop_tap_huan_validate_to_chuc_loai() TO anon;
GRANT ALL ON FUNCTION public.mttq_lop_tap_huan_validate_to_chuc_loai() TO authenticated;
GRANT ALL ON FUNCTION public.mttq_lop_tap_huan_validate_to_chuc_loai() TO service_role;


--
-- Name: FUNCTION mttq_uy_vien_uy_ban_touch_nhiem_ky(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mttq_uy_vien_uy_ban_touch_nhiem_ky() TO anon;
GRANT ALL ON FUNCTION public.mttq_uy_vien_uy_ban_touch_nhiem_ky() TO authenticated;
GRANT ALL ON FUNCTION public.mttq_uy_vien_uy_ban_touch_nhiem_ky() TO service_role;


--
-- Name: FUNCTION pbxh_thuc_hien_sync_phan_tram_hoan_thanh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pbxh_thuc_hien_sync_phan_tram_hoan_thanh() TO anon;
GRANT ALL ON FUNCTION public.pbxh_thuc_hien_sync_phan_tram_hoan_thanh() TO authenticated;
GRANT ALL ON FUNCTION public.pbxh_thuc_hien_sync_phan_tram_hoan_thanh() TO service_role;


--
-- Name: FUNCTION rpc_khen_thuong_cap_nhat_quyet_dinh(p_id bigint, p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_chi_tiet jsonb, p_noi_dung_khen text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(p_id bigint, p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_chi_tiet jsonb, p_noi_dung_khen text) TO anon;
GRANT ALL ON FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(p_id bigint, p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_chi_tiet jsonb, p_noi_dung_khen text) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(p_id bigint, p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_chi_tiet jsonb, p_noi_dung_khen text) TO service_role;


--
-- Name: FUNCTION rpc_khen_thuong_tao_quyet_dinh(p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_id_nguoi_tao bigint, p_chi_tiet jsonb, p_noi_dung_khen text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_id_nguoi_tao bigint, p_chi_tiet jsonb, p_noi_dung_khen text) TO anon;
GRANT ALL ON FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_id_nguoi_tao bigint, p_chi_tiet jsonb, p_noi_dung_khen text) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(p_so_qd text, p_ngay_khen_thuong date, p_don_vi_de_xuat text, p_ghi_chu text, p_trang_thai text, p_id_nguoi_tao bigint, p_chi_tiet jsonb, p_noi_dung_khen text) TO service_role;


--
-- Name: FUNCTION rpc_kho_cap_nhat_phieu_nhap_xuat(p_id bigint, p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(p_id bigint, p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(p_id bigint, p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(p_id bigint, p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint) TO service_role;


--
-- Name: FUNCTION rpc_kho_tao_phieu_nhap_xuat(p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(p_loai_phieu text, p_ngay_phieu date, p_kho_xuat_id bigint, p_kho_nhap_id bigint, p_don_vi_cuu_tro_id bigint, p_dot_cuu_tro_id bigint, p_ghi_chu text, p_nguoi_giao_nhan text, p_bo_phan text, p_chung_tu_goc text, p_muc_dich text, p_chi_tiet jsonb, p_ho_ngheo_id bigint) TO service_role;


--
-- Name: FUNCTION rpc_phan_quyen_cap_nhat_module(p_module_key text, p_legacy_keys text[], p_updates jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rpc_phan_quyen_cap_nhat_module(p_module_key text, p_legacy_keys text[], p_updates jsonb) TO anon;
GRANT ALL ON FUNCTION public.rpc_phan_quyen_cap_nhat_module(p_module_key text, p_legacy_keys text[], p_updates jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_phan_quyen_cap_nhat_module(p_module_key text, p_legacy_keys text[], p_updates jsonb) TO service_role;


--
-- Name: FUNCTION rpc_tap_huan_cap_nhat_lop(p_id bigint, p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_chi_tiet jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rpc_tap_huan_cap_nhat_lop(p_id bigint, p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_chi_tiet jsonb) TO anon;
GRANT ALL ON FUNCTION public.rpc_tap_huan_cap_nhat_lop(p_id bigint, p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_chi_tiet jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_tap_huan_cap_nhat_lop(p_id bigint, p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_chi_tiet jsonb) TO service_role;


--
-- Name: FUNCTION rpc_tap_huan_tao_lop(p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_id_nguoi_tao bigint, p_chi_tiet jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rpc_tap_huan_tao_lop(p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_id_nguoi_tao bigint, p_chi_tiet jsonb) TO anon;
GRANT ALL ON FUNCTION public.rpc_tap_huan_tao_lop(p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_id_nguoi_tao bigint, p_chi_tiet jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_tap_huan_tao_lop(p_ten_lop_tap_huan text, p_nam_tap_huan integer, p_cap_tap_huan text, p_don_vi_id bigint, p_to_chuc_id bigint, p_ghi_chu text, p_id_nguoi_tao bigint, p_chi_tiet jsonb) TO service_role;


--
-- Name: FUNCTION rpc_thong_bao_danh_dau_tat_ca_da_doc(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() TO authenticated;
GRANT ALL ON FUNCTION public.rpc_thong_bao_danh_dau_tat_ca_da_doc() TO service_role;


--
-- Name: FUNCTION rpc_tn_luu_tiep_nhan(p_id bigint, p_data jsonb, p_phieu_ids bigint[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rpc_tn_luu_tiep_nhan(p_id bigint, p_data jsonb, p_phieu_ids bigint[]) TO anon;
GRANT ALL ON FUNCTION public.rpc_tn_luu_tiep_nhan(p_id bigint, p_data jsonb, p_phieu_ids bigint[]) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_tn_luu_tiep_nhan(p_id bigint, p_data jsonb, p_phieu_ids bigint[]) TO service_role;


--
-- Name: FUNCTION set_tg_cap_nhat(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_tg_cap_nhat() TO anon;
GRANT ALL ON FUNCTION public.set_tg_cap_nhat() TO authenticated;
GRANT ALL ON FUNCTION public.set_tg_cap_nhat() TO service_role;


--
-- Name: FUNCTION var_phong_ban_path_after_insert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.var_phong_ban_path_after_insert() TO anon;
GRANT ALL ON FUNCTION public.var_phong_ban_path_after_insert() TO authenticated;
GRANT ALL ON FUNCTION public.var_phong_ban_path_after_insert() TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.audit_log TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: SEQUENCE audit_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.audit_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;


--
-- Name: TABLE bai_viet_danh_sach; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bai_viet_danh_sach TO anon;
GRANT ALL ON TABLE public.bai_viet_danh_sach TO authenticated;
GRANT ALL ON TABLE public.bai_viet_danh_sach TO service_role;


--
-- Name: SEQUENCE bai_viet_danh_sach_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.bai_viet_danh_sach_id_seq TO anon;
GRANT ALL ON SEQUENCE public.bai_viet_danh_sach_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.bai_viet_danh_sach_id_seq TO service_role;


--
-- Name: TABLE bai_viet_thiet_lap_khac; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bai_viet_thiet_lap_khac TO anon;
GRANT ALL ON TABLE public.bai_viet_thiet_lap_khac TO authenticated;
GRANT ALL ON TABLE public.bai_viet_thiet_lap_khac TO service_role;


--
-- Name: SEQUENCE bai_viet_thiet_lap_khac_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.bai_viet_thiet_lap_khac_id_seq TO anon;
GRANT ALL ON SEQUENCE public.bai_viet_thiet_lap_khac_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.bai_viet_thiet_lap_khac_id_seq TO service_role;


--
-- Name: TABLE bai_viet_thiet_lap_the_loai; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bai_viet_thiet_lap_the_loai TO anon;
GRANT ALL ON TABLE public.bai_viet_thiet_lap_the_loai TO authenticated;
GRANT ALL ON TABLE public.bai_viet_thiet_lap_the_loai TO service_role;


--
-- Name: SEQUENCE bai_viet_thiet_lap_the_loai_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.bai_viet_thiet_lap_the_loai_id_seq TO anon;
GRANT ALL ON SEQUENCE public.bai_viet_thiet_lap_the_loai_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.bai_viet_thiet_lap_the_loai_id_seq TO service_role;


--
-- Name: TABLE chuong_trinh_nam; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chuong_trinh_nam TO anon;
GRANT ALL ON TABLE public.chuong_trinh_nam TO authenticated;
GRANT ALL ON TABLE public.chuong_trinh_nam TO service_role;


--
-- Name: SEQUENCE chuong_trinh_nam_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.chuong_trinh_nam_id_seq TO anon;
GRANT ALL ON SEQUENCE public.chuong_trinh_nam_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.chuong_trinh_nam_id_seq TO service_role;


--
-- Name: TABLE cong_viec_danh_sach; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cong_viec_danh_sach TO anon;
GRANT ALL ON TABLE public.cong_viec_danh_sach TO authenticated;
GRANT ALL ON TABLE public.cong_viec_danh_sach TO service_role;


--
-- Name: SEQUENCE cong_viec_danh_sach_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.cong_viec_danh_sach_id_seq TO anon;
GRANT ALL ON SEQUENCE public.cong_viec_danh_sach_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.cong_viec_danh_sach_id_seq TO service_role;


--
-- Name: TABLE dttg_dip_tham_hoi; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dttg_dip_tham_hoi TO anon;
GRANT ALL ON TABLE public.dttg_dip_tham_hoi TO authenticated;
GRANT ALL ON TABLE public.dttg_dip_tham_hoi TO service_role;


--
-- Name: SEQUENCE dttg_dip_tham_hoi_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.dttg_dip_tham_hoi_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dttg_dip_tham_hoi_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dttg_dip_tham_hoi_id_seq TO service_role;


--
-- Name: TABLE dttg_tham_hoi_ca_nhan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dttg_tham_hoi_ca_nhan TO anon;
GRANT ALL ON TABLE public.dttg_tham_hoi_ca_nhan TO authenticated;
GRANT ALL ON TABLE public.dttg_tham_hoi_ca_nhan TO service_role;


--
-- Name: TABLE dttg_tham_hoi_to_chuc; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dttg_tham_hoi_to_chuc TO anon;
GRANT ALL ON TABLE public.dttg_tham_hoi_to_chuc TO authenticated;
GRANT ALL ON TABLE public.dttg_tham_hoi_to_chuc TO service_role;


--
-- Name: TABLE dttg_dip_tham_hoi_with_counts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dttg_dip_tham_hoi_with_counts TO anon;
GRANT ALL ON TABLE public.dttg_dip_tham_hoi_with_counts TO authenticated;
GRANT ALL ON TABLE public.dttg_dip_tham_hoi_with_counts TO service_role;


--
-- Name: SEQUENCE dttg_tham_hoi_ca_nhan_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.dttg_tham_hoi_ca_nhan_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dttg_tham_hoi_ca_nhan_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dttg_tham_hoi_ca_nhan_id_seq TO service_role;


--
-- Name: SEQUENCE dttg_tham_hoi_to_chuc_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.dttg_tham_hoi_to_chuc_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dttg_tham_hoi_to_chuc_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dttg_tham_hoi_to_chuc_id_seq TO service_role;


--
-- Name: TABLE dttg_thong_tin_ca_nhan_tieu_bieu; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dttg_thong_tin_ca_nhan_tieu_bieu TO anon;
GRANT ALL ON TABLE public.dttg_thong_tin_ca_nhan_tieu_bieu TO authenticated;
GRANT ALL ON TABLE public.dttg_thong_tin_ca_nhan_tieu_bieu TO service_role;


--
-- Name: SEQUENCE dttg_thong_tin_ca_nhan_tieu_bieu_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.dttg_thong_tin_ca_nhan_tieu_bieu_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dttg_thong_tin_ca_nhan_tieu_bieu_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dttg_thong_tin_ca_nhan_tieu_bieu_id_seq TO service_role;


--
-- Name: TABLE dttg_thong_tin_to_chuc_quan_trong; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dttg_thong_tin_to_chuc_quan_trong TO anon;
GRANT ALL ON TABLE public.dttg_thong_tin_to_chuc_quan_trong TO authenticated;
GRANT ALL ON TABLE public.dttg_thong_tin_to_chuc_quan_trong TO service_role;


--
-- Name: SEQUENCE dttg_thong_tin_to_chuc_quan_trong_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.dttg_thong_tin_to_chuc_quan_trong_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dttg_thong_tin_to_chuc_quan_trong_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dttg_thong_tin_to_chuc_quan_trong_id_seq TO service_role;


--
-- Name: TABLE hngh_thong_tin_ho_ngheo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hngh_thong_tin_ho_ngheo TO anon;
GRANT ALL ON TABLE public.hngh_thong_tin_ho_ngheo TO authenticated;
GRANT ALL ON TABLE public.hngh_thong_tin_ho_ngheo TO service_role;


--
-- Name: SEQUENCE hngh_thong_tin_ho_ngheo_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.hngh_thong_tin_ho_ngheo_id_seq TO anon;
GRANT ALL ON SEQUENCE public.hngh_thong_tin_ho_ngheo_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.hngh_thong_tin_ho_ngheo_id_seq TO service_role;


--
-- Name: TABLE kho_danh_muc_hang_hoa; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_danh_muc_hang_hoa TO anon;
GRANT ALL ON TABLE public.kho_danh_muc_hang_hoa TO authenticated;
GRANT ALL ON TABLE public.kho_danh_muc_hang_hoa TO service_role;


--
-- Name: SEQUENCE kho_danh_muc_hang_hoa_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_danh_muc_hang_hoa_id_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_danh_muc_hang_hoa_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_danh_muc_hang_hoa_id_seq TO service_role;


--
-- Name: TABLE kho_danh_sach_hang_hoa; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_danh_sach_hang_hoa TO anon;
GRANT ALL ON TABLE public.kho_danh_sach_hang_hoa TO authenticated;
GRANT ALL ON TABLE public.kho_danh_sach_hang_hoa TO service_role;


--
-- Name: SEQUENCE kho_danh_sach_hang_hoa_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_danh_sach_hang_hoa_id_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_danh_sach_hang_hoa_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_danh_sach_hang_hoa_id_seq TO service_role;


--
-- Name: TABLE kho_danh_sach_kho; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_danh_sach_kho TO anon;
GRANT ALL ON TABLE public.kho_danh_sach_kho TO authenticated;
GRANT ALL ON TABLE public.kho_danh_sach_kho TO service_role;


--
-- Name: SEQUENCE kho_danh_sach_kho_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_danh_sach_kho_id_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_danh_sach_kho_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_danh_sach_kho_id_seq TO service_role;


--
-- Name: SEQUENCE kho_danh_sach_kho_tt_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_danh_sach_kho_tt_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_danh_sach_kho_tt_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_danh_sach_kho_tt_seq TO service_role;


--
-- Name: TABLE kho_don_vi_cuu_tro; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_don_vi_cuu_tro TO anon;
GRANT ALL ON TABLE public.kho_don_vi_cuu_tro TO authenticated;
GRANT ALL ON TABLE public.kho_don_vi_cuu_tro TO service_role;


--
-- Name: SEQUENCE kho_don_vi_cuu_tro_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_don_vi_cuu_tro_id_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_don_vi_cuu_tro_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_don_vi_cuu_tro_id_seq TO service_role;


--
-- Name: SEQUENCE kho_don_vi_cuu_tro_tt_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_don_vi_cuu_tro_tt_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_don_vi_cuu_tro_tt_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_don_vi_cuu_tro_tt_seq TO service_role;


--
-- Name: TABLE kho_dot_cuu_tro; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_dot_cuu_tro TO anon;
GRANT ALL ON TABLE public.kho_dot_cuu_tro TO authenticated;
GRANT ALL ON TABLE public.kho_dot_cuu_tro TO service_role;


--
-- Name: SEQUENCE kho_dot_cuu_tro_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_dot_cuu_tro_id_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_dot_cuu_tro_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_dot_cuu_tro_id_seq TO service_role;


--
-- Name: SEQUENCE kho_dot_cuu_tro_tt_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_dot_cuu_tro_tt_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_dot_cuu_tro_tt_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_dot_cuu_tro_tt_seq TO service_role;


--
-- Name: TABLE kho_nhap_xuat_kho; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_nhap_xuat_kho TO anon;
GRANT ALL ON TABLE public.kho_nhap_xuat_kho TO authenticated;
GRANT ALL ON TABLE public.kho_nhap_xuat_kho TO service_role;


--
-- Name: TABLE kho_nhap_xuat_kho_ct; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_nhap_xuat_kho_ct TO anon;
GRANT ALL ON TABLE public.kho_nhap_xuat_kho_ct TO authenticated;
GRANT ALL ON TABLE public.kho_nhap_xuat_kho_ct TO service_role;


--
-- Name: SEQUENCE kho_nhap_xuat_kho_ct_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_ct_id_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_ct_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_ct_id_seq TO service_role;


--
-- Name: SEQUENCE kho_nhap_xuat_kho_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_id_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_id_seq TO service_role;


--
-- Name: SEQUENCE kho_nhap_xuat_kho_pc_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_pc_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_pc_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_pc_seq TO service_role;


--
-- Name: SEQUENCE kho_nhap_xuat_kho_pn_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_pn_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_pn_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_pn_seq TO service_role;


--
-- Name: SEQUENCE kho_nhap_xuat_kho_px_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_px_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_px_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_px_seq TO service_role;


--
-- Name: SEQUENCE kho_nhap_xuat_kho_tt_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_tt_seq TO anon;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_tt_seq TO authenticated;
GRANT ALL ON SEQUENCE public.kho_nhap_xuat_kho_tt_seq TO service_role;


--
-- Name: TABLE kho_ton_kho_view; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kho_ton_kho_view TO anon;
GRANT ALL ON TABLE public.kho_ton_kho_view TO authenticated;
GRANT ALL ON TABLE public.kho_ton_kho_view TO service_role;


--
-- Name: TABLE ktnt_khen_thuong_nha_tai_tro; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ktnt_khen_thuong_nha_tai_tro TO anon;
GRANT ALL ON TABLE public.ktnt_khen_thuong_nha_tai_tro TO authenticated;
GRANT ALL ON TABLE public.ktnt_khen_thuong_nha_tai_tro TO service_role;


--
-- Name: SEQUENCE ktnt_khen_thuong_nha_tai_tro_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.ktnt_khen_thuong_nha_tai_tro_id_seq TO anon;
GRANT ALL ON SEQUENCE public.ktnt_khen_thuong_nha_tai_tro_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ktnt_khen_thuong_nha_tai_tro_id_seq TO service_role;


--
-- Name: TABLE lich_su_trang_thai; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.lich_su_trang_thai TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.lich_su_trang_thai TO authenticated;
GRANT ALL ON TABLE public.lich_su_trang_thai TO service_role;


--
-- Name: SEQUENCE lich_su_trang_thai_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lich_su_trang_thai_id_seq TO anon;
GRANT ALL ON SEQUENCE public.lich_su_trang_thai_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.lich_su_trang_thai_id_seq TO service_role;


--
-- Name: TABLE luong_thiet_lap_bac_luong; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.luong_thiet_lap_bac_luong TO anon;
GRANT ALL ON TABLE public.luong_thiet_lap_bac_luong TO authenticated;
GRANT ALL ON TABLE public.luong_thiet_lap_bac_luong TO service_role;


--
-- Name: SEQUENCE luong_thiet_lap_bac_luong_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.luong_thiet_lap_bac_luong_id_seq TO anon;
GRANT ALL ON SEQUENCE public.luong_thiet_lap_bac_luong_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.luong_thiet_lap_bac_luong_id_seq TO service_role;


--
-- Name: TABLE luong_thiet_lap_cau_hinh; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.luong_thiet_lap_cau_hinh TO anon;
GRANT ALL ON TABLE public.luong_thiet_lap_cau_hinh TO authenticated;
GRANT ALL ON TABLE public.luong_thiet_lap_cau_hinh TO service_role;


--
-- Name: TABLE luong_thiet_lap_ngach_luong; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.luong_thiet_lap_ngach_luong TO anon;
GRANT ALL ON TABLE public.luong_thiet_lap_ngach_luong TO authenticated;
GRANT ALL ON TABLE public.luong_thiet_lap_ngach_luong TO service_role;


--
-- Name: SEQUENCE luong_thiet_lap_ngach_luong_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.luong_thiet_lap_ngach_luong_id_seq TO anon;
GRANT ALL ON SEQUENCE public.luong_thiet_lap_ngach_luong_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.luong_thiet_lap_ngach_luong_id_seq TO service_role;


--
-- Name: TABLE mttq_can_bo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_can_bo TO anon;
GRANT ALL ON TABLE public.mttq_can_bo TO authenticated;
GRANT ALL ON TABLE public.mttq_can_bo TO service_role;


--
-- Name: SEQUENCE mttq_can_bo_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_can_bo_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_can_bo_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_can_bo_id_seq TO service_role;


--
-- Name: TABLE mttq_diem_danh_uy_vien; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_diem_danh_uy_vien TO anon;
GRANT ALL ON TABLE public.mttq_diem_danh_uy_vien TO authenticated;
GRANT ALL ON TABLE public.mttq_diem_danh_uy_vien TO service_role;


--
-- Name: SEQUENCE mttq_diem_danh_uy_vien_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_diem_danh_uy_vien_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_diem_danh_uy_vien_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_diem_danh_uy_vien_id_seq TO service_role;


--
-- Name: TABLE mttq_khen_thuong; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_khen_thuong TO anon;
GRANT ALL ON TABLE public.mttq_khen_thuong TO authenticated;
GRANT ALL ON TABLE public.mttq_khen_thuong TO service_role;


--
-- Name: TABLE mttq_khen_thuong_ct; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_khen_thuong_ct TO anon;
GRANT ALL ON TABLE public.mttq_khen_thuong_ct TO authenticated;
GRANT ALL ON TABLE public.mttq_khen_thuong_ct TO service_role;


--
-- Name: SEQUENCE mttq_khen_thuong_ct_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_khen_thuong_ct_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_khen_thuong_ct_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_khen_thuong_ct_id_seq TO service_role;


--
-- Name: SEQUENCE mttq_khen_thuong_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_khen_thuong_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_khen_thuong_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_khen_thuong_id_seq TO service_role;


--
-- Name: TABLE mttq_ky_hop; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_ky_hop TO anon;
GRANT ALL ON TABLE public.mttq_ky_hop TO authenticated;
GRANT ALL ON TABLE public.mttq_ky_hop TO service_role;


--
-- Name: SEQUENCE mttq_ky_hop_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_ky_hop_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_ky_hop_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_ky_hop_id_seq TO service_role;


--
-- Name: TABLE mttq_lop_tap_huan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_lop_tap_huan TO anon;
GRANT ALL ON TABLE public.mttq_lop_tap_huan TO authenticated;
GRANT ALL ON TABLE public.mttq_lop_tap_huan TO service_role;


--
-- Name: TABLE mttq_lop_tap_huan_ct; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_lop_tap_huan_ct TO anon;
GRANT ALL ON TABLE public.mttq_lop_tap_huan_ct TO authenticated;
GRANT ALL ON TABLE public.mttq_lop_tap_huan_ct TO service_role;


--
-- Name: SEQUENCE mttq_lop_tap_huan_ct_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_lop_tap_huan_ct_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_lop_tap_huan_ct_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_lop_tap_huan_ct_id_seq TO service_role;


--
-- Name: SEQUENCE mttq_lop_tap_huan_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_lop_tap_huan_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_lop_tap_huan_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_lop_tap_huan_id_seq TO service_role;


--
-- Name: TABLE mttq_nhiem_ky; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_nhiem_ky TO anon;
GRANT ALL ON TABLE public.mttq_nhiem_ky TO authenticated;
GRANT ALL ON TABLE public.mttq_nhiem_ky TO service_role;


--
-- Name: SEQUENCE mttq_nhiem_ky_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_nhiem_ky_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_nhiem_ky_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_nhiem_ky_id_seq TO service_role;


--
-- Name: TABLE mttq_tang_luong; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_tang_luong TO anon;
GRANT ALL ON TABLE public.mttq_tang_luong TO authenticated;
GRANT ALL ON TABLE public.mttq_tang_luong TO service_role;


--
-- Name: SEQUENCE mttq_tang_luong_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_tang_luong_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_tang_luong_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_tang_luong_id_seq TO service_role;


--
-- Name: TABLE mttq_thiet_lap; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_thiet_lap TO anon;
GRANT ALL ON TABLE public.mttq_thiet_lap TO authenticated;
GRANT ALL ON TABLE public.mttq_thiet_lap TO service_role;


--
-- Name: SEQUENCE mttq_thiet_lap_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_thiet_lap_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_thiet_lap_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_thiet_lap_id_seq TO service_role;


--
-- Name: TABLE mttq_uy_vien_uy_ban; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mttq_uy_vien_uy_ban TO anon;
GRANT ALL ON TABLE public.mttq_uy_vien_uy_ban TO authenticated;
GRANT ALL ON TABLE public.mttq_uy_vien_uy_ban TO service_role;


--
-- Name: SEQUENCE mttq_uy_vien_uy_ban_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.mttq_uy_vien_uy_ban_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mttq_uy_vien_uy_ban_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mttq_uy_vien_uy_ban_id_seq TO service_role;


--
-- Name: TABLE nddk_nha_dai_doan_ket; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nddk_nha_dai_doan_ket TO anon;
GRANT ALL ON TABLE public.nddk_nha_dai_doan_ket TO authenticated;
GRANT ALL ON TABLE public.nddk_nha_dai_doan_ket TO service_role;


--
-- Name: SEQUENCE nddk_nha_dai_doan_ket_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nddk_nha_dai_doan_ket_id_seq TO anon;
GRANT ALL ON SEQUENCE public.nddk_nha_dai_doan_ket_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.nddk_nha_dai_doan_ket_id_seq TO service_role;


--
-- Name: TABLE pbxh_thiet_lap; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pbxh_thiet_lap TO anon;
GRANT ALL ON TABLE public.pbxh_thiet_lap TO authenticated;
GRANT ALL ON TABLE public.pbxh_thiet_lap TO service_role;


--
-- Name: SEQUENCE pbxh_thiet_lap_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pbxh_thiet_lap_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pbxh_thiet_lap_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pbxh_thiet_lap_id_seq TO service_role;


--
-- Name: TABLE pbxh_thuc_hien_phan_bien_xa_hoi; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi TO anon;
GRANT ALL ON TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi TO authenticated;
GRANT ALL ON TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi TO service_role;


--
-- Name: SEQUENCE pbxh_thuc_hien_phan_bien_xa_hoi_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pbxh_thuc_hien_phan_bien_xa_hoi_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pbxh_thuc_hien_phan_bien_xa_hoi_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pbxh_thuc_hien_phan_bien_xa_hoi_id_seq TO service_role;


--
-- Name: TABLE thong_bao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.thong_bao TO service_role;
GRANT SELECT,UPDATE ON TABLE public.thong_bao TO authenticated;


--
-- Name: SEQUENCE thong_bao_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.thong_bao_id_seq TO anon;
GRANT ALL ON SEQUENCE public.thong_bao_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.thong_bao_id_seq TO service_role;


--
-- Name: TABLE tn_tiep_nhan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tn_tiep_nhan TO anon;
GRANT ALL ON TABLE public.tn_tiep_nhan TO authenticated;
GRANT ALL ON TABLE public.tn_tiep_nhan TO service_role;


--
-- Name: SEQUENCE tn_tiep_nhan_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tn_tiep_nhan_id_seq TO anon;
GRANT ALL ON SEQUENCE public.tn_tiep_nhan_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.tn_tiep_nhan_id_seq TO service_role;


--
-- Name: TABLE tn_tiep_nhan_phieu_kho; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tn_tiep_nhan_phieu_kho TO anon;
GRANT ALL ON TABLE public.tn_tiep_nhan_phieu_kho TO authenticated;
GRANT ALL ON TABLE public.tn_tiep_nhan_phieu_kho TO service_role;


--
-- Name: SEQUENCE tn_tiep_nhan_so_phieu_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tn_tiep_nhan_so_phieu_seq TO anon;
GRANT ALL ON SEQUENCE public.tn_tiep_nhan_so_phieu_seq TO authenticated;
GRANT ALL ON SEQUENCE public.tn_tiep_nhan_so_phieu_seq TO service_role;


--
-- Name: TABLE var_nhan_vien; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.var_nhan_vien TO anon;
GRANT ALL ON TABLE public.var_nhan_vien TO authenticated;
GRANT ALL ON TABLE public.var_nhan_vien TO service_role;


--
-- Name: TABLE v_cong_viec_bao_cao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_cong_viec_bao_cao TO anon;
GRANT ALL ON TABLE public.v_cong_viec_bao_cao TO authenticated;
GRANT ALL ON TABLE public.v_cong_viec_bao_cao TO service_role;


--
-- Name: TABLE v_diem_danh_ky_hop_summary; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_diem_danh_ky_hop_summary TO anon;
GRANT ALL ON TABLE public.v_diem_danh_ky_hop_summary TO authenticated;
GRANT ALL ON TABLE public.v_diem_danh_ky_hop_summary TO service_role;


--
-- Name: TABLE v_diem_danh_uy_vien_summary; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_diem_danh_uy_vien_summary TO anon;
GRANT ALL ON TABLE public.v_diem_danh_uy_vien_summary TO authenticated;
GRANT ALL ON TABLE public.v_diem_danh_uy_vien_summary TO service_role;


--
-- Name: TABLE var_ssn_xa_phuong; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.var_ssn_xa_phuong TO anon;
GRANT ALL ON TABLE public.var_ssn_xa_phuong TO authenticated;
GRANT ALL ON TABLE public.var_ssn_xa_phuong TO service_role;


--
-- Name: TABLE v_xa_phuong_min; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_xa_phuong_min TO anon;
GRANT ALL ON TABLE public.v_xa_phuong_min TO authenticated;
GRANT ALL ON TABLE public.v_xa_phuong_min TO service_role;


--
-- Name: TABLE var_chuc_vu; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.var_chuc_vu TO anon;
GRANT ALL ON TABLE public.var_chuc_vu TO authenticated;
GRANT ALL ON TABLE public.var_chuc_vu TO service_role;


--
-- Name: SEQUENCE var_chuc_vu_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.var_chuc_vu_id_seq TO anon;
GRANT ALL ON SEQUENCE public.var_chuc_vu_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.var_chuc_vu_id_seq TO service_role;


--
-- Name: SEQUENCE var_nhan_vien_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.var_nhan_vien_id_seq TO anon;
GRANT ALL ON SEQUENCE public.var_nhan_vien_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.var_nhan_vien_id_seq TO service_role;


--
-- Name: TABLE var_phan_quyen; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.var_phan_quyen TO anon;
GRANT ALL ON TABLE public.var_phan_quyen TO authenticated;
GRANT ALL ON TABLE public.var_phan_quyen TO service_role;


--
-- Name: SEQUENCE var_phan_quyen_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.var_phan_quyen_id_seq TO anon;
GRANT ALL ON SEQUENCE public.var_phan_quyen_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.var_phan_quyen_id_seq TO service_role;


--
-- Name: TABLE var_phong_ban; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.var_phong_ban TO anon;
GRANT ALL ON TABLE public.var_phong_ban TO authenticated;
GRANT ALL ON TABLE public.var_phong_ban TO service_role;


--
-- Name: SEQUENCE var_phong_ban_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.var_phong_ban_id_seq TO anon;
GRANT ALL ON SEQUENCE public.var_phong_ban_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.var_phong_ban_id_seq TO service_role;


--
-- Name: TABLE var_ssn_tinh_thanh; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.var_ssn_tinh_thanh TO anon;
GRANT ALL ON TABLE public.var_ssn_tinh_thanh TO authenticated;
GRANT ALL ON TABLE public.var_ssn_tinh_thanh TO service_role;


--
-- Name: SEQUENCE var_ssn_tinh_thanh_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.var_ssn_tinh_thanh_id_seq TO anon;
GRANT ALL ON SEQUENCE public.var_ssn_tinh_thanh_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.var_ssn_tinh_thanh_id_seq TO service_role;


--
-- Name: SEQUENCE var_ssn_xa_phuong_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.var_ssn_xa_phuong_id_seq TO anon;
GRANT ALL ON SEQUENCE public.var_ssn_xa_phuong_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.var_ssn_xa_phuong_id_seq TO service_role;


--
-- Name: TABLE var_thong_tin_to_chuc; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.var_thong_tin_to_chuc TO anon;
GRANT ALL ON TABLE public.var_thong_tin_to_chuc TO authenticated;
GRANT ALL ON TABLE public.var_thong_tin_to_chuc TO service_role;


--
-- Name: TABLE vnn_chuong_trinh; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vnn_chuong_trinh TO anon;
GRANT ALL ON TABLE public.vnn_chuong_trinh TO authenticated;
GRANT ALL ON TABLE public.vnn_chuong_trinh TO service_role;


--
-- Name: SEQUENCE vnn_chuong_trinh_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.vnn_chuong_trinh_id_seq TO anon;
GRANT ALL ON SEQUENCE public.vnn_chuong_trinh_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.vnn_chuong_trinh_id_seq TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


