import React, { useState, useEffect, useMemo, useCallback, startTransition, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, CalendarDays, ClipboardList, Edit, Hash, Info, StickyNote, Trash2, Type, User, Users } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import { formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import TabGroup, { type Tab } from '@/components/ui/TabGroup';
import { DRAWER_Z_CONTENT_BASE, DRAWER_WIDTH_DETAIL_SMALL } from '@/lib/dialog-sizes';
import { queryKeys } from '@/lib/query-keys';
import type { MttqKyHop } from '@/features/mat-tran-to-quoc/ky-hop/core/types';
import type { MttqUyVienUyBan } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';
import { getMttqKyHopById } from '@/features/mat-tran-to-quoc/ky-hop/services/mttq-ky-hop-service';
import { getMttqUyVienUyBanById } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/services/mttq-uy-vien-uy-ban-service';
import {
  useMttqKyHopDetail,
  useDeleteMttqKyHopMany,
} from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop';
import { canViewKyHopRow, useMttqKyHopViewer } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop-viewer';
import {
  useMttqUyVienUyBanDetail,
  useDeleteMttqUyVienUyBanMany,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban';
import type { MttqNhiemKy } from '../core/types';
import MttqNhiemKyDetailKyHopTab from './mttq-nhiem-ky-detail-ky-hop-tab';
import MttqNhiemKyDetailUyVienTab from './mttq-nhiem-ky-detail-uy-vien-tab';

const MttqKyHopDetail = lazy(() => import('@/features/mat-tran-to-quoc/ky-hop/components/mttq-ky-hop-detail'));
const MttqUyVienUyBanDetail = lazy(() => import('@/features/mat-tran-to-quoc/uy-vien-uy-ban/components/mttq-uy-vien-uy-ban-detail'));
const MttqKyHopForm = lazy(() => import('@/features/mat-tran-to-quoc/ky-hop/components/mttq-ky-hop-form'));
const MttqUyVienUyBanForm = lazy(() => import('@/features/mat-tran-to-quoc/uy-vien-uy-ban/components/mttq-uy-vien-uy-ban-form'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

const TAB_INFO = 'info';
const TAB_KY_HOP = 'kyHop';
const TAB_UY_VIEN = 'uyVien';
const TAB_DIEM_DANH = 'diemDanh';

const DIEM_DANH_MATRIX_BASE = '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky/diem-danh';

type NestedChildFormOrigin = 'nested-list' | 'nested-detail';

interface Props {
  data: MttqNhiemKy;
  onClose: () => void;
  onEdit: (item: MttqNhiemKy) => void;
  onDelete: (id: string) => void;
}

const MttqNhiemKyDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useResourcePermissions('matTranTerm');
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();
  const [detailTab, setDetailTab] = useState<string>(TAB_INFO);

  const [nestedKyHopId, setNestedKyHopId] = useState<string | null>(null);
  const [nestedUyVienId, setNestedUyVienId] = useState<string | null>(null);

  const [showKyHopForm, setShowKyHopForm] = useState(false);
  const [kyHopEditing, setKyHopEditing] = useState<MttqKyHop | null>(null);
  const [kyHopFormOrigin, setKyHopFormOrigin] = useState<NestedChildFormOrigin>('nested-list');

  const [showUyVienForm, setShowUyVienForm] = useState(false);
  const [uyVienEditing, setUyVienEditing] = useState<MttqUyVienUyBan | null>(null);
  const [uyVienFormOrigin, setUyVienFormOrigin] = useState<NestedChildFormOrigin>('nested-list');

  const { data: kyHopNestedData } = useMttqKyHopDetail(nestedKyHopId);
  const { data: uyVienNestedData } = useMttqUyVienUyBanDetail(nestedUyVienId);
  const deleteKyHopMutation = useDeleteMttqKyHopMany();
  const deleteUyVienMutation = useDeleteMttqUyVienUyBanMany();
  const kyHopViewer = useMttqKyHopViewer();

  useEffect(() => {
    if (!nestedKyHopId || !kyHopNestedData) return;
    if (!canViewKyHopRow(kyHopViewer, kyHopNestedData)) {
      toast.error(txt('matTranKyHop.noViewPermission'));
      setNestedKyHopId(null);
    }
  }, [nestedKyHopId, kyHopNestedData, kyHopViewer]);

  useEffect(() => {
    setDetailTab(TAB_INFO);
    setNestedKyHopId(null);
    setNestedUyVienId(null);
    setShowKyHopForm(false);
    setKyHopEditing(null);
    setShowUyVienForm(false);
    setUyVienEditing(null);
  }, [data.id]);

  const invalidateKyHopChildQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.mttqKyHop.byNhiemKy(data.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.mttqNhiemKy.detail(data.id) });
  }, [data.id, queryClient]);

  const invalidateUyVienChildQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.mttqUyVienUyBan.byNhiemKy(data.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.mttqNhiemKy.detail(data.id) });
  }, [data.id, queryClient]);

  const deleteKyHopById = useCallback(
    (id: string) => {
      deleteKyHopMutation.mutate([id], {
        onSuccess: () => {
          setNestedKyHopId((cur) => (cur === id ? null : cur));
          invalidateKyHopChildQueries();
        },
      });
    },
    [deleteKyHopMutation, invalidateKyHopChildQueries],
  );

  const deleteUyVienById = useCallback(
    (id: string) => {
      deleteUyVienMutation.mutate([id], {
        onSuccess: () => {
          setNestedUyVienId((cur) => (cur === id ? null : cur));
          invalidateUyVienChildQueries();
        },
      });
    },
    [deleteUyVienMutation, invalidateUyVienChildQueries],
  );

  const handleDeleteKyHopWithConfirm = useCallback(
    (id: string) => {
      confirm({
        title: txt('matTranKyHop.deleteTitle'),
        message: txt('matTranKyHop.deleteMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: () => deleteKyHopById(id),
      });
    },
    [confirm, deleteKyHopById],
  );

  const handleDeleteUyVienWithConfirm = useCallback(
    (id: string) => {
      confirm({
        title: txt('matTranUyVienUyBan.deleteTitle'),
        message: txt('matTranUyVienUyBan.deleteMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: () => deleteUyVienById(id),
      });
    },
    [confirm, deleteUyVienById],
  );

  const handleEditKyHopFromList = useCallback(async (item: MttqKyHop) => {
    try {
      const full = await getMttqKyHopById(item.id);
      if (!full) {
        toast.error(txt('matTranKyHop.service.notFound'));
        return;
      }
      startTransition(() => {
        setNestedKyHopId(null);
        setKyHopFormOrigin('nested-list');
        setKyHopEditing(full);
        setShowKyHopForm(true);
      });
    } catch {
      toast.error(txt('matTranKyHop.service.notFound'));
    }
  }, []);

  const handleEditUyVienFromList = useCallback(async (item: MttqUyVienUyBan) => {
    try {
      const full = await getMttqUyVienUyBanById(item.id);
      if (!full) {
        toast.error(txt('matTranUyVienUyBan.service.notFound'));
        return;
      }
      startTransition(() => {
        setNestedUyVienId(null);
        setUyVienFormOrigin('nested-list');
        setUyVienEditing(full);
        setShowUyVienForm(true);
      });
    } catch {
      toast.error(txt('matTranUyVienUyBan.service.notFound'));
    }
  }, []);

  const handleEditKyHopFromNestedDetail = useCallback((d: MttqKyHop) => {
    startTransition(() => {
      setKyHopFormOrigin('nested-detail');
      setKyHopEditing(d);
      setShowKyHopForm(true);
    });
  }, []);

  const handleEditUyVienFromNestedDetail = useCallback((d: MttqUyVienUyBan) => {
    startTransition(() => {
      setUyVienFormOrigin('nested-detail');
      setUyVienEditing(d);
      setShowUyVienForm(true);
    });
  }, []);

  const handleOpenCreateKyHop = useCallback(() => {
    startTransition(() => {
      setNestedKyHopId(null);
      setKyHopEditing(null);
      setKyHopFormOrigin('nested-list');
      setShowKyHopForm(true);
    });
  }, []);

  const handleOpenCreateUyVien = useCallback(() => {
    startTransition(() => {
      setNestedUyVienId(null);
      setUyVienEditing(null);
      setUyVienFormOrigin('nested-list');
      setShowUyVienForm(true);
    });
  }, []);

  const handleCloseKyHopForm = useCallback(() => {
    const editedId = kyHopEditing?.id ?? null;
    const origin = kyHopFormOrigin;
    setShowKyHopForm(false);
    setKyHopEditing(null);
    setKyHopFormOrigin('nested-list');
    if (origin === 'nested-detail' && editedId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqKyHop.detail(editedId) });
    }
    invalidateKyHopChildQueries();
  }, [kyHopEditing, kyHopFormOrigin, queryClient, invalidateKyHopChildQueries]);

  const handleCloseUyVienForm = useCallback(() => {
    const editedId = uyVienEditing?.id ?? null;
    const origin = uyVienFormOrigin;
    setShowUyVienForm(false);
    setUyVienEditing(null);
    setUyVienFormOrigin('nested-list');
    if (origin === 'nested-detail' && editedId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqUyVienUyBan.detail(editedId) });
    }
    invalidateUyVienChildQueries();
  }, [uyVienEditing, uyVienFormOrigin, queryClient, invalidateUyVienChildQueries]);

  const openKyHopDetail = useCallback((row: MttqKyHop) => {
    setNestedUyVienId(null);
    setNestedKyHopId(row.id);
  }, []);

  const openUyVienDetail = useCallback((row: MttqUyVienUyBan) => {
    setNestedKyHopId(null);
    setNestedUyVienId(row.id);
  }, []);

  const tabs = useMemo<Tab[]>(
    () => [
      { id: TAB_INFO, label: txt('matTranNhiemKy.detail.tabInfo'), icon: Info },
      { id: TAB_KY_HOP, label: txt('matTranNhiemKy.detail.tabKyHop'), icon: CalendarDays },
      { id: TAB_UY_VIEN, label: txt('matTranNhiemKy.detail.tabUyVien'), icon: Users },
      { id: TAB_DIEM_DANH, label: txt('matTranNhiemKy.detail.tabDiemDanh'), icon: ClipboardList },
    ],
    [],
  );

  const handleDetailTabChange = useCallback(
    (id: string) => {
      if (id === TAB_DIEM_DANH) {
        navigate(`${DIEM_DANH_MATRIX_BASE}/${data.id}`);
        onClose();
        return;
      }
      setDetailTab(id);
    },
    [data.id, navigate, onClose],
  );

  const handleDelete = () => {
    confirm({
      title: txt('matTranNhiemKy.deleteTitle'),
      message: txt('matTranNhiemKy.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: () => onDelete(data.id),
    });
  };

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
              onClick={handleDelete}
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
        onClose={onClose}
        title={txt('matTranNhiemKy.detail.title')}
        maxWidthClass={DRAWER_WIDTH_DETAIL}
        icon={<CalendarClock size={18} />}
        subtitle={data.ten_nhiem_ky}
        footer={footer}
        footerCompact
      >
        <div className="space-y-5">
          <DetailSummaryCard
            leading={
              <DetailSummaryIconTile>
                <CalendarClock size={26} className="text-white" aria-hidden />
              </DetailSummaryIconTile>
            }
            title={data.ten_nhiem_ky}
            subtitle={
              <p className="tabular-nums m-0">
                {data.tu_nam != null || data.den_nam != null
                  ? `${data.tu_nam ?? '—'} → ${data.den_nam ?? '—'}`
                  : txt('common.emptyCell')}
              </p>
            }
          />

          <div className="w-full overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            <TabGroup tabs={tabs} activeTab={detailTab} onChange={handleDetailTabChange} />
          </div>

          {detailTab === TAB_INFO ? (
            <>
              <DetailSection title={txt('matTranNhiemKy.detail.sectionMain')} icon={<Type size={14} />} variant="primary">
                <DetailFieldGrid>
                  <DetailField
                    label={txt('matTranNhiemKy.form.tenNhiemKy')}
                    value={<span className="font-semibold tracking-tight">{data.ten_nhiem_ky}</span>}
                    icon={<Type size={12} />}
                  />
                  <DetailField
                    label={txt('matTranNhiemKy.form.tuNam')}
                    value={data.tu_nam != null ? String(data.tu_nam) : undefined}
                    icon={<Hash size={12} />}
                    emptyText={txt('common.emptyCell')}
                  />
                  <DetailField
                    label={txt('matTranNhiemKy.form.denNam')}
                    value={data.den_nam != null ? String(data.den_nam) : undefined}
                    icon={<Hash size={12} />}
                    emptyText={txt('common.emptyCell')}
                  />
                  <DetailField
                    className={DETAIL_FIELD_SPAN_FULL}
                    label={txt('matTranNhiemKy.form.thongTin')}
                    value={
                      data.thong_tin?.trim() ? (
                        <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.thong_tin}</p>
                      ) : undefined
                    }
                    emptyText={txt('common.emptyCell')}
                  />
                  <DetailField
                    className={DETAIL_FIELD_SPAN_FULL}
                    label={txt('matTranNhiemKy.form.ghiChu')}
                    value={
                      data.ghi_chu?.trim() ? (
                        <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.ghi_chu}</p>
                      ) : undefined
                    }
                    icon={<StickyNote size={12} />}
                    emptyText={txt('common.emptyCell')}
                  />
                </DetailFieldGrid>
              </DetailSection>

              <DetailSection title={txt('matTranNhiemKy.detail.sectionCounts')} icon={<Hash size={14} />}>
                <DetailFieldGrid>
                  <DetailField label={txt('matTranNhiemKy.form.slDauNhiemKy')} value={String(data.sl_dau_nhiem_ky)} />
                  <DetailField label={txt('matTranNhiemKy.form.slDangThamGia')} value={String(data.sl_dang_tham_gia)} />
                  <DetailField label={txt('matTranNhiemKy.form.slThoiThamGia')} value={String(data.sl_thoi_tham_gia)} />
                  <DetailField label={txt('matTranNhiemKy.form.slCanBoSung')} value={String(data.sl_can_bo_sung)} />
                  <DetailField label={txt('matTranNhiemKy.form.slThieu')} value={String(data.sl_thieu)} />
                </DetailFieldGrid>
              </DetailSection>

              <DetailSection title={txt('matTranNhiemKy.detail.systemInfo')} icon={<User size={14} />}>
                <DetailFieldGrid>
                  <DetailField
                    label={txt('matTranNhiemKy.store.nguoiTaoCol')}
                    value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao ?? undefined}
                    emptyText={txt('common.emptyCell')}
                  />
                  <DetailField
                    label={txt('matTranNhiemKy.detail.tgTao')}
                    value={data.tg_tao ? formatDateTimeShort(data.tg_tao) : undefined}
                    emptyText={txt('common.emptyCell')}
                  />
                  <DetailField
                    label={txt('matTranNhiemKy.detail.tgCapNhat')}
                    value={data.tg_cap_nhat ? formatDateTimeShort(data.tg_cap_nhat) : undefined}
                    emptyText={txt('common.emptyCell')}
                  />
                </DetailFieldGrid>
              </DetailSection>
            </>
          ) : null}

          {detailTab === TAB_KY_HOP ? (
            <MttqNhiemKyDetailKyHopTab
              nhiemKyId={data.id}
              onViewRow={openKyHopDetail}
              onEditRow={handleEditKyHopFromList}
              onDeleteRow={handleDeleteKyHopWithConfirm}
              onAdd={handleOpenCreateKyHop}
            />
          ) : null}
          {detailTab === TAB_UY_VIEN ? (
            <MttqNhiemKyDetailUyVienTab
              nhiemKyId={data.id}
              onViewRow={openUyVienDetail}
              onEditRow={handleEditUyVienFromList}
              onDeleteRow={handleDeleteUyVienWithConfirm}
              onAdd={handleOpenCreateUyVien}
            />
          ) : null}
        </div>
      </GenericDrawer>

      <AnimatePresence>
        {showKyHopForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKyHopForm
              initialData={kyHopEditing}
              defaultNhiemKyId={kyHopEditing ? undefined : data.id}
              onClose={handleCloseKyHopForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUyVienForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqUyVienUyBanForm
              initialData={uyVienEditing}
              defaultNhiemKyId={uyVienEditing ? undefined : data.id}
              onClose={handleCloseUyVienForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nestedKyHopId && kyHopNestedData && !showKyHopForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKyHopDetail
              data={kyHopNestedData}
              stackLevel={1}
              maxWidthClass={DRAWER_WIDTH_DETAIL_SMALL}
              onClose={() => setNestedKyHopId(null)}
              onEdit={handleEditKyHopFromNestedDetail}
              onDelete={deleteKyHopById}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nestedUyVienId && uyVienNestedData && !showUyVienForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqUyVienUyBanDetail
              data={uyVienNestedData}
              stackLevel={1}
              maxWidthClass={DRAWER_WIDTH_DETAIL_SMALL}
              onClose={() => setNestedUyVienId(null)}
              onEdit={handleEditUyVienFromNestedDetail}
              onDelete={deleteUyVienById}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
};

export default MttqNhiemKyDetail;
