# Triển khai

Hướng dẫn đưa hệ thống **MTTQVN** lên môi trường chạy thật: biến môi trường, build, CI, migration
cơ sở dữ liệu, Edge Function.

Sự cố sau khi triển khai: xem [`RUNBOOK.md`](RUNBOOK.md).

> ⚠️ **Không bao giờ** chép giá trị thật của biến môi trường, mật khẩu, access token hay chuỗi kết
> nối vào bất kỳ file nào trong repo — kể cả file tài liệu, kể cả dạng "ví dụ". Tài liệu chỉ ghi
> **tên biến**. `.env.example` được git theo dõi (`.gitignore` có `!.env.example`) nên nó phải luôn
> rỗng giá trị.

---

## 1. Kiến trúc triển khai

| Thành phần | Chạy ở đâu |
|---|---|
| Ứng dụng (SPA React + Vite) | Vercel — static build `dist/`, rewrite mọi path về `/index.html` (`vercel.json`) |
| Cơ sở dữ liệu, Auth, Storage | Supabase (PostgreSQL 17) |
| Quản trị tài khoản Auth | Supabase Edge Function `admin-user` (Deno) |
| Ảnh (upload mới) | Cloudinary; bucket `avatars` private chỉ còn phục vụ dữ liệu cũ |
| Giám sát lỗi | Sentry (tuỳ chọn) |

Không có backend riêng. Client dùng **anon key** — key này lộ được trong bundle SPA, nên lớp bảo vệ
phải nằm ở RLS trên Supabase.

> ⚠️ Hiện trạng: RLS trên Supabase đang là `USING (true)` cho hầu hết bảng — **mọi chặn dữ liệu đang
> nằm ở client**. Đây là nợ kỹ thuật đã biết, phải tính tới khi đánh giá rủi ro triển khai.

---

## 2. Biến môi trường

Khai báo đầy đủ trong `env.d.ts`; khuôn mẫu rỗng trong `.env.example`. Chép `.env.example` →
`.env.local` cho máy dev, và khai cùng bộ tên này trong **Vercel → Project Settings → Environment
Variables** cho môi trường chạy thật.

