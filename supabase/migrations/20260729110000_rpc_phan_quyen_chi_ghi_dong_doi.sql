-- ============================================================================
-- rpc_phan_quyen_cap_nhat_module — chỉ ghi những dòng THỰC SỰ đổi
--
-- Bản trước xoá sạch rồi chèn lại toàn bộ chức vụ của module. Đúng về kết quả,
-- nhưng màn hình phân quyền là một ma trận: mỗi lần bấm MỘT ô, giao diện gửi
-- lên cả 115 chức vụ ⇒ 115 lệnh xoá + 115 lệnh chèn. Bảng `var_phan_quyen` có
-- trigger ghi nhật ký, nên **một cái tích chuột sinh ra ~230 dòng `audit_log`**
-- và câu hỏi "ai vừa đổi quyền gì" chìm nghỉm trong đống đó — tức là nhật ký
-- có mà không dùng được, đúng thứ nó sinh ra để tránh.
--
-- Bản này giữ nguyên tính nguyên tử (vẫn một lời gọi = một giao dịch) nhưng:
--   · dòng có quyền  → INSERT ... ON CONFLICT DO UPDATE, và **chỉ** update khi
--     chuỗi quyền khác đi (`WHERE ... IS DISTINCT FROM`);
--   · dòng bị bỏ hết quyền → DELETE đúng những dòng đó;
--   · dòng không đổi → không chạm tới, nên không sinh dòng nhật ký nào.
--
-- Dựa vào chỉ mục duy nhất `uq_var_phan_quyen_chuc_vu_module (chuc_vu_id, module_key)`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_phan_quyen_cap_nhat_module(
  p_module_key  text,
  -- Các khoá module cũ cần dọn kèm (đổi tên đường dẫn qua các đợt).
  p_legacy_keys text[],
  -- [{ "chuc_vu_id": 12, "quyen": "xem,them" }, …] — `quyen` rỗng = gỡ hết quyền.
  p_updates     jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
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

COMMENT ON FUNCTION public.rpc_phan_quyen_cap_nhat_module(text, text[], jsonb) IS
  'Cập nhật quyền của một module trong cùng một giao dịch, chỉ ghi những dòng thực sự đổi '
  '(tránh làm nhật ký thay đổi ngập vì mỗi tích chuột ghi lại cả ma trận).';

GRANT EXECUTE ON FUNCTION public.rpc_phan_quyen_cap_nhat_module(text, text[], jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
