import React, { useState, useMemo } from 'react';
import { txt } from '../lib/text';
import { useAuthStore } from '../store/useStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import SingleImageInput from '../components/ui/SingleImageInput';
import DashboardToolbar from '../components/shared/DashboardToolbar';
import DetailToolbar from '../components/shared/DetailToolbar';
import DetailSection from '../components/shared/DetailSection';
import DetailField from '../components/shared/DetailField';
import DetailFieldGrid from '../components/shared/DetailFieldGrid';
import EnumBadge from '../components/ui/EnumBadge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, User as UserIcon, Mail, Shield, ShieldCheck, Calendar,
  Camera, Key, X,
  Phone, Briefcase, Building2, Clock, FileText, Globe,
  Users, IdCard, MapPin, Heart, GraduationCap, BookOpen,
  Landmark, CreditCard,
} from 'lucide-react';
import { formatDate, getTenureText, getAvatarUrl } from '../lib/utils';
import {
  GENDER_BADGE_CONFIG,
  MARITAL_BADGE_CONFIG,
  CONTRACT_BADGE_CONFIG,
  EDUCATION_BADGE_CONFIG,
} from '../features/he-thong/nhan-vien/core/constants';
import { canEditProfile } from '../lib/profile-permissions';
import type { Employee } from '../features/he-thong/nhan-vien/core/types';
import { useEmployees } from '../features/he-thong/nhan-vien/hooks/use-nhan-vien';
import { useUpdateEmployee } from '../features/he-thong/nhan-vien/hooks/use-nhan-vien';
import { employeeToFormValues } from '../features/he-thong/nhan-vien/utils/employee-to-form';

