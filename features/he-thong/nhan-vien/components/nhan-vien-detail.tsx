import React from 'react';
import { txt } from '../../../../lib/text';
import {
  Edit, Trash2, User, AtSign, Building2, Briefcase, Layers, Power, Calendar, Clock, RefreshCw,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import EnumBadge from '../../../../components/ui/EnumBadge';
import { Employee } from '../core/types';
import { STATUS_BADGE_CONFIG } from '../core/constants';
import { formatDate, formatDateTimeShort, getAvatarUrl } from '../../../../lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '../../../../components/shared/GenericDrawer';
import DetailSection from '../../../../components/shared/DetailSection';
import DetailField from '../../../../components/shared/DetailField';
import DetailFieldGrid from '../../../../components/shared/DetailFieldGrid';
import DetailToolbar, { DetailToolbarAction } from '../../../../components/shared/DetailToolbar';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '../../../../lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';

interface Props {
  data: Employee;
  onClose: () => void;
  onEdit: (item: Employee) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: Employee) => void;
}

const EmployeeDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete, onStatusChange }) => {
  const { canEdit, canDelete } = useResourcePermissions('employees');

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
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <img
            src={data.hinh_anh || getAvatarUrl(data.ho_va_ten, 96)}
            alt={data.ho_va_ten}
            className="h-16 w-16 rounded-xl object-cover border border-border shadow-md shrink-0"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight truncate flex-1 min-w-0">
                {data.ho_va_ten}
              </h2>
              <div className="shrink-0">
                <EnumBadge value={data.trang_thai} config={STATUS_BADGE_CONFIG} />
              </div>
            </div>
            <p className="text-body-sm text-muted-foreground font-mono">@{data.ten_tai_khoan}</p>
          </div>
        </div>

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
