# 5F Template – Ứng dụng quản lý nội bộ

Ứng dụng web quản lý thiết bị / nhân sự và nghiệp vụ nội bộ: Trang chủ, Hệ thống (nhân viên, phòng ban, chức vụ, thông tin công ty, phân quyền, …), Hồ sơ. Giao diện tiếng Việt, dark mode; tông màu chủ đạo chọn trong menu người dùng (avatar).

## Stack (tóm tắt)

- **Frontend:** React (Vite) + TypeScript.
- **UI:** Tailwind CSS + **component nội bộ** trong `components/ui/` (phong cách tương tự shadcn, **không** cài registry shadcn/Radix để giữ kiểm soát bundle).
- **Dữ liệu:** TanStack Query (server) + Zustand (client); React Hook Form + Zod.
- **Backend:** Supabase (PostgreSQL + Auth); bắt buộc cấu hình `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong `.env.local`.

## Supabase

1. Tạo project trên [Supabase](https://supabase.com), lấy **URL** và **anon key**.
2. Copy `.env.example` → `.env.local` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. **Không commit** `.env.local` (đã nằm trong `.gitignore`). Trên Vercel: chỉ cần hai biến Supabase trên (ma trận phân quyền luôn bật sau đăng nhập, không cần flag env riêng).
3. Sinh type TypeScript cho PostgREST (khuyến nghị khi schema ổn định):

   ```bash
   npm run types:supabase
   ```

   (Cần [Supabase CLI](https://supabase.com/docs/guides/cli) và project đã `supabase link`, hoặc chỉnh script trong `package.json` dùng `--project-id`.)

4. Bật **RLS** và policy phù hợp trên các bảng; client chỉ dùng anon key (có thể lộ trong bundle SPA) — **RLS** là lớp bảo vệ chính. **Không** đặt `SUPABASE_SERVICE_ROLE_KEY` vào biến `VITE_*`.

**Hiệu năng (đã áp dụng trong code):** client Supabase singleton + PKCE; TanStack Query `staleTime` / `gcTime`; repository giới hạn số dòng mỗi lần `getAll` (xem `SUPABASE_DEFAULT_MAX_ROWS`); `select` trong service chỉ lấy cột và quan hệ cần thiết. Dev: nút **React Query Devtools** góc dưới trái.

## Yêu cầu

- Node.js (khuyến nghị LTS)

## Chạy dự án

1. Cài đặt phụ thuộc:
   ```bash
   npm install
   ```
2. Chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt theo địa chỉ in ra (thường là `http://localhost:5173`).

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chạy dev server (Vite) |
| `npm run build` | Build production (output trong `dist/`) |
| `npm run preview` | Xem bản build (sau khi chạy `npm run build`) |
| `npm run test` | Chạy test (Vitest) |
| `npm run test:watch` | Chạy test ở chế độ watch |
| `npm run types:supabase` | Sinh `lib/supabase/database.types.ts` (cần Supabase CLI) |

## Tài liệu

- [Quy ước giao diện (UI Conventions)](docs/UI-CONVENTIONS.md) – Dialog/Drawer, Section, Design system (border radius, button, error message).
- [Catalog view types ERP](docs/view-types.md) – `VIEW_TYPE_REGISTRY`, primitive theo nhóm, tách `ViewTypeId` vs `DataTypeId`.

## Cấu trúc chính

- `App.tsx` – Router, theme, ngôn ngữ, route bảo vệ.
- `components/` – Layout, UI dùng chung (Button, Input, Table, …), shared (ConfirmDialog, ErrorState, …).
- `features/he-thong/` – Module Hệ thống: nhân viên, phòng ban, chức vụ, thông tin công ty, phân quyền; **cấp bậc / chi nhánh** chỉ là lookup (hooks + service), không có trang riêng.
- `lib/` – Tiện ích, `lib/text` (chuỗi giao diện), theme, sidebar, `lib/query-keys`, `lib/supabase/`.
- `locales/` – File JSON / gộp chuỗi (theo cấu hình dự án).
- `pages/` – Trang đơn (Home, Login, Profile, …).
- `store/` – Zustand (auth, UI, confirm).
