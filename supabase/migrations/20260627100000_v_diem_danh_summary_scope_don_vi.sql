-- Scope ủy viên / kỳ họp theo `don_vi_id` cho 2 view summary:
--   - Kỳ họp cấp Tỉnh (`mttq_ky_hop.don_vi_id IS NULL`): mẫu số = tất cả ủy viên của nhiệm kỳ.
--   - Kỳ họp xã X (`mttq_ky_hop.don_vi_id = X`): mẫu số = chỉ ủy viên cùng `don_vi_id = X`.
-- Hệ quả phái sinh:
--   - Tỉnh ủy viên (`u.don_vi_id IS NULL`) → chỉ attend Tỉnh kỳ họp.
--   - Xã X ủy viên → attend (Tỉnh kỳ họp + xã X kỳ họp).
-- Trước fix, 2 view chỉ join qua `nhiem_ky_id` → user Xã phường thấy `Chưa điểm danh`
-- bị bơm phồng vì denominator gộp cả ủy viên xã khác / ủy viên Tỉnh không thuộc scope của họ.

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
    AND (kh.don_vi_id IS NULL OR kh.don_vi_id = u.don_vi_id)
) uv ON true
GROUP BY kh.id, kh.nhiem_ky_id, kh.ky_thu, kh.ngay_hop, uv.cnt;

ALTER VIEW public.v_diem_danh_ky_hop_summary SET (security_invoker = true);

CREATE OR REPLACE VIEW public.v_diem_danh_uy_vien_summary AS
SELECT
  u.id                                                                 AS uy_vien_id,
  u.nhiem_ky_id,
  COUNT(kh.id)::bigint                                                 AS so_ky_hop,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Có mặt')::bigint          AS co_mat,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Vắng mặt')::bigint       AS vang_mat,
  GREATEST(COUNT(kh.id) - COUNT(dd.id), 0)::bigint                     AS chua_diem_danh
FROM public.mttq_uy_vien_uy_ban u
LEFT JOIN public.mttq_ky_hop kh
       ON kh.nhiem_ky_id = u.nhiem_ky_id
      AND (kh.don_vi_id IS NULL OR kh.don_vi_id = u.don_vi_id)
LEFT JOIN public.mttq_diem_danh_uy_vien dd
       ON dd.ky_hop_id = kh.id AND dd.uy_vien_id = u.id
GROUP BY u.id, u.nhiem_ky_id;

ALTER VIEW public.v_diem_danh_uy_vien_summary SET (security_invoker = true);
