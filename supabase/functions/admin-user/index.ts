// Supabase Edge Function: admin-user
// Quản trị tài khoản Supabase Auth (chỉ admin app gọi). Yêu cầu service_role
// (đã có sẵn trong runtime). Chấp nhận JSON body { action, username, password? }.
// Trả JSON: 200 OK / 4xx kèm `{ error }`.
//
// Triển khai:
//   supabase functions deploy admin-user --no-verify-jwt
//   (hoặc [functions.admin-user] verify_jwt = false trong supabase/config.toml)
//
// Lý do tắt verify JWT ở gateway: CORS preflight gửi OPTIONS không có JWT hợp lệ;
// nếu gateway bật verify_jwt → 401 trước khi vào Deno → trình duyệt báo lỗi CORS.
// POST vẫn bắt buộc Bearer token và được kiểm tra bên dưới (callerClient.auth.getUser).
//
// Bảo mật:
// - Header `Authorization: Bearer <user_jwt>` bắt buộc; Edge Function tự xác
//   thực JWT bằng SUPABASE_ANON_KEY và đối chiếu với bảng `var_nhan_vien`.
// - Caller phải có dòng nhân viên trùng email + `trang_thai = 'Hoạt động'`.

// @ts-expect-error Deno runtime resolves remote modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// @ts-expect-error Deno global only available in edge runtime
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-expect-error Deno global only available in edge runtime
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
// @ts-expect-error Deno global only available in edge runtime
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const EMAIL_SUFFIX = '@gmail.com';
const DEFAULT_PASSWORD = '123456';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type Action = 'check' | 'create' | 'reset_password' | 'delete';

interface RequestBody {
  action: Action;
  username: string;
  password?: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function buildEmail(username: string): string {
  return `${username.trim().toLowerCase()}${EMAIL_SUFFIX}`;
}

async function findAuthUserIdByEmail(adminClient: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  // listUsers chưa có filter email phía server -> phải duyệt phân trang.
  const perPage = 1000;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) break;
  }
  return null;
}

// @ts-expect-error Deno runtime resolves remote modules
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: 'Edge Function chưa được cấu hình env Supabase' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return jsonResponse(401, { error: 'Thiếu Authorization header' });
  }

  // 1) Xác thực caller bằng anon client + JWT
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();
  if (callerError || !caller?.email) {
    return jsonResponse(401, { error: 'JWT không hợp lệ' });
  }

  // 2) Đối chiếu caller với var_nhan_vien (trang_thai = 'Hoạt động')
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const callerLogin = caller.email.split('@')[0]?.toLowerCase() ?? '';
  const { data: callerEmp, error: callerEmpError } = await adminClient
    .from('var_nhan_vien')
    .select('ten_tai_khoan, trang_thai')
    .ilike('ten_tai_khoan', callerLogin)
    .maybeSingle();
  if (callerEmpError) {
    return jsonResponse(500, { error: callerEmpError.message });
  }
  if (!callerEmp || callerEmp.trang_thai !== 'Hoạt động') {
    return jsonResponse(403, { error: 'Tài khoản không có quyền quản trị' });
  }

  // 3) Parse + thực thi action
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(400, { error: 'Body JSON không hợp lệ' });
  }
  const { action, username } = body;
  if (!action || !username || typeof username !== 'string') {
    return jsonResponse(400, { error: 'Thiếu `action` hoặc `username`' });
  }
  const email = buildEmail(username);
  const password = body.password && body.password.length >= 6 ? body.password : DEFAULT_PASSWORD;

  try {
    if (action === 'check') {
      const id = await findAuthUserIdByEmail(adminClient, email);
      return jsonResponse(200, { exists: id !== null, user_id: id ?? undefined });
    }

    if (action === 'create') {
      const existing = await findAuthUserIdByEmail(adminClient, email);
      if (existing) {
        return jsonResponse(409, { error: 'Email Auth đã tồn tại', user_id: existing });
      }
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: username },
      });
      if (error) return jsonResponse(400, { error: error.message });
      return jsonResponse(200, { user_id: data.user?.id });
    }

    if (action === 'reset_password') {
      const id = await findAuthUserIdByEmail(adminClient, email);
      if (!id) return jsonResponse(404, { error: 'Không tìm thấy user Auth' });
      const { error } = await adminClient.auth.admin.updateUserById(id, { password });
      if (error) return jsonResponse(400, { error: error.message });
      return jsonResponse(200, { user_id: id });
    }

    if (action === 'delete') {
      const id = await findAuthUserIdByEmail(adminClient, email);
      if (!id) return jsonResponse(200, { deleted: false });
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (error) return jsonResponse(400, { error: error.message });
      return jsonResponse(200, { deleted: true, user_id: id });
    }

    return jsonResponse(400, { error: `Action không hợp lệ: ${action}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return jsonResponse(500, { error: message });
  }
});
