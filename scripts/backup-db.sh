#!/usr/bin/env bash
# =============================================================================
# Sao lưu cơ sở dữ liệu MTTQVN bằng pg_dump (schema `public`).
#
# Dùng:
#   npm run db:backup                      # mặc định: giữ 14 ngày, tối thiểu 5 bản
#   ./scripts/backup-db.sh
#   ./scripts/backup-db.sh --giu-ngay 30 --giu-toi-thieu 10
#   ./scripts/backup-db.sh --thu-muc /Volumes/USB/mttqvn-backups
#   ./scripts/backup-db.sh --cho-staging  # dump không kèm owner/quyền, để nạp sang project khác
#
# Thông tin kết nối — KHÔNG có giá trị thật nào nằm trong repo:
#   · SUPABASE_DB_URL       — chuỗi kết nối đầy đủ (nếu có thì dùng luôn, bỏ qua phần dưới)
#   · SUPABASE_DB_PASSWORD  — mật khẩu database, đọc từ biến môi trường hoặc .env.local
#   · SUPABASE_DB_HOST / SUPABASE_DB_PORT / SUPABASE_DB_USER / SUPABASE_DB_NAME — tuỳ chọn,
#     thiếu thì suy ra từ supabase/.temp/pooler-url, cuối cùng là db.<ref>.supabase.co:5432
#   · project ref lấy theo SUPABASE_PROJECT_REF → supabase/.temp/project-ref → VITE_SUPABASE_URL
#
#   `.env.local` KHÔNG được commit (.gitignore đã chặn). Mật khẩu truyền cho pg_dump
#   qua biến PGPASSWORD, không đặt trong tham số dòng lệnh (tránh lộ qua `ps`).
#
# Nơi lưu: MẶC ĐỊNH ~/Desktop/mttqvn-db-backups — NGOÀI repo. File dump chứa dữ liệu
#          thật của cán bộ: không đưa vào git, không chia sẻ ngoài phạm vi quản trị.
#
# Script này CHỈ ĐỌC database (pg_dump). Không ghi, không đổi schema.
# =============================================================================
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/supabase-env.sh"

# ---------------------------------------------------------------------------
# Tham số
# ---------------------------------------------------------------------------
THU_MUC="${MTTQ_BACKUP_DIR:-$HOME/Desktop/mttqvn-db-backups}"
GIU_NGAY=14          # xoá bản cũ hơn ngần này ngày
GIU_TOI_THIEU=5      # nhưng luôn giữ lại ngần này bản mới nhất
CHO_STAGING=0
SCHEMA="public"

# In khối chú thích đầu file (từ sau dòng '# ===' mở đầu tới dòng '# ===' đóng).
in_huong_dan() {
  awk 'NR<3 {next} /^# ={10,}/ {exit} {sub(/^# ?/, ""); print}' "${BASH_SOURCE[0]}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --thu-muc)        THU_MUC="${2:?thiếu đường dẫn sau --thu-muc}"; shift 2 ;;
    --giu-ngay)       GIU_NGAY="${2:?thiếu số sau --giu-ngay}"; shift 2 ;;
    --giu-toi-thieu)  GIU_TOI_THIEU="${2:?thiếu số sau --giu-toi-thieu}"; shift 2 ;;
    --cho-staging)    CHO_STAGING=1; shift ;;
    -h|--help)        in_huong_dan; exit 0 ;;
    *) echo "✗ Tham số không hiểu: $1 (xem --help)" >&2; exit 2 ;;
  esac
done

if ! [[ "$GIU_NGAY" =~ ^[0-9]+$ ]] || ! [[ "$GIU_TOI_THIEU" =~ ^[0-9]+$ ]]; then
  echo "✗ --giu-ngay và --giu-toi-thieu phải là số nguyên không âm." >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Kiểm tra công cụ
# ---------------------------------------------------------------------------
if ! command -v pg_dump >/dev/null 2>&1; then
  cat >&2 <<'HD'
✗ Không tìm thấy lệnh `pg_dump`. Cài PostgreSQL client rồi chạy lại:
    macOS:  brew install libpq && brew link --force libpq
            (hoặc brew install postgresql@17)
