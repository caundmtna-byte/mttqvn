import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Calendar,
  FileText,
  Gift,
  Link2,
  ListChecks,
  Star,
  Type,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useThongTinToChucQuanTrongList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong/hooks/use-thong-tin-to-chuc-quan-trong';
import {
  thamHoiToChucSchema,
  thamHoiToChucToFormInput,
  type ThamHoiToChucFormInput,
  type ThamHoiToChucFormValues,
} from '../core/schema';
import { TIEN_DO_VALUES } from '../core/constants';
import type { ThamHoiToChuc } from '../core/types';
import { useCreateThamHoiToChuc, useUpdateThamHoiToChuc } from '../hooks/use-tham-hoi-to-chuc';

const FORM_ID = 'dttg-tham-hoi-to-chuc-form';

interface Props {
  initialData?: ThamHoiToChuc | null;
  onClose: () => void;
}

const ThamHoiToChucForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const { data: orgList = [] } = useThongTinToChucQuanTrongList();
  const createMutation = useCreateThamHoiToChuc(onClose);
  const updateMutation = useUpdateThamHoiToChuc(onClose);

  const toChucOptions = useMemo(
    () =>
      [...orgList]
        .sort((a, b) => a.ten_co_so.localeCompare(b.ten_co_so, 'vi'))
        .map((o) => ({
          label: o.ten_co_so,
          value: o.id,
          subLabel: o.loai_hinh,
        })),
    [orgList],
  );

  const tienDoOptions = useMemo(
    () => TIEN_DO_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ThamHoiToChucFormInput>({
    defaultValues: thamHoiToChucToFormInput(null),
    resolver: zodResolver(thamHoiToChucSchema) as Resolver<ThamHoiToChucFormInput>,
  });

  useEffect(() => {
    reset(thamHoiToChucToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ThamHoiToChucFormInput> = (data) => {
    const parsed = thamHoiToChucSchema.parse(data) as ThamHoiToChucFormValues;
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data: parsed });
    } else {
      createMutation.mutate({ data: parsed, idNguoiTao: nhanVienId });
    }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Building2 size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('danTocThamHoiToChuc.form.editSubtitle')} · ${initialData.dip_tham_hoi}`
          : txt('danTocThamHoiToChuc.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('danTocThamHoiToChuc.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="to_chuc_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={toChucOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                    label={txt('danTocThamHoiToChuc.form.toChuc')}
                    placeholder={txt('danTocThamHoiToChuc.form.toChucPlaceholder')}
                    required
                    icon={<Star size={14} />}
                    error={errors.to_chuc_id?.message}
                    dropdownInPortal
                    clearable={false}
                  />
                )}
              />
            </div>
            <Input
              label={txt('danTocThamHoiToChuc.form.dipThamHoi')}
              required
              icon={Calendar}
              {...register('dip_tham_hoi')}
              error={errors.dip_tham_hoi?.message}
            />
            <div className="space-y-1.5">
              <Input
                label={txt('danTocThamHoiToChuc.form.thoiGianDuKien')}
                icon={Calendar}
                {...register('thoi_gian_du_kien')}
                error={errors.thoi_gian_du_kien?.message}
              />
              <p className="text-xs text-muted-foreground m-0">{txt('danTocThamHoiToChuc.form.thoiGianDuKienHint')}</p>
            </div>
            <Input
              label={txt('danTocThamHoiToChuc.form.donViThamHoi')}
              icon={Building2}
              {...register('don_vi_tham_hoi')}
              error={errors.don_vi_tham_hoi?.message}
            />
            <Controller
              name="tien_do"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={tienDoOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  label={txt('danTocThamHoiToChuc.form.tienDo')}
                  required
                  icon={<ListChecks size={14} />}
                  error={errors.tien_do?.message}
                  dropdownInPortal
                  clearable={false}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocThamHoiToChuc.form.sectionContent')} icon={<FileText size={14} />}>
          <FormGrid cols={1}>
            <Textarea
              label={txt('danTocThamHoiToChuc.form.noiDungThamHoi')}
              rows={3}
              icon={FileText}
              {...register('noi_dung_tham_hoi')}
              error={errors.noi_dung_tham_hoi?.message}
            />
            <Textarea
              label={txt('danTocThamHoiToChuc.form.thanhPhanDoan')}
              rows={2}
              icon={Users}
              {...register('thanh_phan_doan')}
              error={errors.thanh_phan_doan?.message}
            />
            <Input
              label={txt('danTocThamHoiToChuc.form.quaTang')}
              icon={Gift}
              {...register('qua_tang')}
              error={errors.qua_tang?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocThamHoiToChuc.form.sectionResult')} icon={<ListChecks size={14} />}>
          <FormGrid cols={1}>
            <Textarea
              label={txt('danTocThamHoiToChuc.form.ketQuaThucHien')}
              rows={3}
              icon={FileText}
              {...register('ket_qua_thuc_hien')}
              error={errors.ket_qua_thuc_hien?.message}
            />
            <Input
              label={txt('danTocThamHoiToChuc.form.linkKetQua')}
              icon={Link2}
              {...register('link_ket_qua')}
              error={errors.link_ket_qua?.message}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default ThamHoiToChucForm;
