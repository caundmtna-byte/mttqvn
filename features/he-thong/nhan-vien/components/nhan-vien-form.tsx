import React, { useEffect, useMemo, useState } from 'react';
import { txt } from '../../../../lib/text';
import { useForm, Controller, SubmitHandler, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { User, AtSign, Building2, Layers, Briefcase, MapPin } from 'lucide-react';
import Input from '../../../../components/ui/Input';
import Combobox from '../../../../components/ui/Combobox';
import ToggleSwitch from '../../../../components/ui/ToggleSwitch';
import SingleImageInput from '../../../../components/ui/SingleImageInput';
import { EmployeeFormValues, buildEmployeeSchema } from '../core/schema';
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
import { useTinhThanhList } from '../../danh-sach-tinh-thanh/hooks/use-dia-ban';
import { getXaPhuongAll } from '../../danh-sach-tinh-thanh/services/dia-ban-service';
import { queryKeys } from '@/lib/query-keys';
import { geoDataQueryOptions } from '@/lib/supabase/query-config';
import { getDefaultEmployeeFormValues, employeeToFormValues } from '../utils/employee-to-form';
import AuthConflictDialog from './auth-conflict-dialog';
import { useSignedEmployeeAvatarSrc } from '../hooks/use-signed-employee-avatar-src';

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
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaPhuongList = [] } = useQuery({
    queryKey: queryKeys.xaPhuong.listAll,
    queryFn: getXaPhuongAll,
    ...geoDataQueryOptions,
  });

  const employeeResolver = useMemo(
    () => zodResolver(buildEmployeeSchema(positions)) as Resolver<EmployeeFormValues>,
    [positions],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<EmployeeFormValues>({
    resolver: employeeResolver,
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
  const selectedUnit = useWatch({ control, name: 'id_bo_phan' });
  const selectedChucVuId = useWatch({ control, name: 'id_chuc_vu' });
  const watchedUsername = (useWatch({ control, name: 'ten_tai_khoan' }) ?? '').trim().toLowerCase();
  const watchedHinhAnh = useWatch({ control, name: 'hinh_anh' });
  const avatarDisplaySrc = useSignedEmployeeAvatarSrc(watchedHinhAnh ?? null);
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

  const needsDonViXaPhuong = useMemo(() => {
    const id = selectedChucVuId ? String(selectedChucVuId) : '';
    if (!id) return false;
    const p = positions.find((x) => String(x.id) === id);
    return p?.cap_quan_ly === 'Xã phường';
  }, [positions, selectedChucVuId]);

  const tinhById = useMemo(() => new Map(tinhList.map((t) => [t.id, t.ten])), [tinhList]);

  const xaPhuongOptions = useMemo(() => {
    const rows = [...xaPhuongList].sort((a, b) => {
      const ta = (tinhById.get(a.id_tinh_thanh) ?? '').localeCompare(tinhById.get(b.id_tinh_thanh) ?? '', 'vi');
      if (ta !== 0) return ta;
      return a.ten.localeCompare(b.ten, 'vi');
    });
    return rows.map((x) => {
      const tinhTen = tinhById.get(x.id_tinh_thanh) ?? '';
      return {
        label: tinhTen ? `${x.ten} (${tinhTen})` : x.ten,
        value: String(x.id),
      };
    });
  }, [xaPhuongList, tinhById]);

  const positionOptions = useMemo(() => {
    const active = positions.filter((p) => p.trang_thai === 'Đang hoạt động');
    const dept = selectedDept ? String(selectedDept) : '';
    const unit = selectedUnit ? String(selectedUnit) : '';
    if (!dept && !unit) return active.map((p) => ({ label: p.ten_chuc_vu, value: String(p.id) }));
    // Chức vụ có thể gắn `phong_ban_id` = phòng ban cha hoặc bộ phận con — khi đã chọn bộ phận,
    // vẫn hiện chức vụ thuộc phòng ban đang chọn (tránh list rỗng / không có dropdown).
    const allowedDeptIds = new Set<string>();
    if (dept) allowedDeptIds.add(dept);
    if (unit) allowedDeptIds.add(unit);
    return active
      .filter((p) => {
        const pb = p.phong_ban_id == null || p.phong_ban_id === '' ? '' : String(p.phong_ban_id);
        if (!pb) return false;
        return allowedDeptIds.has(pb);
      })
      .map((p) => ({ label: p.ten_chuc_vu, value: String(p.id) }));
  }, [positions, selectedDept, selectedUnit]);

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
                    displaySrc={avatarDisplaySrc || undefined}
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
                  onChange={(v) => {
                    const next = v || '';
                    if (next !== (field.value || '')) {
                      setValue('id_bo_phan', '');
                      setValue('id_chuc_vu', '');
                      setValue('don_vi_id', '');
                    }
                    field.onChange(next);
                  }}
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
                  onChange={(v) => {
                    const next = v || '';
                    if (next !== (field.value || '')) {
                      setValue('id_chuc_vu', '');
                      setValue('don_vi_id', '');
                    }
                    field.onChange(next);
                  }}
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
                  onChange={(v) => {
                    field.onChange(v || '');
                    setValue('don_vi_id', '');
                  }}
                  placeholder={txt('employee.form.positionPlaceholder')}
                  error={errors.id_chuc_vu?.message}
                  icon={<Briefcase size={12} />}
                  disabled={!selectedDept}
                  required
                  dropdownInPortal
                />
              )}
            />
            {needsDonViXaPhuong && (
              <Controller
                name="don_vi_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('employee.form.donViXaPhuong')}
                    options={xaPhuongOptions}
                    value={field.value || ''}
                    onChange={(v) => field.onChange(v || '')}
                    placeholder={txt('employee.form.donViXaPhuongPlaceholder')}
                    error={errors.don_vi_id?.message}
                    icon={<MapPin size={12} />}
                    required
                    searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                    dropdownInPortal
                  />
                )}
              />
            )}
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
