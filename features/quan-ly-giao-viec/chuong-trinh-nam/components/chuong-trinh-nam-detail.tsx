import React, { lazy, Suspense, useCallback, useMemo, useState, startTransition } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  CalendarClock,
  CalendarRange,
  Clock,
  Edit,
  FileText,
  ListTodo,
  Plus,
  StickyNote,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useEmployees } from '@/features/he-thong/nhan-vien/hooks/use-nhan-vien';
import type { ChuongTrinhNam } from '../core/types';
import { getChuongTrinhNamTrangThaiBadgeConfig } from '../core/constants';
import { CONG_VIEC_BY_CHUONG_TRINH_PAGE_LIMIT } from '@/features/quan-ly-giao-viec/cong-viec/services/cong-viec-danh-sach-service';
import {
  CONG_VIEC_MUC_DO_BADGE_CONFIG,
  CONG_VIEC_TRANG_THAI_BADGE_CONFIG,
  congViecDeadlineChipClass,
  congViecThoiHanChipTone,
} from '@/features/quan-ly-giao-viec/cong-viec/core/display-badges';
import { CongViecTableRowActions } from '@/features/quan-ly-giao-viec/cong-viec/components/cong-viec-table-row-actions';
import {
  useCongViecByChuongTrinhNamId,
  useDeleteCongViecDanhSachMany,
} from '@/features/quan-ly-giao-viec/cong-viec/hooks/use-cong-viec-danh-sach';
import type { CongViecDanhSachRow } from '@/features/quan-ly-giao-viec/cong-viec/core/types';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import ChuongTrinhNamChangeStatusDialog from './chuong-trinh-nam-change-status-dialog';

