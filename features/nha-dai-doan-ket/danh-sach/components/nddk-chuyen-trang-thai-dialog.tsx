import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft, Calendar, FileSignature, ListChecks, StickyNote } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { NDDK_TRANG_THAI_VALUES } from '../core/constants';
import { nddkTruongBatBuoc, type NddkTruongBatBuoc } from '../core/luat-truong-bat-buoc';
import {
  nhaDaiDoanKetStatusChangeSchema,
  type NhaDaiDoanKetStatusChangeValues,
} from '../core/schema';

const FORM_ID = 'nddk-chuyen-trang-thai-form';

const O_BAT_BUOC: Record<NddkTruongBatBuoc, { label: string; type: 'date' | 'text' }> = {
  ngay_khao_sat: { label: 'nhaDaiDoanKet.bienBan.ngayKhaoSat', type: 'date' },
  ngay_kiem_tra_hoan_thanh: { label: 'nhaDaiDoanKet.bienBan.ngayKiemTra', type: 'date' },
  ngay_ban_giao: { label: 'nhaDaiDoanKet.bienBan.ngayBanGiao', type: 'date' },
  so_quyet_dinh: { label: 'nhaDaiDoanKet.bienBan.soQuyetDinh', type: 'text' },
  ngay_quyet_dinh: { label: 'nhaDaiDoanKet.bienBan.ngayQuyetDinh', type: 'date' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  initial: NhaDaiDoanKetStatusChangeValues;
  isSubmitting?: boolean;
  onSave: (values: NhaDaiDoanKetStatusChangeValues) => void | Promise<void>;
}

/**
 * Popup giữa màn: đổi trạng thái + ghi lý do.
 *
 * Quy chuẩn `docs/patterns-detail-status-change.md` — `GenericDrawer` +
 * `variant="modal"`, KHÔNG dùng drawer trượt từ phải cho luồng này.
 */
const NddkChuyenTrangThaiDialog: React.FC<Props> = ({
  open,
  onClose,
  initial,
  isSubmitting = false,
  onSave,
}) => {
  // Không có luật chuyển cứng (xem CLAUDE.md) và không trạng thái nào đòi quyền Duyệt.
  const trangThaiOptions = useMemo(
    () => NDDK_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NhaDaiDoanKetStatusChangeValues>({
    resolver: zodResolver(
      nhaDaiDoanKetStatusChangeSchema,
    ) as Resolver<NhaDaiDoanKetStatusChangeValues>,
    defaultValues: initial,
  });

  useEffect(() => {
    if (!open) return;
    reset(initial);
  }, [open, initial, reset]);

  // Ô bắt buộc của trạng thái đang chọn (điền sẵn giá trị hiện có của hồ sơ).
  const truongBatBuoc = nddkTruongBatBuoc(watch('trang_thai'), initial.nguon_ho_tro);

  const onSubmit: SubmitHandler<NhaDaiDoanKetStatusChangeValues> = async (values) => {
    await Promise.resolve(onSave(values));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.MEDIUM}`}
      onClose={onClose}
      title={txt('nhaDaiDoanKet.statusChangeModal.title')}
      icon={<ArrowRightLeft size={18} />}
      subtitle={txt('nhaDaiDoanKet.statusChangeModal.subtitle')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit
          compact
          saveLabel={txt('nhaDaiDoanKet.statusChangeModal.save')}
          createIcon={<ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection
          title={txt('nhaDaiDoanKet.statusChangeModal.section')}
          icon={<ListChecks size={14} />}
          variant="primary"
        >
          <FormGrid>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('nhaDaiDoanKet.store.trangThaiCol')}
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
                label={txt('nhaDaiDoanKet.statusChangeModal.lyDoLabel')}
                icon={<StickyNote size={12} />}
                {...register('ghi_chu')}
                rows={4}
                placeholder={txt('nhaDaiDoanKet.statusChangeModal.lyDoPlaceholder')}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('nhaDaiDoanKet.statusChangeModal.hint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>
        {truongBatBuoc.length > 0 ? (
          <FormSection
            title={txt('nhaDaiDoanKet.statusChangeModal.sectionBatBuoc')}
            icon={<Calendar size={14} />}
          >
            <FormGrid cols={2}>
              {truongBatBuoc.map((k) => (
                <Input
                  key={k}
                  label={txt(O_BAT_BUOC[k].label)}
                  type={O_BAT_BUOC[k].type}
                  icon={O_BAT_BUOC[k].type === 'date' ? Calendar : FileSignature}
                  required
                  {...register(k)}
                  error={errors[k]?.message}
                />
              ))}
            </FormGrid>
          </FormSection>
        ) : null}
      </form>
    </GenericDrawer>
  );
};

export default NddkChuyenTrangThaiDialog;
