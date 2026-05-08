-- Phase 2 — Egress optimizations: RPCs cho count + path/level + view xã/phường nhẹ.
-- Tham chiếu: docs/supabase-egress.md, plan toi_uu_egress_free-tier.

-- ============================================================================
-- 2.1 RPC đếm nhân viên theo chức vụ (thay full-table scan client-side).
--
-- Trước: phan-quyen-service.ts:135-143 kéo `var_nhan_vien.id_chuc_vu` của TẤT CẢ
-- nhân viên rồi count trong JS — egress O(N_employees) mỗi lần load matrix.
-- Sau: RPC trả O(N_chuc_vu) rows (vài chục) — egress O(số chức vụ).
-- ============================================================================
CREATE OR REPLACE FUNCTION get_nhan_vien_count_by_chuc_vu()
RETURNS TABLE (id_chuc_vu BIGINT, so_nhan_vien BIGINT)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT id_chuc_vu, COUNT(*)::BIGINT AS so_nhan_vien
  FROM var_nhan_vien
  WHERE id_chuc_vu IS NOT NULL
  GROUP BY id_chuc_vu;
$$;

-- ============================================================================
-- 2.3 RPC tính path/level cho phòng ban thay vì kéo `repo.getAll()` client.
--
-- Đầu vào: id phòng ban + cha_id (NULL nếu là root).
-- Đầu ra: 1 row (duong_dan, cap_do).
-- Logic: nếu cha_id NULL → root (`/<id>`, level 1); còn lại lấy duong_dan +
-- cap_do của cha rồi nối.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_phong_ban_path_level(p_id BIGINT, p_cha_id BIGINT)
RETURNS TABLE (duong_dan TEXT, cap_do INT)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
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

-- ============================================================================
-- 2.4 View v_xa_phuong_min — chỉ 3 cột cho lookup import / combobox.
--
-- Trước: import loop dùng `getXaPhuongAll()` qua `XA_PHUONG_SELECT_FULL` (6 cột).
-- Sau: client có thể truy vấn `v_xa_phuong_min` chỉ 3 cột → giảm payload ~50%.
-- (Đã cache 24h client-side ở P1.6 — view này dành cho consumer chưa cache.)
-- ============================================================================
CREATE OR REPLACE VIEW v_xa_phuong_min
WITH (security_invoker = on)
AS
SELECT id, id_tinh_thanh, ten
FROM var_ssn_xa_phuong;

-- ============================================================================
-- 2.2 RPC pagination + search server-side cho bai_viet_danh_sach + cong_viec_danh_sach.
--
-- Các RPC này nhận `p_search`, `p_limit`, `p_offset` để client gửi page state
-- thay vì load full table → filter client. Ban đầu wire-up theo từng module
-- (UI cần thêm pagination state). Hiện tại danh sách bị cap ở 5000 rows
-- (`SUPABASE_DEFAULT_MAX_ROWS`) là đủ cho phạm vi nội bộ.
--
-- bai_viet_danh_sach: search trên `ten_bai`, `link`.
-- cong_viec_danh_sach: search trên `ten_cong_viec`.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_bai_viet_page(
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS SETOF bai_viet_danh_sach
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT *
  FROM bai_viet_danh_sach b
  WHERE p_search IS NULL
     OR b.ten_bai ILIKE '%' || p_search || '%'
     OR (b.link IS NOT NULL AND b.link ILIKE '%' || p_search || '%')
  ORDER BY b.ngay_dang DESC NULLS LAST, b.id DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION get_cong_viec_page(
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS SETOF cong_viec_danh_sach
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT *
  FROM cong_viec_danh_sach c
  WHERE p_search IS NULL
     OR c.ten_cong_viec ILIKE '%' || p_search || '%'
  ORDER BY c.tg_cap_nhat DESC NULLS LAST, c.id DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

COMMENT ON FUNCTION get_bai_viet_page IS
  'Egress optim P2.2: pagination + search server-side cho bài viết danh sách.';
COMMENT ON FUNCTION get_cong_viec_page IS
  'Egress optim P2.2: pagination + search server-side cho công việc danh sách.';

-- ============================================================================
COMMENT ON FUNCTION get_nhan_vien_count_by_chuc_vu IS
  'Egress optim P2.1: thay vòng count client-side trong phan-quyen-service.';
COMMENT ON FUNCTION get_phong_ban_path_level IS
  'Egress optim P2.3: path/level phòng ban không cần kéo getAll() client.';
COMMENT ON VIEW v_xa_phuong_min IS
  'Egress optim P2.4: lookup xã/phường tối thiểu (3 cột) cho import resolver.';