HD
  exit 1
fi

# ---------------------------------------------------------------------------
# Dựng thông tin kết nối
# ---------------------------------------------------------------------------
DB_URL="${SUPABASE_DB_URL:-$(doc_env_local SUPABASE_DB_URL)}"

if [[ -z "$DB_URL" ]]; then
  MAT_KHAU="${SUPABASE_DB_PASSWORD:-$(doc_env_local SUPABASE_DB_PASSWORD)}"
  if [[ -z "$MAT_KHAU" ]]; then
    cat >&2 <<'HD'
✗ Thiếu mật khẩu database. Đặt một trong hai:
    export SUPABASE_DB_PASSWORD="..."           # trong shell, không ghi vào file repo
  hoặc thêm dòng SUPABASE_DB_PASSWORD=... vào .env.local (file này đã bị .gitignore chặn).
  Lấy mật khẩu ở: Supabase Dashboard → Project Settings → Database → Database password.
HD
    exit 1
  fi

  DB_HOST="${SUPABASE_DB_HOST:-}"
  DB_PORT="${SUPABASE_DB_PORT:-}"
  DB_USER="${SUPABASE_DB_USER:-}"
  DB_NAME="${SUPABASE_DB_NAME:-postgres}"

  # Suy ra từ pooler-url do `supabase link` sinh (không chứa mật khẩu).
  POOLER="$MTTQ_ROOT/supabase/.temp/pooler-url"
  if [[ -z "$DB_HOST" && -s "$POOLER" ]]; then
    POOLER_URL="$(tr -d '[:space:]' < "$POOLER")"
    DB_USER="${DB_USER:-$(printf '%s' "$POOLER_URL" | sed -n 's|^postgresql://\([^:@/]*\)[:@].*|\1|p')}"
    DB_HOST="$(printf '%s' "$POOLER_URL" | sed -n 's|^postgresql://[^@]*@\([^:/]*\).*|\1|p')"
    DB_PORT="${DB_PORT:-$(printf '%s' "$POOLER_URL" | sed -n 's|^postgresql://[^@]*@[^:]*:\([0-9]*\).*|\1|p')}"
  fi

  if [[ -z "$DB_HOST" ]]; then
    REF="$(lay_project_ref)" || exit 1
    DB_HOST="db.${REF}.supabase.co"
    DB_USER="${DB_USER:-postgres}"
  fi
  DB_PORT="${DB_PORT:-5432}"
  DB_USER="${DB_USER:-postgres}"

  DB_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  export PGPASSWORD="$MAT_KHAU"
  unset MAT_KHAU
fi

# Chuỗi an toàn để in ra màn hình (che mật khẩu nếu người dùng truyền SUPABASE_DB_URL).
DB_URL_HIEN_THI="$(printf '%s' "$DB_URL" | sed -E 's#://([^:@/]+):[^@]*@#://\1:***@#')"

# ---------------------------------------------------------------------------
# Chạy dump
# ---------------------------------------------------------------------------
mkdir -p "$THU_MUC"
if [[ ! -w "$THU_MUC" ]]; then
  echo "✗ Không ghi được vào thư mục sao lưu: $THU_MUC" >&2
  exit 1
fi

DAU_THOI_GIAN="$(date +%Y%m%d-%H%M%S)"
FILE="$THU_MUC/mttqvn-${DAU_THOI_GIAN}.sql"
FILE_TAM="${FILE}.dang-ghi"

PG_DUMP_ARGS=(--schema="$SCHEMA" --format=plain)
if [[ "$CHO_STAGING" -eq 1 ]]; then
  # Nạp sang project Supabase khác: bỏ owner và GRANT để không vướng role không tồn tại.
  PG_DUMP_ARGS+=(--no-owner --no-privileges)
fi

echo "→ Sao lưu schema '$SCHEMA' từ: $DB_URL_HIEN_THI"
echo "  Ghi ra: $FILE"

don_dep_tam() { [[ -f "$FILE_TAM" ]] && rm -f "$FILE_TAM"; }
trap don_dep_tam EXIT

