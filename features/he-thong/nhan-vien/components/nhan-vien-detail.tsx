import React, { useCallback, useMemo, memo } from 'react';
import { txt } from '../../../../lib/text';
import { Employee } from '../core/types';
import {
  User, Mail, Phone, Calendar,
  Briefcase, Building2, Edit, Trash2,
  Clock,
  RefreshCw, MapPin, Heart, GraduationCap,
  Landmark, CreditCard, FileText, Globe,
  Users, IdCard, BookOpen, Printer, ShieldCheck,
} from 'lucide-react';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '../../../../components/shared/GenericDrawer';
import DetailSection from '../../../../components/shared/DetailSection';
import DetailField from '../../../../components/shared/DetailField';
import DetailFieldGrid from '../../../../components/shared/DetailFieldGrid';
import DetailToolbar, { DetailToolbarAction } from '../../../../components/shared/DetailToolbar';
import Button from '../../../../components/ui/Button';
import Combobox from '../../../../components/ui/Combobox';
import EnumBadge from '../../../../components/ui/EnumBadge';
import { formatDate, getTenureText, cn, getAvatarUrl } from '@/lib/utils';
import { formatValueByDataType } from '@/lib/data-types';
import { EMPLOYEE_FIELD_DATA_TYPE } from '../core/employee-field-meta';
import { openEmployeeProfilePreviewTab } from '../utils/open-employee-profile-preview';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_YES } from '../../../../lib/button-labels';
import { useConfirmStore } from '../../../../store/useConfirmStore';
import { useUpdateStatusEmployee } from '../hooks/use-nhan-vien';
import {
  STATUS_OPTIONS,
  STATUS_BADGE_CONFIG,
  GENDER_BADGE_CONFIG,
  MARITAL_BADGE_CONFIG,
  CONTRACT_BADGE_CONFIG,
  EDUCATION_BADGE_CONFIG,
} from '../core/constants';
import { useCan } from '@/hooks/use-can';

interface Props {
  data: Employee;
  onClose: () => void;
  onEdit: (item: Employee) => void;
  onDelete: (id: string) => void;
}

