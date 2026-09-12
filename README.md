# MTTQVN — Hệ thống quản trị nội bộ Uỷ ban MTTQ Việt Nam tỉnh Nghệ An

Ứng dụng web nội bộ (SPA) phục vụ **cán bộ cấp tỉnh và cấp xã/phường** của Uỷ ban Mặt trận Tổ quốc
Việt Nam tỉnh Nghệ An: quản lý uỷ viên uỷ ban và kỳ họp, tập huấn — khen thưởng, kho cứu trợ và an
sinh xã hội, giao việc — báo cáo, viết bài, phản biện xã hội, công tác dân tộc — tôn giáo.

Giao diện tiếng Việt, có chế độ sáng/tối, cài được như PWA. Toàn bộ dữ liệu nằm trên Supabase
(PostgreSQL + Auth); không có backend riêng ngoài một Edge Function cho thao tác quản trị tài khoản.

> Tài liệu kỹ thuật chi tiết nằm ở **[`CLAUDE.md`](CLAUDE.md)** (quy ước module, hai tầng phân quyền,
> chọn kiểu phân trang, bẫy đã biết) và thư mục **[`docs/`](docs/)**. README này chỉ là bản đồ vào cửa.

---

## 1. Các nhóm nghiệp vụ

Menu chính (`lib/sidebar-menu.tsx`) gồm 9 mục ngoài Trang chủ. Mỗi mục là một trang dashboard gom
các module con; route khai báo tập trung trong `App.tsx`.

| Nhóm | Đường dẫn gốc | Module chính | Thư mục |
|---|---|---|---|
| **Mặt trận tổ quốc** | `/mat-tran-to-quoc` | Tập huấn & Khen thưởng (danh sách tập huấn, danh sách khen thưởng) · Uỷ viên uỷ ban (nhiệm kỳ + ma trận điểm danh, kỳ họp, danh sách uỷ viên, báo cáo uỷ viên) · Tổ chức cán bộ (danh sách cán bộ, báo cáo cán bộ, thiết lập cài đặt) · Quản lý lương (danh sách tăng lương, thiết lập lương) | `features/mat-tran-to-quoc/` |
| **Quản lý viết bài** | `/quan-ly-viet-bai` | Bài viết · Nhuận bút viết bài · Báo cáo thống kê bài viết · Thiết lập bài viết | `features/quan-ly-viet-bai/` |
| **Quản lý giao việc** | `/quan-ly-giao-viec` | Chương trình năm · Công việc · Báo cáo công việc | `features/quan-ly-giao-viec/` |
| **Kiểm tra, giám sát, phản biện xã hội** | `/phan-bien-xa-hoi` | Thực hiện phản biện xã hội · Thiết lập danh mục · Thống kê phản biện xã hội | `features/phan-bien-xa-hoi/` |
| **Dân tộc, tôn giáo** | `/dan-toc-ton-giao` | Thăm hỏi (dịp thăm hỏi, thăm hỏi tổ chức, thăm hỏi cá nhân, thống kê thăm hỏi) · Thông tin (tổ chức quan trọng, cá nhân tiêu biểu, thống kê tổ chức — cá nhân) | `features/dan-toc-ton-giao/` |
| **An sinh xã hội** | `/an-sinh-xa-hoi` | Kho cứu trợ: danh sách kho, hàng hoá, đợt cứu trợ, đơn vị cứu trợ, nhập xuất kho (có in phiếu), tồn kho, báo cáo hỗ trợ | `features/mat-tran-to-quoc/` (nhóm `kho-*`, `dot-cuu-tro`, `don-vi-cuu-tro`, `hang-hoa`, `ton-kho`, `nhap-xuat-kho`, `bao-cao-ho-tro`) |
| **Hành chính** | `/hanh-chinh` | Quản lý tài sản · Quản lý xe — **chưa triển khai**, đang là trang placeholder | `lib/an-sinh-hanh-chinh-module-config.ts` |
| **Trang thông tin khác** | `/trang-thong-tin-khac` | Liên kết truy cập | `pages/dashboards/` |
| **Hệ thống** | `/he-thong` | Nhân viên · Phòng ban · Chức vụ · Thông tin tổ chức · Phân quyền · Danh sách tỉnh thành (xã/phường) | `features/he-thong/` |

