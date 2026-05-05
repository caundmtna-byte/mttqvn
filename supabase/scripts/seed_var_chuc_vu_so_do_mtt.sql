-- ============================================================================
-- Dữ liệu mẫu chức vụ (public.var_chuc_vu) theo sơ đồ tổ chức (bảng tính MTT).
-- Phụ thuộc: migration var_phong_ban + var_chuc_vu đã chạy.
--
-- Cách chạy: Supabase → SQL Editor (hoặc psql), dán toàn bộ file và Execute.
--
-- Script cũng tạo (nếu chưa có) cây public.var_phong_ban khớp sơ đồ ảnh.
--
-- Ràng buộc:
-- - uq_var_phong_ban_ten_lower: ten_phong_ban duy nhất toàn DB
--   → tên bộ phận con có ghi rõ cha trong ngoặc.
-- - uq_var_chuc_vu_ten_lower: ten_chuc_vu duy nhất toàn DB
--   → chức lặp (Trưởng ban / Phó ban / Chuyên viên / Kế toán) có hậu tố đơn vị.
--
-- cap_bac (int2): 1 đứng đầu, 2 phó, 3 trợ lý, 4 chuyên viên / kế toán viên.
-- ============================================================================

DO $$
DECLARE
  id_bld   bigint;
  id_btc   bigint;
  id_bpt   bigint;
  id_vp    bigint;
  id_huyen bigint;
  id_bp_tc_tc   bigint;
  id_bp_tg_tc   bigint;
  id_bp_td_tc   bigint;
  id_bp_qnp     bigint;
  id_bp_ntm     bigint;
  id_bp_kt_vp   bigint;
  id_bp_hc_vp   bigint;
