# Supabase: egress và hiệu năng (checklist nội bộ)

Tham chiếu chính: [Manage Egress usage](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

## Mục tiêu

Dùng được **free-tier Supabase** (5 GB egress/tháng) cho app vài trăm user
nội bộ + giảm Vercel bandwidth. Mọi thay đổi lớn về list/select/mutation
phải đi qua checklist bên dưới.

## Quy tắc bắt buộc

### 1. `SELECT_LIST` ≠ `SELECT_FULL` khi có cột nặng

Mọi module dùng `core/supabase-select.ts` phải:

- Bỏ khỏi `SELECT_LIST` các cột long-text (`thong_tin`, `ghi_chu`, `tai_lieu_*`,
  `noi_dung_*`) và base64 (`hinh_anh`).
- Bỏ khỏi `SELECT_LIST` các join chỉ dùng trong detail/form (vd `dan_toc`,
  `trinh_do`, `ly_luan_chinh_tri` trong `mttq_can_bo`).
- Giữ tất cả ở `SELECT_FULL` cho `getById` / `handleEdit` / `detail page`.
- Đảm bảo `SEARCHABLE_KEYS` (utils/search-keys.ts) **chỉ chứa cột có trong
  `SELECT_LIST`** (nếu không, search client-side sẽ luôn lệch).

Module đã áp dụng: `uy-vien-uy-ban`, `ky-hop`, `nhiem-ky`, `nhan-vien`.
Module không tách (giải thích trong file): `mttq_can_bo` — nhiều join phụ
thuộc cho search; chấp nhận chi phí cao đổi lấy ổn định.

### 2. Đếm con: dùng `(count)` thay vì `(id)`

```ts
// ❌ Sai — kéo array of ids:
mttq_khen_thuong_ct(id)

// ✅ Đúng — chỉ trả [{ count: N }]:
mttq_khen_thuong_ct(count)
```

Mapper service phải đọc `lines[0]?.count` thay vì `lines.length`.
Đã áp dụng cho: `khen-thuong`, `tap-huan`.

### 3. KHÔNG `getById` trước `update`

Postgres trả mảng rỗng nếu id sai — không cần load full row trước. Bỏ pattern:

```ts
// ❌ Sai — round-trip thừa:
const existing = await getById(id);
if (!existing) throw notFound;
return await repo.update(id, payload);

// ✅ Đúng — chỉ 1 round-trip:
return await repo.update(id, payload);
```

Áp dụng: `mttq-can-bo`, `mttq-ky-hop`, `mttq-nhiem-ky`, `mttq-uy-vien-uy-ban`,
`mttq-khen-thuong`, `mttq-tap-huan`, `bai-viet-danh-sach`,
`cong-viec-danh-sach`, `mttq-thiet-lap`, `the-loai`, `thiet-lap-khac`.

### 4. KHÔNG `select('*')` trong `returningSelect` rộng

Mutation đã có một `getById` ngay sau đó (vd `khen-thuong`, `tap-huan`)
phải narrow `returningSelect` còn `'id,tg_cap_nhat'` hoặc `'id'`.

### 5. Avatar/file: Cloudinary URL (upload mới) — legacy Supabase path vẫn hiển thị qua signed URL

KHÔNG lưu base64 `data:image/...` trong cột `var_nhan_vien.hinh_anh`. Upload mới:

- `SingleImageInput` / form avatar upload lên **Cloudinary** (`mttqvn/avatars/{id}/…`) ngay khi chọn file.
- Cột `hinh_anh` lưu **HTTPS URL** (`https://res.cloudinary.com/...`).
- Service `resolveEmployeeAvatarUrl()` vẫn gọi `uploadImageIfDataUrl` như safety net lúc save.

**Legacy** (row cũ chưa migrate):

- Path Supabase bucket `avatars` private → hook `useSignedEmployeeAvatarSrc` ký URL tạm.
- Migration một lần sang Cloudinary: `scripts/migrate-avatars-to-cloudinary.ts` (`DRY_RUN=1` trước).
- Migration cũ (Storage path): `scripts/migrate-avatars-to-storage.ts`.

### 6. RPC / View khi list cần aggregate hoặc full-table scan

| Vấn đề                                              | Giải pháp                                           |
| --------------------------------------------------- | --------------------------------------------------- |
| Đếm nhân viên theo chức vụ                          | RPC `get_nhan_vien_count_by_chuc_vu`                |
| Tính path/level cho phòng ban khi update            | RPC `get_phong_ban_path_level(id, parent_id)`        |
| Pagination + filter server-side cho list lớn        | RPC `get_bai_viet_page` / `get_cong_viec_page`      |
| Lookup xã/phường nhẹ                                | View `v_xa_phuong_min`                              |

Migration: `supabase/migrations/<timestamp>_egress_optimizations.sql`.

### 7. TanStack Query: `setQueryData` thay `invalidateQueries`

- Mutation 1 row → `setQueryData(detailKey, updated)` + patch list cache thủ
  công. Tránh `invalidateQueries(listKey)` nếu list đang mounted.
- Mutation tick nhanh (vd điểm danh): tính delta → patch summary counters
  trên ủy viên list cache, KHÔNG invalidate `mttqUyVienUyBan.all`.
- Khi phải invalidate query đắt nhưng không cần refetch ngay (vd
  `byCanBoPrefix` trong khen-thưởng; ma trận điểm danh nhiệm kỳ): dùng
  `refetchType: 'none'` để mark stale; query tự refetch khi user mở lại.

### 8. `handleEditFromList` đi qua cache

```ts
// ❌ Sai — bypass cache, mỗi click 1 round-trip:
const full = await getById(item.id);

// ✅ Đúng — dedupe theo cache TanStack Query:
const full = await queryClient.fetchQuery({
  queryKey: queryKeys.<module>.detail(item.id),
  queryFn: () => getById(item.id),
  ...defaultServerQueryOptions,
});
```

### 9. Cache client-side cho data tĩnh (geo, lookup)

`getXaPhuongAll()` cache in-memory 24h + invalidate khi CUD. Tương tự cho
data master ít thay đổi: dùng `masterDataQueryOptions` (stale 30 phút).

### 10. Batch CRUD con (form parent/child)

Bảng con (vd `mttq_khen_thuong_ct`, `mttq_lop_tap_huan_ct`) phải:

- 1× `delete().in('id', toDelete)` — KHÔNG loop `.eq('id', x).delete()`.
- 1× `upsert(rowsExisting, { onConflict: 'id' })` — KHÔNG loop `.update()`.
- 1× `insert(rowsNew)` — KHÔNG loop `.insert(row)`.

Tối đa 3 round-trip thay vì N+1.

## TanStack Query default

QueryClient root (`index.tsx`):

```ts
defaultOptions: {
  queries: {
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (n, e) => n < 2 && isRetryableError(e),
  },
}
```

`use-hydrate-position-permissions` phải dùng `MASTER_DATA_STALE_TIME_MS`
(30 phút), KHÔNG dùng `staleTime: 0`.

## Vercel bandwidth

`vercel.json` phải có `Cache-Control` cho:

- `/assets/*` và `*.{js,css,woff2,woff,ttf,svg,png,jpg,jpeg,webp,ico,gif}` →
  `public, max-age=31536000, immutable` (file đã hash).
- `/index.html`, `/`, `/sw.js` → `public, max-age=0, must-revalidate`.
- `/manifest.webmanifest` → `public, max-age=3600`.

`vite.config.ts` bật `esbuild.drop: ['console','debugger']`,
`viteCompression` (Brotli + Gzip), `cssCodeSplit: true`,
`assetsInlineLimit: 4096`. `manualChunks` phải tách:
`framer-motion`, `@tanstack`, `recharts`, `@tiptap`, `jspdf`,
`lucide-react`, `xlsx`, `dompurify`, `@supabase`.

## Vận hành (Dashboard Supabase)

- **Usage / Observability**: theo dõi egress theo dịch vụ; tìm endpoint
  `/rest/v1/...` gọi nhiều.
- **Database → Query performance**: truy vấn gọi nặng, số dòng trả về
  trung bình. Soi cột nào trả về > 1 KB/row → ứng viên long-text.
- **Index**: cột dùng trong `filter`, `order`, `eq` trên Postgres (giảm
  scan, gián tiếp giảm retry/refetch phía client).
- **Storage → Bandwidth**: avatar private — egress chủ yếu qua signed URL
  theo phiên user; không cache Service Worker cho URL có token.

## Khi mở rộng

- Realtime: subscribe tối thiểu, hủy khi unmount.
- Storage: ảnh qua CDN/transform, `cache-control` 1 năm.
- Backend/BFF: pooler Postgres (Supavisor) theo
  [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).
- Trang report dùng nhiều RPC: dùng `refetchType: 'none'` khi invalidate
  từ mutation không thuộc trang report.