Hai lưu ý về sơ đồ trên, đối chiếu trực tiếp từ `App.tsx`:

- **Kho cứu trợ đã dời sang An sinh xã hội.** Các đường dẫn cũ `/mat-tran-to-quoc/kho-cuu-tro/*` vẫn
  còn nhưng chỉ `<Navigate>` sang `/an-sinh-xa-hoi/kho-cuu-tro/*`. Mã nguồn vẫn nằm trong
  `features/mat-tran-to-quoc/`.
- **Hành chính và một phần An sinh xã hội** (Quỹ vì người nghèo, Quỹ cứu trợ, Nhà đại đoàn kết) hiện
  là **module placeholder**: route sinh tự động từ `PLACEHOLDER_MODULE_PATHS` và render
  `DashboardModulePlaceholder`, chưa có bảng dữ liệu.

Ngoài menu còn có: Trang chủ (`/`), Hồ sơ (`/ho-so`), Thông báo (`/thong-bao`), Đăng nhập
(`/dang-nhap`).

---

## 2. Công nghệ

| Lớp | Dùng gì |
|---|---|
| Frontend | React 19 + TypeScript + Vite 7, React Router 7 (route lazy theo trang) |
| UI | Tailwind CSS 4 + component nội bộ trong `components/ui/` (không cài registry shadcn/Radix), `lucide-react`, `framer-motion`, `recharts`, `sonner` |
| Dữ liệu | TanStack Query v5 (server state, có persist localStorage) + Zustand (client state) |
| Form | React Hook Form + Zod |
| Backend | Supabase — PostgreSQL, Auth (PKCE), Storage, Edge Function `admin-user` |
| Ảnh | Cloudinary (upload mới); bucket `avatars` private chỉ còn phục vụ dữ liệu cũ |
| Xuất file | `xlsx`, `docx`, `jspdf` + `jspdf-autotable`, `html2canvas` |
| Giám sát | Sentry (tự tắt khi không có `VITE_SENTRY_DSN`) |
| Test | Vitest 4 — **node-first, jsdom opt-in** (`.ts` chạy `node`, `.tsx` chạy `jsdom`) |
| Triển khai | Vercel (SPA rewrite + cache header trong `vercel.json`), PWA qua `vite-plugin-pwa` |

---

## 3. Chạy dự án

Yêu cầu Node `^20.19.0 || >=22.12.0` (xem `engines` trong `package.json`).

```bash
npm install
cp .env.example .env.local   # rồi điền giá trị thật
npm run dev                  # Vite dev server, cổng 3000 (vite.config.ts)
```

### Biến môi trường

`.env.local` **không** được commit (`.gitignore` chặn `.env*`, chỉ chừa `.env.example`). Danh sách
biến khai báo trong `env.d.ts`:

| Biến | Bắt buộc | Dùng để |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Endpoint Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key (lộ được trong bundle SPA) |
| `VITE_CLOUDINARY_CLOUD_NAME` | — | Upload ảnh (unsigned preset) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | — | Upload ảnh (unsigned preset) |
| `VITE_SENTRY_DSN` | — | Bỏ trống ⇒ tắt toàn bộ giám sát |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | — | 0..1, bỏ trống = 0.1 |
| `VITE_APP_VERSION` | — | Thiếu thì stack trace production là mã đã nén |

**Không** đặt `SUPABASE_SERVICE_ROLE_KEY` vào biến `VITE_*` — key đó chỉ dùng ở Edge Function.

### Lệnh

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server (Vite, cổng 3000) |
| `npm run build` | Build production → `dist/` |
| `npm run preview` | Xem bản build |
| `npm run typecheck` | `tsc --noEmit` (đã bật `incremental`) |
| `npm run typecheck:mttq` | Typecheck phạm vi MTTQ + hệ thống |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Toàn bộ Vitest |
| `npm run test:changed` | Chỉ test liên quan file đã đổi |
| `npx vitest run <path>` | Một file / thư mục |
| `npm run types:supabase` | Sinh `lib/supabase/database.types.ts` (cần Supabase CLI + `supabase link`) |
| `npm run storage:create-avatars` | Tạo bucket `avatars` |

CI (`.github/workflows/typecheck.yml`) chạy: typecheck toàn repo · lint · test · build, cộng một job
typecheck riêng cho phạm vi MTTQ.

---

