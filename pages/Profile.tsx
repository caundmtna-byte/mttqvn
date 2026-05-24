import React, { useMemo, useState } from 'react';
import { useSignedEmployeeAvatarSrc } from '../features/he-thong/nhan-vien/hooks/use-signed-employee-avatar-src';
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
  Save, User as UserIcon, Mail, Shield, Camera, Key, X,
  AtSign, Briefcase, Building2, Layers,
} from 'lucide-react';
import { getAvatarUrl } from '../lib/utils';
import { canEditProfile } from '../lib/profile-permissions';
import { supabaseEmailToLoginName } from '../lib/auth-email';
import { useEmployees, useUpdateEmployee } from '../features/he-thong/nhan-vien/hooks/use-nhan-vien';
import { employeeToFormValues } from '../features/he-thong/nhan-vien/utils/employee-to-form';
import { STATUS_BADGE_CONFIG } from '../features/he-thong/nhan-vien/core/constants';
import {
  changePasswordValidationMessage,
  changeUserPassword,
  validateChangePasswordForm,
} from '../lib/auth/change-password';

const Profile: React.FC = () => {
  const { user, login } = useAuthStore();
  const { data: employees = [] } = useEmployees();
  const updateEmployeeMutation = useUpdateEmployee();

  const currentEmployee = useMemo(() => {
    if (!user) return null;
    return (
      employees.find((e) => {
        const u = user.username?.trim().toLowerCase();
        if (u && e.ten_tai_khoan.trim().toLowerCase() === u) return true;
        const fromEmail = supabaseEmailToLoginName(user.email ?? '');
        return Boolean(fromEmail && e.ten_tai_khoan.trim().toLowerCase() === fromEmail);
      }) ?? null
    );
  }, [employees, user]);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const editable = canEditProfile(user);
  const displayName = currentEmployee?.ho_va_ten ?? user?.full_name ?? '';
  const displayEmail = user?.email ?? '';
  const displayUsername = currentEmployee?.ten_tai_khoan ?? user?.username ?? '';
  const displayAvatar = currentEmployee?.hinh_anh ?? user?.avatar_url ?? null;
  const trangThai = currentEmployee?.trang_thai ?? user?.trang_thai;

  const profileAvatarStored = avatarPreview ?? displayAvatar ?? null;
  const profileAvatarSigned = useSignedEmployeeAvatarSrc(profileAvatarStored);
  const profileAvatarImgSrc = useMemo(() => {
    const s = profileAvatarStored?.trim() ?? '';
    if (!s) return getAvatarUrl(displayName, 128);
    if (s.startsWith('data:image/')) return s;
    if (s.startsWith('http') && !s.includes('.supabase.co')) return s;
    return profileAvatarSigned || getAvatarUrl(displayName, 128);
  }, [profileAvatarStored, profileAvatarSigned, displayName]);

  const handleAvatarSave = async () => {
    if (!user) return;
    if (avatarPreview === null) return;
    if (currentEmployee) {
      try {
        const payload = employeeToFormValues(currentEmployee);
        const updated = await updateEmployeeMutation.mutateAsync({
          id: currentEmployee.id,
          data: { ...payload, hinh_anh: avatarPreview },
        });
        // Sau upload, server trả path Storage (bucket private) — không giữ data URL trong session.
        login({ ...user, avatar_url: updated.hinh_anh ?? undefined });
        toast.success(txt('page.profile.avatarUpdateSuccess'));
      } catch {
        toast.error(txt('page.profile.userNotFound'));
      }
    } else {
      login({ ...user, avatar_url: avatarPreview ?? undefined });
      toast.success(txt('page.profile.avatarUpdateSuccess'));
    }
    setAvatarModalOpen(false);
    setAvatarPreview(null);
  };

  const roleLabel =
    currentEmployee?.ten_chuc_vu?.trim() ||
    user?.ten_chuc_vu?.trim() ||
    txt('employee.unassigned');
  const avatarAlt = displayName
    ? txt('page.profile.avatarAlt', { name: displayName })
    : txt('page.profile.avatarAltFallback');
  const emptyText = txt('page.profile.emptyField');

  const toolbarActions = useMemo(() => {
    const actions = [];
    if (editable) {
      actions.push({
        label: txt('page.profile.changeAvatar'),
        icon: <Camera />,
        onClick: () => {
          setAvatarPreview(displayAvatar);
          setAvatarModalOpen(true);
        },
        variant: 'info' as const,
      });
    }
    actions.push({
      label: txt('page.profile.changePassword'),
      icon: <Key />,
      onClick: () => {
        setPasswordError(null);
        setPasswordForm({ current: '', new: '', confirm: '' });
        setPasswordModalOpen(true);
      },
      variant: 'secondary' as const,
    });
    return actions;
  }, [editable, displayAvatar]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    const validationError = validateChangePasswordForm({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.new,
      confirmPassword: passwordForm.confirm,
    });
    if (validationError) {
      setPasswordError(changePasswordValidationMessage(validationError));
      return;
    }
    setPasswordSubmitting(true);
    try {
      const result = await changeUserPassword(passwordForm.current, passwordForm.new);
      if (result.error) {
        setPasswordError(result.error);
        return;
      }
      setPasswordModalOpen(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
      toast.success(txt('nav.changePassword.success'));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">{txt('page.profile.userNotFound')}</p>
      </div>
    );
  }

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

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch lg:items-start w-full">
          <motion.aside
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-6"
          >
            <div className="rounded-xl border border-border bg-card shadow-sm relative overflow-hidden">
              <div className="h-16 sm:h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" aria-hidden="true" />

              <div className="px-4 sm:px-6 -mt-8 sm:-mt-12">
                <div className="flex items-end gap-3 sm:block sm:text-center">
                  <div className="relative shrink-0 sm:inline-block">
                    <img
                      src={profileAvatarImgSrc}
                      alt={avatarAlt}
                      className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-[3px] sm:border-4 border-card shadow-lg object-cover"
                      loading="lazy"
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

              <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 sm:gap-3 text-xs sm:text-sm">
                  {displayUsername && (
                    <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground min-w-0">
                      <AtSign size={14} className="shrink-0" />
                      <span className="truncate">{displayUsername}</span>
                    </div>
                  )}
                  {displayEmail && (
                    <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground min-w-0">
                      <Mail size={14} className="shrink-0" />
                      <span className="truncate">{displayEmail}</span>
                    </div>
                  )}
                  {currentEmployee?.ten_phong_ban && (
                    <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                      <Building2 size={14} className="shrink-0" />
                      <span className="truncate">{currentEmployee.ten_phong_ban}</span>
                    </div>
                  )}
                  {currentEmployee?.ten_chuc_vu && (
                    <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                      <Briefcase size={14} className="shrink-0" />
                      <span className="truncate">{currentEmployee.ten_chuc_vu}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                    <Shield size={14} className="shrink-0" />
                    <span>{txt('page.profile.verified')}</span>
                  </div>
                </div>
              </div>

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

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full min-w-0 flex-1 space-y-4 sm:space-y-5"
          >
            <DetailSection title={txt('employee.detail.identity')} icon={<UserIcon size={14} />} variant="primary">
              <DetailFieldGrid cols={2}>
                <DetailField label={txt('employee.form.username')} value={displayUsername} icon={<AtSign size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.form.fullName')} value={displayName} icon={<UserIcon size={12} />} emptyText={emptyText} />
                <DetailField label={txt('page.profile.email')} value={displayEmail} icon={<Mail size={12} />} emptyText={emptyText} />
                <DetailField
                  label={txt('common.status')}
                  value={trangThai ? <EnumBadge value={trangThai} config={STATUS_BADGE_CONFIG} /> : undefined}
                  emptyText={emptyText}
                />
              </DetailFieldGrid>
            </DetailSection>

            <DetailSection title={txt('employee.form.workInfo')} icon={<Briefcase size={14} />} variant="primary">
              <DetailFieldGrid cols={3}>
                <DetailField label={txt('employee.form.department')} value={currentEmployee?.ten_phong_ban} icon={<Building2 size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.form.unit')} value={currentEmployee?.ten_bo_phan} icon={<Layers size={12} />} emptyText={emptyText} />
                <DetailField label={txt('employee.form.position')} value={currentEmployee?.ten_chuc_vu} icon={<Briefcase size={12} />} emptyText={emptyText} />
              </DetailFieldGrid>
            </DetailSection>
          </motion.div>
        </div>
      </div>

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
                displaySrc={profileAvatarSigned || undefined}
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
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {passwordError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {passwordError}
                  </div>
                )}
                <Input
                  label={txt('page.profile.currentPassword')}
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                  placeholder={txt('page.profile.passwordPlaceholder')}
                  autoComplete="current-password"
                />
                <Input
                  label={txt('page.profile.newPassword')}
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
                  placeholder={txt('page.profile.passwordPlaceholder')}
                  autoComplete="new-password"
                />
                <Input
                  label={txt('page.profile.confirmPassword')}
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder={txt('page.profile.passwordPlaceholder')}
                  autoComplete="new-password"
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setPasswordModalOpen(false)}
                    disabled={passwordSubmitting}
                  >
                    {txt('common.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl" isLoading={passwordSubmitting} disabled={passwordSubmitting}>
                    {txt('nav.changePassword.submit')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
