-- Tóm tắt điểm danh theo từng ủy viên (số kỳ họp trong nhiệm kỳ, có mặt / vắng / chưa điểm danh).

CREATE OR REPLACE VIEW public.v_diem_danh_uy_vien_summary AS
SELECT
  u.id                                                                 AS uy_vien_id,
  u.nhiem_ky_id,
  COUNT(kh.id)::bigint                                                 AS so_ky_hop,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Có mặt')::bigint          AS co_mat,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Vắng mặt')::bigint       AS vang_mat,
  GREATEST(COUNT(kh.id) - COUNT(dd.id), 0)::bigint                     AS chua_diem_danh
FROM public.mttq_uy_vien_uy_ban u
LEFT JOIN public.mttq_ky_hop kh ON kh.nhiem_ky_id = u.nhiem_ky_id
LEFT JOIN public.mttq_diem_danh_uy_vien dd ON dd.ky_hop_id = kh.id AND dd.uy_vien_id = u.id
GROUP BY u.id, u.nhiem_ky_id;

ALTER VIEW public.v_diem_danh_uy_vien_summary SET (security_invoker = true);
