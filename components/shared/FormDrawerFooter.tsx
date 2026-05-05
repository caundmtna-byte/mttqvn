import React from 'react';
import { Save, ArrowRight, UserPlus } from 'lucide-react';
import Button from '../ui/Button';
import { BTN_CANCEL, BTN_SAVE, BTN_CREATE } from '../../lib/button-labels';

export interface FormDrawerFooterProps {
  /** Id của form để submit từ ngoài (nút Lưu/Tạo gửi submit cho form này) */
  formId: string;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  /** Nút gọn (h-8, text-xs, shadow-sm) — dùng cùng `footerCompact` trên GenericDrawer */
  compact?: boolean;
  /** Nhãn nút Lưu khi sửa (mặc định BTN_SAVE) */
  saveLabel?: string;
  /** Nhãn nút Tạo khi thêm mới (mặc định BTN_CREATE) */
  createLabel?: string;
  /** Nhãn nút Hủy (mặc định BTN_CANCEL) */
  cancelLabel?: string;
  /** Icon bên trái nút gửi khi **tạo mới** (mặc định UserPlus); nhãn nút lấy `BTN_CREATE` → **Thêm** */
  createIcon?: React.ReactNode;
}

/**
 * Footer form drawer: Hủy (trái), Lưu / Thêm (phải) — `lib/button-labels.ts`, `docs/patterns-button-labels.md`.
 */
export const FormDrawerFooter: React.FC<FormDrawerFooterProps> = ({
  formId,
  onCancel,
  isLoading = false,
  isEdit = false,
  compact = false,
  saveLabel,
  createLabel,
  cancelLabel,
  createIcon,
}) => {
  const resolvedCancel = cancelLabel ?? BTN_CANCEL();
  const resolvedSave = saveLabel ?? BTN_SAVE();
  const resolvedCreate = createLabel ?? BTN_CREATE();
  const resolvedCreateIcon = createIcon ?? <UserPlus className="mr-2 h-4 w-4" />;
  const resolvedCreateIconCompact = createIcon ?? <UserPlus className="w-3.5 h-3.5 mr-1.5 shrink-0" />;

  if (compact) {
    return (
      <div className="flex items-center justify-between w-full gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="h-8 px-3 text-xs border-border text-muted-foreground"
        >
          {resolvedCancel}
        </Button>
        <Button
          type="submit"
          form={formId}
          size="sm"
          isLoading={isLoading}
          className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
        >
          {isEdit ? (
            <>
              <Save className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {resolvedSave}
            </>
          ) : (
            <>
              {resolvedCreateIconCompact}
              {resolvedCreate}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full gap-3">
      <Button variant="outline" onClick={onCancel} className="border-border text-muted-foreground">
        {resolvedCancel}
      </Button>
      <Button type="submit" form={formId} isLoading={isLoading} className="bg-primary text-white shadow-lg">
        {isEdit ? (
          <>
            <Save className="mr-2 h-4 w-4" /> {resolvedSave}
          </>
        ) : (
          <>
            {resolvedCreateIcon} {resolvedCreate} <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default FormDrawerFooter;
