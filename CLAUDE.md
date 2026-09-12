# CLAUDE.md — mttqvn

Hệ thống quản trị nội bộ MTTQ. React 19 + TypeScript + Vite + Supabase + TanStack Query + Tailwind.
Toàn bộ text UI, tên biến nghiệp vụ và comment dùng **tiếng Việt không dấu cho định danh, có dấu cho chuỗi hiển thị**.

## Lệnh chuẩn

```bash
npm run dev              # Vite dev server
npm run build            # build production
npm run typecheck        # tsc --noEmit (đã bật incremental)
npm run typecheck:mttq   # phạm vi MTTQ + hệ thống
npm run lint             # eslint
npm test                 # toàn bộ vitest
npm run test:changed     # chỉ test liên quan file đã đổi
npx vitest run <path>    # một file/thư mục
```

Cần `.env.local` (chép từ `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
**Không bao giờ** đặt giá trị thật vào `.env.example` — file đó được git theo dõi (`.gitignore` có `!.env.example`).

## Bản đồ thư mục

| Đường dẫn | Vai trò |
|---|---|
| `features/<nhóm>/<module>/` | Module nghiệp vụ (39 module). Xem quy ước bên dưới. |
| `components/shared/` | Component dùng chung có nghiệp vụ: `GenericTable`, `GenericToolbar`, `GenericDrawer`, `DetailSummaryCard`, `DashboardToolbar`, `stats/` |
| `components/ui/` | Primitive không nghiệp vụ: `Button`, `Input`, `Combobox`, `DateRangePicker`, `TabGroup`… |
| `components/layout/` | `Layout`, sidebar, `CommandPalette` |
| `lib/` | Tiện ích chung: `permissions.ts`, `query-keys.ts`, `date-range-presets.ts`, `text/`, `supabase/`, `data/` |
| `store/` | Zustand: `useStore` (auth), `usePermissionGrantStore` (ma trận quyền), `createGenericStore` (state list) |
| `hooks/` | Hook chung: `use-can`, `use-resource-permissions`, `use-tab-search-param` |
| `supabase/migrations/` | Migration SQL (đặt tên `<timestamp>_<mô tả>.sql`) |
| `docs/` | Quy ước — đọc trước khi làm module mới |

## Quy ước module

Mỗi module trong `features/` theo cấu trúc:

```
<module>/
  index.tsx          # trang chính (list / báo cáo)
  core/              # types.ts, schema.ts (zod), constants.ts, supabase-select.ts
  services/          # gọi Supabase, dùng createRepository hoặc RPC
  hooks/             # useQuery/useMutation + *-viewer.ts (phạm vi xem)
  components/        # *-table, *-form, *-detail, *-toolbar
  utils/             # logic thuần — đây là nơi ĐÁNG viết test
  store/             # createGenericStore cho state list
  text.ts            # chuỗi UI của module, gộp vào lib/text/index.ts
```

**Hai tầng quyền tách biệt — đừng nhầm:**

1. **Quyền hành động** — `useCan(action, resource)` / `lib/permissions.ts`. Chỉ trả lời "được mở module không".
2. **Phạm vi dòng** — hook `use-*-viewer.ts` của từng module. Quy tắc chung:
   *Xã phường* → chỉ `don_vi_id` của mình · *Tỉnh* → toàn bộ · còn lại → chỉ bản ghi mình tạo.
   Nguồn tín hiệu: `usePermissionGrantStore` (`chucVuCapBac`, `chucVuCapQuanLy`, `grantsByModule`).
   Mẫu tốt nhất: `features/quan-ly-viet-bai/hooks/use-article-all-tab-viewer.ts`,
   `features/mat-tran-to-quoc/bao-cao-uy-vien/hooks/use-mttq-bao-cao-uy-vien-viewer.ts` (tách hàm thuần để test được).

3. **RLS ở database** — lớp chặn thật, đang làm dần. Hai hàm dùng chung:
   `fn_la_quan_tri()` (cấp bậc 1 / quyền `quan_tri`) và `fn_co_quyen('<module_key>', '<hanh_dong>')`
   (tra đúng ma trận `var_phan_quyen` mà giao diện đang dùng; `hanh_dong` ∈ `xem|them|sua|xoa`).
   `module_key` là segment cuối của đường dẫn module.

   Đã siết **quyền GHI** cho: `var_phan_quyen`, `var_chuc_vu`, `var_nhan_vien` (sửa hồ sơ của
   chính mình vẫn được), `mttq_tang_luong`, `luong_thiet_lap_*`.
   Khi viết policy mới: gate bằng `fn_co_quyen(...)` để không chặn nhầm người dùng hợp lệ, và
   **luôn thử tấn công thật** bằng `SET ROLE authenticated` + `set_config('request.jwt.claims', …)`
   trước khi coi là xong.

**Quyền `approve` (Duyệt) tách khỏi `edit`.** "Sửa được hồ sơ" KHÔNG đồng nghĩa với
"được ban hành quyết định" — trước đây nút đổi trạng thái chỉ gác bằng `canEdit`, nên
người nhập liệu tự ban hành quyết định khen thưởng của chính mình. Nay:

- `useResourcePermissions(resource).canApprove` ⇔ token `phe_duyet` trong `var_phan_quyen`.
- Hộp thoại đổi trạng thái **chỉ đổ ra bước chuyển hợp lệ**, không đổ cả danh sách.
  Luật ở client (`.../danh-sach-khen-thuong/utils/luat-trang-thai.ts`) là **bản sao** của
  trigger `fn_kiem_luat_trang_thai` dưới DB — DB mới là nơi chặn thật. Sửa một bên
  phải sửa cả bên kia; `luat-trang-thai.test.ts` giữ hai bên khớp nhau.
- Khi thêm module có phê duyệt: nhớ rằng **không chức vụ nào có sẵn `phe_duyet`**.
  Siết quyền mà không seed = chỉ còn `cap_bac = 1` duyệt được. Xem
  `supabase/migrations/20260731100000_seed_quyen_phe_duyet_khen_thuong.sql` —
  seed đúng những chức vụ đang có `sua` để giữ nguyên hành vi, rồi để cơ quan tự bỏ tích.

> ⚠️ Các bảng còn lại vẫn `USING (true)` cho cả đọc lẫn ghi — chặn dữ liệu vẫn đang nằm ở client.
> Trang báo cáo/thống kê **bắt buộc** áp viewer như trang list, nếu không là lộ dữ liệu toàn hệ thống.

## Chọn kiểu phân trang

Đây là quyết định **bắt buộc phải chốt khi tạo module mới**, và chỉ có hai nhánh:

| Bản chất bảng | Kiểu phân trang | Ví dụ |
|---|---|---|
| **Giao dịch** — mỗi nghiệp vụ một dòng, tăng theo thời gian, không có trần | **Server-side** (RPC) | `bai_viet_danh_sach`, `cong_viec_danh_sach`, `kho_nhap_xuat_kho(_ct)`, `mttq_diem_danh_uy_vien`, `mttq_khen_thuong(_ct)`, `mttq_lop_tap_huan(_ct)`, `mttq_tang_luong`, `dttg_tham_hoi_*`, `pbxh_thuc_hien_*`, `nddk_nha_dai_doan_ket` |
| **Danh mục** — có trần tự nhiên (số xã, số biên chế, số chức danh…) | **Client-side** | `var_ssn_xa_phuong` (131), `var_chuc_vu` (116), `var_nhan_vien` (199), `mttq_can_bo` (233), `var_phong_ban`, mọi `*_thiet_lap`, `var_phan_quyen` |

Phân trang server cho bảng danh mục là phức tạp hoá vĩnh viễn mà không bao giờ thu lợi — đừng làm.

**Khuôn mẫu RPC phân trang** (mẫu chuẩn: `get_bai_viet_page`, `get_cong_viec_page`):

```sql
CREATE FUNCTION public.get_<bang>_page(
  p_search text, p_limit integer, p_offset integer, ...bo_loc..., p_sort text DEFAULT NULL
) RETURNS TABLE (<cot cua bang>, <cot hien thi da LEFT JOIN>, total_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT ..., COUNT(*) OVER () AS total_count
  FROM ...
  ORDER BY
    CASE WHEN p_sort = '<cot>_asc'  THEN <bieu_thuc> END ASC  NULLS LAST,
    CASE WHEN p_sort = '<cot>_desc' THEN <bieu_thuc> END DESC NULLS LAST,
    ...,
    <thu_tu_mac_dinh>, <khoa_chinh> DESC   -- phải kết thúc bằng khoá chính
  LIMIT greatest(p_limit, 1) OFFSET greatest(p_offset, 0);
$$;
```

Bốn điều dễ sai, đã trả giá một lần:

1. **`COUNT(*) OVER ()` là bắt buộc.** Không có nó thì UI hiện `Tổng: —`, nút "trang cuối" chết, và
   hộp thoại Xuất ghi sai số dòng. Đọc bằng `readRpcTotalCount` (`lib/data/server-paging.ts`).
2. **`p_sort` dùng whitelist bằng `CASE`, không nội suy chuỗi.** Client dựng tham số bằng
   `buildRpcSortParam(sort, <DANH_SACH_COT>)`; danh sách cột đó phải khớp đúng khối `ORDER BY`.
   **Không được sort ở client trên dữ liệu đã phân trang** — chỉ sắp được đúng trang đang xem.
3. **`ORDER BY` phải kết thúc bằng khoá chính**, nếu không hai trang liền nhau có thể trùng dòng
   hoặc bỏ sót dòng. Kiểm bằng cách gom hết các trang rồi đếm id khác nhau.
4. **RPC trả luôn cột hiển thị đã `LEFT JOIN`** (tên thể loại, tên người tạo…). Gọi RPC lấy id rồi
   `SELECT` lại lần hai là tốn gấp đôi request mỗi lần đổi trang.

**Xuất file:** trang phân trang server phải truyền `serverTotalRecords` và `fetchAllData` cho
`ExportDialog`, với `get<X>AllForExport()` kéo theo từng lô 500 dòng. Không có bước này thì chọn
phạm vi "Tất cả" vẫn chỉ xuất đúng trang đang xem.

## Hai quỹ tiền — một bộ bảng, hai nhánh dữ liệu

Quỹ Vì người nghèo và Quỹ Cứu trợ **dùng chung** `quy_danh_muc_tai_khoan`,
`quy_danh_muc_khoan`, `quy_so_thu_chi`, phân biệt bằng cột `quy`
(`'vi_nguoi_ngheo'` | `'cuu_tro'`). Hai quỹ giống hệt nhau về nghiệp vụ; nhân đôi
bảng là nhân đôi vĩnh viễn mọi ràng buộc, trigger, RPC và màn hình.
**Mọi truy vấn bắt buộc lọc theo `quy`** — quên một chỗ là trộn sổ hai quỹ.

Những thứ DB đã tự lo, đừng làm lại ở client:
- Số chứng từ `PT-2026-0001` / `PC-2026-0001` sinh tự động; đã phát hành thì
  **không đổi được** số lẫn loại phiếu (cùng lý do với số phiếu kho).
- `id_nguoi_tao` gán từ phiên đăng nhập — đừng gửi lên.
- Nhật ký thay đổi (`audit_log`) bật sẵn cho cả ba bảng: đây là tiền.
- RLS siết quyền ghi theo `fn_co_quyen('<module_key>', 'them|sua|xoa')`.

Ràng buộc DB sẽ từ chối, client phải có câu tiếng Việt tương ứng trong
`lib/supabase/error-messages.ts`: `so_tien > 0`; khoản mục phải cùng `loai` với
phiếu (khoá ngoại ghép `(khoan_id, loai)`); khoản mục/tài khoản phải cùng `quy`
(`QUY_KHONG_KHOP`); trùng tên trong cùng quỹ.

`quy_so_du_view` = tổng thu − tổng chi theo từng tài khoản. **Chưa có tồn đầu
kỳ** — khi làm chốt sổ theo kỳ phải thay bằng cách tính có số dư đầu kỳ.

## Trạng thái bản ghi — luật chuyển và vết thay đổi

- **Luật chuyển trạng thái** ở `fn_kiem_luat_trang_thai()`. Hiện chỉ bật cho
  `mttq_khen_thuong`: đã ban hành thì không lùi về nháp, đã huỷ thì không ban
  hành lại. **Cố ý KHÔNG chặn** việc mở lại một công việc đã hoàn thành — đó là
  chuyện bình thường trong điều hành, chặn sẽ làm hỏng luồng làm việc thật.
  Thêm bảng khác = thêm một nhánh `IF` trong hàm đó.
- **Mọi lần đổi trạng thái đều để lại vết** ở `lich_su_trang_thai` (từ đâu sang
  đâu, ai đổi, lúc nào, lý do). Bảng chỉ đọc với người dùng; trigger ghi bằng
  `SECURITY DEFINER`. Trước đây lý do bị ghi đè vào `ghi_chu` của chính bản ghi
  nên mất sạch lịch sử.
- `mttq_khen_thuong.nguoi_duyet_id` / `tg_duyet` do **máy chủ gán** khi chuyển
  sang "Đã ban hành", và tự xoá khi rời khỏi trạng thái đó.
- `nddk_nha_dai_doan_ket` **có ghi vết** `lich_su_trang_thai` nhưng **không** có
  luật chuyển trạng thái: một căn đang tạm dừng quay lại thực hiện là chuyện
  bình thường. Cột `ngay_cap_nhat_trang_thai` do trigger
  `fn_nddk_set_ngay_trang_thai` gán, form **không có ô nhập** cho nó.

> ⚠️ **Quyền `approve` vẫn chưa được kiểm ở client.** `ActionType` có `'approve'`,
> ma trận phân quyền có cột đó, nhưng **không một lời gọi `can(user,'approve',…)`
> nào trong toàn repo** — nút đổi trạng thái mới chỉ gác bằng `canEdit`, nghĩa là
> ai sửa được thì duyệt được. Hộp thoại đổi trạng thái cũng vẫn liệt kê mọi trạng
> thái thay vì chỉ những bước hợp lệ. DB đã chặn bước sai, nhưng phần client là
> việc còn lại.

## Test — viết cái gì

Logic thuần, sai một dòng là sai dữ liệu thật: phạm vi xem (`*-viewer`), tính theo kỳ/ngày tháng,
parse/import/export, tính tiền, máy trạng thái. **Không** test render component, class Tailwind,
wrapper mỏng, snapshot.

File test đặt **cạnh file nguồn** (`foo.ts` + `foo.test.ts`). Một số module cũ dùng `__tests__/` — giữ nguyên, không di chuyển.

Cấu hình vitest là **node-first, jsdom opt-in**: `.ts` chạy môi trường `node`, `.tsx` chạy `jsdom`.
File `.ts` cần DOM thì thêm `// @vitest-environment jsdom` đầu file.

## Bẫy đã biết

- **KHÔNG gọi Supabase bên trong callback `onAuthStateChange`.** supabase-js giữ khoá
  auth trong suốt lúc callback chạy; một truy vấn ở đó sẽ chờ khoá, còn khoá thì chờ
  callback kết thúc ⇒ **khoá chết: mọi truy vấn của app treo vĩnh viễn mà không phát
  một request nào** (triệu chứng: trang nào cũng "Đang tải dữ liệu", DevTools Network
  trống trơn, không có lỗi). Đẩy phần tra cứu ra ngoài bằng `setTimeout(…, 0)` —
  xem `lib/supabase/auth.ts` `onAuthStateChange`.
- **`esbuild.drop: ['console']` trong `vite.config.ts` xoá `console.*` ở CẢ chế độ dev.**
  Muốn debug tạm thì ghi vào `window`, đừng dùng `console.log` rồi tưởng code không chạy.

- **Biểu đồ xu hướng + preset "Tất cả"**: `resolveStandardDateRange('all')` trả `start: '', end: ''`.
  Truyền thẳng vào vòng lặp `dayjs` sẽ **lặp vô tận** (`Invalid.isAfter(Invalid) === false`).
  Luôn đi qua helper `resolve*TrendChartRange()` và guard `isValid()`.
- **Egress Supabase** (free-tier 5GB/tháng): đọc `docs/supabase-egress.md` trước khi thêm query.
  Không `select('*')`, tách `SELECT_LIST` / `SELECT_FULL`, không `getById` trước `update`.
- **KHÔNG cắt ngầm số dòng.** Hàm "lấy danh sách" phải trả về đủ; dùng `fetchAllPages()`
  chứ đừng `.limit(500)` / `.limit(2000)` cho ăn chắc. Danh sách thiếu người, báo cáo hụt số
  và kiểm trùng bỏ sót đều không để lại dấu vết nào trên giao diện. Bảng lớn thì trị bằng
  RPC phân trang server-side, không phải bằng trần thấp hơn.

## Tài liệu tham chiếu

| File | Nội dung |
|---|---|
| `docs/module-standard-checklist.md` | Checklist bắt buộc khi tạo/rà soát module CRUD |
| `docs/supabase-egress.md` | Quy tắc egress — đọc trước khi viết query |
| `docs/UI-CONVENTIONS.md` | Quy ước giao diện |
| `docs/checklist-module.md` | Chi tiết list + detail + form |
| `docs/patterns-*.md` | Nút, thao tác bảng, đổi trạng thái ở detail |
| `docs/PERMISSION-SUBMENU-PATTERN.md` | Ẩn/hiện menu theo quyền |
