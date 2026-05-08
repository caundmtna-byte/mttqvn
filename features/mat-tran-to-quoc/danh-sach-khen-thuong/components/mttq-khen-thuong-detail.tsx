import React, { useCallback, useMemo, useState } from 'react';
import {
  AlignLeft,
  ArrowRightLeft,
  Award,
  Building2,
  Calendar,
  Clock,
  Edit,
  FileText,
  Link2,
  ListChecks,
  Medal,
  Plus,
  StickyNote,
  Tag,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { TableRowIconButton } from '@/components/shared/row-actions';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useCan } from '@/hooks/use-can';
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import type { MttqKhenThuong, MttqKhenThuongCt } from '../core/types';
import type {
  MttqKhenThuongFormValues,
  MttqKhenThuongChiTietLineFormValues,
  MttqKhenThuongStatusChangeValues,
} from '../core/schema';
import {
  MTTQ_KHEN_THUONG_DANH_HIEU,
  MTTQ_KHEN_THUONG_HINH_THUC,
} from '../core/constants';
import { useUpdateMttqKhenThuong } from '../hooks/use-mttq-khen-thuong';
import MttqKhenThuongChiTietLineDrawer, {
  MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE,
} from './mttq-khen-thuong-chi-tiet-line-drawer';
import MttqKhenThuongChuyenTrangThaiDialog from './mttq-khen-thuong-chuyen-trang-thai-dialog';
import {
  getKhenThuongDanhHieuBadgeConfig,
  getKhenThuongHinhThucBadgeConfig,
  getKhenThuongTrangThaiBadgeConfig,
} from '../utils/display-format';

interface Props {
  data: MttqKhenThuong;
  onClose: () => void;
  onEdit: (item: MttqKhenThuong) => void;
  onDelete: (id: string) => void;
}

type LineDrawerState = null | { mode: 'add' } | { mode: 'edit'; index: number };

type ChiTietDetailRow = MttqKhenThuongCt & { rowIndex: number };

function chiTietToLineForm(c: MttqKhenThuongCt): MttqKhenThuongChiTietLineFormValues {
  return {
    id: c.id,
    can_bo_id: c.can_bo_id,
    hinh_thuc_khen: c.hinh_thuc_khen,
    danh_hieu: c.danh_hieu,
    noi_dung_khen: c.noi_dung_khen ?? undefined,
    ho_so_khen: c.ho_so_khen ?? undefined,
  };
}

function parentToFormValues(d: MttqKhenThuong, chiLines: MttqKhenThuongChiTietLineFormValues[]): MttqKhenThuongFormValues {
  return {
    so_qd: d.so_qd,
    ngay_khen_thuong: d.ngay_khen_thuong,
    don_vi_de_xuat: d.don_vi_de_xuat ?? undefined,
    ghi_chu: d.ghi_chu ?? undefined,
    trang_thai: d.trang_thai,
    chi_tiet: chiLines,
  };
}

const CHI_TIET_TABLE_CLASS = 'min-w-[56rem]';
const CELL_NOWRAP = 'whitespace-nowrap align-top';

function chiTietCellClass(extra: string) {
  return `${CELL_NOWRAP} ${extra}`;
}

const MttqKhenThuongDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranRewardList');
  const confirm = useConfirmStore((s) => s.confirm);
  const updateMutation = useUpdateMttqKhenThuong();
  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });

  const [lineDrawer, setLineDrawer] = useState<LineDrawerState>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const trangThaiBadgeConfig = useMemo(() => getKhenThuongTrangThaiBadgeConfig(), []);
  const hinhThucBadgeConfig = useMemo(() => getKhenThuongHinhThucBadgeConfig(), []);
  const danhHieuBadgeConfig = useMemo(() => getKhenThuongDanhHieuBadgeConfig(), []);

  const toolbarActions: DetailToolbarAction[] = useMemo(
    () =>
      canEdit
        ? [
            {
              label: txt('matTranKhenThuong.detail.toolbarChangeStatus'),
              icon: <ArrowRightLeft size={16} />,
              variant: 'info' as const,
              onClick: () => {
                setLineDrawer(null);
                setStatusModalOpen(true);
              },
            },
          ]
        : [],
    [canEdit],
  );

  const lineFormRows = useMemo(() => data.chi_tiet.map(chiTietToLineForm), [data.chi_tiet]);

  const canBoOptions = useMemo(
    () =>
      [...canBoList]
        .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, 'vi'))
        .map((c) => ({ label: c.ho_ten, value: String(c.id) })),
    [canBoList],
  );

  const hinhThucOpts = useMemo(
    () => MTTQ_KHEN_THUONG_HINH_THUC.map((v) => ({ label: v, value: v })),
    [],
  );
  const danhHieuOpts = useMemo(
    () => MTTQ_KHEN_THUONG_DANH_HIEU.map((v) => ({ label: v, value: v })),
    [],
  );

  const gridRows: ChiTietDetailRow[] = useMemo(
    () => data.chi_tiet.map((r, i) => ({ ...r, rowIndex: i })),
    [data.chi_tiet],
  );

  const openAddLine = useCallback(() => {
    setStatusModalOpen(false);
    setLineDrawer({ mode: 'add' });
  }, []);
  const openEditLine = useCallback((index: number) => {
    setStatusModalOpen(false);
    setLineDrawer({ mode: 'edit', index });
  }, []);

  const handleLineDrawerSave = useCallback(
    async (values: MttqKhenThuongChiTietLineFormValues) => {
      if (!lineDrawer) return;
      let nextLines: MttqKhenThuongChiTietLineFormValues[];
      if (lineDrawer.mode === 'add') {
        nextLines = [...lineFormRows, values];
      } else {
        nextLines = lineFormRows.map((l, i) => (i === lineDrawer.index ? values : l));
      }
      await updateMutation.mutateAsync({
        id: data.id,
        data: parentToFormValues(data, nextLines),
      });
    },
    [data, lineDrawer, lineFormRows, updateMutation],
  );

  const handleRemoveLine = useCallback(
    (index: number) => {
      if (data.chi_tiet.length <= 1) {
        toast.warning(txt('matTranKhenThuong.chiTietDrawer.cannotDeleteLast'));
        return;
      }
      confirm({
        title: txt('matTranKhenThuong.chiTietDrawer.deleteLineTitle'),
        message: txt('matTranKhenThuong.chiTietDrawer.deleteLineMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: () => {
          const nextLines = lineFormRows.filter((_, i) => i !== index);
          updateMutation.mutate({ id: data.id, data: parentToFormValues(data, nextLines) });
        },
      });
    },
    [confirm, data, lineFormRows, updateMutation],
  );

  const lineDrawerInitial = useMemo(() => {
    if (!lineDrawer) return MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE;
    if (lineDrawer.mode === 'add') return MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE;
    const row = lineFormRows[lineDrawer.index];
    return row ? { ...MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE, ...row } : MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE;
  }, [lineDrawer, lineFormRows]);

  const statusChangeInitial = useMemo(
    (): MttqKhenThuongStatusChangeValues => ({
      trang_thai: data.trang_thai,
      ghi_chu: data.ghi_chu ?? undefined,
    }),
    [data.trang_thai, data.ghi_chu],
  );

  const handleStatusChangeSave = useCallback(
    async (form: MttqKhenThuongStatusChangeValues) => {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          ...parentToFormValues(data, lineFormRows),
          trang_thai: form.trang_thai,
          ghi_chu: form.ghi_chu,
        },
      });
    },
    [data, lineFormRows, updateMutation],
  );

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
        onClose={onClose}
        title={txt('matTranKhenThuong.detail.title')}
        maxWidthClass={DRAWER_WIDTH_DETAIL}
        icon={<Award size={18} />}
        subtitle={`${data.so_qd} · ${data.ngay_khen_thuong ? formatDateShort(data.ngay_khen_thuong) : ''}`}
        footer={footer}
        footerCompact
      >
        <div className="space-y-5">
          <DetailSummaryCard
            leading={
              <DetailSummaryIconTile>
                <Award size={26} className="text-white" aria-hidden />
              </DetailSummaryIconTile>
            }
            title={data.so_qd}
            badge={<EnumBadge value={data.trang_thai} config={trangThaiBadgeConfig} shape="pill" truncate />}
            subtitle={
              <p className="tabular-nums m-0">
                {data.ngay_khen_thuong ? formatDateShort(data.ngay_khen_thuong) : txt('common.emptyCell')}
                {data.don_vi_de_xuat?.trim() ? ` · ${data.don_vi_de_xuat}` : ''}
              </p>
            }
          />

          {toolbarActions.length > 0 ? (
            <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
          ) : null}

          <DetailSection title={txt('matTranKhenThuong.detail.sectionHeader')} icon={<FileText size={14} />} variant="primary">
            <DetailFieldGrid>
              <DetailField
                label={txt('matTranKhenThuong.form.soQd')}
                value={<span className="font-semibold tracking-tight">{data.so_qd}</span>}
                icon={<FileText size={12} />}
              />
              <DetailField
                label={txt('matTranKhenThuong.form.ngayKhenThuong')}
                value={
                  data.ngay_khen_thuong ? (
                    <span className="tabular-nums">{formatDateShort(data.ngay_khen_thuong)}</span>
                  ) : undefined
                }
                icon={<Calendar size={12} />}
              />
              <DetailField
                label={txt('matTranKhenThuong.form.donViDeXuat')}
                value={data.don_vi_de_xuat ?? undefined}
                icon={<Building2 size={12} />}
                emptyText={txt('common.emptyCell')}
              />
              <DetailField
                label={txt('matTranKhenThuong.form.trangThai')}
                value={<EnumBadge value={data.trang_thai} config={trangThaiBadgeConfig} shape="pill" />}
                icon={<Tag size={12} />}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('matTranKhenThuong.form.ghiChu')}
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

          <DetailSection title={txt('matTranKhenThuong.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
            <DetailFieldGrid>
              <DetailField
                label={txt('matTranKhenThuong.detail.tgTao')}
                value={<span className="tabular-nums">{formatDateTimeShort(data.tg_tao)}</span>}
                icon={<Calendar size={12} />}
              />
              <DetailField
                label={txt('matTranKhenThuong.detail.tgCapNhat')}
                value={<span className="tabular-nums">{formatDateTimeShort(data.tg_cap_nhat)}</span>}
                icon={<Clock size={12} />}
              />
              <DetailField
                label={txt('matTranKhenThuong.store.nguoiTaoCol')}
                value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao ?? undefined}
                icon={<User size={12} />}
                emptyText={txt('common.emptyCell')}
              />
            </DetailFieldGrid>
          </DetailSection>

          <DetailSection
            title={txt('matTranKhenThuong.detail.sectionChiTiet')}
            icon={<Users size={14} />}
            variant="primary"
            headerRight={
              canEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={openAddLine} className="gap-1">
                  <Plus className="w-4 h-4" />
                  {txt('matTranKhenThuong.form.addLine')}
                </Button>
              ) : null
            }
          >
            {gridRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{txt('matTranKhenThuong.form.chiTietEmptyHint')}</p>
            ) : (
              <EmbeddedChildDataGrid<ChiTietDetailRow>
                rows={gridRows}
                getRowKey={(r) => r.id}
                maxVisibleBodyRows={8}
                tableClassName={CHI_TIET_TABLE_CLASS}
                onRowClick={canEdit ? (r) => openEditLine(r.rowIndex) : undefined}
                labelColumn={{
                  minWidthClass: 'min-w-[12rem] w-[12rem]',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranKhenThuong.form.canBo')}
                    </span>
                  ),
                  renderCell: (r) => (
                    <span className={`inline-flex items-center gap-2 min-w-0 ${CELL_NOWRAP}`}>
                      <Users size={14} className="shrink-0 text-primary/70" aria-hidden />
                      <span className="font-medium text-foreground">{r.ten_can_bo ?? `#${r.can_bo_id}`}</span>
                    </span>
                  ),
                  cellClassName: CELL_NOWRAP,
                }}
                columns={[
                  {
                    id: 'hinh_thuc',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranKhenThuong.form.hinhThuc')}
                      </span>
                    ),
                    headerClassName: 'min-w-[8.5rem]',
                    cellClassName: chiTietCellClass('min-w-[8.5rem]'),
                    renderCell: (r) => (
                      <EnumBadge
                        value={r.hinh_thuc_khen}
                        config={hinhThucBadgeConfig}
                        shape="rounded"
                        truncate
                      />
                    ),
                  },
                  {
                    id: 'danh_hieu',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <Medal size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranKhenThuong.form.danhHieu')}
                      </span>
                    ),
                    headerClassName: 'min-w-[7.5rem]',
                    cellClassName: chiTietCellClass('min-w-[7.5rem]'),
                    renderCell: (r) => (
                      <EnumBadge value={r.danh_hieu} config={danhHieuBadgeConfig} shape="rounded" truncate />
                    ),
                  },
                  {
                    id: 'noi_dung',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <AlignLeft size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranKhenThuong.form.noiDung')}
                      </span>
                    ),
                    headerClassName: 'min-w-[16rem]',
                    cellClassName: chiTietCellClass('min-w-[16rem]'),
                    renderCell: (r) => (r.noi_dung_khen?.trim() ? r.noi_dung_khen : txt('common.emptyCell')),
                  },
                  {
                    id: 'ho_so',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <Link2 size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranKhenThuong.form.hoSo')}
                      </span>
                    ),
                    headerClassName: 'min-w-[12rem]',
                    cellClassName: chiTietCellClass('min-w-[12rem]'),
                    renderCell: (r) => (r.ho_so_khen?.trim() ? r.ho_so_khen : txt('common.emptyCell')),
                  },
                ]}
                actionsColumn={{
                  header: txt('common.actions'),
                  widthClass: 'w-[5.5rem] min-w-[5.5rem]',
                  renderCell: (r) =>
                    canEdit ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <TableRowIconButton
                          icon={Edit}
                          label={txt('common.edit')}
                          size="compact"
                          variant="primary"
                          onClick={() => openEditLine(r.rowIndex)}
                        />
                        <TableRowIconButton
                          icon={Trash2}
                          label={txt('common.delete')}
                          size="compact"
                          variant="danger"
                          disabled={data.chi_tiet.length <= 1}
                          onClick={() => handleRemoveLine(r.rowIndex)}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground"> </span>
                    ),
                }}
              />
            )}
          </DetailSection>
        </div>
      </GenericDrawer>

      {lineDrawer && canEdit ? (
        <MttqKhenThuongChiTietLineDrawer
          key={lineDrawer.mode === 'edit' ? `e-${lineDrawer.index}` : 'add'}
          open
          onClose={() => setLineDrawer(null)}
          mode={lineDrawer.mode}
          initialLine={lineDrawerInitial}
          canBoOptions={canBoOptions}
          hinhThucOpts={hinhThucOpts}
          danhHieuOpts={danhHieuOpts}
          onSave={handleLineDrawerSave}
          isSubmitting={updateMutation.isPending}
          stackLevel={1}
        />
      ) : null}

      {statusModalOpen && canEdit ? (
        <MttqKhenThuongChuyenTrangThaiDialog
          key={`status-${data.id}`}
          open
          onClose={() => setStatusModalOpen(false)}
          initial={statusChangeInitial}
          onSave={handleStatusChangeSave}
          isSubmitting={updateMutation.isPending}
        />
      ) : null}
    </>
  );
};

export default MttqKhenThuongDetail;
