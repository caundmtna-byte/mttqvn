import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { txt } from '@/lib/text';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import type { Employee } from '../core/types';
import type { TrangThaiNhanVien } from '../core/constants';

const FORM_ID = 'nhan-vien-status-change-form';

interface Props {
  open: boolean;
  employee: Employee | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (status: TrangThaiNhanVien) => void | Promise<void>;
}

/**
 * Popup giữa màn đổi trạng thái nhân viên (Hoạt động / Khóa).
 * Quy chuẩn: `docs/patterns-detail-status-change.md`
 */
const EmployeeStatusChangeDialog: React.FC<Props> = ({
  open,
  employee,
  isSubmitting = false,
  onClose,
  onSave,
}) => {
  const [status, setStatus] = useState<TrangThaiNhanVien>('Hoạt động');

  useEffect(() => {
    if (!open || !employee) return;
    setStatus(employee.trang_thai);
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await Promise.resolve(onSave(status));
  };

  if (!open || !employee) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.COMPACT}`}
      onClose={onClose}
      title={txt('employee.statusChangeTitle')}
      icon={<RefreshCw size={18} />}
      subtitle={
        <>
          {txt('employee.statusChangeMessage')}{' '}
          <strong className="text-foreground">{employee.ho_va_ten}</strong>
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
        <ToggleSwitch
          checked={status === 'Hoạt động'}
          onChange={(checked) => setStatus(checked ? 'Hoạt động' : 'Khóa')}
          label={txt('common.status')}
          description={
            status === 'Hoạt động'
              ? txt('employee.form.statusSwitchActiveHint')
              : txt('employee.form.statusSwitchLockedHint')
          }
        />
      </form>
    </GenericDrawer>
  );
};

export default EmployeeStatusChangeDialog;
