import React, { useEffect, useState } from 'react';
import { KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { txt } from '@/lib/text';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { cn } from '@/lib/utils';
import type { Employee } from '../core/types';
import { kiemTraMatKhauQuanTri, type LoiMatKhauQuanTri } from '../utils/mat-khau-quan-tri';

const FORM_ID = 'nhan-vien-doi-mat-khau-form';

const INPUT_CLASS =
  'flex h-10 w-full rounded-lg border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const THONG_BAO_LOI: Record<LoiMatKhauQuanTri, () => string> = {
  trong: () => txt('employee.resetPassword.errorTrong'),
  quaNgan: () => txt('employee.resetPassword.errorQuaNgan'),
  khongKhop: () => txt('employee.resetPassword.errorKhongKhop'),
  coKhoangTrang: () => txt('employee.resetPassword.errorCoKhoangTrang'),
};

interface Props {
  employee: Employee;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (password: string) => void | Promise<void>;
}

/**
 * Hộp thoại quản trị viên đặt mật khẩu mới cho tài khoản của NGƯỜI KHÁC.
 *
 * Chỉ mở khi {@link useCanResetEmployeePassword} cho phép; Edge Function
 * `admin-user` vẫn kiểm quyền lần nữa ở máy chủ.
 */
const EmployeeResetPasswordDialog: React.FC<Props> = ({
  employee,
  isSubmitting = false,
  onClose,
  onSave,
}) => {
  const [matKhau, setMatKhau] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [hien, setHien] = useState({ matKhau: false, xacNhan: false });
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    setMatKhau('');
    setXacNhan('');
    setLoi(null);
  }, [employee.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ma = kiemTraMatKhauQuanTri({ matKhau, xacNhan });
    if (ma) {
      setLoi(THONG_BAO_LOI[ma]());
      return;
    }
    setLoi(null);
    await Promise.resolve(onSave(matKhau));
  };

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.COMPACT}`}
      onClose={onClose}
      title={txt('employee.resetPassword.title')}
      icon={<KeyRound size={18} />}
      subtitle={
        <>
          {txt('employee.resetPassword.subtitle')}{' '}
          <strong className="text-foreground">{employee.ten_tai_khoan}</strong>
          {' — '}
          {employee.ho_va_ten}
        </>
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit
          compact
          saveLabel={txt('common.confirm')}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{txt('employee.resetPassword.warning')}</span>
        </div>

        {loi && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {loi}
          </div>
        )}

        <div>
          <label
            htmlFor="nhan-vien-mat-khau-moi"
            className="text-sm font-medium text-foreground block mb-1.5"
          >
            {txt('employee.resetPassword.newPassword')}
          </label>
          <div className="relative">
            <input
              id="nhan-vien-mat-khau-moi"
              type={hien.matKhau ? 'text' : 'password'}
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              placeholder={txt('employee.resetPassword.placeholder')}
              autoComplete="new-password"
              autoFocus
              className={cn(INPUT_CLASS)}
            />
            <button
              type="button"
              onClick={() => setHien((s) => ({ ...s, matKhau: !s.matKhau }))}
              aria-label={
                hien.matKhau
                  ? txt('employee.resetPassword.hidePassword')
                  : txt('employee.resetPassword.showPassword')
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
            >
              {hien.matKhau ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="nhan-vien-mat-khau-xac-nhan"
            className="text-sm font-medium text-foreground block mb-1.5"
          >
            {txt('employee.resetPassword.confirmPassword')}
          </label>
          <div className="relative">
            <input
              id="nhan-vien-mat-khau-xac-nhan"
              type={hien.xacNhan ? 'text' : 'password'}
              value={xacNhan}
              onChange={(e) => setXacNhan(e.target.value)}
              placeholder={txt('employee.resetPassword.placeholder')}
              autoComplete="new-password"
              className={cn(INPUT_CLASS)}
            />
            <button
              type="button"
              onClick={() => setHien((s) => ({ ...s, xacNhan: !s.xacNhan }))}
              aria-label={
                hien.xacNhan
                  ? txt('employee.resetPassword.hidePassword')
                  : txt('employee.resetPassword.showPassword')
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
            >
              {hien.xacNhan ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {txt('employee.resetPassword.hint')}
        </p>
      </form>
    </GenericDrawer>
  );
};

export default EmployeeResetPasswordDialog;
