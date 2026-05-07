-- Hàm đếm số xã/phường theo từng tỉnh/thành bằng GROUP BY phía DB.
-- Thay thế vòng lặp paginate client-side trong getXaCountsByTinhThanhId().
CREATE OR REPLACE FUNCTION get_xa_counts_by_tinh_thanh()
RETURNS TABLE (id_tinh_thanh TEXT, so_xa BIGINT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT id_tinh_thanh::TEXT, COUNT(*)::BIGINT AS so_xa
  FROM var_ssn_xa_phuong
  GROUP BY id_tinh_thanh;
$$;
