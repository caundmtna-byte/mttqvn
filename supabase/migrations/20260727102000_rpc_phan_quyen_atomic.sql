-- ============================================================================
-- Phân quyền: xoá + ghi lại quyền của một module trong MỘT transaction
--
-- Trước đây client `delete` rồi `upsert` bằng hai request. Delete xong mà upsert
-- lỗi ⇒ các chức vụ mất sạch quyền trên module đó, không có đường lùi.
--
-- Hành vi giữ nguyên:
--   • xoá mọi dòng của các chức vụ được gửi lên, trên MỌI `module_key` cũ/mới
--     (`p_legacy_keys`) — đúng như `moduleKeysForDbLookup` phía client;
--   • chỉ chèn lại dòng có `quyen` khác rỗng, dưới `p_module_key` chuẩn.
--
-- Trigger `tg_audit_var_phan_quyen` (fn_ghi_nhat_ky) vẫn ghi nhật ký cho cả
-- DELETE lẫn INSERT.
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_phan_quyen_cap_nhat_module(TEXT, TEXT[], JSONB);

CREATE OR REPLACE FUNCTION public.rpc_phan_quyen_cap_nhat_module(
  p_module_key  TEXT,
  p_legacy_keys TEXT[],
  p_updates     JSONB   -- [{ "chuc_vu_id": 12, "quyen": "xem,them" }, …] quyen rỗng = gỡ hết quyền
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_keys    TEXT[];
  v_so_dong INTEGER;
BEGIN
  IF p_module_key IS NULL OR btrim(p_module_key) = '' THEN
    RAISE EXCEPTION 'PHAN_QUYEN_MODULE_RONG: Chưa xác định được phần cần phân quyền.';
  END IF;

  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RAISE EXCEPTION 'PHAN_QUYEN_KHONG_CO_CHUC_VU: Chưa chọn chức vụ nào để phân quyền.';
  END IF;

  v_keys := COALESCE(p_legacy_keys, ARRAY[]::TEXT[]) || ARRAY[p_module_key];

  DELETE FROM public.var_phan_quyen pq
  WHERE pq.module_key = ANY (v_keys)
    AND pq.chuc_vu_id IN (
      SELECT (u->>'chuc_vu_id')::BIGINT
      FROM jsonb_array_elements(p_updates) AS u
    );

  INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
  SELECT
    (u->>'chuc_vu_id')::BIGINT,
    p_module_key,
    u->>'quyen'
  FROM jsonb_array_elements(p_updates) AS u
  WHERE COALESCE(btrim(u->>'quyen'), '') <> '';

  GET DIAGNOSTICS v_so_dong = ROW_COUNT;
  RETURN v_so_dong;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_phan_quyen_cap_nhat_module(TEXT, TEXT[], JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