| Biến | Bắt buộc | Dùng để |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Endpoint Supabase (`https://<project_ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key |
| `VITE_CLOUDINARY_CLOUD_NAME` | — | Upload ảnh (unsigned preset) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | — | Upload ảnh (unsigned preset) |
| `VITE_SENTRY_DSN` | — | Bỏ trống ⇒ toàn bộ giám sát tự tắt, app chạy bình thường |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | — | Tỉ lệ lấy mẫu hiệu năng 0..1; bỏ trống = 0.1 |
| `VITE_APP_VERSION` | — | Thiếu thì stack trace production là mã đã nén, đọc không ra |

Chỉ có hai biến Supabase là bắt buộc: thiếu chúng, `assertSupabaseConfigured()`
(`lib/supabase/config.ts`) ném lỗi ngay trước auth/repository.

**Biến chỉ dành cho phía server — tuyệt đối không đặt tiền tố `VITE_`:**

| Biến | Nơi dùng |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime Edge Function `admin-user` (Supabase cấp sẵn) |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI khi deploy, đặt trong shell của người triển khai |
| `SUPABASE_PROJECT_REF` | Supabase CLI khi link project |

---

## 3. Build và kiểm tra trước khi phát hành

```bash
npm ci
npm run typecheck     # tsc --noEmit, đã bật incremental
npm run lint
npm test
npm run build         # → dist/
npm run preview       # xem thử bản build
```

`npm run typecheck:mttq` là bản rút gọn theo phạm vi MTTQ + hệ thống
(`tsconfig.typecheck-mttq.json`), dùng khi chỉ động vào phạm vi đó.

### CI

`.github/workflows/typecheck.yml`, chạy trên `push` vào `main`/`master` và trên mọi pull request.
Node 22, `npm ci`, hai job:

| Job | Bước |
|---|---|
| `kiem-tra` | `npm run typecheck` → `npm run lint` → `npm test` → `npm run build` |
| `typecheck-mttq` | `npm run typecheck:mttq` (tách riêng để PR module không bị chặn bởi lỗi ngoài scope) |

Lint **không** dùng `--max-warnings=0` vì repo còn cảnh báo tồn đọng; ESLint vẫn trả exit code khác 0
khi có **lỗi**, nên job chặn đúng thứ cần chặn.

### Vercel

`vercel.json` đã cấu hình sẵn, không cần sửa khi deploy:

- Rewrite `/(.*)` → `/index.html` (SPA routing).
- `/assets/*` và file đã hash (`js|css|woff2|woff|ttf|svg|png|jpg|jpeg|webp|ico|gif`) →
  `public, max-age=31536000, immutable`.
- `/index.html`, `/`, `/sw.js` → `public, max-age=0, must-revalidate`.
- `/manifest.webmanifest` → `public, max-age=3600`.

App có Service Worker (`vite-plugin-pwa`, `registerType: 'autoUpdate'`). Sau khi deploy, người dùng
đang mở app sẽ nhận bản mới ở lần điều hướng kế tiếp; nếu cần chắc chắn thì hướng dẫn họ đóng hẳn
tab rồi mở lại.

---

## 4. Migration cơ sở dữ liệu

Migration nằm ở `supabase/migrations/`, đặt tên **`<timestamp>_<mô tả>.sql`**
(ví dụ `20260726101000_get_kho_nhap_xuat_kho_page.sql`). Timestamp quyết định thứ tự áp — đặt tên sai
thứ tự là áp sai thứ tự.

### Ba quy tắc bắt buộc

1. **Sao lưu toàn bộ DB trước mỗi migration**, lưu **ngoài repo**. Dùng script, đừng gõ tay:

   ```bash
   npm run db:backup
   ```

   Chi tiết script ở [mục 4.1](#41-script-sao-lưu-scriptsbackup-dbsh) ngay bên dưới. Thư mục sao lưu
   đang dùng: `~/Desktop/mttqvn-db-backups/`, tên file `mttqvn-<YYYYMMDD>-<HHMMSS>.sql`. File dump
   chứa dữ liệu thật của cán bộ — không đưa vào repo, không chia sẻ ngoài phạm vi quản trị. Mật khẩu
   truyền qua biến môi trường / `.env.local`, không viết vào file nào trong repo.

2. **Chạy từng migration một, rồi kiểm trên app.** Không nạp một loạt file rồi mới mở app. Sau mỗi
   file: đăng nhập, mở đúng module bị ảnh hưởng, xem danh sách + mở một bản ghi + lưu thử. Lỗi phát
   hiện ở file thứ nhất rẻ hơn nhiều so với lỗi phát hiện sau file thứ tám.

3. **Migration phải idempotent** — chạy lại lần hai không được hỏng. Khuôn mẫu đang dùng trong repo:

   ```sql
   CREATE TABLE IF NOT EXISTS public.<bang> ( … );
   ALTER TABLE public.<bang> ADD COLUMN IF NOT EXISTS <cot> <kieu>;
   CREATE INDEX IF NOT EXISTS idx_<bang>_<cot> ON public.<bang> (<cot>);

   DROP TRIGGER IF EXISTS trg_<bang>_updated ON public.<bang>;
   CREATE TRIGGER trg_<bang>_updated
     BEFORE UPDATE ON public.<bang>
     FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

   ALTER TABLE public.<bang> ENABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS <bang>_select ON public.<bang>;
   CREATE POLICY <bang>_select ON public.<bang> FOR SELECT TO authenticated USING (true);

   CREATE OR REPLACE FUNCTION public.get_<bang>_page( … ) …;
   ```

   Nguyên tắc: `IF NOT EXISTS` cho thứ tạo mới, `DROP … IF EXISTS` ngay trước `CREATE` cho trigger và
   policy (chúng không có `CREATE OR REPLACE`), `CREATE OR REPLACE` cho function và view.

   **Ba trường hợp khó, khuôn mẫu đã dùng trong repo:**

   | Tình huống | Khuôn |
   |---|---|
   | `ADD CONSTRAINT` | `ALTER TABLE … DROP CONSTRAINT IF EXISTS <ten>;` rồi mới `ADD CONSTRAINT <ten> …` |
   | `DROP TABLE` / `DROP COLUMN` dọn schema cũ | bọc `DO $$ … IF EXISTS (SELECT 1 FROM information_schema.columns …) THEN … END $$` — chỉ drop khi **đúng là schema cũ**, không drop vô điều kiện |
   | Backfill đọc cột mà chính file đó xoá ở bước sau | bọc `DO $$` kiểm tra cột nguồn còn tồn tại; chạy lại lần hai thì bỏ qua |

   Mẫu đọc được: `20260507100000_var_ssn_tinh_thanh_xa_phuong.sql` (drop schema cũ có guard),
   `20260607130000_move_cap_quan_ly_to_nhan_vien_can_bo.sql` và
   `20260611120000_mttq_can_bo_hoso_mo_rong_uy_vien_drop_dup.sql` (backfill có guard).

   > ⚠️ Đừng viết `DROP TABLE IF EXISTS … CASCADE` vô điều kiện ở đầu migration. `IF EXISTS` chỉ
   > chặn *lỗi*, không chặn *mất dữ liệu*: lần chạy thứ hai nó xoá sạch bảng thật cùng mọi bản ghi
   > tham chiếu. Đây đúng là lỗi đã có trong file `20260507100000` (131 xã/phường) — nay đã bọc guard.

### 4.1. Script sao lưu `scripts/backup-db.sh`

```bash
npm run db:backup                                  # mặc định: giữ 14 ngày, tối thiểu 5 bản
./scripts/backup-db.sh --giu-ngay 30 --giu-toi-thieu 10
./scripts/backup-db.sh --thu-muc /Volumes/USB/mttqvn-backups
./scripts/backup-db.sh --cho-staging               # thêm --no-owner --no-privileges để nạp sang project khác
./scripts/backup-db.sh --help
```

Script **chỉ đọc** database (`pg_dump`), không ghi gì. Việc nó làm:

| Bước | Chi tiết |
|---|---|
| Kết nối | `SUPABASE_DB_URL` nếu có; không thì `SUPABASE_DB_PASSWORD` + host suy ra từ `supabase/.temp/pooler-url`, cuối cùng là `db.<project_ref>.supabase.co:5432` |
| Dump | `pg_dump --schema=public --format=plain` ra `~/Desktop/mttqvn-db-backups/mttqvn-<YYYYMMDD>-<HHMMSS>.sql` |
| Kiểm | file không rỗng · ≥ 1 KB · có dòng kết `PostgreSQL database dump complete` · có ít nhất một `CREATE TABLE`. Thiếu bất kỳ điều nào ⇒ báo lỗi, **thoát mã ≠ 0**, không để lại file dở |
| Dọn | xoá bản cũ hơn `--giu-ngay`, nhưng **luôn giữ** `--giu-toi-thieu` bản mới nhất |

Ghi file ra tên tạm `*.dang-ghi` rồi mới đổi tên — đứt giữa chừng không sinh ra bản sao lưu giả.
Chỉ tự xoá file đúng khuôn `mttqvn-<8 số>-<6 số>.sql`; bản đặt tay có hậu tố
(`…-truoc-restore.sql`) là mốc người vận hành cố ý giữ, script không đụng tới.

**Biến môi trường** (không biến nào có giá trị thật trong repo):

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `SUPABASE_DB_PASSWORD` | ✅ (nếu không có `SUPABASE_DB_URL`) | Dashboard → Project Settings → Database → Database password. Đặt trong shell hoặc `.env.local` |
| `SUPABASE_DB_URL` | — | Chuỗi kết nối đầy đủ, dùng thì bỏ qua mọi biến bên dưới |
| `SUPABASE_DB_HOST` / `_PORT` / `_USER` / `_NAME` | — | Ghi đè phần suy ra tự động |
| `SUPABASE_PROJECT_REF` | — | Ghi đè `supabase/.temp/project-ref` |
| `MTTQ_BACKUP_DIR` | — | Ghi đè thư mục sao lưu mặc định |

Mật khẩu truyền cho `pg_dump` qua `PGPASSWORD`, **không** nằm trong tham số dòng lệnh (nếu không thì
bất kỳ ai chạy `ps` trên máy đó đều đọc được).

> `scripts/lib/supabase-env.sh` là hàm dùng chung (đọc `.env.local`, tìm project ref).
> `scripts/deploy-edge-function-admin-user.sh` dùng chung file này — trước đây nó **hard-code
> project ref của production** ngay trong mã và đã đi vào git; nay bỏ hẳn, không tìm được ref thì
> dừng chứ không đoán.

### Cách áp

**Cách đang dùng — Supabase SQL Editor:** mở file migration, dán nguyên nội dung, chạy, đọc kỹ thông
báo trả về, rồi mở app kiểm tra. Sang file tiếp theo.

**Cách dùng CLI** (khi đã `supabase link`):

```bash
supabase db push          # áp các migration chưa có trên remote
supabase migration list   # đối chiếu local vs remote
```

Dù dùng cách nào, quy tắc dump-trước và kiểm-từng-cái ở trên vẫn giữ nguyên.

### Script SQL chạy tay

`supabase/scripts/` chứa script **không** thuộc chuỗi migration: seed dữ liệu mẫu
(`seed_*.sql`), sửa dữ liệu lệch (`repair_*.sql`, `fix_*.sql`), thao tác thủ công
(`manual_*.sql`, `drop_*.sql`). Chúng không tự chạy, không có thứ tự — đọc phần đầu file trước khi
chạy, và cũng dump trước.

`scripts/sql/create_avatars_storage_full.sql` phục vụ khởi tạo Storage.

### Sau khi đổi schema

Sinh lại type TypeScript cho PostgREST:

```bash
npm run types:supabase    # supabase gen types typescript --linked > lib/supabase/database.types.ts
```

Cần Supabase CLI và project đã `supabase link`.

---

## 5. Edge Function `admin-user`

Mã nguồn: `supabase/functions/admin-user/index.ts` (Deno). Đây là nơi duy nhất trong hệ thống chạm
tới `SUPABASE_SERVICE_ROLE_KEY`.

**Chức năng:** nhận JSON `{ action, username, password? }` với `action` ∈ `check` · `create` ·
`reset_password` · `delete`, để tạo/khoá/đặt lại mật khẩu tài khoản Supabase Auth từ màn quản trị
nhân viên.

**Kiểm soát truy cập** (thực hiện bên trong function, không phải ở gateway):

- Bắt buộc header `Authorization: Bearer <user_jwt>`; function tự xác thực JWT bằng anon key.
- Người gọi phải có dòng `var_nhan_vien` trùng email và `trang_thai = 'Hoạt động'`.
- Và phải có quyền quản trị thật: `var_chuc_vu.cap_bac = 1`, hoặc `var_phan_quyen.quyen` chứa
  `quan_tri`/`all` trên module `nhan-vien`.
- Mật khẩu không có giá trị mặc định: admin phải truyền (≥ 8 ký tự); không truyền thì function sinh
  chuỗi ngẫu nhiên và trả về để admin đưa tận tay người dùng.

**`verify_jwt = false` là cố ý, đừng bật lại.** `supabase/config.toml` đặt
`[functions.admin-user] verify_jwt = false`. Lý do: CORS preflight gửi `OPTIONS` không mang JWT hợp
lệ; nếu gateway bật verify → 401 trước khi vào Deno → trình duyệt báo lỗi CORS ("preflight không có
HTTP ok"). Request `POST` vẫn được kiểm tra JWT đầy đủ trong code.

**Triển khai:**

```bash
# Lần đầu / khi đổi máy — liên kết project
export SUPABASE_ACCESS_TOKEN="<access token của bạn>"   # Dashboard → Account → Access tokens
./scripts/deploy-edge-function-admin-user.sh link

# Deploy
./scripts/deploy-edge-function-admin-user.sh
```

Script tự lấy `project_ref` từ `VITE_SUPABASE_URL` trong `.env.local`; ghi đè bằng
`SUPABASE_PROJECT_REF` nếu cần. Bên dưới nó chạy `supabase functions deploy admin-user
--no-verify-jwt`, đồng bộ với `config.toml`.

Kiểm tra sau deploy: Dashboard → Edge Functions → `admin-user`, và thử tạo một tài khoản test từ màn
Hệ thống → Nhân viên.

---

## 6. Script tiện ích khác

| Script | Việc |
|---|---|
| `npm run db:backup` (`scripts/backup-db.sh`) | Sao lưu schema `public` ra ngoài repo + dọn bản cũ — xem [4.1](#41-script-sao-lưu-scriptsbackup-dbsh) |
| `scripts/lib/supabase-env.sh` | Hàm dùng chung: đọc `.env.local`, tìm project ref. `source`, không chạy trực tiếp |
| `npm run storage:create-avatars` (`scripts/create-avatars-bucket.ts`) | Tạo bucket `avatars` |
| `scripts/generate-text-from-locales.mjs` | Sinh `lib/text/` từ `locales/*.json` |
| `scripts/archive/migrate-avatars-to-cloudinary.ts` | Migration một lần: avatar Supabase Storage → Cloudinary. Chạy `DRY_RUN=1` trước |
| `scripts/archive/migrate-avatars-to-storage.ts` | Migration cũ hơn (base64 → Storage path). Giữ để tham chiếu |
| `scripts/archive/migrate-logo-to-cloudinary.ts` | Migration logo thương hiệu |

---

## 7. Checklist trước mỗi lần phát hành

- [ ] `npm run typecheck && npm run lint && npm test && npm run build` xanh ở local hoặc CI.
- [ ] `git status` sạch; không có file `.env*` nào (ngoài `.env.example`) bị staged.
- [ ] `.env.example` vẫn rỗng giá trị.
- [ ] Nếu có migration: đã chạy `npm run db:backup` (kết thúc bằng dòng `✓ Sao lưu xong`).
- [ ] Migration áp **từng cái một**, kiểm trên app sau mỗi cái.
- [ ] Nếu đổi schema: đã chạy `npm run types:supabase` và commit `database.types.ts`.
- [ ] Nếu đổi Edge Function: đã deploy lại và thử một thao tác tài khoản thật.
- [ ] Biến môi trường trên Vercel khớp với `env.d.ts` (đúng tên, đúng environment).
- [ ] Sau deploy: đăng nhập bằng một tài khoản **cấp xã/phường** để xác nhận phạm vi xem vẫn đúng —
      RLS đang mở, viewer phía client là lớp chặn duy nhất.

---

## 8. Môi trường staging — ĐỀ XUẤT, chưa làm

> Mục này là **bản đề xuất để bàn**, không phải hướng dẫn cho việc đã có. Hiện hệ thống chỉ có nhánh
> `main` và đẩy thẳng production: mọi migration đều thử nghiệm trên dữ liệu thật của cán bộ, lần đầu
> tiên chạy cũng là lần duy nhất. Chưa tạo project nào, chưa đụng cấu hình thật.

### Vì sao trước đây không lập được

Không dựng lại được database từ đầu: bộ migration chạy lại sẽ gãy giữa chừng, nên không có cách nào
tạo ra một DB thứ hai giống production. Nay phần lớn rào đó đã gỡ (xem mục 4, quy tắc 3) — bộ
migration cũ đã chạy lại được, nên staging trở nên khả thi.

### Cần những gì

| Hạng mục | Nội dung |
|---|---|
| Project Supabase thứ hai | Một project riêng, ví dụ đặt tên `mttqvn-staging`. Free tier là đủ: staging không cần egress lớn |
| Biến môi trường | Cùng **bộ tên** như production (mục 2), khác **giá trị**. Trên Vercel: khai cùng tên biến ở environment `Preview`, trỏ về project staging. Máy dev dùng `.env.staging.local` — `.gitignore` đã chặn `.env*.local` |
| Nạp schema | `supabase link --project-ref <ref_staging>` rồi `supabase db push`. Chạy được đúng vì migration đã idempotent — đây là **phép thử thật** cho quy tắc 3: push vào DB trống, rồi push lần hai, không lỗi nào |
| Dữ liệu | **Không** chép dữ liệu production sang. Đó là hồ sơ cán bộ thật: họ tên, ngày sinh, lương, quê quán — một project staging cấu hình lỏng là một vụ lộ dữ liệu |
| Deploy Edge Function | `SUPABASE_PROJECT_REF=<ref_staging> ./scripts/deploy-edge-function-admin-user.sh link` rồi chạy lại không có `link`. Script đã đọc ref từ biến môi trường nên không phải sửa mã |

### Sinh dữ liệu giả

Đủ để bấm thử, không cần giống thật:

1. **Danh mục** — nạp thật từ migration: `var_ssn_tinh_thanh` / `var_ssn_xa_phuong` đã có seed sẵn
   trong `20260507100000`; `luong_thiet_lap_*` có seed trong `20260611180000`. Không có gì nhạy cảm.
2. **Nhân viên / cán bộ** — sinh bằng SQL, tên giả theo số thứ tự:

   ```sql
   INSERT INTO public.var_nhan_vien (ten_tai_khoan, ho_va_ten, trang_thai)
   SELECT 'nv' || i, 'Nguyễn Văn Thử ' || i, 'Hoạt động'
   FROM generate_series(1, 50) AS i
   ON CONFLICT DO NOTHING;
   ```

   Đặt script loại này ở `supabase/scripts/seed_staging_*.sql` — thư mục đó đã dành cho script chạy
   tay ngoài chuỗi migration (xem mục 4). **Không** đặt trong `supabase/migrations/`, nếu không nó
   sẽ chạy cả trên production.
3. **Tài khoản đăng nhập thử** — tạo qua Edge Function `admin-user` trên staging, mỗi cấp một tài
   khoản: một Tỉnh, một Xã phường, một người thường. Đây mới là thứ staging dùng để bắt lỗi phạm vi
   xem — thứ mà production không cho phép thử.

### Việc còn thiếu sau khi có staging

- Nhánh `staging` + quy ước merge (`staging` → `main`), hiện chưa có.
- CI hiện chạy `typecheck/lint/test/build` nhưng **không** kiểm migration. Bước đáng thêm nhất:
  dựng một Postgres rỗng trong CI rồi áp toàn bộ `supabase/migrations/` **hai lần** — lần hai gãy
  tức là có file đánh mất tính idempotent.
