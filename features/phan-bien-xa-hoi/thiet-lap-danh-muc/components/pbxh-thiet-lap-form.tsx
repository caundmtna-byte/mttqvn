import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings2, FileText, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { pbxhThietLapSchema, type PbxhThietLapFormValues } from '../core/schema';
import type { PbxhThietLap, PbxhThietLapLoai } from '../core/types';
import { PBXH_LOAI_TAB_LABEL_KEY } from '../core/types';
import { useCreatePbxhThietLap, useUpdatePbxhThietLap } from '../hooks/use-pbxh-thiet-lap';

interface Props {
  loai: PbxhThietLapLoai;
  initialData?: PbxhThietLap | null;
  onClose: () => void;
}

const PbxhThietLapForm: React.FC<Props> = ({ loai, initialData, onClose }) => {
  const isEdit = !!initialData;
  const createMut = useCreatePbxhThietLap(onClose);
  const updateMut = useUpdatePbxhThietLap(onClose);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PbxhThietLapFormValues>({
    resolver: zodResolver(pbxhThietLapSchema) as Resolver<PbxhThietLapFormValues>,
    defaultValues: { loai, ten: '', mo_ta: '', thu_tu: 0 },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        loai: initialData.loai,
        ten: initialData.ten,
        mo_ta: initialData.mo_ta ?? '',
        thu_tu: initialData.thu_tu,
      });
    } else {
      reset({ loai, ten: '', mo_ta: '', thu_tu: 0 });
    }
  }, [initialData, loai, reset]);

  const onSubmit = (data: PbxhThietLapFormValues) => {
    const payload: PbxhThietLapFormValues = {
      ...data,
      loai,
      mo_ta: data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null,
    };
    if (isEdit && initialData) {
      updateMut.mutate({ id: initialData.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const busy = createMut.isPending || updateMut.isPending;
  const tabLabel = txt(PBXH_LOAI_TAB_LABEL_KEY[loai]);

  return (
    <GenericDrawer
      title={isEdit ? txt('page.pbxhThietLap.editItem') : txt('page.pbxhThietLap.addItem')}
      subtitle={
        isEdit && initialData
          ? `${txt('page.pbxhThietLap.formEditSubtitle')} · ${initialData.ten}`
          : `${txt('page.pbxhThietLap.formCreateSubtitle')} · ${tabLabel}`
      }
      icon={<Settings2 size={20} />}
      onClose={onClose}
      maxWidthClass={DRAWER_WIDTH_FORM}
      footer={
        <FormDrawerFooter
          formId="pbxh-thiet-lap-form"
          onCancel={onClose}
          isLoading={busy}
          isEdit={isEdit}
          compact
          createIcon={<Settings2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id="pbxh-thiet-lap-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('loai')} />
        <FormSection title={txt('page.articleSettings.detailBasic')} icon={<Settings2 size={14} />} variant="primary">
          <FormGrid cols={2}>
            <Input
              label={txt('page.articleSettings.formTen')}
              icon={<Settings2 size={12} />}
              {...register('ten')}
              error={errors.ten?.message}
              required
            />
            <Input
              label={txt('page.articleSettings.formThuTu')}
              type="number"
              min={0}
              icon={<ListOrdered size={12} />}
              {...register('thu_tu', { valueAsNumber: true })}
              error={errors.thu_tu?.message}
              required
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea label={txt('page.articleSettings.colMoTa')} icon={<FileText size={12} />} {...register('mo_ta')} rows={2} />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default PbxhThietLapForm;