const Profile: React.FC = () => {
  const { user, login } = useAuthStore();
  const { data: employees = [] } = useEmployees();
  const updateEmployeeMutation = useUpdateEmployee();

  const currentEmployee = useMemo(
    () => (user?.email ? employees.find((e) => e.email === user.email) ?? null : null),
    [employees, user],
  );

  const displayData: Employee = useMemo(() => {
    if (currentEmployee) return currentEmployee;
    return {
      id: '',
      ma_nhan_vien: '',
      ho_ten: user?.full_name ?? '',
      email: user?.email ?? '',
      so_dien_thoai: '',
      phong_ban_id: null,
      chuc_vu_id: null,
      gioi_tinh: 'Khác',
      trang_thai: 'Đang làm việc',
      ngay_vao_lam: '',
    } as Employee;
  }, [currentEmployee, user?.full_name, user?.email]);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const editable = canEditProfile(user);

  const displayName = currentEmployee?.ho_ten ?? user?.full_name ?? '';
  const displayEmail = currentEmployee?.email ?? user?.email ?? '';
  const displayAvatar = currentEmployee?.anh_dai_dien ?? user?.avatar_url ?? null;
  const displayJoinedAt = currentEmployee?.ngay_vao_lam ?? user?.created_at;

  const handleAvatarSave = async () => {
    if (!user) return;
    if (avatarPreview === null) return;
    if (currentEmployee) {
      try {
        const payload = employeeToFormValues(currentEmployee);
        await updateEmployeeMutation.mutateAsync({
          id: currentEmployee.id,
          data: { ...payload, anh_dai_dien: avatarPreview },
        });
        login({ ...user, avatar_url: avatarPreview });
        toast.success(txt('page.profile.avatarUpdateSuccess'));
      } catch {
        toast.error(txt('page.profile.userNotFound'));
      }
    } else {
      login({ ...user, avatar_url: avatarPreview });
      toast.success(txt('page.profile.avatarUpdateSuccess'));
    }
    setAvatarModalOpen(false);
    setAvatarPreview(null);
  };

  const roleLabel = user?.role === 'admin' ? txt('nav.roleAdmin') : txt('page.profile.roleUser');
  const avatarAlt = displayName
    ? txt('page.profile.avatarAlt', { name: displayName })
    : txt('page.profile.avatarAltFallback');
  const emptyText = txt('page.profile.emptyField');

  const toolbarActions = useMemo(() => {
    if (!editable) return [];
    return [
      {
        label: txt('page.profile.changeAvatar'),
        icon: <Camera />,
        onClick: () => {
          setAvatarPreview(displayAvatar);
          setAvatarModalOpen(true);
        },
        variant: 'info' as const,
      },
      {
        label: txt('page.profile.changePassword'),
        icon: <Key />,
        onClick: () => setPasswordModalOpen(true),
        variant: 'secondary' as const,
      },
    ];
  }, [editable, displayAvatar]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">{txt('page.profile.userNotFound')}</p>
      </div>
    );
  }

  const data = displayData;

  return (
    <div className="flex flex-col min-h-0">
      <DashboardToolbar
        leadingContent={
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UserIcon className="h-4 w-4" />
            </div>
            <h1 className="text-sm font-semibold text-foreground truncate">
              {txt('page.profile.title')}
            </h1>
          </div>
        }
      />
      <div className="px-4 sm:px-6 space-y-4 sm:space-y-6 pb-10 pt-3 md:pt-4 max-w-full">
      {/* View-only banner */}
      {!editable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-amber-800 dark:text-amber-200"
          role="status"
        >
          {txt('page.profile.viewOnlyBanner')}
        </motion.div>
      )}

      {/* ===== Main layout: sidebar + content ===== */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch lg:items-start w-full">
        {/* --- Sidebar: compact horizontal on mobile, vertical card on desktop --- */}
        <motion.aside
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-6"
        >
          <div className="rounded-xl border border-border bg-card shadow-sm relative overflow-hidden">
            {/* Cover gradient – shorter on mobile */}
            <div className="h-16 sm:h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" aria-hidden="true" />

            {/* Avatar + identity: horizontal on mobile, centered on desktop */}
            <div className="px-4 sm:px-6 -mt-8 sm:-mt-12">
              {/* Mobile: flex row | Desktop: text-center stacked */}
              <div className="flex items-end gap-3 sm:block sm:text-center">
                <div className="relative shrink-0 sm:inline-block">
                  <img
                    src={avatarPreview ?? displayAvatar ?? getAvatarUrl(displayName, 128)}
                    alt={avatarAlt}
                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-[3px] sm:border-4 border-card shadow-lg object-cover"
                  />
                  <span
                    className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-card rounded-full"
                    title={txt('page.profile.activeStatus')}
                    aria-hidden="true"
                  />
                </div>
                <div className="pb-1 sm:pb-0 sm:mt-3 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight truncate">{displayName}</h3>
                  <span className="inline-block mt-1 sm:mt-1.5 bg-primary/10 text-primary px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick info – 2-col grid on mobile, stacked on desktop */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 sm:gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground min-w-0">
                  <Mail size={14} className="shrink-0" />
                  <span className="truncate">{displayEmail}</span>
                </div>
                {displayData.so_dien_thoai && (
                  <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                    <Phone size={14} className="shrink-0" />
                    <span className="truncate">{displayData.so_dien_thoai}</span>
                  </div>
                )}
                {displayData.ten_phong_ban && (
                  <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                    <Building2 size={14} className="shrink-0" />
                    <span className="truncate">{displayData.ten_phong_ban}</span>
                  </div>
                )}
                {displayData.ten_chuc_vu && (
                  <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                    <Briefcase size={14} className="shrink-0" />
                    <span className="truncate">{displayData.ten_chuc_vu}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                  <Calendar size={14} className="shrink-0" />
                  <span className="truncate">{txt('page.profile.joinedAt')} {formatDate(displayJoinedAt)}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                  <Shield size={14} className="shrink-0" />
                  <span>{txt('page.profile.verified')}</span>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            {toolbarActions.length > 0 && (
              <div className="border-t border-border">
                <DetailToolbar
                  actions={toolbarActions}
                  columns={2}
                  className="py-3 sm:py-4"
                />
              </div>
            )}
          </div>
        </motion.aside>

        {/* --- Content: sections xếp dọc, full width mobile --- */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full min-w-0 flex-1 space-y-4 sm:space-y-5"
        >
          {/* [1] Thông tin cá nhân */}
          <DetailSection title={txt('employee.detail.personalInfo')} icon={<UserIcon size={14} />} variant="primary">
            <DetailFieldGrid cols={3}>
              <DetailField label={txt('employee.detail.fullName')} value={data.ho_ten} icon={<UserIcon size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.birthDate')} value={data.ngay_sinh ? formatDate(data.ngay_sinh) : undefined} icon={<Calendar size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.gender')} value={data.gioi_tinh ? <EnumBadge value={data.gioi_tinh} config={GENDER_BADGE_CONFIG} /> : undefined} icon={<Users size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.idCard')} value={data.cmnd_cccd} icon={<IdCard size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.idIssueDate')} value={data.ngay_cap_cccd ? formatDate(data.ngay_cap_cccd) : undefined} icon={<Calendar size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.idIssuePlace')} value={data.noi_cap_cccd} icon={<MapPin size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.nationality')} value={data.quoc_tich} icon={<Globe size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.ethnicity')} value={data.dan_toc} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.religion')} value={data.ton_giao} emptyText={emptyText} />
            </DetailFieldGrid>
          </DetailSection>

          {/* [2] Thông tin công việc */}
          <DetailSection title={txt('employee.detail.workInfo')} icon={<Briefcase size={14} />} variant="primary">
            <DetailFieldGrid cols={3}>
              <DetailField label={txt('employee.detail.employeeCode')} value={data.ma_nhan_vien} icon={<FileText size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.position')} value={data.ten_chuc_vu} icon={<Briefcase size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.department')} value={data.ten_phong_ban} icon={<Building2 size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.level')} value={data.ten_cap_bac} icon={<Users size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.hireDate')} value={data.ngay_vao_lam ? formatDate(data.ngay_vao_lam) : undefined} icon={<Calendar size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.tenure')} value={getTenureText(data.ngay_vao_lam)} icon={<Clock size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.contractType')} value={data.loai_hop_dong ? <EnumBadge value={data.loai_hop_dong} config={CONTRACT_BADGE_CONFIG} /> : undefined} icon={<FileText size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.contractEndDate')} value={data.ngay_het_han_hd ? formatDate(data.ngay_het_han_hd) : undefined} icon={<Calendar size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.workplace')} value={data.noi_lam_viec} icon={<Building2 size={12} />} emptyText={emptyText} />
            </DetailFieldGrid>
          </DetailSection>

          {/* [3] Liên hệ & Địa chỉ (gộp) */}
          <DetailSection title={txt('employee.detail.contactInfo')} icon={<Phone size={14} />} variant="primary">
            <DetailFieldGrid cols={3}>
              <DetailField label={txt('employee.detail.workEmail')} value={data.email} icon={<Mail size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.personalEmail')} value={data.email_ca_nhan} icon={<Mail size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.phone')} value={data.so_dien_thoai} icon={<Phone size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.emergencyContact')} value={data.nguoi_lien_he_khan_cap} icon={<UserIcon size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.emergencyPhone')} value={data.sdt_khan_cap} icon={<Phone size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.relationship')} value={data.quan_he_khan_cap} icon={<Users size={12} />} emptyText={emptyText} />
            </DetailFieldGrid>
            {/* Địa chỉ */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5 sm:mb-3 flex items-center gap-1.5">
                <MapPin size={12} /> {txt('employee.detail.address')}
              </p>
              <DetailFieldGrid cols={3}>
                <DetailField label={txt('employee.detail.province')} value={data.tinh_thanh} icon={<MapPin size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.district')} value={data.quan_huyen} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.ward')} value={data.phuong_xa} emptyText={emptyText} />
              </DetailFieldGrid>
              <DetailFieldGrid cols={2} className="mt-3">
                <DetailField label={txt('employee.detail.detailAddress')} value={data.dia_chi_cu_the} icon={<MapPin size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.tempAddress')} value={data.dia_chi_tam_tru} icon={<MapPin size={12} />} emptyText={emptyText} />
              </DetailFieldGrid>
            </div>
          </DetailSection>

          {/* [4] Hôn nhân & Học vấn (gộp) */}
          <DetailSection title={txt('employee.detail.familyInfo')} icon={<Heart size={14} />} variant="primary">
            <DetailFieldGrid cols={3}>
              <DetailField label={txt('employee.detail.maritalStatus')} value={data.tinh_trang_hon_nhan ? <EnumBadge value={data.tinh_trang_hon_nhan} config={MARITAL_BADGE_CONFIG} /> : undefined} icon={<Heart size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.dependents')} value={data.so_nguoi_phu_thuoc !== undefined && data.so_nguoi_phu_thuoc !== null ? String(data.so_nguoi_phu_thuoc) : undefined} icon={<Users size={12} />} emptyText={emptyText} />
            </DetailFieldGrid>
            {/* Học vấn */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5 sm:mb-3 flex items-center gap-1.5">
                <GraduationCap size={12} /> {txt('employee.detail.educationInfo')}
              </p>
              <DetailFieldGrid cols={3}>
                <DetailField label={txt('employee.detail.educationLevel')} value={data.trinh_do_hoc_van ? <EnumBadge value={data.trinh_do_hoc_van} config={EDUCATION_BADGE_CONFIG} /> : undefined} icon={<GraduationCap size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.major')} value={data.chuyen_nganh} icon={<BookOpen size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.school')} value={data.truong_hoc} icon={<Building2 size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.graduationYear')} value={data.nam_tot_nghiep} icon={<Calendar size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.certificates')} value={data.chung_chi} icon={<FileText size={12} />} emptyText={emptyText} />
              </DetailFieldGrid>
            </div>
          </DetailSection>

          {/* [5] Tài chính & Bảo hiểm (gộp) */}
          <DetailSection title={txt('employee.detail.financialInfo')} icon={<Landmark size={14} />} variant="primary">
            <DetailFieldGrid cols={3}>
              <DetailField label={txt('employee.detail.bankAccount')} value={data.so_tai_khoan} icon={<CreditCard size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.bankName')} value={data.ten_ngan_hang} icon={<Landmark size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.bankBranch')} value={data.chi_nhanh_nh} icon={<Building2 size={12} />} emptyText={emptyText} />
              <DetailField label={txt('employee.detail.taxId')} value={data.ma_so_thue_ca_nhan} icon={<FileText size={12} />} emptyText={emptyText} />
            </DetailFieldGrid>
            {/* Bảo hiểm */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5 sm:mb-3 flex items-center gap-1.5">
                <ShieldCheck size={12} /> {txt('employee.detail.insuranceInfo')}
              </p>
              <DetailFieldGrid cols={3}>
                <DetailField label={txt('employee.detail.socialInsurance')} value={data.so_bhxh} icon={<ShieldCheck size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.healthInsurance')} value={data.so_bhyt} icon={<ShieldCheck size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.insuranceDate')} value={data.ngay_tham_gia_bh ? formatDate(data.ngay_tham_gia_bh) : undefined} icon={<Calendar size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.medicalFacility')} value={data.noi_dang_ky_kcb} icon={<Building2 size={12} />} emptyText={emptyText} />
              </DetailFieldGrid>
            </div>
          </DetailSection>

          {/* [6] Thông tin hệ thống */}
          {(data.created_at || data.updated_at) && (
            <DetailSection title={txt('employee.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
              <DetailFieldGrid cols={3}>
                <DetailField label={txt('employee.detail.createdDate')} value={data.created_at ? formatDate(data.created_at) : undefined} icon={<Calendar size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.createdBy')} value={data.created_by} icon={<UserIcon size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.lastUpdated')} value={data.updated_at ? formatDate(data.updated_at) : undefined} icon={<Calendar size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.detail.updatedBy')} value={data.updated_by} icon={<UserIcon size={12} />} emptyText={emptyText} />
              </DetailFieldGrid>
            </DetailSection>
          )}
        </motion.div>
      </div>
      </div>

      {/* ===== Modal: Đổi ảnh đại diện ===== */}
      <AnimatePresence>
        {avatarModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setAvatarModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">{txt('page.profile.avatarModalTitle')}</h3>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={txt('common.close')}
                >
                  <X size={18} />
                </button>
              </div>
              <SingleImageInput
                value={avatarPreview ?? displayAvatar ?? null}
                onChange={setAvatarPreview}
                shape="circle"
                aspectRatio="1/1"
                placeholder={txt('page.profile.changeAvatar')}
                hint={txt('page.profile.avatarModalHint')}
                maxSizeMB={2}
              />
              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setAvatarModalOpen(false)}>
                  {txt('common.cancel')}
                </Button>
                <Button className="flex-1 rounded-xl" onClick={handleAvatarSave} isLoading={updateEmployeeMutation.isPending}>
                  <Save size={16} className="mr-2" /> {txt('common.save')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== Modal: Đổi mật khẩu (Coming soon) ===== */}
      <AnimatePresence>
        {passwordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setPasswordModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">{txt('page.profile.changePasswordTitle')}</h3>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={txt('common.close')}
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{txt('page.profile.changePasswordDesc')}</p>
              <div className="space-y-4">
                <Input label={txt('page.profile.currentPassword')} type="password" placeholder={txt('page.profile.passwordPlaceholder')} disabled />
                <Input label={txt('page.profile.newPassword')} type="password" placeholder={txt('page.profile.passwordPlaceholder')} disabled />
                <Input label={txt('page.profile.confirmPassword')} type="password" placeholder={txt('page.profile.passwordPlaceholder')} disabled />
              </div>
              <div className="mt-4 p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-xs font-medium text-muted-foreground">{txt('page.profile.comingSoon')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{txt('page.profile.comingSoonDesc')}</p>
              </div>
              <div className="flex justify-end mt-6">
                <Button variant="outline" className="rounded-xl" onClick={() => setPasswordModalOpen(false)}>
                  {txt('common.close')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
