import React, { useEffect, useMemo, useState } from 'react';
import { txt } from '../../../../lib/text';
import { useForm, Controller, SubmitHandler, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, AtSign, Building2, Layers, Briefcase } from 'lucide-react';
import Input from '../../../../components/ui/Input';
import Combobox from '../../../../components/ui/Combobox';
import ToggleSwitch from '../../../../components/ui/ToggleSwitch';
import SingleImageInput from '../../../../components/ui/SingleImageInput';
import { EmployeeFormValues, employeeSchema } from '../core/schema';
import { Employee } from '../core/types';
import {
  useCreateEmployee,
  useCreateEmployeeWithAuthDecision,
  useUpdateEmployee,
  useUpdateEmployeeWithAuthDecision,
} from '../hooks/use-nhan-vien';
import type { AuthConflictDecision } from '../services/nhan-vien-service';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '../../../../components/shared/GenericDrawer';
import FormDrawerFooter from '../../../../components/shared/FormDrawerFooter';
import FormSection from '../../../../components/shared/FormSection';
import FormGrid from '../../../../components/shared/FormGrid';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { usePositions } from '../../chuc-vu/hooks/use-chuc-vu';
import { getDefaultEmployeeFormValues, employeeToFormValues } from '../utils/employee-to-form';
import AuthConflictDialog from './auth-conflict-dialog';

interface Props {
  initialData?: Employee | null;
  onClose: () => void;
}

const EmployeeForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = !!initialData;

  const [conflictUsername, setConflictUsername] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<EmployeeFormValues | null>(null);

  const closeConflict = () => {
    setConflictUsername(null);
    setPendingValues(null);
  };
  const handleConflict = (username: string) => {
    setConflictUsername(username);
    return true;
  };

  const createMutation = useCreateEmployee({ onSuccess: onClose, onAuthConflict: handleConflict });
  const updateMutation = useUpdateEmployee({ onSuccess: onClose, onAuthConflict: handleConflict });
  const createDecisionMutation = useCreateEmployeeWithAuthDecision(() => {
    closeConflict();
    onClose();
  });
  const updateDecisionMutation = useUpdateEmployeeWithAuthDecision(() => {
    closeConflict();
    onClose();
  });

  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as Resolver<EmployeeFormValues>,
    defaultValues: getDefaultEmployeeFormValues(),
  });

  useEffect(() => {
    if (initialData) {
      reset(employeeToFormValues(initialData));
    } else {
      reset(getDefaultEmployeeFormValues());
    }
  }, [initialData, reset]);

  const selectedDept = useWatch({ control, name: 'id_phong_ban' });
  const watchedUsername = (useWatch({ control, name: 'ten_tai_khoan' }) ?? '').trim().toLowerCase();
  const authEmailHint = watchedUsername
    ? txt('employee.form.authEmailHint', { email: `${watchedUsername}@gmail.com` })
    : txt('employee.form.authEmailHintEmpty');

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((d) => d.trang_thai === 'Đang hoạt động' && !d.cha_id)
        .map((d) => ({ label: d.ten_phong_ban, value: d.id })),
    [departments],
  );

  const unitOptions = useMemo(
    () =>
      departments
        .filter((d) => d.trang_thai === 'Đang hoạt động' && d.cha_id && d.cha_id === selectedDept)
        .map((d) => ({ label: d.ten_phong_ban, value: d.id })),
    [departments, selectedDept],
  );

  const positionOptions = useMemo(
    () =>
      positions
        .filter((p) => p.trang_thai === 'Đang hoạt động')
        .map((p) => ({ label: p.ten_chuc_vu, value: p.id })),
    [positions],
  );

  const onSubmit: SubmitHandler<EmployeeFormValues> = (data) => {
    setPendingValues(data);
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAuthDecision = (decision: AuthConflictDecision) => {
    if (!pendingValues) return;
    if (isEdit && initialData) {
      updateDecisionMutation.mutate({ id: initialData.id, data: pendingValues, decision });
    } else {
      createDecisionMutation.mutate({ data: pendingValues, decision });
    }
  };

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    createDecisionMutation.isPending ||
    updateDecisionMutation.isPending;
  const isDecisionPending =
    createDecisionMutation.isPending || updateDecisionMutation.isPending;

  return (
    <GenericDrawer
      title={isEdit ? txt('employee.form.editTitle') : txt('employee.form.createTitle')}
      subtitle={
        isEdit && initialData
          ? `${txt('employee.form.editSubtitle')} · ${initialData.ten_tai_khoan}`
          : txt('employee.form.createSubtitle')
      }
      icon={<User size={20} />}
      onClose={onClose}
      footer={
        <FormDrawerFooter
          formId="emp-form"
          onCancel={onClose}
          isLoading={isLoading}
          isEdit={isEdit}
          compact
          createIcon={<User className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
      maxWidthClass={DRAWER_WIDTH_FORM}
    >
      <form id="emp-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection title={txt('employee.form.identity')} icon={<User size={14} />} variant="primary">
          <FormGrid cols={3}>
            <Controller
              name="hinh_anh"
              control={control}
              render={({ field }) => (
                <div className="sm:col-span-1 sm:row-span-2 flex items-start justify-center">
                  <SingleImageInput
                    value={field.value ?? null}
                    onChange={(v) => field.onChange(v ?? null)}
                    shape="circle"
                    aspectRatio="1/1"
                    placeholder={txt('employee.form.avatar')}
                    hint={txt('employee.form.avatarHint')}
                    maxSizeMB={2}
                  />
                </div>
              )}
            />
            <div className="sm:col-span-2">
              <Input
                label={txt('employee.form.username')}
                placeholder={txt('employee.form.usernamePlaceholder')}
                icon={<AtSign size={12} />}
                required
                {...register('ten_tai_khoan', {
                  setValueAs: (v: string) => v?.toLowerCase().trim(),
                })}
                error={errors.ten_tai_khoan?.message}
              />
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{authEmailHint}</p>
            </div>
            <div className="sm:col-span-2">
              <Input
                label={txt('employee.form.fullName')}
                placeholder={txt('employee.form.fullNamePlaceholder')}
                icon={<User size={12} />}
                required
                {...register('ho_va_ten')}
                error={errors.ho_va_ten?.message}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('employee.form.workInfo')} icon={<Briefcase size={14} />} variant="primary">
          <FormGrid cols={3}>
            <Controller
              name="id_phong_ban"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('employee.form.department')}
                  options={departmentOptions}
                  value={field.value || ''}
                  onChange={(v) => field.onChange(v || '')}
                  placeholder={txt('employee.form.departmentPlaceholder')}
                  error={errors.id_phong_ban?.message}
                  icon={<Building2 size={12} />}
                  required
                />
              )}
            />
            <Controller
              name="id_bo_phan"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('employee.form.unit')}
                  options={unitOptions}
                  value={field.value || ''}
                  onChange={(v) => field.onChange(v || '')}
                  placeholder={txt('employee.form.unitPlaceholder')}
                  error={errors.id_bo_phan?.message}
                  icon={<Layers size={12} />}
                  disabled={!selectedDept}
                  required
                />
              )}
            />
            <Controller
              name="id_chuc_vu"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('employee.form.position')}
                  options={positionOptions}
                  value={field.value || ''}
                  onChange={(v) => field.onChange(v || '')}
                  placeholder={txt('employee.form.positionPlaceholder')}
                  error={errors.id_chuc_vu?.message}
                  icon={<Briefcase size={12} />}
                  required
                />
              )}
            />
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <div className="sm:col-span-3">
                  <ToggleSwitch
                    checked={field.value === 'Hoạt động'}
                    onChange={(checked) => field.onChange(checked ? 'Hoạt động' : 'Khóa')}
                    label={txt('common.status')}
                    description={
                      field.value === 'Hoạt động'
                        ? txt('employee.form.statusSwitchActiveHint')
                        : txt('employee.form.statusSwitchLockedHint')
                    }
                  />
                </div>
              )}
            />
          </FormGrid>
        </FormSection>
      </form>

      <AuthConflictDialog
        username={conflictUsername}
        isLoading={isDecisionPending}
        onCancel={closeConflict}
        onChoose={handleAuthDecision}
      />
    </GenericDrawer>
  );
};

export default EmployeeForm;
