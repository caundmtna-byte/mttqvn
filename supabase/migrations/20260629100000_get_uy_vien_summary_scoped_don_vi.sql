-- RPC: tóm tắt điểm danh ủy viên scoped theo don_vi_id (viewer Xã phường).
-- Khác với v_diem_danh_uy_vien_summary: chỉ đếm kỳ họp có kh.don_vi_id = p_don_vi_id,
-- không tính kỳ họp cấp Tỉnh (don_vi_id IS NULL).

CREATE OR REPLACE FUNCTION public.get_uy_vien_diem_danh_summary_for_don_vi(
  p_uy_vien_ids bigint[],
  p_don_vi_id   bigint
) RETURNS TABLE (
  uy_vien_id      bigint,
  so_ky_hop       bigint,
  co_mat          bigint,
  vang_mat        bigint,
  chua_diem_danh  bigint
) LANGUAGE sql STABLE SECURITY INVOKER AS $$
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
