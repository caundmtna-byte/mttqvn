import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense, startTransition } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import Button from '@/components/ui/Button';
import GenericToolbar from '@/components/shared/GenericToolbar';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useMttqNhiemKyDetail } from '../hooks/use-mttq-nhiem-ky';
import { useMttqKyHopListForNhiemKy } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop';
import {
  useMttqUyVienUyBanListForNhiemKy,
  useMttqUyVienUyBanDetail,
  useDeleteMttqUyVienUyBanMany,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban';
import {
  canViewUyVienUyBanRow,
  useMttqUyVienUyBanViewer,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import { canViewKyHopRow, useMttqKyHopViewer } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop-viewer';
import { useDiemDanhForNhiemKy, useUpsertDiemDanh } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-diem-danh';
import type { MttqDiemDanhTrangThai } from '@/features/mat-tran-to-quoc/ky-hop/core/types';
import type { MttqKyHop } from '@/features/mat-tran-to-quoc/ky-hop/core/types';
import type { MttqUyVienUyBan } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';

const MttqUyVienUyBanDetail = lazy(() => import('@/features/mat-tran-to-quoc/uy-vien-uy-ban/components/mttq-uy-vien-uy-ban-detail'));
const MttqUyVienUyBanForm = lazy(() => import('@/features/mat-tran-to-quoc/uy-vien-uy-ban/components/mttq-uy-vien-uy-ban-form'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

const NHIEM_KY_LIST_PATH = '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky';

function cellKey(kyHopId: string, uyVienId: string) {
  return `${kyHopId}:${uyVienId}`;
}

const MttqNhiemKyDiemDanhMatrixPage: React.FC = () => {
  const { nhiemKyId: nhiemKyIdParam } = useParams<{ nhiemKyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nhiemKyId = String(nhiemKyIdParam ?? '').trim();

  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const [uyVienViewingId, setUyVienViewingId] = useState<string | null>(null);
  const [showUyVienForm, setShowUyVienForm] = useState(false);
  const [uyVienEditing, setUyVienEditing] = useState<MttqUyVienUyBan | null>(null);

  const canViewSession = useCan('view', 'matTranSession');
  const canViewUyVien = useCan('view', 'matTranCommitteeMembers');
  const canViewTerm = useCan('view', 'matTranTerm');
  const { canEdit: canEditSession } = useResourcePermissions('matTranSession');

  const { data: nhiemKy } = useMttqNhiemKyDetail(nhiemKyId || null);
  const { data: kyHopRows = [], isLoading: loadingKy } = useMttqKyHopListForNhiemKy(nhiemKyId, {
    enabled: Boolean(nhiemKyId) && canViewSession,
  });
  const { data: uyVienRows = [], isLoading: loadingUv } = useMttqUyVienUyBanListForNhiemKy(nhiemKyId, {
    enabled: Boolean(nhiemKyId) && canViewUyVien,
  });
  const kyHopViewer = useMttqKyHopViewer();
  const visibleKyHopRows = useMemo(
    () => kyHopRows.filter((r) => canViewKyHopRow(kyHopViewer, r)),
    [kyHopRows, kyHopViewer],
  );
  const uyVienViewer = useMttqUyVienUyBanViewer();
  const visibleUyVienRows = useMemo(
    () => uyVienRows.filter((r) => canViewUyVienUyBanRow(uyVienViewer, r)),
    [uyVienRows, uyVienViewer],
  );
  const { data: uyVienViewingData } = useMttqUyVienUyBanDetail(uyVienViewingId);
  const { data: diemDanhRows = [], isLoading: loadingDd } = useDiemDanhForNhiemKy(nhiemKyId || null, {
    enabled: Boolean(nhiemKyId) && canViewSession && canViewUyVien,
  });

  const upsertMutation = useUpsertDiemDanh();
  const deleteUyVienMutation = useDeleteMttqUyVienUyBanMany();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const sortedKyHop = useMemo(() => {
    const list = [...visibleKyHopRows];
    list.sort((a, b) => {
      const da = a.ngay_hop ?? '';
      const db = b.ngay_hop ?? '';
      if (da !== db) return db.localeCompare(da);
      return String(b.ky_thu).localeCompare(String(a.ky_thu), 'vi');
    });
    return list;
  }, [visibleKyHopRows]);

  const sortedUyVien = useMemo(() => {
    return [...visibleUyVienRows].sort((a, b) => a.ho_va_ten.localeCompare(b.ho_va_ten, 'vi'));
  }, [visibleUyVienRows]);

  /** Drawer chi tiết: nếu data về mà viewer không đủ quyền (vd. đoán id), tự đóng + báo. */
  useEffect(() => {
    if (!uyVienViewingId || !uyVienViewingData) return;
    if (!canViewUyVienUyBanRow(uyVienViewer, uyVienViewingData)) {
      toast.error(txt('matTranUyVienUyBan.noViewPermission'));
      setUyVienViewingId(null);
    }
  }, [uyVienViewingId, uyVienViewingData, uyVienViewer]);

  const trangThaiMap = useMemo(() => {
    const m = new Map<string, MttqDiemDanhTrangThai>();
    for (const r of diemDanhRows) {
      m.set(cellKey(r.ky_hop_id, r.uy_vien_id), r.trang_thai);
    }
    return m;
  }, [diemDanhRows]);

  const handleSet = useCallback(
    async (kh: MttqKyHop, uv: MttqUyVienUyBan, trangThai: MttqDiemDanhTrangThai) => {
      if (!idNguoiTao) return;
      const key = cellKey(kh.id, uv.id);
      setPendingKey(key);
      try {
        await upsertMutation.mutateAsync({
          kyHopId: kh.id,
          uyVienId: uv.id,
          trangThai,
          idNguoiTao,
          nhiemKyId,
        });
      } finally {
        setPendingKey(null);
      }
    },
    [idNguoiTao, nhiemKyId, upsertMutation],
  );

  const invalidateUyVienMatrixQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.mttqUyVienUyBan.byNhiemKy(nhiemKyId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.mttqNhiemKy.detail(nhiemKyId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.mttqDiemDanhUyVien.byNhiemKy(nhiemKyId) });
  }, [nhiemKyId, queryClient]);

  const deleteUyVienById = useCallback(
    (id: string) => {
      deleteUyVienMutation.mutate([id], {
        onSuccess: () => {
          setUyVienViewingId((cur) => (cur === id ? null : cur));
          invalidateUyVienMatrixQueries();
        },
      });
    },
    [deleteUyVienMutation, invalidateUyVienMatrixQueries],
  );

  const handleEditUyVienFromDetail = useCallback((d: MttqUyVienUyBan) => {
    startTransition(() => {
      setUyVienEditing(d);
      setShowUyVienForm(true);
    });
  }, []);

  const handleCloseUyVienForm = useCallback(() => {
    const vid = uyVienViewingId;
    const editedId = uyVienEditing?.id ?? null;
    setShowUyVienForm(false);
    setUyVienEditing(null);
    if (vid && editedId === vid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqUyVienUyBan.detail(vid) });
    }
    invalidateUyVienMatrixQueries();
  }, [uyVienViewingId, uyVienEditing, queryClient, invalidateUyVienMatrixQueries]);

  const openUyVienRow = useCallback((uv: MttqUyVienUyBan) => {
    setUyVienViewingId(uv.id);
  }, []);

  const canMutate = canEditSession && Boolean(idNguoiTao);
  const loading = loadingKy || loadingUv || loadingDd;
  const canViewMatrix = canViewSession && canViewUyVien;

  if (!nhiemKyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center text-muted-foreground">
        <p className="text-sm">{txt('matTranNhiemKy.detail.matrixInvalidId')}</p>
      </div>
    );
  }

  if (!canViewTerm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center text-muted-foreground">
        <p className="text-sm">{txt('matTranNhiemKy.noViewPermission')}</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col h-page relative">
      <GenericToolbar
        selectedCount={0}
        searchTerm=""
        onSearchChange={() => {}}
        onClearSelection={() => {}}
        showBack
        onBack={() => navigate(NHIEM_KY_LIST_PATH)}
        hideSearch
        desktopStartSlot={
          <div className="flex min-w-0 max-w-[min(100vw-8rem,28rem)] flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              {txt('matTranNhiemKy.detail.tabDiemDanh')}
            </span>
            <span className="truncate text-sm font-medium text-foreground" title={nhiemKy?.ten_nhiem_ky}>
              {nhiemKy?.ten_nhiem_ky ?? txt('common.loadingData')}
            </span>
          </div>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {!canViewMatrix ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {!canViewSession ? (
              <p>{txt('matTranKyHop.diemDanh.noViewPermission')}</p>
            ) : (
              <p>{txt('matTranUyVienUyBan.noViewPermission')}</p>
            )}
          </div>
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            {txt('common.loadingData')}
          </div>
        ) : sortedUyVien.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            {txt('matTranKyHop.diemDanh.emptyUyVien')}
          </div>
        ) : sortedKyHop.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            {txt('matTranNhiemKy.detail.matrixEmptyKyHop')}
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col p-3 sm:p-4">
            <div className="min-h-0 flex-1 overflow-auto custom-scrollbar rounded-lg border border-border">
              <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 top-0 z-[22] min-w-[11rem] max-w-[15rem] border-b border-r border-border bg-card px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]"
                    >
                      {txt('matTranNhiemKy.detail.matrixCornerLabel')}
                    </th>
                    {sortedKyHop.map((kh) => {
                      const headTitle = [kh.ky_thu, kh.ngay_hop?.trim() || null].filter(Boolean).join(' · ');
                      return (
                        <th
                          key={kh.id}
                          scope="col"
                          className="sticky top-0 z-20 min-w-[5.75rem] max-w-[8rem] border-b border-border bg-card px-2 py-2 text-center text-xs font-semibold leading-snug text-foreground sm:text-[13px]"
                          title={headTitle}
                        >
                          <span className="line-clamp-2 break-words">{kh.ky_thu}</span>
                          {kh.ngay_hop?.trim() ? (
                            <span className="mt-0.5 block text-[11px] font-normal tabular-nums text-muted-foreground">
                              {kh.ngay_hop}
                            </span>
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedUyVien.map((uv) => (
                    <tr
                      key={uv.id}
                      className="group cursor-pointer [&>td]:border-b [&>td]:border-border"
                      onClick={() => openUyVienRow(uv)}
                      title={`${uv.ho_va_ten} — ${txt('matTranUyVienUyBan.detail.title')}`}
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-[2] min-w-[11rem] max-w-[15rem] border-r border-border bg-card px-3 py-2 text-left align-middle shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)] transition-colors group-hover:bg-muted/50"
                      >
                        <span className="line-clamp-2 font-medium leading-snug text-foreground">{uv.ho_va_ten}</span>
                      </th>
                      {sortedKyHop.map((kh) => {
                        const ck = cellKey(kh.id, uv.id);
                        const current = trangThaiMap.get(ck) ?? null;
                        const rowPending = pendingKey === ck;
                        return (
                          <td
                            key={ck}
                            className="bg-card px-1 py-1.5 align-middle text-center transition-colors group-hover:bg-muted/50"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <div
                              className="flex items-center justify-center gap-1 py-0.5"
                              title={
                                !idNguoiTao && canEditSession
                                  ? txt('matTranKyHop.diemDanh.noEmployeeProfile')
                                  : undefined
                              }
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant={current === 'Có mặt' ? 'default' : 'outline'}
                                className="h-8 w-8 shrink-0 p-0"
                                disabled={!canMutate || rowPending}
                                aria-label={txt('matTranKyHop.diemDanh.coMat')}
                                title={txt('matTranKyHop.diemDanh.coMat')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleSet(kh, uv, 'Có mặt');
                                }}
                              >
                                <Check className="h-4 w-4" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={current === 'Vắng mặt' ? 'default' : 'outline'}
                                className="h-8 w-8 shrink-0 p-0"
                                disabled={!canMutate || rowPending}
                                aria-label={txt('matTranKyHop.diemDanh.vangMat')}
                                title={txt('matTranKyHop.diemDanh.vangMat')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleSet(kh, uv, 'Vắng mặt');
                                }}
                              >
                                <UserX className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>

      <AnimatePresence>
        {showUyVienForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqUyVienUyBanForm
              initialData={uyVienEditing}
              defaultNhiemKyId={uyVienEditing ? undefined : nhiemKyId}
              onClose={handleCloseUyVienForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uyVienViewingId && uyVienViewingData && !showUyVienForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqUyVienUyBanDetail
              data={uyVienViewingData}
              onClose={() => setUyVienViewingId(null)}
              onEdit={handleEditUyVienFromDetail}
              onDelete={deleteUyVienById}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
};

export default MttqNhiemKyDiemDanhMatrixPage;
