import React, { useMemo, useState } from 'react';
import EnumBadge from '../../../../components/ui/EnumBadge';
import { buildDepartmentLevelBadgeConfig, departmentTrangThaiBadgeConfig } from '../utils/department-badges';
import { txt } from '../../../../lib/text';
import { Edit, Trash2, Building2, Layers, ArrowUpFromLine, Calendar, Clock, Power, Plus, Folder, FileText } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { Department } from '../core/types';
import { formatDate, formatDateTimeShort } from '../../../../lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '../../../../components/shared/GenericDrawer';
import DetailSection from '../../../../components/shared/DetailSection';
import DetailField from '../../../../components/shared/DetailField';
import DetailFieldGrid from '../../../../components/shared/DetailFieldGrid';
import DetailToolbar, { DetailToolbarAction } from '../../../../components/shared/DetailToolbar';
import EmptyState from '../../../../components/shared/EmptyState';
import EmbeddedChildDataGrid from '../../../../components/shared/EmbeddedChildDataGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '../../../../lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { DepartmentTableRowActions } from './department-table-row-actions';

interface Props {
  data: Department;
  allDepartments: Department[];
  onClose: () => void;
  onEdit: (item: Department) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: Department) => void;
  onAddChild?: (parent: Department) => void;
  /** Click dòng con mở detail con (drawer do index render, đóng khi Thêm/Sửa/Xóa/Hủy) */
  onViewChild?: (child: Department) => void;
  /** Drawer nhỏ hơn khi là detail con (stackLevel do index truyền) */
  maxWidthClass?: string;
  stackLevel?: number;
}

const DepartmentDetail: React.FC<Props> = ({
  data,
  allDepartments,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onAddChild,
  onViewChild,
  maxWidthClass = DRAWER_WIDTH_DETAIL,
  stackLevel = 0,
}) => {
  const { canEdit, canDelete, canCreate } = useResourcePermissions('departments');
  const [childMenuOpenId, setChildMenuOpenId] = useState<string | null>(null);
  const isActive = data.trang_thai === 'Đang hoạt động';
  const parentDept = data.cha_id ? allDepartments.find((d) => d.id === data.cha_id) : null;

  const levelBadgeConfig = useMemo(() => buildDepartmentLevelBadgeConfig(), []);
  const statusBadgeConfig = useMemo(() => departmentTrangThaiBadgeConfig(), []);

  const children = useMemo(
    () =>
      allDepartments
        .filter((d) => d.cha_id === data.id)
        .sort((a, b) => a.thu_tu - b.thu_tu),
    [allDepartments, data.id]
  );

  const toolbarActions: DetailToolbarAction[] = [
    ...(onStatusChange && canEdit
      ? [
          {
            label: isActive ? txt('department.detail.deactivate') : txt('department.detail.activate'),
            icon: <Power size={16} />,
            onClick: () => onStatusChange(data),
            variant: 'info' as const,
          },
        ]
      : []),
  ];

  const renderFooter = (
    <div className="flex w-full items-center justify-between gap-2">
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
      title={txt('department.detail.title')}
      icon={<Building2 size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={maxWidthClass}
      stackLevel={stackLevel}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20">
            <Building2 size={24} className="text-white" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <h2 className="min-w-0 flex-1 truncate text-base font-bold leading-tight text-foreground">
                {data.ten_phong_ban}
              </h2>
              <div className="shrink-0">
                <EnumBadge shape="pill" value={data.trang_thai} config={statusBadgeConfig} />
              </div>
            </div>
          </div>
        </div>

        {toolbarActions.length > 0 && (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        )}

        {/* Thông tin cơ bản */}
        <DetailSection title={txt('department.detail.basicInfo')} icon={<Building2 size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('department.name')} value={data.ten_phong_ban} icon={<Building2 size={12} />} />
            <DetailField
              label={txt('department.detail.description')}
              value={data.mo_ta ?? ''}
              icon={<FileText size={12} />}
              emptyText={txt('page.profile.emptyField')}
            />
            <DetailField label={txt('department.detail.parent')} value={parentDept ? parentDept.ten_phong_ban : txt('department.detail.noParent')} icon={<Folder size={12} />} emptyText={txt('department.detail.noParent')} />
            <DetailField
              label={txt('department.detail.level')}
              value={
                <EnumBadge
                  shape="rounded"
                  value={data.cap_do}
                  config={levelBadgeConfig}
                  fallbackLabel={txt('department.levelBadge', { level: data.cap_do })}
                />
              }
              icon={<Layers size={12} />}
            />
            <DetailField label={txt('department.detail.order')} value={String(data.thu_tu)} icon={<ArrowUpFromLine size={12} />} />
            <DetailField
              label={txt('common.status')}
              value={<EnumBadge shape="pill" value={data.trang_thai} config={statusBadgeConfig} />}
              icon={<Power size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        {/* Thông tin hệ thống */}
        <DetailSection title={txt('department.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('department.detail.createdAt')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
            <DetailField label={txt('department.detail.updated')} value={formatDate(data.tg_cap_nhat)} icon={<Calendar size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('department.detail.childrenSection')}
          icon={<Building2 size={14} />}
          variant="primary"
          headerRight={
            <>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
                {children.length} {txt('department.footerRecords')}
              </span>
              {onAddChild && canCreate ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAddChild(data)}
                  className="h-8 shrink-0 bg-primary px-3 text-white shadow-sm hover:bg-primary/90"
                >
                  <Plus size={14} className="mr-1.5" />
                  {txt('department.detail.addChild')}
                </Button>
              ) : null}
            </>
          }
        >
          {children.length === 0 ? (
            <EmptyState
              title={txt('department.detail.noChildren')}
              description={txt('department.detail.noChildrenHint')}
              icon={<Folder className="h-10 w-10 text-muted-foreground" />}
              action={
                onAddChild && canCreate ? (
                  <Button type="button" size="sm" onClick={() => onAddChild(data)} className="bg-primary text-white hover:bg-primary/90">
                    <Plus size={14} className="mr-2" />
                    {txt('department.detail.addChild')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmbeddedChildDataGrid<Department>
              rows={children}
              getRowKey={(child) => child.id}
              labelColumn={{
                header: txt('department.name'),
                minWidthClass: 'min-w-[160px]',
                renderCell: (child) => <span className="font-medium text-foreground">{child.ten_phong_ban}</span>,
              }}
              columns={[
                {
                  id: 'desc',
                  header: txt('department.store.descCol'),
                  headerClassName: 'max-w-[180px]',
                  cellClassName: 'max-w-[180px]',
                  renderCell: (child) => (
                    <span className="line-clamp-2 text-xs text-muted-foreground">{child.mo_ta ?? '—'}</span>
                  ),
                },
                {
                  id: 'status',
                  header: txt('common.status'),
                  renderCell: (child) => <EnumBadge shape="pill" value={child.trang_thai} config={statusBadgeConfig} />,
                },
              ]}
              actionsColumn={{
                header: txt('common.actions'),
                widthClass: 'w-[92px] min-w-[92px]',
                renderCell: (child) => (
                  <DepartmentTableRowActions
                    compact
                    item={child}
                    menuOpenId={childMenuOpenId}
                    onMenuOpenChange={setChildMenuOpenId}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ),
              }}
              onRowClick={onViewChild ? (child) => onViewChild(child) : undefined}
              containerClassName="border-0 shadow-none"
            />
          )}
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default DepartmentDetail;
