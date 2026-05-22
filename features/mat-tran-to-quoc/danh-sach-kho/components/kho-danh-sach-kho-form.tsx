import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, MapPin, Type, Warehouse } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useTinhThanhList } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { khoDanhSachKhoSchema, type KhoDanhSachKhoFormValues } from '../core/schema';
import type { KhoDanhSachKhoListRow } from '../core/types';
import { useCreateKhoDanhSachKho, useUpdateKhoDanhSachKho } from '../hooks/use-kho-danh-sach-kho';

const FORM_ID = 'kho-danh-sach-kho-form';

const DEFAULT_VALUES: KhoDanhSachKhoFormValues = {
  ten_kho: '',
  don_vi_id: '',
  mo_ta: '',
};

interface Props {
  initialData?: KhoDanhSachKhoListRow | null;
  onClose: () => void;
}

const KhoDanhSachKhoForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');

  const createMutation = useCreateKhoDanhSachKho(onClose);
  const updateMutation = useUpdateKhoDanhSachKho(onClose);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const xaOptions = useMemo(
    () =>
      [...xaList]
        .sort((a, b) => {
          const ta = tinhMap.get(a.id_tinh_thanh) ?? '';
          const tb = tinhMap.get(b.id_tinh_thanh) ?? '';
          if (ta !== tb) return ta.localeCompare(tb, 'vi');
          return a.ten.localeCompare(b.ten, 'vi');
        })
        .map((x) => ({
          label: x.ten,
          value: String(x.id),
          subLabel: tinhMap.get(x.id_tinh_thanh),
        })),
    [xaList, tinhMap],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KhoDanhSachKhoFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(khoDanhSachKhoSchema) as Resolver<KhoDanhSachKhoFormValues>,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ten_kho: initialData.ten_kho,
        don_vi_id:
          initialData.don_vi_id != null && String(initialData.don_vi_id).trim() !== ''
            ? String(initialData.don_vi_id).trim()
            : '',
        mo_ta: initialData.mo_ta ?? '',
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<KhoDanhSachKhoFormValues> = (data) => {
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
      icon={<Warehouse size={18} />}
      subtitle={isEdit && initialData ? `${txt('matTranKhoDanhSach.form.editSubtitle')} · ${initialData.ten_kho}` : txt('matTranKhoDanhSach.form.createSubtitle')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Warehouse className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranKhoDanhSach.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranKhoDanhSach.form.tenKho')}
                required
                icon={Warehouse}
                {...register('ten_kho')}
                error={errors.ten_kho?.message}
              />
            </div>
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5 sm:col-span-2">
                  <Combobox
                    options={xaOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                    label={txt('matTranKhoDanhSach.form.donVi')}
                    placeholder={txt('matTranKhoDanhSach.form.donVi')}
                    error={errors.don_vi_id?.message}
                    icon={<MapPin size={14} />}
                    clearable
                    dropdownInPortal
                    searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                  />
                  <p className="text-xs text-muted-foreground m-0">{txt('matTranKhoDanhSach.form.donViHint')}</p>
                </div>
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranKhoDanhSach.form.moTa')}
                rows={4}
                icon={FileText}
                {...register('mo_ta')}
                error={errors.mo_ta?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KhoDanhSachKhoForm;
