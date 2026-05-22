import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Hash, Layers, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { luongThietLapNgachSchema, type LuongThietLapNgachFormValues } from '../core/schema';
import type { LuongThietLapNgachListRow } from '../core/types';
import { useCreateLuongThietLapNgach, useUpdateLuongThietLapNgach } from '../hooks/use-luong-thiet-lap-ngach';

const FORM_ID = 'luong-ngach-form';

const DEFAULT_VALUES: LuongThietLapNgachFormValues = {
  ma: '',
  ten: '',
  mo_ta: '',
  thu_tu: 0,
};

interface Props {
  initialData?: LuongThietLapNgachListRow | null;
  onClose: () => void;
}

const LuongNgachForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateLuongThietLapNgach(onClose);
  const updateMutation = useUpdateLuongThietLapNgach(onClose);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LuongThietLapNgachFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(luongThietLapNgachSchema) as Resolver<LuongThietLapNgachFormValues>,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ma: initialData.ma ?? '',
        ten: initialData.ten,
        mo_ta: initialData.mo_ta ?? '',
        thu_tu: initialData.thu_tu,
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<LuongThietLapNgachFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Layers size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranThietLapLuong.form.editSubtitle')} · ${initialData.ten}`
          : txt('matTranThietLapLuong.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Layers className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranThietLapLuong.form.sectionMain')} icon={<Layers size={14} />}>
          <FormGrid cols={2}>
            <div className="space-y-1.5">
              <Input
                {...register('ma')}
                label={txt('matTranThietLapLuong.form.ma')}
                icon={Hash}
                error={errors.ma?.message}
                maxLength={64}
              />
            </div>
            <div className="space-y-1.5">
              <Input
                {...register('ten')}
                label={txt('matTranThietLapLuong.form.ten')}
                icon={Layers}
                error={errors.ten?.message}
                required
              />
            </div>
            <div className={`space-y-1.5 ${FORM_GRID_SPAN_FULL}`}>
              <Controller
                name="thu_tu"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    label={txt('matTranThietLapLuong.form.thuTu')}
                    icon={ListOrdered}
                    value={field.value === 0 && field.value !== undefined ? '' : String(field.value)}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === '' ? 0 : Number(v));
                    }}
                    error={errors.thu_tu?.message}
                  />
                )}
              />
            </div>
            <div className={`space-y-1.5 ${FORM_GRID_SPAN_FULL}`}>
              <Textarea
                {...register('mo_ta')}
                label={txt('matTranThietLapLuong.form.moTa')}
                icon={FileText}
                error={errors.mo_ta?.message}
                rows={4}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default LuongNgachForm;
