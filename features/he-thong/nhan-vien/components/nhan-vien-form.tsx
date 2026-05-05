
import React, { useEffect, useMemo, useState } from 'react';
import { txt } from '../../../../lib/text';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UserPlus, Save, ArrowRight, UserCircle, Camera,
  Mail, Phone, Briefcase, IdCard, User, UserRound, Building2, Calendar,
  CircleDot, MapPin, Heart, GraduationCap, Landmark,
  CreditCard, ShieldCheck, FileText, Globe, Users, BookOpen,
  Church, AlertCircle,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Combobox from '../../../../components/ui/Combobox';
import RadioGroup from '../../../../components/ui/RadioGroup';
import SingleImageInput from '../../../../components/ui/SingleImageInput';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '../../../../components/shared/GenericDrawer';
import FormSection from '../../../../components/shared/FormSection';
import FormGrid from '../../../../components/shared/FormGrid';
import { FormStepper } from '../../../../components/shared/FormStepper';
import { employeeSchema, EmployeeFormValues } from '../core/schema';
import { BTN_CANCEL, BTN_SAVE, BTN_CREATE } from '../../../../lib/button-labels';
import { getTodayISO } from '../../../../lib/utils';
import { Employee } from '../core/types';
import { getDefaultEmployeeFormValues, employeeToFormValues } from '../utils/employee-to-form';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/use-nhan-vien';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { usePositions } from '../../chuc-vu/hooks/use-chuc-vu';
import { useJobLevels } from '../../cap-bac/hooks/use-cap-bac';
import { useBranches } from '../../chi-nhanh/hooks/use-chi-nhanh';
import {
  MARITAL_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
} from '../core/constants';
import { EMPLOYEE_FIELD_DATA_TYPE } from '../core/employee-field-meta';
import { RhfDataField } from '../../../../components/data-types';

interface Props {
  initialData?: Employee | null;
  prefillData?: Partial<EmployeeFormValues>;
  onClose: () => void;
}

const FORM_STEPS = 3;

const EmployeeForm: React.FC<Props> = ({ initialData, prefillData, onClose }) => {
  const isEdit = !!initialData;
  const [formStep, setFormStep] = useState(0);

  const stepperSteps = useMemo(
    () => [
      { id: 'core', label: txt('employee.form.stepCoreLabel'), description: txt('employee.form.stepCoreDesc') },
      { id: 'contact', label: txt('employee.form.stepContactLabel'), description: txt('employee.form.stepContactDesc') },
      { id: 'extra', label: txt('employee.form.stepExtraLabel'), description: txt('employee.form.stepExtraDesc') },
    ],
    []
  );
  const createMutation = useCreateEmployee(onClose);
  const updateMutation = useUpdateEmployee(onClose);

  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { data: jobLevels = [] } = useJobLevels();
  const { data: branches = [] } = useBranches();

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        label: d.ten_phong_ban,
        value: d.id,
        subLabel: d.ma_phong_ban,
      })),
    [departments]
  );

  const positionOptions = useMemo(
    () =>
      positions
        .filter((p) => p.trang_thai === 'Đang hoạt động')
        .map((p) => ({
          label: p.ten_chuc_vu,
          value: p.id,
          subLabel: p.ma_chuc_vu,
        })),
    [positions]
  );

  const jobLevelOptions = useMemo(
    () =>
      jobLevels
        .filter((l: { trang_thai?: string }) => l.trang_thai === 'Đang hoạt động')
        .map((l: { ten_cap_bac: string; id: string; ma_cap_bac: string }) => ({
          label: l.ten_cap_bac,
          value: l.id,
          subLabel: l.ma_cap_bac,
        })),
    [jobLevels]
  );

  const branchOptions = useMemo(
    () =>
      branches
        .filter((b) => b.trang_thai === 'Đang hoạt động')
        .map((b) => ({
          label: b.ten_chi_nhanh,
          value: b.id,
          subLabel: b.ma_chi_nhanh,
        })),
    [branches]
  );

  const statusOptions = useMemo(
    () => [
      { value: '1', label: txt('employee.statusActive') },
      { value: '2', label: txt('employee.statusProbation') },
      { value: '3', label: txt('employee.statusLeave') },
      { value: '0', label: txt('employee.statusResigned') },
    ],
    []
  );

  const defaultValues = getDefaultEmployeeFormValues(getTodayISO());

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues,
  });

  useEffect(() => {
    if (initialData) {
      reset(employeeToFormValues(initialData));
    } else if (prefillData) {
      reset((prev) => ({
        ...prev,
        ...prefillData,
        ngay_vao_lam: prefillData.ngay_vao_lam || getTodayISO(),
        trang_thai: prefillData.trang_thai !== undefined ? prefillData.trang_thai : 'Đang làm việc',
      }));
    }
  }, [initialData, prefillData, reset]);

  const onSubmit = (data: EmployeeFormValues) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const renderFooter = useMemo(() => (
    <div className="flex items-center justify-between w-full gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onClose}
        className="h-8 px-3 text-xs border-border text-muted-foreground"
      >
        {BTN_CANCEL()}
      </Button>
      <div className="flex items-center gap-2">
        {formStep > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormStep((s) => Math.max(0, s - 1))}
            className="h-8 px-3 text-xs"
          >
            {txt('nav.back')}
          </Button>
        )}
        {formStep < FORM_STEPS - 1 ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setFormStep((s) => Math.min(FORM_STEPS - 1, s + 1))}
            className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
          >
            {txt('employee.form.stepNext')}
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 shrink-0" />
          </Button>
        ) : (
          <Button
            type="submit"
            form="emp-form"
            size="sm"
            isLoading={isLoading}
            className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
          >
            {isEdit ? (
              <>
                <Save className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {BTN_SAVE()}
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                {BTN_CREATE()}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  ), [onClose, isLoading, isEdit, formStep]);

  return (
    <GenericDrawer
        title={isEdit ? txt('employee.form.editTitle') : txt('employee.form.createTitle')}
        subtitle={isEdit ? `${txt('employee.form.editSubtitle')} ${initialData.ma_nhan_vien}` : txt('employee.form.createSubtitle')}
        icon={<UserCircle size={20} />}
        onClose={onClose}
        footer={renderFooter}
        footerCompact
        maxWidthClass={DRAWER_WIDTH_FORM}
    >
          <form id="emp-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             {Object.keys(errors).length > 0 && (
               <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
                 <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
                 <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                   {txt('employee.form.validationError')}
                 </p>
               </div>
             )}

             <FormStepper
               steps={stepperSteps}
               currentStep={formStep}
               allowBackNavigation
               onStepClick={(idx) => setFormStep(idx)}
               className="pb-1"
             />

             {formStep === 0 && (
             <>
             {/* ===== SECTION 1: Thông tin cá nhân ===== */}
             <FormSection title={txt('employee.form.personalInfo')} icon={<User size={14} />}>
                <div className="flex justify-center">
                    <Controller
                        name="anh_dai_dien"
                        control={control}
                        render={({ field }) => (
                            <SingleImageInput
                                label={txt('employee.form.avatar')}
                                icon={<Camera className="w-4 h-4" />}
                                value={field.value}
                                onChange={field.onChange}
                                shape="circle"
                                maxSizeMB={2}
                                placeholder={txt('employee.form.avatarPlaceholder')}
                                hint={txt('employee.form.avatarHint')}
                                className="w-[180px]"
                            />
                        )}
                    />
                </div>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.fullName')}
                        placeholder={txt('employee.form.fullNamePlaceholder')}
                        required
                        icon={<User className="w-4 h-4 text-muted-foreground" />}
                        {...register('ho_ten')}
                        error={errors.ho_ten?.message}
                    />
                    <Controller
                        name="gioi_tinh"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup
                                label={txt('employee.form.gender')}
                                labelIcon={<Users className="w-4 h-4 text-muted-foreground" />}
                                options={[
                                    { value: 'Nam', label: txt('employee.genderMale'), color: 'indigo' },
                                    { value: 'Nữ', label: txt('employee.genderFemale'), color: 'pink' },
                                    { value: 'Khác', label: txt('employee.genderOther'), color: 'slate' },
                                ]}
                                showColorDot
                                size="sm"
                                value={field.value}
                                onChange={(val) => field.onChange(val)}
                            />
                        )}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.employeeCode')}
                        placeholder={txt('employee.form.employeeCodePlaceholder')}
                        required
                        icon={<IdCard className="w-4 h-4 text-muted-foreground" />}
                        {...register('ma_nhan_vien')}
                        error={errors.ma_nhan_vien?.message}
                        onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            register('ma_nhan_vien').onChange(e);
                        }}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <RhfDataField
                        control={control}
                        name="ngay_sinh"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.ngay_sinh!}
                        label={txt('employee.form.birthDate')}
                    />
                    <Input
                        label={txt('employee.form.idCard')}
                        placeholder={txt('employee.form.idCardPlaceholder')}
                        icon={<IdCard className="w-4 h-4 text-muted-foreground" />}
                        {...register('cmnd_cccd')}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.idIssueDate')}
                        type="date"
                        icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
                        {...register('ngay_cap_cccd')}
                    />
                    <Input
                        label={txt('employee.form.idIssuePlace')}
                        placeholder={txt('employee.form.idIssuePlaceholder')}
                        icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                        {...register('noi_cap_cccd')}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.nationality')}
                        placeholder={txt('employee.form.nationalityPlaceholder')}
                        icon={<Globe className="w-4 h-4 text-muted-foreground" />}
                        {...register('quoc_tich')}
                    />
                    <Input
                        label={txt('employee.form.ethnicity')}
                        placeholder={txt('employee.form.ethnicityPlaceholder')}
                        icon={<UserRound className="w-4 h-4 text-muted-foreground" />}
                        {...register('dan_toc')}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.religion')}
                        placeholder={txt('employee.form.religionPlaceholder')}
                        icon={<Church className="w-4 h-4 text-muted-foreground" />}
                        {...register('ton_giao')}
                    />
                </FormGrid>
             </FormSection>

             {/* ===== SECTION 2: Thông tin công việc ===== */}
             <FormSection title={txt('employee.form.workInfo')} icon={<Briefcase size={14} />}>
                <FormGrid cols={2}>
                    <RhfDataField
                        control={control}
                        name="chuc_vu_id"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.chuc_vu_id!}
                        label={txt('employee.form.position')}
                        required
                        options={positionOptions}
                    />
                    <RhfDataField
                        control={control}
                        name="phong_ban_id"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.phong_ban_id!}
                        label={txt('employee.form.department')}
                        required
                        options={departmentOptions}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <RhfDataField
                        control={control}
                        name="cap_bac_id"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.cap_bac_id!}
                        label={txt('employee.form.level')}
                        options={jobLevelOptions}
                    />
                    <RhfDataField
                        control={control}
                        name="chi_nhanh_id"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.chi_nhanh_id!}
                        label={txt('employee.form.branch')}
                        options={branchOptions}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.hireDate')}
                        type="date"
                        required
                        icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
                        {...register('ngay_vao_lam')}
                        error={errors.ngay_vao_lam?.message}
                    />
                    <Controller
                        name="trang_thai"
                        control={control}
                        render={({ field }) => (
                            <Combobox
                                label={txt('employee.form.workStatus')}
                                options={statusOptions}
                                value={String(field.value)}
                                onChange={(val) => field.onChange(Number(val))}
                                placeholder={txt('employee.form.workStatusPlaceholder')}
                                icon={<CircleDot size={16} className="text-muted-foreground" />}
                                searchable={false}
                            />
                        )}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Controller
                        name="loai_hop_dong"
                        control={control}
                        render={({ field }) => (
                            <Combobox
                                label={txt('employee.form.contractType')}
                                options={CONTRACT_TYPE_OPTIONS}
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder={txt('employee.form.contractTypePlaceholder')}
                                icon={<FileText size={16} className="text-muted-foreground" />}
                                searchable={false}
                            />
                        )}
                    />
                    <Input
                        label={txt('employee.form.contractEndDate')}
                        type="date"
                        icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
                        {...register('ngay_het_han_hd')}
                    />
                </FormGrid>
                <FormGrid cols={1}>
                    <Input
                        label={txt('employee.form.workplace')}
                        placeholder={txt('employee.form.workplacePlaceholder')}
                        icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                        {...register('noi_lam_viec')}
                    />
                </FormGrid>
             </FormSection>
             </>
             )}

             {formStep === 1 && (
             <>
             {/* ===== SECTION 3: Thông tin liên hệ ===== */}
             <FormSection title={txt('employee.form.contactInfo')} icon={<Phone size={14} />}>
                <FormGrid cols={2}>
                    <RhfDataField
                        control={control}
                        name="email"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.email!}
                        label={txt('employee.form.workEmail')}
                        required
                        placeholder={txt('employee.form.workEmailPlaceholder')}
                        icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                    />
                    <RhfDataField
                        control={control}
                        name="email_ca_nhan"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.email_ca_nhan!}
                        label={txt('employee.form.personalEmail')}
                        placeholder={txt('employee.form.personalEmailPlaceholder')}
                        icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <RhfDataField
                        control={control}
                        name="so_dien_thoai"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.so_dien_thoai!}
                        label={txt('employee.form.phoneNumber')}
                        required
                        placeholder={txt('employee.form.phonePlaceholder')}
                        icon={<Phone className="w-4 h-4 text-muted-foreground" />}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.emergencyContact')}
                        placeholder={txt('employee.form.emergencyContactPlaceholder')}
                        icon={<User className="w-4 h-4 text-muted-foreground" />}
                        {...register('nguoi_lien_he_khan_cap')}
                    />
                    <RhfDataField
                        control={control}
                        name="sdt_khan_cap"
                        dataType={EMPLOYEE_FIELD_DATA_TYPE.sdt_khan_cap!}
                        label={txt('employee.form.emergencyPhone')}
                        placeholder={txt('employee.form.phonePlaceholder')}
                        icon={<Phone className="w-4 h-4 text-muted-foreground" />}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Controller
                        name="quan_he_khan_cap"
                        control={control}
                        render={({ field }) => (
                            <Combobox
                                label={txt('employee.form.relationship')}
                                options={RELATIONSHIP_OPTIONS}
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder={txt('employee.form.relationshipPlaceholder')}
                                icon={<Users size={16} className="text-muted-foreground" />}
                                searchable={false}
                            />
                        )}
                    />
                </FormGrid>
             </FormSection>

             {/* ===== SECTION 4: Địa chỉ ===== */}
             <FormSection title={txt('employee.form.address')} icon={<MapPin size={14} />}>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.province')}
                        placeholder={txt('employee.form.provincePlaceholder')}
                        icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                        {...register('tinh_thanh')}
                    />
                    <Input
                        label={txt('employee.form.district')}
                        placeholder={txt('employee.form.districtPlaceholder')}
                        icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                        {...register('quan_huyen')}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.ward')}
                        placeholder={txt('employee.form.wardPlaceholder')}
                        icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                        {...register('phuong_xa')}
                    />
                </FormGrid>
                <FormGrid cols={1}>
                    <Input
                        label={txt('employee.form.detailAddress')}
                        placeholder={txt('employee.form.detailAddressPlaceholder')}
                        icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                        {...register('dia_chi_cu_the')}
                    />
                </FormGrid>
                <FormGrid cols={1}>
                    <Input
                        label={txt('employee.form.tempAddress')}
                        placeholder={txt('employee.form.tempAddressPlaceholder')}
                        icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                        {...register('dia_chi_tam_tru')}
                    />
                </FormGrid>
             </FormSection>

             {/* ===== SECTION 5: Hôn nhân & Gia đình ===== */}
             <FormSection title={txt('employee.form.familyInfo')} icon={<Heart size={14} />}>
                <FormGrid cols={2}>
                    <Controller
                        name="tinh_trang_hon_nhan"
                        control={control}
                        render={({ field }) => (
                            <Combobox
                                label={txt('employee.form.maritalStatus')}
                                options={MARITAL_STATUS_OPTIONS}
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder={txt('employee.form.maritalPlaceholder')}
                                icon={<Heart size={16} className="text-muted-foreground" />}
                                searchable={false}
                            />
                        )}
                    />
                    <Input
                        label={txt('employee.form.dependents')}
                        type="number"
                        placeholder={txt('employee.form.dependentsPlaceholder')}
                        icon={<Users className="w-4 h-4 text-muted-foreground" />}
                        {...register('so_nguoi_phu_thuoc')}
                    />
                </FormGrid>
             </FormSection>

             </>
             )}

             {formStep === 2 && (
             <>
             {/* ===== SECTION 6: Học vấn & Chứng chỉ ===== */}
             <FormSection title={txt('employee.form.educationInfo')} icon={<GraduationCap size={14} />}>
                <FormGrid cols={2}>
                    <Controller
                        name="trinh_do_hoc_van"
                        control={control}
                        render={({ field }) => (
                            <Combobox
                                label={txt('employee.form.educationLevel')}
                                options={EDUCATION_LEVEL_OPTIONS}
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder={txt('employee.form.educationPlaceholder')}
                                icon={<GraduationCap size={16} className="text-muted-foreground" />}
                                searchable={false}
                            />
                        )}
                    />
                    <Input
                        label={txt('employee.form.major')}
                        placeholder={txt('employee.form.majorPlaceholder')}
                        icon={<BookOpen className="w-4 h-4 text-muted-foreground" />}
                        {...register('chuyen_nganh')}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.school')}
                        placeholder={txt('employee.form.schoolPlaceholder')}
                        icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                        {...register('truong_hoc')}
                    />
                    <Input
                        label={txt('employee.form.graduationYear')}
                        placeholder={txt('employee.form.graduationYearPlaceholder')}
                        icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
                        {...register('nam_tot_nghiep')}
                    />
                </FormGrid>
                <FormGrid cols={1}>
                    <Input
                        label={txt('employee.form.certificates')}
                        placeholder={txt('employee.form.certificatesPlaceholder')}
                        icon={<FileText className="w-4 h-4 text-muted-foreground" />}
                        {...register('chung_chi')}
                    />
                </FormGrid>
             </FormSection>

             {/* ===== SECTION 7: Tài chính & Ngân hàng ===== */}
             <FormSection title={txt('employee.form.financialInfo')} icon={<Landmark size={14} />}>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.bankAccount')}
                        placeholder={txt('employee.form.bankAccountPlaceholder')}
                        icon={<CreditCard className="w-4 h-4 text-muted-foreground" />}
                        {...register('so_tai_khoan')}
                    />
                    <Input
                        label={txt('employee.form.bankName')}
                        placeholder={txt('employee.form.bankNamePlaceholder')}
                        icon={<Landmark className="w-4 h-4 text-muted-foreground" />}
                        {...register('ten_ngan_hang')}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.bankBranch')}
                        placeholder={txt('employee.form.bankBranchPlaceholder')}
                        icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                        {...register('chi_nhanh_nh')}
                    />
                    <Input
                        label={txt('employee.form.taxId')}
                        placeholder={txt('employee.form.taxIdPlaceholder')}
                        icon={<FileText className="w-4 h-4 text-muted-foreground" />}
                        {...register('ma_so_thue_ca_nhan')}
                    />
                </FormGrid>
             </FormSection>

             {/* ===== SECTION 8: Bảo hiểm ===== */}
             <FormSection title={txt('employee.form.insuranceInfo')} icon={<ShieldCheck size={14} />}>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.socialInsurance')}
                        placeholder={txt('employee.form.socialInsurancePlaceholder')}
                        icon={<ShieldCheck className="w-4 h-4 text-muted-foreground" />}
                        {...register('so_bhxh')}
                    />
                    <Input
                        label={txt('employee.form.healthInsurance')}
                        placeholder={txt('employee.form.healthInsurancePlaceholder')}
                        icon={<ShieldCheck className="w-4 h-4 text-muted-foreground" />}
                        {...register('so_bhyt')}
                    />
                </FormGrid>
                <FormGrid cols={2}>
                    <Input
                        label={txt('employee.form.insuranceDate')}
                        type="date"
                        icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
                        {...register('ngay_tham_gia_bh')}
                    />
                    <Input
                        label={txt('employee.form.medicalFacility')}
                        placeholder={txt('employee.form.medicalFacilityPlaceholder')}
                        icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                        {...register('noi_dang_ky_kcb')}
                    />
                </FormGrid>
             </FormSection>

             </>
             )}
          </form>
    </GenericDrawer>
  );
};

export default EmployeeForm;
