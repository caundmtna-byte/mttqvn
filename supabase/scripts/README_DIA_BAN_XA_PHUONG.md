# Import bulk `var_ssn_xa_phuong`

Schema hiện tại (rút gọn):

- **`var_ssn_tinh_thanh`**: `id`, `ten`, `thu_tu`, `tg_tao`, `tg_cap_nhat` — unique `lower(trim(ten))`.
- **`var_ssn_xa_phuong`**: `id`, `id_tinh_thanh` (FK → tỉnh), `ten`, `thu_tu`, `tg_tao`, `tg_cap_nhat` — unique `(id_tinh_thanh, lower(trim(ten)))`.

## CSV gợi ý

- Cột: `ten_tinh`, `ten_xa`, `thu_tu` — join `ten_tinh` với `var_ssn_tinh_thanh.ten` để lấy `id_tinh_thanh`, rồi `INSERT` xã/phường.
- Hoặc: `id_tinh_thanh` (bigint), `ten`, `thu_tu`.

## Nạp dữ liệu

1. `\copy staging FROM 'path.csv' CSV HEADER`
2. `INSERT INTO var_ssn_xa_phuong (id_tinh_thanh, ten, thu_tu) SELECT ... FROM staging JOIN var_ssn_tinh_thanh t ON lower(trim(t.ten)) = lower(trim(staging.ten_tinh));`
3. Chạy theo **chunk** trên Supabase SQL Editor nếu file lớn.