BEGIN
  -- ----- Gốc (Phòng) -----
  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'Ban lãnh đạo', 'Phòng — sơ đồ MTT', NULL, 'Đang hoạt động', 1, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Ban lãnh đạo')));
  SELECT id INTO id_bld FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Ban lãnh đạo'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'Ban Tổ chức Tuyên giáo', NULL, NULL, 'Đang hoạt động', 2, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Ban Tổ chức Tuyên giáo')));
  SELECT id INTO id_btc FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Ban Tổ chức Tuyên giáo'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'Ban Phong trào', NULL, NULL, 'Đang hoạt động', 3, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Ban Phong trào')));
  SELECT id INTO id_bpt FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Ban Phong trào'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'Văn phòng', NULL, NULL, 'Đang hoạt động', 4, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Văn phòng')));
  SELECT id INTO id_vp FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Văn phòng'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'Cấp huyện', NULL, NULL, 'Đang hoạt động', 5, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Cấp huyện')));
  SELECT id INTO id_huyen FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Cấp huyện'));

  -- ----- Con: Ban Tổ chức Tuyên giáo -----
  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'BP. Tổ chức (Ban Tổ chức Tuyên giáo)', NULL, id_btc, 'Đang hoạt động', 1, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Tổ chức (Ban Tổ chức Tuyên giáo)')));
  SELECT id INTO id_bp_tc_tc FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Tổ chức (Ban Tổ chức Tuyên giáo)'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'BP. Tuyên giáo (Ban Tổ chức Tuyên giáo)', NULL, id_btc, 'Đang hoạt động', 2, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Tuyên giáo (Ban Tổ chức Tuyên giáo)')));
  SELECT id INTO id_bp_tg_tc FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Tuyên giáo (Ban Tổ chức Tuyên giáo)'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'BP. Thi đua (Ban Tổ chức Tuyên giáo)', NULL, id_btc, 'Đang hoạt động', 3, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Thi đua (Ban Tổ chức Tuyên giáo)')));
  SELECT id INTO id_bp_td_tc FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Thi đua (Ban Tổ chức Tuyên giáo)'));

  -- ----- Con: Ban Phong trào -----
  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'BP. Quỹ người nghèo (Ban Phong trào)', NULL, id_bpt, 'Đang hoạt động', 1, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Quỹ người nghèo (Ban Phong trào)')));
  SELECT id INTO id_bp_qnp FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Quỹ người nghèo (Ban Phong trào)'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'BP. Nông thôn mới (Ban Phong trào)', NULL, id_bpt, 'Đang hoạt động', 2, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Nông thôn mới (Ban Phong trào)')));
  SELECT id INTO id_bp_ntm FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Nông thôn mới (Ban Phong trào)'));

  -- ----- Con: Văn phòng -----
  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'BP. Kế toán (Văn phòng)', NULL, id_vp, 'Đang hoạt động', 1, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Kế toán (Văn phòng)')));
  SELECT id INTO id_bp_kt_vp FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('BP. Kế toán (Văn phòng)'));

  INSERT INTO public.var_phong_ban (ten_phong_ban, mo_ta, cha_id, trang_thai, thu_tu, duong_dan, cap_do)
  SELECT 'Bộ phận Hành chính (Văn phòng)', NULL, id_vp, 'Đang hoạt động', 2, '', 0
  WHERE NOT EXISTS (SELECT 1 FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Bộ phận Hành chính (Văn phòng)')));
  SELECT id INTO id_bp_hc_vp FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower(trim('Bộ phận Hành chính (Văn phòng)'));

  -- ----- var_chuc_vu: Ban lãnh đạo -----
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chủ tịch', NULL, id_bld, 1, 10, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chủ tịch')));

  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Phó Chủ tịch', NULL, id_bld, 2, 11, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Phó Chủ tịch')));

  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Trợ lý Lãnh đạo', 'TL Lãnh đạo (sơ đồ)', id_bld, 3, 12, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Trợ lý Lãnh đạo')));

  -- Trưởng ban cấp Ban (trực thuộc Ban Tổ chức Tuyên giáo)
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Trưởng ban Ban Tổ chức Tuyên giáo', 'Trưởng ban TC (cấp Ban)', id_btc, 1, 20, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Trưởng ban Ban Tổ chức Tuyên giáo')));

  -- BP. Tổ chức / Tuyên giáo / Thi đua
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Trưởng ban — BP Tổ chức', NULL, id_bp_tc_tc, 1, 30, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Trưởng ban — BP Tổ chức')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Phó ban — BP Tổ chức', NULL, id_bp_tc_tc, 2, 31, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Phó ban — BP Tổ chức')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chuyên viên — BP Tổ chức', NULL, id_bp_tc_tc, 4, 32, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chuyên viên — BP Tổ chức')));

  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Trưởng ban — BP Tuyên giáo', NULL, id_bp_tg_tc, 1, 40, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Trưởng ban — BP Tuyên giáo')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Phó ban — BP Tuyên giáo', NULL, id_bp_tg_tc, 2, 41, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Phó ban — BP Tuyên giáo')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chuyên viên — BP Tuyên giáo', NULL, id_bp_tg_tc, 4, 42, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chuyên viên — BP Tuyên giáo')));

  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Trưởng ban — BP Thi đua', NULL, id_bp_td_tc, 1, 50, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Trưởng ban — BP Thi đua')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Phó ban — BP Thi đua', NULL, id_bp_td_tc, 2, 51, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Phó ban — BP Thi đua')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chuyên viên — BP Thi đua', NULL, id_bp_td_tc, 4, 52, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chuyên viên — BP Thi đua')));

  -- Ban Phong trào
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Trưởng ban — Quỹ người nghèo', NULL, id_bp_qnp, 1, 60, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Trưởng ban — Quỹ người nghèo')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Phó ban — Quỹ người nghèo', NULL, id_bp_qnp, 2, 61, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Phó ban — Quỹ người nghèo')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chuyên viên — Quỹ người nghèo', NULL, id_bp_qnp, 4, 62, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chuyên viên — Quỹ người nghèo')));

  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Trưởng ban — Nông thôn mới', NULL, id_bp_ntm, 1, 70, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Trưởng ban — Nông thôn mới')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Phó ban — Nông thôn mới', NULL, id_bp_ntm, 2, 71, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Phó ban — Nông thôn mới')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chuyên viên — Nông thôn mới', NULL, id_bp_ntm, 4, 72, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chuyên viên — Nông thôn mới')));

  -- Văn phòng — BP Kế toán (tên chức vụ duy nhất toàn DB)
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Kế toán trưởng (BP Kế toán Văn phòng)', NULL, id_bp_kt_vp, 1, 80, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Kế toán trưởng (BP Kế toán Văn phòng)')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Kế toán viên (BP Kế toán Văn phòng)', NULL, id_bp_kt_vp, 4, 81, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Kế toán viên (BP Kế toán Văn phòng)')));

  -- Bộ phận Hành chính
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chánh văn phòng', NULL, id_bp_hc_vp, 1, 90, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chánh văn phòng')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Phó Chánh văn phòng', NULL, id_bp_hc_vp, 2, 91, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Phó Chánh văn phòng')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chuyên viên — Bộ phận Hành chính', NULL, id_bp_hc_vp, 4, 92, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chuyên viên — Bộ phận Hành chính')));

  -- Cấp huyện
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chủ tịch huyện', NULL, id_huyen, 1, 100, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chủ tịch huyện')));
  INSERT INTO public.var_chuc_vu (ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, thu_tu, trang_thai)
  SELECT 'Chuyên viên huyện', NULL, id_huyen, 4, 101, 'Đang hoạt động'
  WHERE NOT EXISTS (SELECT 1 FROM public.var_chuc_vu WHERE lower(trim(ten_chuc_vu)) = lower(trim('Chuyên viên huyện')));

END $$;
