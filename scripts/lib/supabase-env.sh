#!/usr/bin/env bash
# =============================================================================
# Hàm dùng chung cho các script Supabase: đọc .env.local và tìm project ref.
#
# Dùng bằng cách `source` từ script khác, KHÔNG chạy trực tiếp:
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/supabase-env.sh"
#
# ⚠️ Nguyên tắc: file này CHỈ đọc giá trị ra biến trong bộ nhớ. Tuyệt đối không
#    in mật khẩu / access token ra màn hình và không ghi chúng vào file nào.
# =============================================================================

# Thư mục gốc repo (thư mục cha của scripts/)
MTTQ_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ---------------------------------------------------------------------------
# doc_env_local <TÊN_BIẾN>
#   In ra giá trị của biến trong .env.local (rỗng nếu không có).
#   Không `source` .env.local — tránh chạy phải mã lạ trong file cấu hình.
# ---------------------------------------------------------------------------
doc_env_local() {
  local key="$1"
  local file="$MTTQ_ROOT/.env.local"
  [[ -f "$file" ]] || return 0

  local line
  line="$(grep -m1 -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" || true)"
  [[ -n "$line" ]] || return 0

  # Bỏ phần "export KEY=" ở đầu
  line="${line#*${key}=}"
  # Bỏ nháy đơn / nháy kép bao ngoài
  line="${line%$'\r'}"
  if [[ "$line" == \"*\" ]]; then
    line="${line:1:${#line}-2}"
  elif [[ "$line" == \'*\' ]]; then
    line="${line:1:${#line}-2}"
  fi
  printf '%s' "$line"
}

# ---------------------------------------------------------------------------
# lay_project_ref
#   In ra project ref của Supabase. Thứ tự ưu tiên:
#     1) biến môi trường SUPABASE_PROJECT_REF
#     2) supabase/.temp/project-ref (do `supabase link` sinh ra)
#     3) VITE_SUPABASE_URL trong .env.local  (https://<ref>.supabase.co)
#   Không tìm được thì trả mã lỗi 1 và in hướng dẫn ra stderr.
#
#   Cố ý KHÔNG hard-code project ref trong mã nguồn: repo này công khai được,
#   ref của production không nên nằm sẵn trong git.
# ---------------------------------------------------------------------------
lay_project_ref() {
  if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
    printf '%s' "$SUPABASE_PROJECT_REF"
    return 0
  fi

  local temp_ref="$MTTQ_ROOT/supabase/.temp/project-ref"
  if [[ -s "$temp_ref" ]]; then
    tr -d '[:space:]' < "$temp_ref"
    return 0
  fi

  local url ref
  url="$(doc_env_local VITE_SUPABASE_URL)"
  if [[ -n "$url" ]]; then
    ref="$(printf '%s' "$url" | sed -n 's|^https://\([^.]*\)\.supabase\.co.*|\1|p')"
    if [[ -n "$ref" ]]; then
      printf '%s' "$ref"
      return 0
    fi
  fi

  cat >&2 <<'HD'
✗ Không xác định được project ref của Supabase. Làm một trong các cách sau:
    export SUPABASE_PROJECT_REF="<project_ref>"
  hoặc chạy `supabase link --project-ref <project_ref>` (sinh supabase/.temp/project-ref)
  hoặc đặt VITE_SUPABASE_URL=https://<project_ref>.supabase.co trong .env.local
HD
  return 1
}
