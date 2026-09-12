-- ============================================================================
-- get_tang_luong_sap_den_han_count — đếm cán bộ sắp đến hạn nâng bậc lương
--
-- Vì sao phải làm ở DB: kỳ nâng lương tiếp theo KHÔNG nằm sẵn trong bảng. Nó
-- được suy ra: gom toàn bộ lịch sử nâng lương → lấy lần gần nhất của mỗi cán bộ
-- → cộng 3 năm (`TANG_LUONG_CYCLE_YEARS`). Làm phép đó ở trình duyệt nghĩa là
-- kéo nguyên bảng lịch sử về máy **mỗi lần mở Trang chủ** — đúng thứ mà
-- docs/supabase-egress.md cấm. Ở đây chỉ trả về một con số.
--
-- Quy tắc đúng bằng `canViewTangLuongRow` phía client — module này có BA nhánh,
-- khác các module khác:
--   · bypass (cấp bậc 1 / quan_tri)  → đếm toàn bộ;
--   · cấp Tỉnh                        → chỉ cán bộ có 'Tỉnh' trong `cap_quan_ly`
--                                        (lọc theo thuộc tính cán bộ, KHÔNG theo đơn vị);
--   · cấp Xã phường                   → chỉ cán bộ cùng `don_vi_id`, và người chưa
--                                        được gán đơn vị đếm ra 0 (không nới lỏng).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_tang_luong_sap_den_han_count(integer, boolean, bigint);
DROP FUNCTION IF EXISTS public.get_tang_luong_sap_den_han_count(integer, text, bigint);

CREATE FUNCTION public.get_tang_luong_sap_den_han_count(
  -- Cửa sổ cảnh báo tính từ hôm nay, theo ngày.
  p_so_ngay          integer DEFAULT 90,
  -- 'all' | 'tinh' | 'xa_phuong' — khớp ba nhánh của canViewTangLuongRow.
  p_scope            text    DEFAULT 'all',
  p_viewer_don_vi_id bigint  DEFAULT NULL
)
RETURNS TABLE (
  so_luong     bigint,
  -- Ngày đến hạn gần nhất trong cửa sổ, để hiện "Gần nhất: …".
  gan_nhat     date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
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

COMMENT ON FUNCTION public.get_tang_luong_sap_den_han_count(integer, text, bigint) IS
  'Đếm cán bộ có kỳ nâng bậc lương đến hạn trong N ngày tới (lần nâng gần nhất + 3 năm).';

GRANT EXECUTE ON FUNCTION public.get_tang_luong_sap_den_han_count(integer, text, bigint)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
