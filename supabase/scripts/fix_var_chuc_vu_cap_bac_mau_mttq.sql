-- ============================================================================
-- Gán lại cap_bac (int2) cho chức vụ mẫu sơ đồ MTTQ — khớp seed_var_chuc_vu_so_do_mtt.sql
-- Quy ước: 1 = đứng đầu (Chủ tịch / Trưởng ban / Chánh văn phòng / Kế toán trưởng…),
--          2 = phó, 3 = trợ lý (chỉ khối Ban lãnh đạo), 4 = chuyên viên / kế toán viên.
--
-- Chạy sau migration 20260511110000_var_chuc_vu_cap_bac_smallint.sql (hoặc khi cột đã int2).
-- SQL Editor / psql: dán và Execute.
-- ============================================================================

UPDATE public.var_chuc_vu v
SET cap_bac = m.lvl
FROM (
  VALUES
    ('Chủ tịch', 1::smallint),
    ('Phó Chủ tịch', 2::smallint),
    ('Trợ lý Lãnh đạo', 3::smallint),
    ('Trưởng ban Ban Tổ chức Tuyên giáo', 1::smallint),
    ('Trưởng ban — BP Tổ chức', 1::smallint),
    ('Phó ban — BP Tổ chức', 2::smallint),
    ('Chuyên viên — BP Tổ chức', 4::smallint),
    ('Trưởng ban — BP Tuyên giáo', 1::smallint),
    ('Phó ban — BP Tuyên giáo', 2::smallint),
    ('Chuyên viên — BP Tuyên giáo', 4::smallint),
    ('Trưởng ban — BP Thi đua', 1::smallint),
    ('Phó ban — BP Thi đua', 2::smallint),
    ('Chuyên viên — BP Thi đua', 4::smallint),
    ('Trưởng ban — Quỹ người nghèo', 1::smallint),
    ('Phó ban — Quỹ người nghèo', 2::smallint),
    ('Chuyên viên — Quỹ người nghèo', 4::smallint),
    ('Trưởng ban — Nông thôn mới', 1::smallint),
    ('Phó ban — Nông thôn mới', 2::smallint),
    ('Chuyên viên — Nông thôn mới', 4::smallint),
    ('Kế toán trưởng (BP Kế toán Văn phòng)', 1::smallint),
    ('Kế toán viên (BP Kế toán Văn phòng)', 4::smallint),
    ('Chánh văn phòng', 1::smallint),
    ('Phó Chánh văn phòng', 2::smallint),
    ('Chuyên viên — Bộ phận Hành chính', 4::smallint),
    ('Chủ tịch huyện', 1::smallint),
    ('Chuyên viên huyện', 4::smallint)
) AS m(ten, lvl)
WHERE lower(trim(v.ten_chuc_vu)) = lower(trim(m.ten));