if ! pg_dump "${PG_DUMP_ARGS[@]}" --file="$FILE_TAM" "$DB_URL"; then
  echo "✗ pg_dump thất bại — KHÔNG có bản sao lưu nào được tạo." >&2
  echo "  Kiểm tra: mật khẩu, kết nối mạng, và host/port ở trên." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Kiểm tra file dump trước khi coi là thành công
# ---------------------------------------------------------------------------
if [[ ! -s "$FILE_TAM" ]]; then
  echo "✗ File dump rỗng — coi như THẤT BẠI." >&2
  exit 1
fi

KICH_THUOC="$(wc -c < "$FILE_TAM" | tr -d ' ')"
if [[ "$KICH_THUOC" -lt 1024 ]]; then
  echo "✗ File dump chỉ $KICH_THUOC byte — quá nhỏ, coi như THẤT BẠI." >&2
  exit 1
fi

# pg_dump ghi dòng kết ở cuối file khi chạy trọn vẹn; thiếu nó là dump bị cắt giữa chừng.
if ! tail -5 "$FILE_TAM" | grep -q 'PostgreSQL database dump complete'; then
  echo "✗ Không thấy dòng kết 'PostgreSQL database dump complete' — dump bị cắt dở, coi như THẤT BẠI." >&2
  exit 1
fi

SO_BANG="$(grep -c '^CREATE TABLE ' "$FILE_TAM" || true)"
if [[ "$SO_BANG" -eq 0 ]]; then
  echo "✗ Dump không chứa CREATE TABLE nào — sai schema hoặc sai database, coi như THẤT BẠI." >&2
  exit 1
fi

mv "$FILE_TAM" "$FILE"
trap - EXIT

KICH_THUOC_DOC="$(du -h "$FILE" | cut -f1 | tr -d ' ')"
echo "✓ Sao lưu xong: $FILE"
echo "  Dung lượng: $KICH_THUOC_DOC · số bảng: $SO_BANG"

# ---------------------------------------------------------------------------
# Dọn bản cũ — luôn giữ lại $GIU_TOI_THIEU bản mới nhất, kể cả khi chúng đã quá hạn
# ---------------------------------------------------------------------------
DA_XOA=0
if [[ "$GIU_NGAY" -gt 0 ]]; then
  # Duyệt danh sách bản sao lưu theo thứ tự MỚI NHẤT TRƯỚC; bỏ qua $GIU_TOI_THIEU
  # bản đầu tiên (luôn giữ), chỉ xét xoá từ bản thứ $GIU_TOI_THIEU + 1 trở đi.
  # Không dùng mảng/`mapfile` để chạy được cả trên bash 3.2 mặc định của macOS.
  #
  # CHỈ đụng vào file do script này sinh: đúng khuôn mttqvn-<8 số>-<6 số>.sql.
  # Bản dump đặt tay có hậu tố (…-truoc-restore.sql, …-truoc-migration.sql) là mốc
  # người vận hành cố ý giữ ⇒ không bao giờ tự xoá.
  STT=0
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    [[ "$(basename "$f")" =~ ^mttqvn-[0-9]{8}-[0-9]{6}\.sql$ ]] || continue
    STT=$((STT + 1))
    [[ "$STT" -le "$GIU_TOI_THIEU" ]] && continue
    # -mtime +N: cũ hơn N ngày
    if [[ -n "$(find "$f" -maxdepth 0 -mtime "+${GIU_NGAY}" 2>/dev/null)" ]]; then
      rm -f "$f"
      echo "  · đã xoá bản quá $GIU_NGAY ngày: $(basename "$f")"
      DA_XOA=$((DA_XOA + 1))
    fi
  done < <(ls -t "$THU_MUC"/mttqvn-*.sql 2>/dev/null || true)
fi

CON_LAI="$(ls -1 "$THU_MUC"/mttqvn-*.sql 2>/dev/null | wc -l | tr -d ' ')"
echo "  Dọn dẹp: xoá $DA_XOA bản (giữ tối thiểu $GIU_TOI_THIEU bản mới nhất) · còn $CON_LAI bản trong $THU_MUC"
echo "→ Xong."