const CongViecForm = lazy(() => import('@/features/quan-ly-giao-viec/cong-viec/components/cong-viec-form'));
const CongViecDetail = lazy(() => import('@/features/quan-ly-giao-viec/cong-viec/components/cong-viec-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

interface Props {
  data: ChuongTrinhNam;
  onClose: () => void;
  onEdit: (item: ChuongTrinhNam) => void;
  onDelete: (id: string) => void;
}

const ChuongTrinhNamDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('annualPrograms');
  const { canCreate: canCreateTask, canEdit: canEditTask, canDelete: canDeleteTask } =
    useResourcePermissions('tasks');
  const confirm = useConfirmStore((s) => s.confirm);
  const trangThaiBadgeConfig = useMemo(() => getChuongTrinhNamTrangThaiBadgeConfig(), []);

  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
  const [cvFormOpen, setCvFormOpen] = useState(false);
  const [cvEditing, setCvEditing] = useState<CongViecDanhSachRow | null>(null);
  const [cvViewing, setCvViewing] = useState<CongViecDanhSachRow | null>(null);
  const [cvMenuOpenId, setCvMenuOpenId] = useState<string | null>(null);

  const { data: congViecRows = [], isLoading: cvLoading } = useCongViecByChuongTrinhNamId(data.id);
  const { data: employees = [] } = useEmployees();
  const deleteCvMutation = useDeleteCongViecDanhSachMany();

  const employeeMap = useMemo(() => new Map(employees.map((e) => [String(e.id), e])), [employees]);

  const rowsEnriched = useMemo<CongViecDanhSachRow[]>(
    () =>
      congViecRows.map((r) => ({
        ...r,
        ho_tro_display: r.ids_ho_tro.map((id) => employeeMap.get(String(id))?.ho_va_ten ?? id).join(', '),
      })),
    [congViecRows, employeeMap],
  );

  const closeCvForm = useCallback(() => {
    setCvFormOpen(false);
    setCvEditing(null);
  }, []);

  const openCreateCv = useCallback(() => {
    startTransition(() => {
      setCvViewing(null);
      setCvEditing(null);
      setCvFormOpen(true);
    });
  }, []);

  const openEditCv = useCallback((item: CongViecDanhSachRow) => {
    startTransition(() => {
      setCvViewing(null);
      setCvEditing(item);
      setCvFormOpen(true);
    });
  }, []);

  const handleDeleteCv = useCallback(
    (id: string) => {
      confirm({
        title: txt('taskList.deleteTitle'),
        message: txt('taskList.deleteMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: async () => {
          await deleteCvMutation.mutateAsync([id]);
          if (cvViewing?.id === id) setCvViewing(null);
        },
      });
    },
    [confirm, deleteCvMutation, cvViewing?.id],
  );

  const toolbarActions: DetailToolbarAction[] = [];
  if (canEdit) {
    toolbarActions.push({
      label: txt('chuongTrinhNam.detail.actionChangeStatus'),
      icon: <ArrowRightLeft size={16} />,
      variant: 'info',
      onClick: () => setChangeStatusOpen(true),
    });
  }

  const footer = (
    <div className="flex items-center justify-between w-full gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
      >
        {BTN_CLOSE()}
      </Button>
      {canEdit || canDelete ? (
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
    <>
      <GenericDrawer
        title={txt('chuongTrinhNam.detail.title')}
        subtitle={txt('chuongTrinhNam.detail.subtitle')}
        icon={<CalendarRange size={18} />}
        onClose={onClose}
        footer={footer}
        maxWidthClass={DRAWER_WIDTH_DETAIL}
        footerCompact
      >
        <div className="space-y-5">
          <DetailSummaryCard
            leading={
              <DetailSummaryIconTile>
                <CalendarRange size={26} className="text-white" />
              </DetailSummaryIconTile>
            }
            title={data.ten_chuong_trinh}
            badge={<EnumBadge value={data.trang_thai} config={trangThaiBadgeConfig} truncate />}
            subtitle={
              <p className="tabular-nums m-0">
                {formatDateShort(data.ngay_bat_dau)} → {formatDateShort(data.ngay_ket_thuc)}
              </p>
            }
          >
            {data.ten_phong_ban?.trim() ? (
              <p className="text-body-sm text-muted-foreground truncate m-0">{data.ten_phong_ban}</p>
            ) : null}
          </DetailSummaryCard>

          {toolbarActions.length > 0 ? (
            <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
          ) : null}

          <DetailSection title={txt('chuongTrinhNam.detail.sectionInfo')} icon={<CalendarRange size={14} />} variant="primary">
            <DetailFieldGrid>
              <DetailField
                label={txt('chuongTrinhNam.store.trangThaiCol')}
                icon={<Tag size={12} />}
                value={<EnumBadge value={data.trang_thai} config={trangThaiBadgeConfig} truncate shape="pill" />}
              />
              <DetailField
                label={txt('chuongTrinhNam.store.ngayBatDauCol')}
                icon={<Calendar size={12} />}
                value={data.ngay_bat_dau ? formatDateShort(data.ngay_bat_dau) : undefined}
              />
              <DetailField
                label={txt('chuongTrinhNam.store.ngayKetThucCol')}
                icon={<Calendar size={12} />}
                value={data.ngay_ket_thuc ? formatDateShort(data.ngay_ket_thuc) : undefined}
              />
              <DetailField
                label={txt('chuongTrinhNam.store.phongBanCol')}
                icon={<Building2 size={12} />}
                value={data.ten_phong_ban?.trim() ? data.ten_phong_ban : undefined}
              />
              <DetailField
                label={txt('chuongTrinhNam.store.nguoiTaoCol')}
                icon={<User size={12} />}
                value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('chuongTrinhNam.form.moTa')}
                icon={<FileText size={12} />}
                value={data.mo_ta ?? undefined}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('chuongTrinhNam.detail.fieldGhiChu')}
                icon={<StickyNote size={12} />}
                value={data.ghi_chu?.trim() ? data.ghi_chu : undefined}
              />
            </DetailFieldGrid>
          </DetailSection>

          <DetailSection title={txt('chuongTrinhNam.detail.sectionMeta')} icon={<Clock size={14} />} variant="muted">
            <DetailFieldGrid>
              <DetailField
                label={txt('chuongTrinhNam.detail.fieldTgTao')}
                icon={<Clock size={12} />}
                value={formatDateTimeShort(data.tg_tao)}
              />
              <DetailField
                label={txt('chuongTrinhNam.store.tgCapNhatCol')}
                icon={<CalendarClock size={12} />}
                value={formatDateTimeShort(data.tg_cap_nhat)}
              />
            </DetailFieldGrid>
          </DetailSection>

          <DetailSection
            title={txt('chuongTrinhNam.detail.sectionCongViec')}
            icon={<ListTodo size={14} />}
            variant="primary"
            headerRight={
              canCreateTask ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={openCreateCv}
                  className="h-8 shrink-0 bg-primary px-3 text-white shadow-sm hover:bg-primary/90"
                >
                  <Plus size={14} className="mr-1.5" />
                  {txt('common.create')}
                </Button>
              ) : null
            }
          >
            {rowsEnriched.length >= CONG_VIEC_BY_CHUONG_TRINH_PAGE_LIMIT ? (
              <p className="text-xs text-muted-foreground mb-2">{txt('chuongTrinhNam.detail.congViecLimitHint')}</p>
            ) : null}
            {cvLoading ? (
              <div className="flex justify-center py-8 text-sm text-muted-foreground">{txt('common.loadingData')}</div>
            ) : rowsEnriched.length === 0 ? (
              <EmptyState
                title={txt('chuongTrinhNam.detail.noCongViec')}
                description={txt('chuongTrinhNam.detail.noCongViecHint')}
                icon={<ListTodo className="h-10 w-10 text-muted-foreground" />}
                action={
                  canCreateTask ? (
                    <Button type="button" size="sm" onClick={openCreateCv} className="bg-primary text-white hover:bg-primary/90">
                      <Plus size={14} className="mr-2" />
                      {txt('common.create')}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <EmbeddedChildDataGrid<CongViecDanhSachRow>
                rows={rowsEnriched}
                getRowKey={(row) => row.id}
                labelColumn={{
                  header: txt('taskList.store.tenCol'),
                  minWidthClass: 'min-w-[160px]',
                  renderCell: (row) => <span className="font-medium text-foreground text-sm">{row.ten_cong_viec}</span>,
                }}
                columns={[
                  {
                    id: 'trang_thai',
                    header: txt('taskList.store.trangThaiCol'),
                    renderCell: (row) => (
                      <EnumBadge
                        value={row.trang_thai}
                        config={CONG_VIEC_TRANG_THAI_BADGE_CONFIG}
                        truncate
                        className="text-[11px] leading-tight"
                      />
                    ),
                  },
                  {
                    id: 'muc_do',
                    header: txt('taskList.store.mucDoCol'),
                    renderCell: (row) => (
                      <EnumBadge
                        value={row.muc_do}
                        config={CONG_VIEC_MUC_DO_BADGE_CONFIG}
                        shape="rounded"
                        truncate
                        className="text-[11px] leading-tight"
                      />
                    ),
                  },
                  {
                    id: 'thoi_han',
                    header: txt('taskList.store.thoiHanCol'),
                    renderCell: (row) =>
                      row.thoi_han ? (
                        <span
                          className={congViecDeadlineChipClass(congViecThoiHanChipTone(row.thoi_han, row.trang_thai), 'text-xs')}
                        >
                          {formatDateShort(row.thoi_han)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{txt('common.emptyCell')}</span>
                      ),
                  },
                  {
                    id: 'trach_nhiem',
                    header: txt('taskList.store.trachNhiemCol'),
                    renderCell: (row) => (
                      <span className="text-xs text-muted-foreground truncate">
                        {row.ho_va_ten_trach_nhiem ?? row.ten_tai_khoan_trach_nhiem ?? txt('common.emptyCell')}
                      </span>
                    ),
                  },
                ]}
                actionsColumn={{
                  header: txt('common.actions'),
                  widthClass: 'w-[92px] min-w-[92px]',
                  renderCell: (row) => (
                    <CongViecTableRowActions
                      compact
                      item={row}
                      menuOpenId={cvMenuOpenId}
                      onMenuOpenChange={setCvMenuOpenId}
                      onEdit={openEditCv}
                      onDelete={handleDeleteCv}
                    />
                  ),
                }}
                onRowClick={(row) => setCvViewing(row)}
                containerClassName="border-0 shadow-none"
              />
            )}
          </DetailSection>
        </div>
      </GenericDrawer>

      {changeStatusOpen ? (
        <ChuongTrinhNamChangeStatusDialog
          open={changeStatusOpen}
          program={data}
          onClose={() => setChangeStatusOpen(false)}
        />
      ) : null}

      <AnimatePresence>
        {cvFormOpen ? (
          <Suspense fallback={<DrawerLazyFallback />}>
            <CongViecForm
              initialData={cvEditing}
              onClose={closeCvForm}
              defaultIdChuongTrinh={data.id}
              stackLevel={1}
            />
          </Suspense>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cvViewing ? (
          <Suspense fallback={<DrawerLazyFallback />}>
            <CongViecDetail
              data={cvViewing}
              stackLevel={1}
              onClose={() => setCvViewing(null)}
              onEdit={(item) => {
                setCvViewing(null);
                openEditCv(item);
              }}
              onDelete={handleDeleteCv}
            />
          </Suspense>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default ChuongTrinhNamDetail;
