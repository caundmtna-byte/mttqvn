import React, { useMemo } from 'react';
import { txt } from '../../../../lib/text';
import {
  Edit, Trash2, User, AtSign, Building2, Briefcase, Layers, MapPin, MapPinned, Power, Calendar, Clock, RefreshCw, Network,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import EnumBadge from '../../../../components/ui/EnumBadge';
import { Employee } from '../core/types';
import { STATUS_BADGE_CONFIG } from '../core/constants';
import { formatDate, formatDateTimeShort } from '../../../../lib/utils';
import { EmployeeAvatarImg } from './employee-avatar-img';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '../../../../components/shared/GenericDrawer';
import DetailSummaryCard from '../../../../components/shared/DetailSummaryCard';
import DetailSection from '../../../../components/shared/DetailSection';
import DetailField from '../../../../components/shared/DetailField';
import DetailFieldGrid from '../../../../components/shared/DetailFieldGrid';
import DetailToolbar, { DetailToolbarAction } from '../../../../components/shared/DetailToolbar';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '../../../../lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { capQuanLyBadgeConfig } from '../../chuc-vu/utils/cap-quan-ly';

interface Props {
  data: Employee;
  onClose: () => void;
  onEdit: (item: Employee) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: Employee) => void;
}

const EmployeeDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete, onStatusChange }) => {
  const { canEdit, canDelete } = useResourcePermissions('employees');

  const capQuanLyBadge = useMemo(
    () => capQuanLyBadgeConfig(txt('position.capQuanLyTinh'), txt('position.capQuanLyXaPhuong')),
    [],
  );

  const toolbarActions: DetailToolbarAction[] = [
    ...(onStatusChange && canEdit
      ? [
          {
            label: txt('employee.detail.changeStatus'),
            icon: <RefreshCw size={16} />,
            onClick: () => onStatusChange(data),
            variant: 'info' as const,
          },
        ]
      : []),
  ];

  const renderFooter = (
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
              onClick={() => {
                onEdit(data);
                onClose();
              }}
              className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_EDIT()}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(data.id);
                onClose();
              }}
              className="h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:text-rose-400 border border-rose-200 hover:border-rose-300 dark:border-rose-800 dark:hover:border-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_DELETE()}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <GenericDrawer
      title={txt('employee.detail.title')}
      subtitle={`@${data.ten_tai_khoan}`}
      icon={<User size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <EmployeeAvatarImg
              hinh_anh={data.hinh_anh}
              ho_va_ten={data.ho_va_ten}
              fallbackSize={96}
              alt={data.ho_va_ten}
              className="h-16 w-16 rounded-xl object-cover border border-border shadow-md shrink-0"
            />
          }
          title={data.ho_va_ten}
          badge={<EnumBadge value={data.trang_thai} config={STATUS_BADGE_CONFIG} />}
          subtitle={<p className="font-mono m-0">@{data.ten_tai_khoan}</p>}
        />

        {toolbarActions.length > 0 && (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        )}

        <DetailSection title={txt('employee.detail.identity')} icon={<User size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('employee.form.username')} value={data.ten_tai_khoan} icon={<AtSign size={12} />} />
            <DetailField label={txt('employee.form.fullName')} value={data.ho_va_ten} icon={<User size={12} />} />
            <DetailField label={txt('common.status')} value={<EnumBadge value={data.trang_thai} config={STATUS_BADGE_CONFIG} />} icon={<Power size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('employee.form.workInfo')} icon={<Briefcase size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('employee.form.department')}
              value={data.ten_phong_ban ?? txt('common.emptyCell')}
              icon={<Building2 size={12} />}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('employee.form.unit')}
              value={data.ten_bo_phan ?? txt('common.emptyCell')}
              icon={<Layers size={12} />}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('employee.form.position')}
              value={data.ten_chuc_vu ?? txt('common.emptyCell')}
              icon={<Briefcase size={12} />}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('position.store.managementLevelCol')}
              value={
                Array.isArray(data.cap_quan_ly) && data.cap_quan_ly.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {data.cap_quan_ly.map((v) => (
                      <EnumBadge key={v} value={v} config={capQuanLyBadge} shape="rounded" />
                    ))}
                  </div>
                ) : ''
              }
              icon={<MapPinned size={12} />}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('employee.form.donViXaPhuong')}
              value={
                Array.isArray(data.cap_quan_ly) && data.cap_quan_ly.includes('Tỉnh') && !data.cap_quan_ly.includes('Xã phường')
                  ? '-'
                  : (data.ten_don_vi ?? txt('common.emptyCell'))
              }
              icon={<MapPin size={12} />}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('matTranCanBo.form.toChuc')}
              value={
                Array.isArray(data.ten_to_chuc_arr) && data.ten_to_chuc_arr.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {data.ten_to_chuc_arr.map((ten) => (
                      <span
                        key={ten}
                        className="inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground"
                      >
                        {ten}
                      </span>
                    ))}
                  </div>
                ) : undefined
              }
              icon={<Network size={12} />}
              emptyText={txt('common.emptyCell')}
            />
          </DetailFieldGrid>
        </DetailSection>

        {(data.tg_tao || data.tg_cap_nhat) && (
          <DetailSection title={txt('employee.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
            <DetailFieldGrid>
              {data.tg_tao && (
                <DetailField label={txt('employee.detail.createdDate')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
              )}
              {data.tg_cap_nhat && (
                <DetailField label={txt('employee.detail.lastUpdated')} value={formatDate(data.tg_cap_nhat)} icon={<Calendar size={12} />} />
              )}
            </DetailFieldGrid>
          </DetailSection>
        )}
      </div>
    </GenericDrawer>
  );
};

export default EmployeeDetail;
