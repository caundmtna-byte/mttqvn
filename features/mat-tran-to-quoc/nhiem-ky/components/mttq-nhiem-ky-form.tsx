import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Hash, StickyNote, Type } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import {
  mttqNhiemKySchema,
  mttqNhiemKyToFormInput,
  type MttqNhiemKyFormInput,
  type MttqNhiemKyFormValues,
} from '../core/schema';
import type { MttqNhiemKy } from '../core/types';
import { useCreateMttqNhiemKy, useUpdateMttqNhiemKy } from '../hooks/use-mttq-nhiem-ky';

const FORM_ID = 'mttq-nhiem-ky-form';

interface Props {
  initialData?: MttqNhiemKy | null;
  onClose: () => void;
}

const MttqNhiemKyForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateMttqNhiemKy(onClose);
  const updateMutation = useUpdateMttqNhiemKy(onClose);

  const defaultValues = useMemo(() => mttqNhiemKyToFormInput(initialData ?? null), [initialData]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MttqNhiemKyFormInput, unknown, MttqNhiemKyFormValues>({
    defaultValues,
    resolver: zodResolver(mttqNhiemKySchema) as Resolver<MttqNhiemKyFormInput, unknown, MttqNhiemKyFormValues>,
  });

  useEffect(() => {
    reset(mttqNhiemKyToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<MttqNhiemKyFormValues> = (data) => {
    if (!isEdit) {
      if (!idNguoiTao) {
        toast.error(txt('matTranNhiemKy.service.noEmployeeProfile'));
        return;
      }
      createMutation.mutate({ data, idNguoiTao });
      return;
    }
    if (!initialData) return;
    updateMutation.mutate({ id: initialData.id, data });
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<CalendarClock size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranNhiemKy.form.editSubtitle')} · ${initialData.ten_nhiem_ky}`
          : txt('matTranNhiemKy.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<CalendarClock className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranNhiemKy.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid>
            <Controller
              name="ten_nhiem_ky"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  required
                  label={txt('matTranNhiemKy.form.tenNhiemKy')}
                  error={errors.ten_nhiem_ky?.message}
                  icon={Type}
                />
              )}
            />
            <Controller
              name="tu_nam"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value === undefined || field.value === null ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                  type="number"
                  label={txt('matTranNhiemKy.form.tuNam')}
                  error={errors.tu_nam?.message}
                  icon={Hash}
                />
              )}
            />
            <Controller
              name="den_nam"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value === undefined || field.value === null ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                  type="number"
                  label={txt('matTranNhiemKy.form.denNam')}
                  error={errors.den_nam?.message}
                  icon={Hash}
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="thong_tin"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    label={txt('matTranNhiemKy.form.thongTin')}
                    rows={3}
                    error={errors.thong_tin?.message}
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="ghi_chu"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    label={txt('matTranNhiemKy.form.ghiChu')}
                    rows={2}
                    icon={<StickyNote size={14} />}
                    error={errors.ghi_chu?.message}
                  />
                )}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranNhiemKy.form.sectionCounts')} icon={<Hash size={14} />}>
          <FormGrid>
            {(
              [
                ['sl_dau_nhiem_ky', txt('matTranNhiemKy.form.slDauNhiemKy')],
                ['sl_dang_tham_gia', txt('matTranNhiemKy.form.slDangThamGia')],
                ['sl_thoi_tham_gia', txt('matTranNhiemKy.form.slThoiThamGia')],
                ['sl_can_bo_sung', txt('matTranNhiemKy.form.slCanBoSung')],
                ['sl_thieu', txt('matTranNhiemKy.form.slThieu')],
              ] as const
            ).map(([name, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={String(field.value ?? 0)}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    type="number"
                    label={label}
                    error={errors[name]?.message}
                  />
                )}
              />
            ))}
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqNhiemKyForm;