## 4. Bản đồ thư mục

| Đường dẫn | Vai trò |
|---|---|
| `App.tsx` | Bảng route, các synchronizer (theme, metadata, ngôn ngữ, ma trận quyền, phiên đăng nhập) |
| `index.tsx` | Bootstrap React, QueryClient + persist, Sentry |
| `features/<nhóm>/<module>/` | Module nghiệp vụ — `core/` · `services/` · `hooks/` · `components/` · `utils/` · `store/` · `text.ts` |
| `pages/` | Trang đơn: Home, Login, Profile, Thông báo, `dashboards/` của từng nhóm |
| `components/shared/` | Component dùng chung có nghiệp vụ: `GenericTable`, `GenericToolbar`, `GenericDrawer`, `ExportDialog`, `DetailSummaryCard`, `stats/` |
| `components/ui/` | Primitive không nghiệp vụ: `Button`, `Input`, `Combobox`, `DateRangePicker`, `TabGroup`… |
| `components/layout/` | `Layout`, sidebar, `CommandPalette` |
| `components/auth/` | `ProtectedRoute`, đồng bộ phiên và ma trận quyền |
| `lib/` | `permissions.ts`, `query-keys.ts`, `sidebar-menu.tsx`, `date-range-presets.ts`, `text/` (chuỗi UI), `supabase/`, `data/` (repository + phân trang server) |
| `store/` | Zustand: `useStore` (auth), `usePermissionGrantStore` (ma trận quyền), `createGenericStore` |
| `hooks/` | `use-can`, `use-hydrate-position-permissions`, `use-resource-permissions`, `use-server-paged-list`… |
| `supabase/migrations/` | Migration SQL, đặt tên `<timestamp>_<mô tả>.sql` |
| `supabase/functions/admin-user/` | Edge Function tạo/sửa/xoá tài khoản Auth |
| `supabase/scripts/` | Script SQL chạy tay: seed, repair dữ liệu |
| `scripts/` | Script Node/Bash: deploy Edge Function, tạo bucket, migrate ảnh (`archive/`) |
| `docs/` | Quy ước và vận hành |
| `locales/` | `common.json` (+ `en/`) — nguồn để sinh `lib/text/` |

---

## 5. Hai điều dễ hiểu sai ngay từ đầu

1. **Phân quyền có hai tầng tách biệt.** `useCan(action, resource)` chỉ trả lời "được mở module
   không". Phạm vi dòng nằm ở hook riêng của từng module (`use-*-viewer.ts`): *xã/phường* → chỉ
   `don_vi_id` của mình · *tỉnh* → toàn bộ · còn lại → chỉ bản ghi mình tạo.
2. **RLS trên Supabase hiện là `USING (true)` cho hầu hết bảng** — mọi chặn dữ liệu đang nằm ở
   client. Trang báo cáo/thống kê **bắt buộc** áp viewer như trang list, nếu không là lộ dữ liệu
   toàn hệ thống.

---

## 6. Tài liệu

| File | Nội dung |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Quy ước module, hai tầng quyền, chọn kiểu phân trang, bẫy đã biết |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Xử lý sự cố: triệu chứng → xác nhận → xử lý; khôi phục từ `pg_dump` |
| [`docs/TRIEN-KHAI.md`](docs/TRIEN-KHAI.md) | Build, biến môi trường, CI, migration, Edge Function |
| [`docs/supabase-egress.md`](docs/supabase-egress.md) | Quy tắc egress — đọc trước khi viết query |
| [`docs/module-standard-checklist.md`](docs/module-standard-checklist.md) | Checklist bắt buộc khi tạo/rà soát module CRUD |
| [`docs/checklist-module.md`](docs/checklist-module.md) | Chi tiết list + detail + form |
| [`docs/UI-CONVENTIONS.md`](docs/UI-CONVENTIONS.md) | Quy ước giao diện |
| [`docs/PERMISSION-SUBMENU-PATTERN.md`](docs/PERMISSION-SUBMENU-PATTERN.md) | Ẩn/hiện menu theo quyền |
| [`docs/patterns-*.md`](docs/) | Nhãn nút, thao tác bảng, đổi trạng thái ở detail |
| [`docs/view-types.md`](docs/view-types.md) | `VIEW_TYPE_REGISTRY`, `ViewTypeId` vs `DataTypeId` |
