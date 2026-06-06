import React, { useEffect, useMemo } from 'react';
import { txt } from '../../../../lib/text';
import { useForm, Controller, SubmitHandler, type Resolver } from 'react-hook-form';
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
import type { Department } from '../../phong-ban/core/types';
import { usePositions } from '../hooks/use-chuc-vu';
const DEFAULT_VALUES = {
  ten_chuc_vu: '',
  cap_bac: '',
  phong_ban_id: '',
  mo_ta: '',
  thu_tu: 1,
  trang_thai: 'Đang hoạt động' as const,
} as unknown as PositionFormValues;

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

  const selectedCapBacId =
    initialData?.cap_bac != null && String(initialData.cap_bac).trim() !== ''
      ? String(initialData.cap_bac).trim()
      : null;
  const selectedPhongBanId =
    initialData?.phong_ban_id != null && String(initialData.phong_ban_id).trim() !== ''
      ? String(initialData.phong_ban_id).trim()
      : null;

  const jobLevelOptions = useMemo(() => {
    const active = jobLevels
      .filter((lvl) => lvl.trang_thai === 'Đang hoạt động')
      .map((lvl) => ({
        label: lvl.ten_cap_bac,
        value: lvl.id,
        subLabel: lvl.ma_cap_bac,
      }));
    const sel = selectedCapBacId
      ? jobLevels.find((l) => String(l.id).trim() === selectedCapBacId)
      : undefined;
    if (sel && !active.some((o) => String(o.value) === String(sel.id))) {
      return [
        ...active,
        {
          label: sel.ten_cap_bac,
          value: sel.id,
          subLabel:
            sel.trang_thai !== 'Đang hoạt động'
              ? [sel.ma_cap_bac, txt('position.inactive')].filter(Boolean).join(' · ')
              : sel.ma_cap_bac,
        },
      ];
    }
    return active;
  }, [jobLevels, selectedCapBacId]);

  const departmentOptions = useMemo(() => {
    const deptToOption = (d: Department) => {
      const inactive = d.trang_thai !== 'Đang hoạt động';
      const baseName = inactive ? `${d.ten_phong_ban} (${txt('position.inactive')})` : d.ten_phong_ban;
      const isRoot = !d.cha_id || d.cap_do <= 1;
      return {
        value: d.id,
        label: isRoot ? baseName : `↳ ${baseName}`,
      };
    };

    const active = departments.filter((d) => d.trang_thai === 'Đang hoạt động');
    const sorted = [...active].sort((a, b) => a.duong_dan.localeCompare(b.duong_dan, 'vi'));
    const opts = sorted.map(deptToOption);

    const sel = selectedPhongBanId
      ? departments.find((d) => String(d.id).trim() === selectedPhongBanId)
      : undefined;
    if (sel && !active.some((d) => String(d.id) === String(sel.id))) {
      return [...opts, deptToOption(sel)];
    }
    return opts;
  }, [departments, selectedPhongBanId]);

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema) as Resolver<PositionFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  /** Sửa: không reset theo `positions` khi đang sửa — tránh ghi đè phòng ban/cấp bậc khi cache danh sách refetch. */
  useEffect(() => {
    if (!initialData) return;
    reset({
      ten_chuc_vu: initialData.ten_chuc_vu,
      cap_bac:
        initialData.cap_bac != null && String(initialData.cap_bac).trim() !== ''
          ? String(initialData.cap_bac).trim()
          : '',
      phong_ban_id:
        initialData.phong_ban_id != null && String(initialData.phong_ban_id).trim() !== ''
          ? String(initialData.phong_ban_id).trim()
          : '',
      mo_ta: initialData.mo_ta || '',
      thu_tu: initialData.thu_tu ?? 0,
      trang_thai: initialData.trang_thai,
    });
  }, [initialData, reset]);

  useEffect(() => {
    if (initialData) return;
    const nextThuTu = positions.length ? Math.max(...positions.map((p) => p.thu_tu ?? 0)) + 1 : 1;
    reset({ ...DEFAULT_VALUES, thu_tu: nextThuTu });
  }, [initialData, positions, reset]);

  const onSubmit: SubmitHandler<PositionFormValues> = (data) => {
    const sanitizedData: PositionFormValues = {
      ...data,
      ten_chuc_vu: data.ten_chuc_vu.trim(),
      cap_bac: String(data.cap_bac).trim(),
      phong_ban_id: String(data.phong_ban_id).trim(),
      mo_ta: data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null,
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
            ? `${txt('position.form.editSubtitle')} · ${initialData.ten_chuc_vu}`
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
                <div className="sm:col-span-3">
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
                  name="cap_bac"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      label={txt('position.form.level')}
                      options={jobLevelOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={txt('position.form.levelPlaceholder')}
                      required
                      error={errors.cap_bac?.message}
                      icon={<Layers size={12} />}
                      renderValue={(opt) => (
                        <span className="text-body-sm font-semibold tabular-nums text-foreground">
                          {String(opt.value)}
                        </span>
                      )}
                      renderOption={(opt) => (
                        <span className="text-body-sm font-semibold tabular-nums text-foreground">
                          {String(opt.value)}
                        </span>
                      )}
                      clearable={false}
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
                      required
                      error={errors.phong_ban_id?.message}
                      icon={<Building2 size={12} />}
                      clearable={false}
                      dropdownInPortal
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