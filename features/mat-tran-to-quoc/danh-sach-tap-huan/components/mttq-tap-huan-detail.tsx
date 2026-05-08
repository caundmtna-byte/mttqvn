import React, { useCallback, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Clock,
  Edit,
  FileText,
  GraduationCap,
  IdCard,
  ListChecks,
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
import { formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { TableRowIconButton } from '@/components/shared/row-actions';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useCan } from '@/hooks/use-can';
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import type { MttqLopTapHuan, MttqLopTapHuanCt } from '../core/types';
import type {
  MttqTapHuanFormValues,
  MttqTapHuanChiTietLineFormValues,
} from '../core/schema';
import { MTTQ_TAP_HUAN_THUOC_DIEN } from '../core/constants';
import { useUpdateMttqLopTapHuan } from '../hooks/use-mttq-tap-huan';
import MttqTapHuanChiTietLineDrawer, {
  MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE,
} from './mttq-tap-huan-chi-tiet-line-drawer';
import {
  getTapHuanCapBadgeConfig,
  getTapHuanThuocDienBadgeConfig,
} from '../utils/display-format';

interface Props {
  data: MttqLopTapHuan;
  onClose: () => void;
  onEdit: (item: MttqLopTapHuan) => void;
  onDelete: (id: string) => void;
}

type LineDrawerState = null | { mode: 'add' } | { mode: 'edit'; index: number };

type ChiTietDetailRow = MttqLopTapHuanCt & { rowIndex: number };

function chiTietToLineForm(c: MttqLopTapHuanCt): MttqTapHuanChiTietLineFormValues {
  return {
    id: c.id,
    can_bo_id: c.can_bo_id,
    chuc_vu: c.chuc_vu ?? '',
    don_vi_cong_tac: c.don_vi_cong_tac ?? '',
    thuoc_dien: c.thuoc_dien,
  };
}

function parentToFormValues(
  d: MttqLopTapHuan,
  chiLines: MttqTapHuanChiTietLineFormValues[],
): MttqTapHuanFormValues {
  return {
    ten_lop_tap_huan: d.ten_lop_tap_huan,
    nam_tap_huan: d.nam_tap_huan,
    cap_tap_huan: d.cap_tap_huan,
    ghi_chu: d.ghi_chu ?? undefined,
    chi_tiet: chiLines,
  };
}

const CHI_TIET_TABLE_CLASS = 'min-w-[64rem]';
const CELL_NOWRAP = 'whitespace-nowrap align-top';

function chiTietCellClass(extra: string) {
  return `${CELL_NOWRAP} ${extra}`;
}

const MttqLopTapHuanDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranTrainingList');
  const confirm = useConfirmStore((s) => s.confirm);
  const updateMutation = useUpdateMttqLopTapHuan();
  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });

  const [lineDrawer, setLineDrawer] = useState<LineDrawerState>(null);

  const capBadgeConfig = useMemo(() => getTapHuanCapBadgeConfig(), []);
  const thuocDienBadgeConfig = useMemo(() => getTapHuanThuocDienBadgeConfig(), []);

  const lineFormRows = useMemo(() => data.chi_tiet.map(chiTietToLineForm), [data.chi_tiet]);

  const canBoOptions = useMemo(
    () =>
      [...canBoList]
        .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, 'vi'))
        .map((c) => ({ label: c.ho_ten, value: String(c.id) })),
    [canBoList],
  );

  const thuocDienOpts = useMemo(
    () => MTTQ_TAP_HUAN_THUOC_DIEN.map((v) => ({ label: v, value: v })),
    [],
  );

  const canBoMap = useMemo(() => {
    const m = new Map<string, (typeof canBoList)[number]>();
    for (const c of canBoList) m.set(String(c.id), c);
    return m;
  }, [canBoList]);

  const resolveFromCanBo = useCallback(
    (canBoId: string) => {
      const c = canBoMap.get(canBoId.trim());
      return {
        chuc_vu: (c?.ten_chuc_vu ?? '').trim(),
        don_vi_cong_tac: (c?.ten_to_chuc ?? '').trim(),
      };
    },
    [canBoMap],
  );

  const gridRows: ChiTietDetailRow[] = useMemo(
    () => data.chi_tiet.map((r, i) => ({ ...r, rowIndex: i })),
    [data.chi_tiet],
  );

  const openAddLine = useCallback(() => {
    setLineDrawer({ mode: 'add' });
  }, []);
  const openEditLine = useCallback((index: number) => {
    setLineDrawer({ mode: 'edit', index });
  }, []);

  const handleLineDrawerSave = useCallback(
    async (values: MttqTapHuanChiTietLineFormValues) => {
      if (!lineDrawer) return;
      let nextLines: MttqTapHuanChiTietLineFormValues[];
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
        toast.warning(txt('matTranTapHuan.chiTietDrawer.cannotDeleteLast'));
        return;
      }
      confirm({
        title: txt('matTranTapHuan.chiTietDrawer.deleteLineTitle'),
        message: txt('matTranTapHuan.chiTietDrawer.deleteLineMessage'),
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
    if (!lineDrawer) return MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE;
    if (lineDrawer.mode === 'add') return MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE;
    const row = lineFormRows[lineDrawer.index];
    return row
      ? { ...MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE, ...row }
      : MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE;
  }, [lineDrawer, lineFormRows]);

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
        title={txt('matTranTapHuan.detail.title')}
        maxWidthClass={DRAWER_WIDTH_DETAIL}
        icon={<GraduationCap size={18} />}
        subtitle={`${data.ten_lop_tap_huan} · ${data.nam_tap_huan}`}
        footer={footer}
        footerCompact
      >
        <div className="space-y-5">
          <DetailSummaryCard
            leading={
              <DetailSummaryIconTile>
                <GraduationCap size={26} className="text-white" aria-hidden />
              </DetailSummaryIconTile>
            }
            title={data.ten_lop_tap_huan}
            badge={<EnumBadge value={data.cap_tap_huan} config={capBadgeConfig} shape="pill" truncate />}
            subtitle={
              <p className="tabular-nums m-0">
                {data.nam_tap_huan ? String(data.nam_tap_huan) : txt('common.emptyCell')}
              </p>
            }
          />

          <DetailSection
            title={txt('matTranTapHuan.detail.sectionHeader')}
            icon={<FileText size={14} />}
            variant="primary"
          >
            <DetailFieldGrid>
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('matTranTapHuan.form.tenLop')}
                value={
                  <span className="font-semibold tracking-tight">{data.ten_lop_tap_huan}</span>
                }
                icon={<GraduationCap size={12} />}
              />
              <DetailField
                label={txt('matTranTapHuan.form.namTapHuan')}
                value={<span className="tabular-nums">{String(data.nam_tap_huan)}</span>}
                icon={<CalendarDays size={12} />}
              />
              <DetailField
                label={txt('matTranTapHuan.form.capTapHuan')}
                value={<EnumBadge value={data.cap_tap_huan} config={capBadgeConfig} shape="pill" />}
                icon={<Tag size={12} />}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('matTranTapHuan.form.ghiChu')}
                value={
                  data.ghi_chu?.trim() ? (
                    <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">
                      {data.ghi_chu}
                    </p>
                  ) : undefined
                }
                icon={<StickyNote size={12} />}
                emptyText={txt('common.emptyCell')}
              />
            </DetailFieldGrid>
          </DetailSection>

          <DetailSection
            title={txt('matTranTapHuan.detail.systemInfo')}
            icon={<Clock size={14} />}
            variant="primary"
          >
            <DetailFieldGrid>
              <DetailField
                label={txt('matTranTapHuan.detail.tgTao')}
                value={<span className="tabular-nums">{formatDateTimeShort(data.tg_tao)}</span>}
                icon={<CalendarDays size={12} />}
              />
              <DetailField
                label={txt('matTranTapHuan.detail.tgCapNhat')}
                value={<span className="tabular-nums">{formatDateTimeShort(data.tg_cap_nhat)}</span>}
                icon={<Clock size={12} />}
              />
              <DetailField
                label={txt('matTranTapHuan.store.nguoiTaoCol')}
                value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao ?? undefined}
                icon={<User size={12} />}
                emptyText={txt('common.emptyCell')}
              />
            </DetailFieldGrid>
          </DetailSection>

          <DetailSection
            title={txt('matTranTapHuan.detail.sectionChiTiet')}
            icon={<Users size={14} />}
            variant="primary"
            headerRight={
              canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openAddLine}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  {txt('matTranTapHuan.form.addLine')}
                </Button>
              ) : null
            }
          >
            {gridRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {txt('matTranTapHuan.form.chiTietEmptyHint')}
              </p>
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
                      {txt('matTranTapHuan.form.hoVaTen')}
                    </span>
                  ),
                  renderCell: (r) => (
                    <span className={`inline-flex items-center gap-2 min-w-0 ${CELL_NOWRAP}`}>
                      <Users size={14} className="shrink-0 text-primary/70" aria-hidden />
                      <span className="font-medium text-foreground">
                        {r.ten_can_bo ?? `#${r.can_bo_id}`}
                      </span>
                    </span>
                  ),
                  cellClassName: CELL_NOWRAP,
                }}
                columns={[
                  {
                    id: 'chuc_vu',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <IdCard size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranTapHuan.form.chucVu')}
                      </span>
                    ),
                    headerClassName: 'min-w-[10rem]',
                    cellClassName: chiTietCellClass('min-w-[10rem]'),
                    renderCell: (r) =>
                      r.chuc_vu?.trim() ? r.chuc_vu : txt('common.emptyCell'),
                  },
                  {
                    id: 'don_vi',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranTapHuan.form.donViCongTac')}
                      </span>
                    ),
                    headerClassName: 'min-w-[14rem]',
                    cellClassName: chiTietCellClass('min-w-[14rem]'),
                    renderCell: (r) =>
                      r.don_vi_cong_tac?.trim() ? r.don_vi_cong_tac : txt('common.emptyCell'),
                  },
                  {
                    id: 'cap_quan_ly',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <Tag size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranTapHuan.form.capQuanLy')}
                      </span>
                    ),
                    headerClassName: 'min-w-[10rem]',
                    cellClassName: chiTietCellClass('min-w-[10rem]'),
                    renderCell: (r) =>
                      r.ten_cap_quan_ly?.trim() ? r.ten_cap_quan_ly : txt('common.emptyCell'),
                  },
                  {
                    id: 'thuoc_dien',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranTapHuan.form.thuocDien')}
                      </span>
                    ),
                    headerClassName: 'min-w-[9rem]',
                    cellClassName: chiTietCellClass('min-w-[9rem]'),
                    renderCell: (r) => (
                      <EnumBadge
                        value={r.thuoc_dien}
                        config={thuocDienBadgeConfig}
                        shape="rounded"
                        truncate
                      />
                    ),
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
        <MttqTapHuanChiTietLineDrawer
          key={lineDrawer.mode === 'edit' ? `e-${lineDrawer.index}` : 'add'}
          open
          onClose={() => setLineDrawer(null)}
          mode={lineDrawer.mode}
          initialLine={lineDrawerInitial}
          canBoOptions={canBoOptions}
          thuocDienOpts={thuocDienOpts}
          resolveFromCanBo={resolveFromCanBo}
          onSave={handleLineDrawerSave}
          isSubmitting={updateMutation.isPending}
          stackLevel={1}
        />
      ) : null}
    </>
  );
};

export default MttqLopTapHuanDetail;
