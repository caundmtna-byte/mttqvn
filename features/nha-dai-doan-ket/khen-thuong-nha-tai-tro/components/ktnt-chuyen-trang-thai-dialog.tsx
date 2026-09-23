import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft, ListChecks, StickyNote } from 'lucide-react';
import { txt } from '@/lib/text';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { ktntTrangThaiChonDuoc } from '../utils/luat-trang-thai';
import {
  khenThuongNhaTaiTroStatusChangeSchema,
  type KhenThuongNhaTaiTroStatusChangeValues,
} from '../core/schema';

const FORM_ID = 'ktnt-chuyen-trang-thai-form';

interface Props {
  open: boolean;
  onClose: () => void;
  initial: KhenThuongNhaTaiTroStatusChangeValues;
  /** Có token `phe_duyet` không — thiếu thì không chọn được Đã duyệt / Không duyệt. */
  canApprove?: boolean;
  isSubmitting?: boolean;
  onSave: (values: KhenThuongNhaTaiTroStatusChangeValues) => void | Promise<void>;
}

/**
 * Popup giữa màn: đổi trạng thái + ghi lý do (`docs/patterns-detail-status-change.md`).
 * Chỉ đổ ra bước chuyển HỢP LỆ theo luật và quyền — bản sao client của trigger
 * `fn_kiem_luat_trang_thai` + `fn_ktnt_kiem_quyen_phe_duyet`; DB vẫn chặn thật.
 */
const KtntChuyenTrangThaiDialog: React.FC<Props> = ({
  open,
  onClose,
  initial,
  canApprove = false,
  isSubmitting = false,
  onSave,
}) => {
  const trangThaiOptions = useMemo(
    () => ktntTrangThaiChonDuoc(initial.trang_thai, canApprove).map((v) => ({ label: v, value: v })),
    [initial.trang_thai, canApprove],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KhenThuongNhaTaiTroStatusChangeValues>({
    resolver: zodResolver(khenThuongNhaTaiTroStatusChangeSchema) as Resolver<KhenThuongNhaTaiTroStatusChangeValues>,
    defaultValues: initial,
  });

  useEffect(() => {
    if (!open) return;
    reset({ trang_thai: initial.trang_thai, ghi_chu: initial.ghi_chu });
  }, [open, initial, reset]);

  const onSubmit: SubmitHandler<KhenThuongNhaTaiTroStatusChangeValues> = async (values) => {
    await Promise.resolve(onSave(values));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.MEDIUM}`}
      onClose={onClose}
      title={txt('khenThuongNhaTaiTro.statusChangeModal.title')}
      icon={<ArrowRightLeft size={18} />}
      subtitle={txt('khenThuongNhaTaiTro.statusChangeModal.subtitle')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit
          compact
          saveLabel={txt('khenThuongNhaTaiTro.statusChangeModal.save')}
          createIcon={<ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection
          title={txt('khenThuongNhaTaiTro.statusChangeModal.section')}
          icon={<ListChecks size={14} />}
          variant="primary"
        >
          <FormGrid>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('khenThuongNhaTaiTro.store.trangThaiCol')}
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.trang_thai?.message}
                  icon={<ListChecks size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('khenThuongNhaTaiTro.statusChangeModal.lyDoLabel')}
                icon={<StickyNote size={12} />}
                {...register('ghi_chu')}
                rows={4}
                placeholder={txt('khenThuongNhaTaiTro.statusChangeModal.lyDoPlaceholder')}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('khenThuongNhaTaiTro.statusChangeModal.hint')}
              </p>
              {!canApprove ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {txt('khenThuongNhaTaiTro.statusChangeModal.noApproveHint')}
                </p>
              ) : null}
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KtntChuyenTrangThaiDialog;
