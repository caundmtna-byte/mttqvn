import React, { useEffect } from 'react';
import { useForm, Controller, useWatch, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Map, ArrowUpFromLine } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Combobox, { type Option } from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid from '@/components/shared/FormGrid';
import { xaPhuongSchema, type XaPhuongFormValues } from '../core/schema';
import type { XaPhuong } from '../core/types';
import {
  useCreateXaPhuong,
  useUpdateXaPhuong,
  useXaPhuongByTinhThanh,
} from '../hooks/use-dia-ban';

const DEFAULT_VALUES: XaPhuongFormValues = {
  id_tinh_thanh: '',
  ten: '',
  thu_tu: 0,
};

interface Props {
  initialData?: XaPhuong | null;
  /** Khi mở từ drawer tỉnh: cố định tỉnh, ẩn combobox */
  lockTinhId?: string;
  tinhOptions: Option[];
  stackLevel?: number;
  onClose: () => void;
}

const XaPhuongForm: React.FC<Props> = ({
  initialData,
  lockTinhId,
  tinhOptions,
  stackLevel = 0,
  onClose,
}) => {
  const isEdit = !!initialData;
  const createMutation = useCreateXaPhuong(onClose);
  const updateMutation = useUpdateXaPhuong(onClose);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<XaPhuongFormValues>({
    resolver: zodResolver(xaPhuongSchema) as Resolver<XaPhuongFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const watchedTinhId = useWatch({ control, name: 'id_tinh_thanh' });
  const idForXaPool =
    (lockTinhId ?? '').trim() ||
    (initialData?.id_tinh_thanh ?? '').trim() ||
    (typeof watchedTinhId === 'string' ? watchedTinhId.trim() : '') ||
    '';
  const { data: xaOfTinh = [] } = useXaPhuongByTinhThanh(idForXaPool ? idForXaPool : null);

  useEffect(() => {
    if (initialData) {
      reset({
        id_tinh_thanh: initialData.id_tinh_thanh,
        ten: initialData.ten,
        thu_tu: initialData.thu_tu ?? 0,
      });
      return;
    }
    reset({
      ...DEFAULT_VALUES,
      id_tinh_thanh: (lockTinhId ?? '').trim(),
      thu_tu: 1,
    });
  }, [initialData, lockTinhId, reset]);

  useEffect(() => {
    if (initialData) return;
    const tid = (lockTinhId ?? '').trim();
    const tinhKey = tid || (typeof watchedTinhId === 'string' ? watchedTinhId.trim() : '');
    if (!tinhKey) return;
    const nextThu =
      xaOfTinh.length > 0 ? Math.max(...xaOfTinh.map((x) => x.thu_tu ?? 0)) + 1 : 1;
    setValue('thu_tu', nextThu, { shouldDirty: false });
    if (tid) setValue('id_tinh_thanh', tid, { shouldDirty: false });
  }, [initialData, lockTinhId, watchedTinhId, xaOfTinh, setValue]);

  const title = isEdit ? txt('diaBan.form.xaEditTitle') : txt('diaBan.form.xaCreateTitle');

  const onSubmit: SubmitHandler<XaPhuongFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      title={title}
      subtitle={isEdit ? `#${initialData?.id}` : undefined}
      icon={<Map size={18} />}
      onClose={onClose}
      stackLevel={stackLevel}
      footer={
        <FormDrawerFooter
          formId="dia-ban-xa-form"
          onCancel={onClose}
          isLoading={isLoading}
          isEdit={isEdit}
          compact
          createIcon={<Map className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
      maxWidthClass={DRAWER_WIDTH_FORM}
    >
      <form id="dia-ban-xa-form" className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <FormSection title={txt('diaBan.detail.basicInfo')} icon={<Map size={14} />}>
          <FormGrid>
            {!lockTinhId?.trim() && (
              <Controller
                name="id_tinh_thanh"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('diaBan.form.tinhSelect')}
                    placeholder={txt('diaBan.form.tinhSelectHint')}
                    options={tinhOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.id_tinh_thanh?.message}
                    required
                    clearable={false}
                    searchable
                    dropdownInPortal
                  />
                )}
              />
            )}
            <Input
              label={txt('diaBan.form.ten')}
              placeholder={txt('diaBan.form.tenPlaceholderXa')}
              error={errors.ten?.message}
              required
              {...register('ten')}
            />
            <Input
              type="number"
              label={txt('diaBan.form.thuTu')}
              error={errors.thu_tu?.message}
              icon={<ArrowUpFromLine size={14} />}
              required
              {...register('thu_tu', { valueAsNumber: true })}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default XaPhuongForm;
