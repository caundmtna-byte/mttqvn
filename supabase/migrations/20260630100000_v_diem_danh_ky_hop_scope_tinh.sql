-- Scope thống kê điểm danh kỳ họp theo cấp ủy viên:
--   - Kỳ cấp Tỉnh (kh.don_vi_id IS NULL): chỉ tính ủy viên có u.don_vi_id IS NULL.
--   - Kỳ xã X (kh.don_vi_id = X): chỉ tính ủy viên có u.don_vi_id = X.
-- Trước fix, kỳ Tỉnh dùng (kh.don_vi_id IS NULL OR ...) → đếm cả ủy viên xã phường.

CREATE OR REPLACE VIEW public.v_diem_danh_ky_hop_summary AS
SELECT
  kh.id                                                                   AS ky_hop_id,
  kh.nhiem_ky_id,
  kh.ky_thu,
  kh.ngay_hop,
  COUNT(dd.id)::bigint                                                     AS tong_diem_danh,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Có mặt')::bigint             AS co_mat,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Vắng mặt')::bigint           AS vang_mat,
  COALESCE(uv.cnt, 0)::bigint                                              AS sl_uy_vien_nhiem_ky,
  GREATEST(COALESCE(uv.cnt, 0) - COUNT(dd.id), 0)::bigint                  AS chua_diem_danh
FROM public.mttq_ky_hop kh
LEFT JOIN public.mttq_diem_danh_uy_vien dd
       ON dd.ky_hop_id = kh.id
      AND EXISTS (
            SELECT 1 FROM public.mttq_uy_vien_uy_ban u2
            WHERE u2.id = dd.uy_vien_id
              AND (CASE WHEN kh.don_vi_id IS NULL
                        THEN u2.don_vi_id IS NULL
                        ELSE u2.don_vi_id = kh.don_vi_id
                   END)
          )
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS cnt
  FROM public.mttq_uy_vien_uy_ban u
  WHERE u.nhiem_ky_id = kh.nhiem_ky_id
    AND (CASE WHEN kh.don_vi_id IS NULL
              THEN u.don_vi_id IS NULL
              ELSE u.don_vi_id = kh.don_vi_id
         END)
) uv ON true
GROUP BY kh.id, kh.nhiem_ky_id, kh.ky_thu, kh.ngay_hop, uv.cnt;

ALTER VIEW public.v_diem_danh_ky_hop_summary SET (security_invoker = true);
