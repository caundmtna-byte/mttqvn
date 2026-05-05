import React, { useEffect, useMemo } from 'react';
import { txt } from '../../../../lib/text';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Layers, Building2, FileText, Power } from 'lucide-react';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import Input from '../../../../components/ui/Input';
import Combobox from '../../../../components/ui/Combobox';
import Textarea from '../../../../components/ui/Textarea';
import StatusToggle from '../../../../components/ui/StatusToggle';
import { PositionFormValues, positionSchema } from '../core/schema';
import { Position } from '../core/types';
import { useCreatePosition, useUpdatePosition } from '../hooks/use-chuc-vu';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '../../../../components/shared/GenericDrawer';
import FormDrawerFooter from '../../../../components/shared/FormDrawerFooter';
import FormSection from '../../../../components/shared/FormSection';
import FormGrid from '../../../../components/shared/FormGrid';

// Import hooks from other modules
import { useJobLevels } from '../../cap-bac/hooks/use-cap-bac';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { usePositions } from '../hooks/use-chuc-vu';

const DEFAULT_VALUES: PositionFormValues = {
  ma_chuc_vu: '',
  ten_chuc_vu: '',
  cap_bac_id: '',
  phong_ban_id: '',
  mo_ta: '',
  thu_tu: 1,
  trang_thai: 'Đang hoạt động',
};

interface Props {
  initialData?: Position | null;
  onClose: () => void;
}

const PositionForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = !!initialData;
  const createMutation = useCreatePosition(onClose);
  const updateMutation = useUpdatePosition(onClose);

  const { data: jobLevels = [] } = useJobLevels();
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();

  const jobLevelOptions = useMemo(
    () =>
      jobLevels
        .filter((lvl) => lvl.trang_thai === 'Đang hoạt động')
        .map((lvl) => ({
          label: lvl.ten_cap_bac,
          value: lvl.id,
          subLabel: lvl.ma_cap_bac,
        })),
    [jobLevels]
  );

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((dept) => dept.trang_thai === 'Đang hoạt động')
        .map((dept) => ({
          label: dept.ten_phong_ban,
          value: dept.id,
          subLabel: dept.ma_phong_ban,
        })),
    [departments]
  );

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ma_chuc_vu: initialData.ma_chuc_vu,
        ten_chuc_vu: initialData.ten_chuc_vu,
        cap_bac_id: initialData.cap_bac_id || '',
        phong_ban_id: initialData.phong_ban_id || '',
        mo_ta: initialData.mo_ta || '',
        thu_tu: initialData.thu_tu ?? 0,
        trang_thai: initialData.trang_thai,
      });
    } else {
      const nextThuTu = positions.length
        ? Math.max(...positions.map((p) => p.thu_tu ?? 0)) + 1
        : 1;
      reset({ ...DEFAULT_VALUES, thu_tu: nextThuTu });
    }
  }, [initialData, positions, reset]);

  const onSubmit: SubmitHandler<PositionFormValues> = (data) => {
    // Convert empty strings to null
    const sanitizedData = {
        ...data,
        cap_bac_id: data.cap_bac_id || null,
        phong_ban_id: data.phong_ban_id || null,
    };

    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data: sanitizedData });
    } else {
      createMutation.mutate(sanitizedData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
        title={isEdit ? txt('position.form.editTitle') : txt('position.form.createTitle')}
        subtitle={
          isEdit && initialData
            ? `${txt('position.form.editSubtitle')} · ${initialData.ma_chuc_vu}`
            : txt('position.form.createSubtitle')
        }
        icon={<Briefcase size={20} />}
        onClose={onClose}
        footer={
          <FormDrawerFooter
            formId="pos-form"
            onCancel={onClose}
            isLoading={isLoading}
            isEdit={isEdit}
            compact
            createIcon={<Briefcase className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
          />
        }
        footerCompact
        maxWidthClass={DRAWER_WIDTH_FORM}
    >
          <form id="pos-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormSection title={txt('position.detail.basicInfo')} icon={<Briefcase size={14} />} variant="primary">
              <FormGrid cols={3}>
                <div className="sm:col-span-1">
                  <Controller
                    name="ma_chuc_vu"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label={txt('position.form.code')}
                        placeholder={txt('position.form.codePlaceholder')}
                        icon={<Briefcase size={12} />}
                        required
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        onBlur={field.onBlur}
                        error={errors.ma_chuc_vu?.message}
                      />
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={txt('position.form.name')}
                    placeholder={txt('position.form.namePlaceholder')}
                    icon={<Briefcase size={12} />}
                    required
                    {...register('ten_chuc_vu')}
                    error={errors.ten_chuc_vu?.message}
                  />
                </div>
                <Controller
                  name="cap_bac_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      label={txt('position.form.level')}
                      options={jobLevelOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={txt('position.form.levelPlaceholder')}
                      error={errors.cap_bac_id?.message}
                      icon={<Layers size={12} />}
                    />
                  )}
                />
                <Controller
                  name="phong_ban_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      label={txt('position.form.department')}
                      options={departmentOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={txt('position.form.departmentPlaceholder')}
                      error={errors.phong_ban_id?.message}
                      icon={<Building2 size={12} />}
                    />
                  )}
                />
                <div className="col-span-1 sm:col-span-3">
                  <Textarea
                    label={txt('position.form.description')}
                    placeholder={txt('position.form.descriptionPlaceholder')}
                    icon={<FileText size={12} />}
                    rows={3}
                    className="resize-y min-h-[80px]"
                    {...register('mo_ta')}
                    error={errors.mo_ta?.message}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    label={txt('position.detail.order')}
                    type="number"
                    min={0}
                    {...register('thu_tu')}
                    error={errors.thu_tu?.message}
                  />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Controller
                    name="trang_thai"
                    control={control}
                    render={({ field }) => (
                      <StatusToggle
                        label={txt('position.form.status')}
                        value={field.value}
                        onChange={field.onChange}
                        icon={<Power size={12} />}
                        activeLabel={TRANG_THAI_HOAT_DONG[1]}
                        inactiveLabel={TRANG_THAI_HOAT_DONG[0]}
                        required
                      />
                    )}
                  />
                </div>
              </FormGrid>
            </FormSection>
          </form>
    </GenericDrawer>
  );
};

export default PositionForm;