const EmployeeDetailComponent: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const confirm = useConfirmStore(state => state.confirm);
  const statusMutation = useUpdateStatusEmployee();
  const canEdit = useCan('edit', 'employees');
  const canDelete = useCan('delete', 'employees');
  const canViewExtras = useCan('view', 'employees');

  const handleUpdateStatus = useCallback(() => {
    let selectedStatus: Employee['trang_thai'] = data.trang_thai;

    confirm({
      title: txt('employee.statusChangeTitle'),
      message: (
        <div className="space-y-4 text-left py-2">
          <p className="text-sm">{txt('employee.statusChangeMessage')} <strong>{data.ho_ten}</strong>:</p>
          <Combobox
            value={data.trang_thai}
            options={STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
            onChange={(v) => { selectedStatus = v as Employee['trang_thai']; }}
            searchable={false}
            dropdownInPortal
          />
        </div>
      ),
      variant: "info",
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        await statusMutation.mutateAsync({ ids: [data.id], status: selectedStatus });
      }
    });
  }, [data.id, data.trang_thai, data.ho_ten, confirm, statusMutation]);

  const toolbarActions = useMemo((): DetailToolbarAction[] => {
    const actions: DetailToolbarAction[] = [];
    if (canEdit) {
      actions.push({
        label: txt('employee.detail.changeStatus'),
        icon: <RefreshCw />,
        onClick: handleUpdateStatus,
        variant: "info",
      });
    }
    if (canViewExtras) {
      actions.push(
        {
          label: txt('employee.detail.print'),
          icon: <Printer />,
          onClick: () => openEmployeeProfilePreviewTab(data.id),
          variant: "secondary",
        },
        {
          label: txt('employee.detail.sendEmail'),
          icon: <Mail />,
          onClick: () => { window.location.href = `mailto:${data.email}`; },
          variant: "primary",
        },
        {
          label: txt('employee.detail.callPhone'),
          icon: <Phone />,
          onClick: () => { window.location.href = `tel:${data.so_dien_thoai}`; },
          variant: "success",
        },
      );
    }
    return actions;
  }, [handleUpdateStatus, data.id, data.email, data.so_dien_thoai, canEdit, canViewExtras]);

  const renderFooter = useMemo(() => (
    <div className="flex items-center justify-between w-full gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
      >
        {BTN_CLOSE()}
      </Button>
      {(canEdit || canDelete) ? (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              size="sm"
              onClick={() => onEdit(data)}
              className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {BTN_EDIT()}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(data.id)}
              className="h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 border border-rose-200 hover:border-rose-300 dark:border-rose-800 dark:hover:border-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {BTN_DELETE()}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  ), [onClose, onEdit, onDelete, data, canEdit, canDelete]);

  return (
    <GenericDrawer
      title={txt('employee.detail.title')}
      subtitle={`${txt('employee.detail.subtitle')} ${data.ma_nhan_vien}`}
      icon={<User size={20} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        {/* Header Summary Card - Compact Horizontal */}
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={data.anh_dai_dien || getAvatarUrl(data.ho_ten ?? '')}
              alt={data.ho_ten}
              className="w-14 h-14 rounded-xl border-2 border-card shadow-md object-cover bg-card"
            />
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card shadow-sm",
              data.trang_thai === 'Đang làm việc' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            )}></div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight truncate flex-1 min-w-0">
                {data.ho_ten}
              </h2>
              <div className="shrink-0">
                <EnumBadge value={data.trang_thai} config={STATUS_BADGE_CONFIG} />
              </div>
            </div>
            <p className="text-body-sm text-primary font-medium">{data.ten_chuc_vu}</p>
          </div>
        </div>

        {/* Toolbar Detail (Circular Actions) */}
        <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />

        {/* ===== [1] Thông tin cá nhân ===== */}
        <DetailSection title={txt('employee.detail.personalInfo')} icon={<User size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('employee.detail.fullName')} value={data.ho_ten} icon={<User size={12} />} />
            <DetailField
              label={txt('employee.detail.birthDate')}
              value={
                data.ngay_sinh
                  ? formatValueByDataType(EMPLOYEE_FIELD_DATA_TYPE.ngay_sinh!, data.ngay_sinh)
                  : undefined
              }
              icon={<Calendar size={12} />}
            />
            <DetailField
              label={txt('employee.detail.gender')}
              value={<EnumBadge value={data.gioi_tinh} config={GENDER_BADGE_CONFIG} />}
              icon={<Users size={12} />}
            />
            <DetailField label={txt('employee.detail.idCard')} value={data.cmnd_cccd} icon={<IdCard size={12} />} />
            <DetailField label={txt('employee.detail.idIssueDate')} value={data.ngay_cap_cccd ? formatDate(data.ngay_cap_cccd) : undefined} icon={<Calendar size={12} />} />
            <DetailField label={txt('employee.detail.idIssuePlace')} value={data.noi_cap_cccd} icon={<MapPin size={12} />} />
            <DetailField label={txt('employee.detail.nationality')} value={data.quoc_tich} icon={<Globe size={12} />} />
            <DetailField label={txt('employee.detail.ethnicity')} value={data.dan_toc} />
            <DetailField label={txt('employee.detail.religion')} value={data.ton_giao} />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [2] Thông tin công việc ===== */}
        <DetailSection title={txt('employee.detail.workInfo')} icon={<Briefcase size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('employee.detail.employeeCode')} value={data.ma_nhan_vien} icon={<FileText size={12} />} />
            <DetailField label={txt('employee.detail.position')} value={data.ten_chuc_vu} icon={<Briefcase size={12} />} />
            <DetailField label={txt('employee.detail.department')} value={data.ten_phong_ban} icon={<Building2 size={12} />} />
            <DetailField label={txt('employee.detail.branch')} value={data.ten_chi_nhanh} icon={<MapPin size={12} />} />
            <DetailField label={txt('employee.detail.level')} value={data.ten_cap_bac} icon={<Users size={12} />} />
            <DetailField label={txt('employee.detail.hireDate')} value={formatDate(data.ngay_vao_lam)} icon={<Calendar size={12} />} />
            <DetailField label={txt('employee.detail.tenure')} value={getTenureText(data.ngay_vao_lam)} icon={<Clock size={12} />} />
            <DetailField label={txt('employee.detail.contractType')} value={data.loai_hop_dong ? <EnumBadge value={data.loai_hop_dong} config={CONTRACT_BADGE_CONFIG} /> : undefined} icon={<FileText size={12} />} />
            <DetailField label={txt('employee.detail.contractEndDate')} value={data.ngay_het_han_hd ? formatDate(data.ngay_het_han_hd) : undefined} icon={<Calendar size={12} />} />
            <DetailField label={txt('employee.detail.workplace')} value={data.noi_lam_viec} icon={<Building2 size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [3] Thông tin liên hệ ===== */}
        <DetailSection title={txt('employee.detail.contactInfo')} icon={<Phone size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('employee.detail.workEmail')}
              value={formatValueByDataType(EMPLOYEE_FIELD_DATA_TYPE.email!, data.email) || undefined}
              icon={<Mail size={12} />}
            />
            <DetailField
              label={txt('employee.detail.personalEmail')}
              value={
                data.email_ca_nhan
                  ? formatValueByDataType(EMPLOYEE_FIELD_DATA_TYPE.email_ca_nhan!, data.email_ca_nhan)
                  : undefined
              }
              icon={<Mail size={12} />}
            />
            <DetailField
              label={txt('employee.detail.phone')}
              value={formatValueByDataType(EMPLOYEE_FIELD_DATA_TYPE.so_dien_thoai!, data.so_dien_thoai) || undefined}
              icon={<Phone size={12} />}
            />
            <DetailField label={txt('employee.detail.emergencyContact')} value={data.nguoi_lien_he_khan_cap} icon={<User size={12} />} />
            <DetailField
              label={txt('employee.detail.emergencyPhone')}
              value={
                data.sdt_khan_cap
                  ? formatValueByDataType(EMPLOYEE_FIELD_DATA_TYPE.sdt_khan_cap!, data.sdt_khan_cap)
                  : undefined
              }
              icon={<Phone size={12} />}
            />
            <DetailField label={txt('employee.detail.relationship')} value={data.quan_he_khan_cap} icon={<Users size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [4] Địa chỉ ===== */}
        <DetailSection title={txt('employee.detail.address')} icon={<MapPin size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('employee.detail.province')} value={data.tinh_thanh} icon={<MapPin size={12} />} />
            <DetailField label={txt('employee.detail.district')} value={data.quan_huyen} />
            <DetailField label={txt('employee.detail.ward')} value={data.phuong_xa} />
          </DetailFieldGrid>
          {/* Trường dài: full-width 1 cột */}
          <DetailFieldGrid cols={1} className="mt-4">
            <DetailField label={txt('employee.detail.detailAddress')} value={data.dia_chi_cu_the} icon={<MapPin size={12} />} />
            <DetailField label={txt('employee.detail.tempAddress')} value={data.dia_chi_tam_tru} icon={<MapPin size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [5] Hôn nhân & Gia đình ===== */}
        <DetailSection title={txt('employee.detail.familyInfo')} icon={<Heart size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('employee.detail.maritalStatus')} value={data.tinh_trang_hon_nhan ? <EnumBadge value={data.tinh_trang_hon_nhan} config={MARITAL_BADGE_CONFIG} /> : undefined} icon={<Heart size={12} />} />
            <DetailField
              label={txt('employee.detail.dependents')}
              value={data.so_nguoi_phu_thuoc !== undefined && data.so_nguoi_phu_thuoc !== null ? String(data.so_nguoi_phu_thuoc) : undefined}
              icon={<Users size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [6] Học vấn & Chứng chỉ ===== */}
        <DetailSection title={txt('employee.detail.educationInfo')} icon={<GraduationCap size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('employee.detail.educationLevel')} value={data.trinh_do_hoc_van ? <EnumBadge value={data.trinh_do_hoc_van} config={EDUCATION_BADGE_CONFIG} /> : undefined} icon={<GraduationCap size={12} />} />
            <DetailField label={txt('employee.detail.major')} value={data.chuyen_nganh} icon={<BookOpen size={12} />} />
            <DetailField label={txt('employee.detail.school')} value={data.truong_hoc} icon={<Building2 size={12} />} />
            <DetailField label={txt('employee.detail.graduationYear')} value={data.nam_tot_nghiep} icon={<Calendar size={12} />} />
          </DetailFieldGrid>
          {/* Chứng chỉ: full-width 1 cột */}
          <DetailFieldGrid cols={1} className="mt-4">
            <DetailField label={txt('employee.detail.certificates')} value={data.chung_chi} icon={<FileText size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [7] Tài chính & Ngân hàng ===== */}
        <DetailSection title={txt('employee.detail.financialInfo')} icon={<Landmark size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('employee.detail.bankAccount')} value={data.so_tai_khoan} icon={<CreditCard size={12} />} />
            <DetailField label={txt('employee.detail.bankName')} value={data.ten_ngan_hang} icon={<Landmark size={12} />} />
            <DetailField label={txt('employee.detail.bankBranch')} value={data.chi_nhanh_nh} icon={<Building2 size={12} />} />
            <DetailField label={txt('employee.detail.taxId')} value={data.ma_so_thue_ca_nhan} icon={<FileText size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [8] Bảo hiểm ===== */}
        <DetailSection title={txt('employee.detail.insuranceInfo')} icon={<ShieldCheck size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('employee.detail.socialInsurance')} value={data.so_bhxh} icon={<ShieldCheck size={12} />} />
            <DetailField label={txt('employee.detail.healthInsurance')} value={data.so_bhyt} icon={<ShieldCheck size={12} />} />
            <DetailField label={txt('employee.detail.insuranceDate')} value={data.ngay_tham_gia_bh ? formatDate(data.ngay_tham_gia_bh) : undefined} icon={<Calendar size={12} />} />
            <DetailField label={txt('employee.detail.medicalFacility')} value={data.noi_dang_ky_kcb} icon={<Building2 size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        {/* ===== [9] Thông tin hệ thống ===== */}
        {(data.created_at || data.updated_at) && (
          <DetailSection title={txt('employee.detail.systemInfo')} icon={<Clock size={14} />}>
            <DetailFieldGrid>
              <DetailField label={txt('employee.detail.createdDate')} value={data.created_at ? formatDate(data.created_at) : undefined} icon={<Calendar size={12} />} />
              <DetailField label={txt('employee.detail.createdBy')} value={data.created_by} icon={<User size={12} />} />
              <DetailField label={txt('employee.detail.lastUpdated')} value={data.updated_at ? formatDate(data.updated_at) : undefined} icon={<Calendar size={12} />} />
              <DetailField label={txt('employee.detail.updatedBy')} value={data.updated_by} icon={<User size={12} />} />
            </DetailFieldGrid>
          </DetailSection>
        )}
      </div>
    </GenericDrawer>
  );
};

const EmployeeDetail = memo(EmployeeDetailComponent);
export default EmployeeDetail;
