#!/usr/bin/env bash
# =============================================================================
# Triển khai Edge Function `admin-user` lên Supabase (tạo/cập nhật trên cloud).
#
# Chuẩn bị:
#   1) Cài Supabase CLI: https://supabase.com/docs/guides/cli/getting-started
#   2) Đăng nhập (một trong hai):
#        supabase login
#      hoặc
#        export SUPABASE_ACCESS_TOKEN="sbp_..."   # Dashboard → Account → Access tokens
#   3) Liên kết project (chỉ lần đầu, hoặc khi đổi máy):
#        ./scripts/deploy-edge-function-admin-user.sh link
#      Hoặc: export SUPABASE_PROJECT_REF="<project_ref>" rồi chạy lệnh link ở trên.
#
# Deploy:
#   ./scripts/deploy-edge-function-admin-user.sh
#
# Ghi chú: Mã function tại supabase/functions/admin-user/index.ts
#          --no-verify-jwt = tắt kiểm tra JWT ở gateway (bắt buộc cho CORS từ SPA:
#          OPTIONS preflight không mang JWT hợp lệ). JWT vẫn được kiểm tra trong code Deno.
#          Đồng bộ với supabase/config.toml → [functions.admin-user] verify_jwt = false
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Lấy project ref từ URL https://<REF>.supabase.co trong .env.local (nếu có), không thì mặc định bên dưới.
DEFAULT_REF="ufnahagiixvvxyngnyqy"
if [[ -f .env.local ]] && grep -q 'VITE_SUPABASE_URL=' .env.local; then
  URL_LINE="$(grep '^VITE_SUPABASE_URL=' .env.local | head -1)"
  EXTRACTED="$(echo "$URL_LINE" | sed -n 's|^VITE_SUPABASE_URL=https://\([^.]*\)\.supabase\.co.*|\1|p')"
  if [[ -n "$EXTRACTED" ]]; then
    DEFAULT_REF="$EXTRACTED"
  fi
fi
PROJECT_REF="${SUPABASE_PROJECT_REF:-$DEFAULT_REF}"

if ! command -v supabase &>/dev/null; then
  echo "Chưa có lệnh 'supabase'. Cài CLI rồi chạy lại."
  echo "  https://supabase.com/docs/guides/cli/getting-started"
  exit 1
fi

if [[ "${1:-}" == "link" ]]; then
  echo "→ Liên kết project ref: $PROJECT_REF"
  supabase link --project-ref "$PROJECT_REF"
  echo "→ Link xong. Chạy lại script (không thêm 'link') để deploy."
  exit 0
fi

echo "→ Deploy Edge Function: admin-user (project ref: $PROJECT_REF)"
supabase functions deploy admin-user --no-verify-jwt

echo "→ Xong. Kiểm tra: Dashboard → Edge Functions → admin-user"
echo "  URL: https://${PROJECT_REF}.supabase.co/functions/v1/admin-user"
