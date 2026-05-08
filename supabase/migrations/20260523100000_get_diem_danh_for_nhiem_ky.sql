-- RPC: get_diem_danh_for_nhiem_ky
-- Thay thế pattern 2-query trong client (fetch ky_hop IDs → fetch diem_danh rows).
-- Trả về chỉ 3 cột cần thiết cho ma trận điểm danh, giảm ~40% payload
-- so với SELECT * từ mttq_diem_danh_uy_vien.
-- Gọi thay thế: supabase.rpc('get_diem_danh_for_nhiem_ky', { p_nhiem_ky_id: '...' })

CREATE OR REPLACE FUNCTION get_diem_danh_for_nhiem_ky(p_nhiem_ky_id text)
RETURNS TABLE(
  ky_hop_id  text,
  uy_vien_id text,
  trang_thai text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    d.ky_hop_id::text,
    d.uy_vien_id::text,
    d.trang_thai
  FROM mttq_diem_danh_uy_vien d
  JOIN mttq_ky_hop             k ON k.id = d.ky_hop_id
  WHERE k.nhiem_ky_id::text = p_nhiem_ky_id;
$$;

-- Grant cho authenticated role (khớp với RLS trên bảng nguồn)
GRANT EXECUTE ON FUNCTION get_diem_danh_for_nhiem_ky(text) TO authenticated;
