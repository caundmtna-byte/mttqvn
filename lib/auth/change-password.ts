import { getSupabase } from '@/lib/supabase/client';
import { txt } from '@/lib/text';

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ChangePasswordValidationError =
  | 'currentRequired'
  | 'newMin'
  | 'confirmMismatch';

/** Kiểm tra form đổi mật khẩu — trả mã lỗi hoặc null nếu hợp lệ. */
export function validateChangePasswordForm(
  input: ChangePasswordInput,
): ChangePasswordValidationError | null {
  if (!input.currentPassword.trim()) return 'currentRequired';
  if (input.newPassword.length < 6) return 'newMin';
  if (input.newPassword !== input.confirmPassword) return 'confirmMismatch';
  return null;
}

export function changePasswordValidationMessage(code: ChangePasswordValidationError): string {
  switch (code) {
    case 'currentRequired':
      return txt('nav.changePassword.errorCurrentRequired');
    case 'newMin':
      return txt('nav.changePassword.errorNewMin');
    case 'confirmMismatch':
      return txt('nav.changePassword.errorConfirmMismatch');
  }
}

/**
 * Đổi mật khẩu tài khoản đang đăng nhập.
 * Xác minh mật khẩu cũ bằng `signInWithPassword`, sau đó `updateUser`.
 */
export async function changeUserPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: txt('nav.changePassword.errorNotConfigured') };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return { error: txt('nav.changePassword.errorSession') };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: txt('nav.changePassword.errorWrongCurrent') };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { error: updateError.message || txt('nav.changePassword.errorGeneric') };
  }

  return {};
}
