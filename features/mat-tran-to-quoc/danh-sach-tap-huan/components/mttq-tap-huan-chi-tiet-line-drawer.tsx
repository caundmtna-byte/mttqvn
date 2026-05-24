import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Building2, Layers, ListChecks, UserCircle, Users } from 'lucide-react';
import { txt } from '@/lib/text';
import Combobox from '@/components/ui/Combobox';
import CanBoCombobox from '@/features/mat-tran-to-quoc/danh-sach-can-bo/components/can-bo-combobox';
import Input from '@/components/ui/Input';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DRAWER_WIDTH_STACKED } from '@/lib/dialog-sizes';
import {
  mttqTapHuanChiTietLineSchema,
  type MttqTapHuanChiTietLineFormValues,
} from '../core/schema';
import type { TapHuanCanBoThreeColDisplay } from '../utils/snapshot-from-can-bo';

const EMPTY_LINE: MttqTapHuanChiTietLineFormValues = {
  id: undefined,
  can_bo_id: '',
  thuoc_dien: 'Biên chế',
};

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  /** Giá trị ban đầu khi mở drawer (đồng bộ khi `open` bật). */
  initialLine: MttqTapHuanChiTietLineFormValues;
  canBoOptions: { label: string; value: string }[];
  thuocDienOpts: { label: string; value: string }[];
  /** Tổ chức / phòng ban / chức vụ từ Danh sách cán bộ (chỉ hiển thị, không ghi DB). */
  resolveFromCanBo: (canBoId: string) => TapHuanCanBoThreeColDisplay;
  /** Trả về Promise khi cần đợi ghi DB trước khi đóng drawer (vd. lưu từ màn detail). */
  onSave: (values: MttqTapHuanChiTietLineFormValues) => void | Promise<void>;
  /** Đang ghi DB (vd. cập nhật từ drawer detail). */
  isSubmitting?: boolean;
  /** Mặc định 1 — drawer mở trên drawer cha (form/detail). */
  stackLevel?: number;
}

const FORM_ID = 'mttq-tap-huan-chi-tiet-line-form';

const MttqTapHuanChiTietLineDrawer: React.FC<Props> = ({
  open,
  onClose,
  mode,
  initialLine,
  canBoOptions,
  thuocDienOpts,
  resolveFromCanBo,
  onSave,
  isSubmitting = false,
  stackLevel = 1,
}) => {
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MttqTapHuanChiTietLineFormValues>({
    resolver: zodResolver(mttqTapHuanChiTietLineSchema) as Resolver<MttqTapHuanChiTietLineFormValues>,
    defaultValues: EMPTY_LINE,
  });

  const watchedCanBoId = useWatch({ control, name: 'can_bo_id' });
  const displaySnap = useMemo(
    () => resolveFromCanBo(String(watchedCanBoId ?? '').trim()),
    [watchedCanBoId, resolveFromCanBo],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      ...EMPTY_LINE,
      ...initialLine,
      id: initialLine.id,
      can_bo_id: initialLine.can_bo_id ?? '',
      thuoc_dien: initialLine.thuoc_dien ?? 'Biên chế',
    });
  }, [open, initialLine, reset]);

  const onSubmit: SubmitHandler<MttqTapHuanChiTietLineFormValues> = async (formData) => {
    try {
      await Promise.resolve(onSave(formData));
      onClose();
    } catch {
      /* Giữ drawer mở khi onSave từ chối (vd. trùng cán bộ). */
    }
  };

  if (!open) return null;

  return (
    <GenericDrawer
      stackLevel={stackLevel}
      maxWidthClass={DRAWER_WIDTH_STACKED}
      onClose={onClose}
      title={
        mode === 'add'
          ? txt('matTranTapHuan.chiTietDrawer.titleAdd')
          : txt('matTranTapHuan.chiTietDrawer.titleEdit')
      }
      icon={<UserCircle size={18} />}
      subtitle={txt('matTranTapHuan.form.sectionChiTiet')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit={mode === 'edit'}
          compact
          createIcon={<Users className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection
          title={txt('matTranTapHuan.form.sectionChiTiet')}
          icon={<Users size={14} />}
          variant="primary"
        >
          <FormGrid>
            <Controller
              name="can_bo_id"
              control={control}
              render={({ field }) => (
                <CanBoCombobox
                  createFormStackLevel={stackLevel + 1}
                  label={txt('matTranTapHuan.form.canBo')}
                  options={canBoOptions}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(String(v));
                  }}
                  placeholder={txt('common.select')}
                  error={errors.can_bo_id?.message}
                  icon={<Users size={12} />}
                  required
                  dropdownInPortal
                />
              )}
            />
            <p className={`${FORM_GRID_SPAN_FULL} text-xs text-muted-foreground m-0 -mt-1`}>
              {txt('matTranTapHuan.form.chiTietSnapshotHint')}
            </p>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                readOnly
                tabIndex={-1}
                label={txt('matTranCanBo.form.toChuc')}
                icon={Building2}
                value={displaySnap.ten_to_chuc.trim() ? displaySnap.ten_to_chuc : '—'}
                className="cursor-default"
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                readOnly
                tabIndex={-1}
                label={txt('matTranCanBo.form.phongBan')}
                icon={Layers}
                value={displaySnap.ten_phong_ban.trim() ? displaySnap.ten_phong_ban : '—'}
                className="cursor-default"
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                readOnly
                tabIndex={-1}
                label={txt('matTranCanBo.form.chucVu')}
                icon={Briefcase}
                value={displaySnap.ten_chuc_vu.trim() ? displaySnap.ten_chuc_vu : '—'}
                className="cursor-default"
              />
            </div>
            <Controller
              name="thuoc_dien"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTapHuan.form.thuocDien')}
                  options={thuocDienOpts}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.thuoc_dien?.message}
                  icon={<ListChecks size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqTapHuanChiTietLineDrawer;
export { EMPTY_LINE as MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE };
