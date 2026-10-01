#!/usr/bin/env bash
# =============================================================================
# Chụp CẤU TRÚC database (schema `public`, không dữ liệu) ra `supabase/schema.sql`.
#
# Dùng:  npm run db:schema
#
# Migration cũ đã xoá khỏi repo (2026-10-01); file này là bản mô tả DB thật duy
# nhất trong repo. Test đối chiếu luật client ↔ CHECK / trigger dưới DB đọc nó,
# nên MỖI LẦN ĐỔI DB thì chạy lại lệnh này rồi commit kèm.
#
# Kết nối: SUPABASE_DB_HOST / SUPABASE_DB_PORT / SUPABASE_DB_USER / SUPABASE_DB_NAME
# và SUPABASE_DB_PASSWORD đọc từ biến môi trường hoặc .env.local. Mật khẩu chỉ đi
# qua PGPASSWORD, không in ra màn hình.
#
# Script này CHỈ ĐỌC database.
# =============================================================================
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/supabase-env.sh"

lay() { local v="${!1:-}"; [[ -n "$v" ]] && printf '%s' "$v" || doc_env_local "$1"; }

DB_HOST="$(lay SUPABASE_DB_HOST)"
DB_PORT="$(lay SUPABASE_DB_PORT)"
DB_USER="$(lay SUPABASE_DB_USER)"
DB_NAME="$(lay SUPABASE_DB_NAME)"
MAT_KHAU="$(lay SUPABASE_DB_PASSWORD)"

if [[ -z "$DB_HOST" || -z "$DB_USER" || -z "$MAT_KHAU" ]]; then
  echo "✗ Thiếu SUPABASE_DB_HOST / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD (biến môi trường hoặc .env.local)." >&2
  exit 1
fi

OUT="$MTTQ_ROOT/supabase/schema.sql"
TAM="${OUT}.dang-ghi"
trap '[[ -f "$TAM" ]] && rm -f "$TAM"' EXIT

export PGPASSWORD="$MAT_KHAU"
unset MAT_KHAU
pg_dump --schema-only --schema=public --no-owner --format=plain --file="$TAM" \
  "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-postgres}?sslmode=require"

if ! tail -5 "$TAM" | grep -q 'PostgreSQL database dump complete'; then
  echo "✗ Dump bị cắt dở — giữ nguyên file cũ." >&2
  exit 1
fi

# pg_dump 17.6+/18 chèn `\restrict <khoá ngẫu nhiên>` — đổi mỗi lần chạy, làm diff
# git nhiễu vô ích. Bỏ đi; file chỉ để đọc / đối chiếu.
grep -vE '^\\(un)?restrict ' "$TAM" > "$OUT"
rm -f "$TAM"
echo "✓ Đã ghi $(wc -l < "$OUT" | tr -d ' ') dòng vào supabase/schema.sql"
