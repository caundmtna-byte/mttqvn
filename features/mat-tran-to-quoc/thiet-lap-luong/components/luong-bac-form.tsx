import React, { useEffect } from 'react';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gauge, Hash, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { luongThietLapBacFormSchema, type LuongThietLapBacFormValues, type LuongThietLapBacMaCode } from '../core/schema';
import type { LuongThietLapBacRow } from '../core/types';
import { useCreateLuongThietLapBac, useUpdateLuongThietLapBac } from '../hooks/use-luong-thiet-lap-bac';
import { cn } from '@/lib/utils';

const FORM_ID = 'luong-bac-form';

interface Props {
  ngachId: string;
  ngachLabel?: string;
  initialData?: LuongThietLapBacRow | null;
  /** Mã B1–B9 còn thiếu (chỉ dùng khi tạo mới). */
  missingCodesForCreate: LuongThietLapBacMaCode[];
  onClose: () => void;
}

const LuongBacForm: React.FC<Props> = ({ ngachId, ngachLabel, initialData, missingCodesForCreate, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateLuongThietLapBac(onClose);
  const updateMutation = useUpdateLuongThietLapBac(onClose);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LuongThietLapBacFormValues>({
    defaultValues: {
      ma_bac: 'B1',
      he_so: 1,
      thu_tu: 1,
    },
    resolver: zodResolver(luongThietLapBacFormSchema) as Resolver<LuongThietLapBacFormValues>,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ma_bac: initialData.ma_bac as LuongThietLapBacMaCode,
        he_so: Number(initialData.he_so),
        thu_tu: initialData.thu_tu,
      });
    } else {
      const first = missingCodesForCreate[0] ?? 'B1';
      const idx = Number.parseInt(first.replace(/^B/i, ''), 10);
      reset({
        ma_bac: first,
        he_so: 1,
        thu_tu: Number.isFinite(idx) ? idx : 1,
      });
    }
  }, [initialData, missingCodesForCreate, reset]);

  const onSubmit: SubmitHandler<LuongThietLapBacFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({
        id: initialData.id,
        ngachId,
        data: { he_so: data.he_so, thu_tu: data.thu_tu },
      });
    } else {
      createMutation.mutate({ ngachId, data });
    }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Hash size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranThietLapLuong.bac.form.editSubtitle')} · ${initialData.ma_bac}${ngachLabel ? ` · ${ngachLabel}` : ''}`
          : `${txt('matTranThietLapLuong.bac.form.createSubtitle')}${ngachLabel ? ` · ${ngachLabel}` : ''}`
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Hash className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranThietLapLuong.bac.form.sectionMain')} icon={<Hash size={14} />}>
          <FormGrid cols={2}>
            {!isEdit ? (
              <div className={`space-y-1.5 ${FORM_GRID_SPAN_FULL}`}>
                <label className="text-sm font-medium text-foreground" htmlFor={`${FORM_ID}-ma_bac`}>
                  {txt('matTranThietLapLuong.bac.form.maBac')}
                </label>
                <select
                  id={`${FORM_ID}-ma_bac`}
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
                    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  )}
                  {...register('ma_bac')}
                >
                  {missingCodesForCreate.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.ma_bac ? <p className="text-xs text-destructive m-0">{errors.ma_bac.message}</p> : null}
                <p className="text-xs text-muted-foreground m-0">{txt('matTranThietLapLuong.bac.form.maBacHint')}</p>
              </div>
            ) : (
              <div className={`space-y-1.5 ${FORM_GRID_SPAN_FULL}`}>
                <Input
                  label={txt('matTranThietLapLuong.bac.form.maBac')}
                  icon={Hash}
                  value={initialData?.ma_bac ?? ''}
                  disabled
                  readOnly
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Input
                {...register('he_so')}
                type="text"
                inputMode="decimal"
                label={txt('matTranThietLapLuong.bac.colHeSo')}
                icon={Gauge}
                error={errors.he_so?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Input
                {...register('thu_tu')}
                type="number"
                label={txt('matTranThietLapLuong.store.thuTuCol')}
                icon={ListOrdered}
                error={errors.thu_tu?.message}
                min={0}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default LuongBacForm;
