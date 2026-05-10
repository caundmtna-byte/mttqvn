import React, { lazy, Suspense, useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Combobox from '@/components/ui/Combobox';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';

const MttqCanBoForm = lazy(() => import('./mttq-can-bo-form'));

const FormLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div
      className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"
      aria-hidden
    />
  </div>
);

export type CanBoComboboxProps = Omit<React.ComponentProps<typeof Combobox>, 'dropdownListTop'> & {
  /** Drawer form cán bộ: stack = drawer cha + 1 (mặc định 0 khi mở từ trang không xếp chồng). */
  createFormStackLevel?: number;
};

/**
 * Combobox chọn cán bộ + hàng « Thêm cán bộ mới » mở drawer tạo (quyền `create` + hồ sơ nhân viên).
 */
const CanBoCombobox: React.FC<CanBoComboboxProps> = ({
  createFormStackLevel = 0,
  disabled,
  onChange,
  ...rest
}) => {
  const canCreate = useCan('create', 'matTranOfficerList');
  const nhanVienId = String(useAuthStore((s) => s.user?.nhan_vien_id) ?? '').trim();
  const [showCreate, setShowCreate] = useState(false);

  const openCreate = useCallback(
    (close: () => void) => {
      close();
      if (!nhanVienId) {
        toast.error(txt('matTranCanBo.service.noEmployeeProfile'));
        return;
      }
      setShowCreate(true);
    },
    [nhanVienId],
  );

  const dropdownListTop =
    canCreate && !disabled
      ? ({ close }: { close: () => void }) => (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openCreate(close);
            }}
          >
            <Plus size={16} className="shrink-0" aria-hidden />
            {txt('matTranCanBo.comboboxAddNew')}
          </button>
        )
      : undefined;

  return (
    <>
      <Combobox {...rest} disabled={disabled} onChange={onChange} dropdownListTop={dropdownListTop} />
      {showCreate ? (
        <Suspense fallback={<FormLazyFallback />}>
          <MttqCanBoForm
            initialData={null}
            stackLevel={createFormStackLevel}
            onClose={() => setShowCreate(false)}
            onCreateSuccess={(created) => {
              onChange(String(created.id));
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
};

export default CanBoCombobox;
