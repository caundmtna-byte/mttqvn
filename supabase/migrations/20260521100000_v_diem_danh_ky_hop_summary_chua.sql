-- Bổ sung view tóm tắt điểm danh: số ủy viên nhiệm kỳ, số chưa điểm danh.
-- Thứ tự cột 1–7 phải khớp view cũ (tong_diem_danh, co_mat, vang_mat) để CREATE OR REPLACE VIEW không báo lỗi đổi tên cột.

CREATE OR REPLACE VIEW public.v_diem_danh_ky_hop_summary AS
SELECT
  kh.id                                                                 AS ky_hop_id,
  kh.nhiem_ky_id,
  kh.ky_thu,
  kh.ngay_hop,
  COUNT(dd.id)::bigint                                                   AS tong_diem_danh,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Có mặt')::bigint           AS co_mat,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Vắng mặt')::bigint          AS vang_mat,
  COALESCE(uv.cnt, 0)::bigint                                            AS sl_uy_vien_nhiem_ky,
  GREATEST(COALESCE(uv.cnt, 0) - COUNT(dd.id), 0)::bigint                 AS chua_diem_danh
FROM public.mttq_ky_hop kh
LEFT JOIN public.mttq_diem_danh_uy_vien dd ON dd.ky_hop_id = kh.id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS cnt
  FROM public.mttq_uy_vien_uy_ban u
  WHERE u.nhiem_ky_id = kh.nhiem_ky_id
) uv ON true
GROUP BY kh.id, kh.nhiem_ky_id, kh.ky_thu, kh.ngay_hop, uv.cnt;

ALTER VIEW public.v_diem_danh_ky_hop_summary SET (security_invoker = true);
