# RUNBOOK — xử lý sự cố

Tài liệu vận hành cho hệ thống **MTTQVN** (Uỷ ban MTTQ Việt Nam tỉnh Nghệ An).
Mỗi mục viết theo đúng một thứ tự: **triệu chứng người dùng thấy → cách xác nhận → cách xử lý**.

Chỉ ghi những sự cố **đã thực sự xảy ra** trong dự án này. Gặp sự cố mới thì bổ sung vào đây theo
cùng khuôn, đừng thêm mục phỏng đoán.

Tham chiếu: [`../CLAUDE.md`](../CLAUDE.md) mục "Bẫy đã biết" · [`supabase-egress.md`](supabase-egress.md)
· [`TRIEN-KHAI.md`](TRIEN-KHAI.md).

---

## Bảng tra nhanh

| Triệu chứng | Mục |
|---|---|
| Mọi trang kẹt ở "Đang tải dữ liệu", Network trống trơn | [1](#1-app-treo-ở-đang-tải-dữ-liệu-devtools-network-trống-trơn) |
| Sau F5 menu/quyền hiện thiếu, hoặc báo không có quyền | [2](#2-sau-f5-menu--quyền-hiện-thiếu) |
| Danh sách thiếu bản ghi, báo cáo ra số nhỏ hơn thực tế | [3](#3-danh-sách-thiếu-bản-ghi--báo-cáo-ra-số-nhỏ-hơn-thực-tế) |
| Supabase báo sắp hết egress / hoá đơn tăng | [4](#4-egress-supabase-tăng-đột-biến) |
| `console.log` không in gì khi chạy dev | [5](#5-consolelog-không-in-ra-gì-khi-dev) |
| Xuất Excel/PDF chọn "Tất cả" nhưng chỉ ra đúng trang đang xem | [6](#6-xuất-file-chọn-tất-cả-nhưng-chỉ-ra-trang-đang-xem) |
| Biểu đồ xu hướng làm treo tab khi chọn "Tất cả" | [7](#7-biểu-đồ-xu-hướng--preset-tất-cả-làm-treo-tab) |
| Cần quay lại dữ liệu trước một migration hỏng | [8](#8-khôi-phục-cơ-sở-dữ-liệu-từ-bản-sao-lưu-pg_dump) |

---

## 1. App treo ở "Đang tải dữ liệu", DevTools Network trống trơn

### Triệu chứng

Đăng nhập xong, **trang nào cũng** hiện "Đang tải dữ liệu" và đứng yên vĩnh viễn. Không có thông báo
lỗi, không có toast, không có gì đỏ trong Console.

### Cách xác nhận

Dấu hiệu phân biệt duy nhất, và nó rất đặc trưng: mở **DevTools → Network**, lọc `rest/v1` →
**không có một request nào được phát ra**. Đây không phải lỗi mạng hay lỗi Supabase; app đơn giản
là chưa bao giờ gửi truy vấn.

Nếu Network **có** request và chúng pending/lỗi 4xx-5xx thì sự cố khác — xem mục 2 hoặc kiểm tra
trạng thái Supabase.

### Cách xử lý

Nguyên nhân đã biết: **có code gọi Supabase bên trong callback `onAuthStateChange`.** `supabase-js`
giữ khoá auth suốt lúc callback chạy; một truy vấn đặt trong đó sẽ chờ khoá, còn khoá thì chờ
callback kết thúc ⇒ khoá chết, mọi truy vấn của app treo.

1. Tìm nơi vi phạm:

   ```bash
   grep -rn "onAuthStateChange" --include="*.ts" --include="*.tsx" . \
     --exclude-dir=node_modules --exclude-dir=dist
   ```

2. Trong mỗi callback đó, mọi lời gọi Supabase (`supabase.from(...)`, `auth.getUser()`, RPC…) phải
   được đẩy ra ngoài phạm vi khoá bằng `setTimeout(…, 0)`.

3. Mẫu đúng đã có sẵn trong `lib/supabase/auth.ts` → `onAuthStateChange`: callback chỉ đọc
   `session.user`, phần tra cứu hồ sơ nhân viên nằm trong `setTimeout(() => { void (async () => {…})(); }, 0)`.

Sửa xong reload là hết ngay. Không cần xoá cache hay đăng nhập lại.

---

## 2. Sau F5 menu / quyền hiện thiếu

### Triệu chứng

Vừa nhấn F5, người dùng thấy sidebar thiếu mục, hoặc mở module thì báo không có quyền — trong khi
trước đó (và sau khi bấm lại) vẫn vào bình thường. Có trường hợp ngược lại đáng lo hơn: người dùng
**thấy nhiều module hơn mức được cấp**.

### Cách xác nhận

1. Mở DevTools → Network, lọc `var_phan_quyen`. Quan sát request lấy ma trận quyền sau khi reload:
   - Chưa xong ⇒ menu đang ở trạng thái chờ, đợi vài trăm ms là đủ.
   - Trả lỗi (4xx/5xx) ⇒ hydrate thất bại.
2. Trong Console kiểm tra store quyền: `usePermissionGrantStore` phải có `grantsByModule` không rỗng,
   `chucVuCapBac` / `chucVuCapQuanLy` đúng chức vụ người dùng.
3. Kiểm tra hồ sơ: tài khoản phải có `id_chuc_vu`. Hook `useHydratePositionPermissions` chỉ chạy khi
   `hasHydrated && user && chucVuKey` — **nhân viên không gán chức vụ thì không có quyền nào cả**,
   đây là nguyên nhân phổ biến nhất và không phải bug.

### Cách xử lý

| Kết quả xác nhận | Xử lý |
|---|---|
| Nhân viên chưa có chức vụ | Gán chức vụ trong Hệ thống → Nhân viên, rồi đăng nhập lại |
| Chức vụ có nhưng `var_phan_quyen` chưa có dòng | Cấp quyền trong Hệ thống → Phân quyền |
| Request quyền lỗi | Nhánh `isError` trong `use-hydrate-position-permissions.ts` áp **deny-by-default** — người dùng thấy "không có quyền" thay vì thấy hết. Đúng thiết kế; sửa nguyên nhân lỗi request, đừng nới nhánh này |
| Thấy **nhiều** module hơn mức được cấp | Đây là hồi quy của lỗi cũ: trước kia không có nhánh `isError`, `matrixActive` ở lại `false` suốt phiên và `legacyCan` cho xem mọi module. Kiểm tra `use-hydrate-position-permissions.ts` còn đủ ba nhánh `payload` / `isError` / `isPending` |
| Quyền vừa đổi trên DB nhưng app chưa nhận | Ma trận cache 30 phút (`MASTER_DATA_STALE_TIME_MS`). Đăng xuất — đăng nhập lại để hydrate lại. **Không** hạ `staleTime` xuống 0: `docs/supabase-egress.md` cấm, vì mọi lần điều hướng sẽ gọi lại |

Cache TanStack Query còn được persist xuống `localStorage`. Nếu nghi ngờ cache cũ, tăng số phiên bản
persist trong `index.tsx` (lịch sử đã có v2→v6, riêng v6 chính là để ma trận phân quyền không bị khôi
phục cache cũ sau reload).

---

## 3. Danh sách thiếu bản ghi / báo cáo ra số nhỏ hơn thực tế

### Triệu chứng

Người dùng nói "thiếu người", "báo cáo ít hơn thực tế", "kiểm trùng không bắt được". Giao diện
**không báo gì cả** — đây là loại lỗi tệ nhất trong hệ này vì nó im lặng.

### Cách xác nhận

1. Đếm thực tế trên Supabase (SQL Editor):

   ```sql
   SELECT count(*) FROM public.<bang>;              -- tổng
   SELECT count(*) FROM public.<bang> WHERE <bo_loc_dang_ap>;
   ```

   So với con số app hiển thị. Lệch ⇒ có chỗ cắt ngầm.

2. Tìm trần cứng trong service của module:

   ```bash
   grep -rn "\.limit(\|maxRows\|SAFETY_LIMIT\|range(" features/<nhóm>/<module>/services/
   ```

   Nghi ngờ mọi con số tròn: `.limit(500)`, `.limit(1000)`, `.limit(2000)`, trần 5.000.

3. Với trang **phân trang server (RPC)**: kiểm tra RPC có `COUNT(*) OVER () AS total_count` không.
   Thiếu nó thì UI hiện `Tổng: —`, nút "trang cuối" chết, hộp thoại Xuất ghi sai số dòng.

4. Với trang **báo cáo/thống kê**: kiểm tra trang có áp hook `use-*-viewer.ts` không. Viewer giới hạn
   phạm vi dòng đúng chủ ý (xã/phường chỉ thấy đơn vị mình) — số nhỏ hơn ở đây là **đúng**, không
   phải lỗi.

### Cách xử lý

- Bỏ trần cứng. Hàm nói là "lấy danh sách" thì phải trả **đủ** dòng; dùng `fetchAllPages()`
  (`lib/supabase/fetch-all-pages.ts`) — nó lặp tới hết dữ liệu.
- `fetchAllPages` có `FETCH_ALL_PAGES_SAFETY_LIMIT` = 200.000 và **ném lỗi** khi vượt chứ không trả
  về một phần. Vượt `FETCH_ALL_PAGES_WARN_AT` = 20.000 thì ghi cảnh báo — đó là tín hiệu **chuyển
  module sang RPC phân trang server-side**, không phải tín hiệu để hạ trần xuống.
  Mẫu RPC: `get_bai_viet_page`, `get_cong_viec_page`, `get_kho_nhap_xuat_kho_page`,
  `get_pbxh_thuc_hien_page`, `get_dttg_tham_hoi_page`.
- RPC thiếu `total_count`: thêm `COUNT(*) OVER () AS total_count`, đọc bằng `readRpcTotalCount`
  (`lib/data/server-paging.ts`).
- Trang liền nhau trùng dòng hoặc bỏ sót dòng ⇒ `ORDER BY` của RPC chưa kết thúc bằng khoá chính.
  Kiểm bằng cách gom hết các trang rồi đếm số id khác nhau.
- Ngoại lệ hợp lệ duy nhất của việc cắt: ô **xem trước** có nói rõ với người dùng và có lối đi tới
  danh sách đầy đủ (ví dụ "5 lần nâng lương gần nhất" trong hồ sơ cán bộ), hoặc truy vấn *tồn tại?* /
  *gợi ý tìm kiếm* (`.limit(1)`, `.limit(10)`).

---

## 4. Egress Supabase tăng đột biến

### Triệu chứng

Supabase cảnh báo sắp chạm hạn mức free-tier **5 GB egress/tháng**, hoặc app chậm hẳn khi điều hướng
qua lại giữa các trang danh sách.

### Cách xác nhận — khoanh vùng theo thứ tự

1. **Dashboard → Usage / Observability**: xem egress tách theo dịch vụ (Database / Storage / Auth).
   Tìm endpoint `/rest/v1/...` bị gọi nhiều nhất — nó chỉ thẳng ra bảng nào.
2. **Dashboard → Database → Query performance**: soi số dòng trả về trung bình và kích thước mỗi dòng.
   Cột nào khiến row > 1 KB là ứng viên long-text (`thong_tin`, `ghi_chu`, `tai_lieu_*`, `noi_dung_*`,
   `hinh_anh` base64).
3. **Trong app**: DevTools → Network, lọc `rest/v1`, thao tác đúng luồng người dùng phàn nàn. Đếm số
   request cho một hành động — mỗi lần đổi trang nên là **một** request, không phải hai.
4. **Dashboard → Storage → Bandwidth**: bucket `avatars` là private, egress đi qua signed URL theo
   từng phiên. Nếu Storage tăng, nghi ngờ ảnh chưa qua `cloudinaryThumbUrl`.

### Cách xử lý

Đối chiếu với checklist trong [`supabase-egress.md`](supabase-egress.md). Các thủ phạm hay gặp nhất:

| Dấu hiệu | Sửa |
|---|---|
| Row nặng ở màn list | Tách `SELECT_LIST` (bỏ long-text, bỏ join chỉ dùng ở detail) khỏi `SELECT_FULL`; đồng bộ `SEARCHABLE_KEYS` chỉ chứa cột có trong `SELECT_LIST` |
| Embed `bang_con(id)` để đếm | Đổi sang `bang_con(count)`, mapper đọc `lines[0]?.count` |
| Mỗi lần sửa phát 2 request | Bỏ `getById` trước `update`; `handleEditFromList` đi qua `queryClient.fetchQuery` thay vì gọi thẳng `getById` |
| `returningSelect: '*'` | Narrow còn `'id,tg_cap_nhat'` hoặc `'id'` |
| List tải lại toàn bảng mỗi lần điều hướng | Đừng hạ `staleTime` của `transactionalCrudListQueryOptions` (3 phút); chuyển module sang RPC phân trang |
| Ảnh Cloudinary kéo bản gốc | Luôn đi qua `cloudinaryThumbUrl` (`lib/cloudinary/thumb-url.ts`) |
| Lookup lớn tải lại mỗi F5 | Cache phải mirror xuống `localStorage` (mẫu: `getXaPhuongAll()`, TTL 24h) |

---

## 5. `console.log` không in ra gì khi dev

### Triệu chứng

Thêm `console.log` để debug, chạy `npm run dev`, Console trống. Dễ kết luận nhầm là "code không
chạy vào nhánh này" rồi đi sửa sai chỗ.

### Cách xác nhận

Mở `vite.config.ts`, xem khối `esbuild`:

```ts
esbuild: {
  drop: ['console', 'debugger'],
},
```

`esbuild.drop` ở cấp `esbuild` (không nằm trong `build`) áp dụng cho **cả chế độ dev**, không riêng
production.

### Cách xử lý

Debug tạm thì ghi vào `window` rồi đọc trong Console:

```ts
(window as any).__dbg = { value };
```

Hoặc đặt breakpoint / `debugger` qua DevTools Sources. **Không** xoá `drop: ['console']` khỏi
`vite.config.ts` — nó có chủ đích: giảm bundle và tránh log lọt dữ liệu nhạy cảm ra production.

---

## 6. Xuất file chọn "Tất cả" nhưng chỉ ra trang đang xem

### Triệu chứng

Ở trang danh sách có phân trang server, người dùng chọn phạm vi xuất "Tất cả" nhưng file Excel/PDF
chỉ có đúng số dòng của trang đang mở. Hoặc hộp thoại Xuất ghi tổng số dòng sai.

### Cách xác nhận

Mở `index.tsx` của module, xem chỗ dựng `ExportDialog`: có truyền `serverTotalRecords` và
`fetchAllData` không. Đồng thời kiểm tra RPC tương ứng có trả `total_count` (mục 3).

### Cách xử lý

Trang phân trang server **bắt buộc** truyền cả hai: `serverTotalRecords` (từ `readRpcTotalCount`) và
`fetchAllData`, với hàm `get<X>AllForExport()` kéo theo từng lô 500 dòng. Thiếu bước này thì "Tất cả"
vẫn chỉ xuất đúng trang đang xem.

---

## 7. Biểu đồ xu hướng + preset "Tất cả" làm treo tab

### Triệu chứng

Mở trang báo cáo có biểu đồ xu hướng, chọn khoảng thời gian preset **"Tất cả"** → tab đơ, quạt máy
chạy hết công suất, phải đóng tab.

### Cách xác nhận

`resolveStandardDateRange('all')` trả về `start: ''`, `end: ''`. Truyền thẳng chuỗi rỗng vào vòng lặp
`dayjs` sẽ lặp **vô tận**, vì `Invalid.isAfter(Invalid) === false` nên điều kiện dừng không bao giờ
đúng.

### Cách xử lý

Luôn đi qua helper `resolve*TrendChartRange()` của module và guard `isValid()` trước vòng lặp. Không
tự viết vòng `while (cur.isBefore(end))` trên giá trị lấy thẳng từ `resolveStandardDateRange`.

---

## 8. Khôi phục cơ sở dữ liệu từ bản sao lưu `pg_dump`

### Khi nào cần

Migration chạy sai và làm hỏng/mất dữ liệu, hoặc một thao tác xoá hàng loạt vượt ngoài dự kiến.

> ## ⚠️ Đọc trước khi làm bất cứ bước nào
>
> **Khôi phục đè là MẤT DỮ LIỆU.** Bản dump là ảnh chụp DB tại đúng một mốc thời gian. Mọi thứ người
> dùng nhập **sau** mốc đó — bài viết, công việc, điểm danh, phiếu nhập xuất kho, quyết định nâng
> lương — không có trong file dump và sẽ biến mất khi nạp đè, **không có cách lấy lại**.
>
> Vì vậy: bước 2 (dump hiện trạng trước đã) là **bắt buộc**, kể cả khi DB đang hỏng — và **khôi phục
> chọn lọc đúng bảng bị hỏng** luôn tốt hơn nạp cả dump.
>
> Khoảng dữ liệu sẽ mất = từ dấu thời gian trên tên file dump → đến bây giờ. Nhìn tên file mà ước
> lượng trước khi quyết định, đừng quyết rồi mới nhìn.

### Bản sao lưu nằm ở đâu

**Ngoài repo**, tại `~/Desktop/mttqvn-db-backups/`, đặt tên theo giờ dump:
`mttqvn-<YYYYMMDD>-<HHMMSS>.sql` (ví dụ `mttqvn-20260911-150444.sql`). File dump text do `pg_dump`
sinh ra từ PostgreSQL 17.6, chứa schema `public`.

Bản do `npm run db:backup` sinh ra đã được script kiểm: không rỗng, có dòng kết
`PostgreSQL database dump complete`, có `CREATE TABLE`. Bản đặt tay thì chưa — vẫn phải tự kiểm ở
bước 4.

> Quy tắc bắt buộc: **sao lưu toàn bộ DB trước mỗi migration** (`npm run db:backup`). Chi tiết quy
> trình và tham số của script ở [`TRIEN-KHAI.md`](TRIEN-KHAI.md) mục 4 và 4.1.

### Các bước

1. **Dừng ghi.** Báo người dùng ngừng thao tác. Nếu sự cố nặng, tạm gỡ biến môi trường Supabase trên
   Vercel để app không ghi thêm.

2. **Dump hiện trạng trước đã** — kể cả khi DB đang hỏng, và **đừng bỏ qua bước này**. Bản hỏng vẫn
   chứa dữ liệu mới hơn bản sao lưu; khôi phục xong mà mất phần đó thì không lấy lại được:

   ```bash
   pg_dump "$DATABASE_URL" -f ~/Desktop/mttqvn-db-backups/mttqvn-$(date +%Y%m%d-%H%M%S)-truoc-restore.sql
   ```

   (Đặt tay ở đây, không dùng `npm run db:backup`: hậu tố `-truoc-restore` đánh dấu đây là mốc cố ý
   giữ — script dọn bản cũ chỉ đụng file đúng khuôn `mttqvn-<8 số>-<6 số>.sql`, nên bản này không
   bao giờ bị tự xoá.)

3. **Chọn đúng bản sao lưu.** Lấy bản có dấu thời gian **ngay trước** thời điểm sự cố:

   ```bash
   ls -lt ~/Desktop/mttqvn-db-backups/
   ```

4. **Xem trước bản sao lưu** trước khi ghi đè gì. Ba phép kiểm, tất cả chỉ **đọc file**, không chạm
   database:

   ```bash
   FILE=~/Desktop/mttqvn-db-backups/<file>.sql

   # a) Dump có trọn vẹn không — thiếu dòng này là file bị cắt giữa chừng, KHÔNG dùng được
   tail -5 "$FILE" | grep "PostgreSQL database dump complete"

   # b) Có bảng cần khôi phục không, và khối dữ liệu của nó nằm ở dòng nào
   grep -n "^COPY public.<bang> " "$FILE"

   # c) Khối đó có bao nhiêu dòng dữ liệu (đếm tới dấu kết thúc COPY là dòng chỉ có '\.')
   awk '/^COPY public\.<bang> /{n=1;next} n&&/^\\\.$/{exit} n{c++} END{print c+0}' "$FILE"
   ```

   Số ở (c) phải hợp lý so với thực tế (ví dụ `var_ssn_xa_phuong` ≈ 131, `mttq_can_bo` ≈ 233,
   `var_nhan_vien` ≈ 199 — xem bảng "Chọn kiểu phân trang" trong `CLAUDE.md`). Ra 0 hoặc ra một con
   số vô lý thì **dừng lại**, chọn bản dump khác; đừng nạp rồi mới phát hiện.

5. **Khôi phục.** Ưu tiên khôi phục **chọn lọc** thay vì nạp toàn bộ dump đè lên DB đang chạy:

   - *Hỏng một bảng:* trích khối `COPY public.<bang> …` của bảng đó ra file riêng, `TRUNCATE` bảng
     (chú ý khoá ngoại) rồi nạp lại khối đó.
   - *Hỏng diện rộng:* khôi phục vào **một database/project trống** trước, kiểm tra rồi mới đồng bộ
     sang. Đừng `psql -f <dump>` thẳng vào DB production đang chạy.

   ```bash
   psql "$DATABASE_URL_KIEM_THU" -v ON_ERROR_STOP=1 -f ~/Desktop/mttqvn-db-backups/<file>.sql
   ```

6. **Kiểm tra trên app**, không chỉ trên SQL: đăng nhập, mở đúng module vừa khôi phục, đối chiếu số
   dòng danh sách với `SELECT count(*)`. Kiểm tra thêm một trang báo cáo để chắc quyền và viewer vẫn
   đúng.

7. **Chạy lại migration còn thiếu** (nếu bản khôi phục cũ hơn một số migration), theo đúng thứ tự
   timestamp, **từng cái một**, kiểm tra app sau mỗi cái — xem [`TRIEN-KHAI.md`](TRIEN-KHAI.md).

### Lưu ý

- Chuỗi kết nối / mật khẩu DB **không** được ghi vào bất kỳ file nào trong repo. Truyền qua biến môi
  trường của shell.
- Bản sao lưu là file SQL chứa **toàn bộ dữ liệu thật của cán bộ**. Không đưa vào repo, không đính
  kèm vào issue, không chia sẻ ngoài phạm vi người quản trị.
- `npm run db:backup` tự xoá bản cũ hơn 14 ngày nhưng luôn giữ 5 bản mới nhất, và **chỉ** đụng file
  đúng khuôn `mttqvn-<8 số>-<6 số>.sql`. Muốn giữ một mốc lâu dài thì đặt tên có hậu tố
  (`mttqvn-20260911-150444-truoc-doi-luong.sql`) — script sẽ không bao giờ tự xoá nó.
- Toàn bộ mục 8 này chỉ **đọc** file dump và database; không có bước nào ghi đè cho tới khi bạn cố ý
  chạy lệnh ở bước 5.
