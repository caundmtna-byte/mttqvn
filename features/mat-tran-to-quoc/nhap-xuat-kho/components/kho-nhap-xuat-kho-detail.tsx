import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Building2,
  Calculator,
  Calendar,
  Coins,
  Edit,
  FileText,
  HandHeart,
  Hash,
  ListOrdered,
  Package,
  Plus,
  Printer,
  Ruler,
  StickyNote,
  Trash2,
  User,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { TableRowIconButton } from '@/components/shared/row-actions';
import { formatCurrency, formatDate, formatDateTime, formatDecimal } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useCan } from '@/hooks/use-can';
import { useKhoDanhSachHangHoaList } from '@/features/mat-tran-to-quoc/hang-hoa/hooks/use-kho-danh-sach-hang-hoa';
import type { NhapXuatKhoDetail, NhapXuatKhoCtRow } from '../core/types';
import type { NhapXuatKhoCtLineFormValues } from '../core/schema';
import { nhapXuatKhoFormSchema } from '../core/schema';
import type { NhapXuatKhoLoaiPhieu } from '../core/constants';
import { useUpdateNhapXuatKho, useTonKhoByKho, useLastDonGiaMap } from '../hooks/use-kho-nhap-xuat-kho';
import {
  chiTietToLineForm,
  nhapXuatKhoChiTietCellClass,
  NHAP_XUAT_KHO_CHI_TIET_CELL_NOWRAP,
  NHAP_XUAT_KHO_CHI_TIET_TABLE_CLASS,
  parentToFormValues,
} from '../utils/chi-tiet-form';
import NhapXuatKhoCtLineDrawer, {
  NHAP_XUAT_KHO_CT_EMPTY_LINE,
  type NhapXuatKhoLineHangHoaOption,
} from './kho-nhap-xuat-kho-ct-line-drawer';
import NhapXuatKhoCtLineDetailDrawer from './kho-nhap-xuat-kho-ct-line-detail-drawer';

interface Props {
  data: NhapXuatKhoDetail;
  onClose: () => void;
  onEdit: (item: NhapXuatKhoDetail) => void;
  onDelete: (id: string) => void;
}

type LineDrawerState = null | { mode: 'add' } | { mode: 'edit'; index: number };

type ChiTietDetailRow = NhapXuatKhoCtRow & { rowIndex: number; tenHangHoa: string };

const IN_PHIEU_PATH_PREFIX = '/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho';

function loaiPhieuIcon(loai: NhapXuatKhoLoaiPhieu) {
  switch (loai) {
    case 'nhap_ngoai':
      return ArrowDownToLine;
    case 'xuat_ngoai':
      return ArrowUpFromLine;
    case 'chuyen_kho':
      return ArrowLeftRight;
  }
}

const KhoNhapXuatKhoDetailDrawer: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useResourcePermissions('matTranReliefStockTransactions');
  const confirm = useConfirmStore((s) => s.confirm);
  const updateMutation = useUpdateNhapXuatKho();
  const canViewHh = useCan('view', 'matTranReliefGoods');
  const { data: hhRows = [] } = useKhoDanhSachHangHoaList({ enabled: canViewHh });
  const { data: lastDonGiaMap } = useLastDonGiaMap();

  const [lineDrawer, setLineDrawer] = useState<LineDrawerState>(null);
  const [viewLineIndex, setViewLineIndex] = useState<number | null>(null);

  const loaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      nhap_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.nhap_ngoai'), color: 'emerald' },
      xuat_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.xuat_ngoai'), color: 'rose' },
      chuyen_kho: { label: txt('matTranNhapXuatKho.loaiPhieu.chuyen_kho'), color: 'sky' },
    };
  }, []);

  const lines = useMemo<NhapXuatKhoCtRow[]>(() => {
    const all = Array.isArray(data.chi_tiet) ? [...data.chi_tiet] : [];
    return all.sort((a, b) => {
      const ta = a.thu_tu ?? 0;
      const tb = b.thu_tu ?? 0;
      if (ta !== tb) return ta - tb;
      return Number(a.id) - Number(b.id);
    });
  }, [data.chi_tiet]);

  const lineFormRows = useMemo(() => lines.map(chiTietToLineForm), [lines]);

  const hangHoaOptions = useMemo<NhapXuatKhoLineHangHoaOption[]>(
    () =>
      [...hhRows]
        .filter((h) => h.trang_thai !== 'Ngừng hoạt động')
        .sort((a, b) => a.ten_hang_hoa.localeCompare(b.ten_hang_hoa, 'vi'))
        .map((h) => ({
          label: `${h.ten_danh_muc_nhom} · ${h.ten_hang_hoa}`,
          value: h.id,
          don_vi_tinh: h.don_vi_tinh,
        })),
    [hhRows],
  );

  const needCheckTonKho = data.loai_phieu === 'xuat_ngoai' || data.loai_phieu === 'chuyen_kho';
  const tonKhoQuery = useTonKhoByKho(data.kho_xuat_id, { enabled: needCheckTonKho });
  const tonKhoMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of tonKhoQuery.data ?? []) map.set(r.hang_hoa_id, r.ton_kho);
    return map;
  }, [tonKhoQuery.data]);

  const gridRows = useMemo<ChiTietDetailRow[]>(
    () =>
      lines.map((line, i) => {
        const opt = hangHoaOptions.find((o) => o.value === line.hang_hoa_id);
        const tenHangHoa = opt?.label ?? (line.ten_hang_hoa?.trim() || `#${line.hang_hoa_id}`);
        return { ...line, rowIndex: i, tenHangHoa };
      }),
    [lines, hangHoaOptions],
  );

  const tongTien = useMemo(
    () => lines.reduce((acc, l) => acc + (Number.isFinite(l.thanh_tien) ? l.thanh_tien : 0), 0),
    [lines],
  );

  const totals = useMemo(() => {
    let overflows = 0;
    for (const r of lineFormRows) {
      const sl = Number(r?.so_luong ?? 0);
      if (needCheckTonKho && r?.hang_hoa_id) {
        const ton = tonKhoMap.get(r.hang_hoa_id);
        if (ton != null && Number.isFinite(sl) && sl > ton) overflows += 1;
      }
    }
    return { overflows };
  }, [lineFormRows, needCheckTonKho, tonKhoMap]);

  const openAddLine = useCallback(() => setLineDrawer({ mode: 'add' }), []);
  const openEditLine = useCallback((index: number) => {
    setViewLineIndex(null);
    setLineDrawer({ mode: 'edit', index });
  }, []);

  const handleRemoveLine = useCallback(
    (index: number) => {
      if (lines.length <= 1) {
        toast.warning(txt('matTranNhapXuatKho.form.cannotDeleteLast'));
        return;
      }
      confirm({
        title: txt('matTranNhapXuatKho.form.deleteLineTitle'),
        message: txt('matTranNhapXuatKho.form.deleteLineMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: async () => {
          const nextLines = lineFormRows.filter((_, i) => i !== index);
          const payload = parentToFormValues(data, nextLines);
          const parsed = nhapXuatKhoFormSchema.safeParse(payload);
          if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? txt('common.validationError'));
            return;
          }
          await updateMutation.mutateAsync({ id: data.id, data: parsed.data });
        },
      });
    },
    [confirm, data, lineFormRows, lines.length, updateMutation],
  );

  const handleLineDrawerSave = useCallback(
    async (values: NhapXuatKhoCtLineFormValues) => {
      if (!lineDrawer) return;
      let nextLines: NhapXuatKhoCtLineFormValues[];
      if (lineDrawer.mode === 'add') {
        nextLines = [...lineFormRows, values];
      } else {
        nextLines = lineFormRows.map((l, i) => (i === lineDrawer.index ? values : l));
      }
      if (totals.overflows > 0 || needCheckTonKho) {
        let overflows = 0;
        for (const r of nextLines) {
          const sl = Number(r?.so_luong ?? 0);
          if (needCheckTonKho && r?.hang_hoa_id) {
            const editingIdx = lineDrawer.mode === 'edit' ? lineDrawer.index : -1;
            let used = 0;
            nextLines.forEach((line, i) => {
              if (i === editingIdx || line.hang_hoa_id !== r.hang_hoa_id) return;
              const s = Number(line.so_luong ?? 0);
              if (Number.isFinite(s)) used += s;
            });
            const total = tonKhoMap.get(r.hang_hoa_id);
            const available = total != null ? total - used : null;
            if (available != null && Number.isFinite(sl) && sl > available) overflows += 1;
          }
        }
        if (overflows > 0) {
          toast.error(txt('matTranNhapXuatKho.service.tonKhoKhongDu'));
          return;
        }
      }
      const payload = parentToFormValues(data, nextLines);
      const parsed = nhapXuatKhoFormSchema.safeParse(payload);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? txt('common.validationError'));
        return;
      }
      await updateMutation.mutateAsync({ id: data.id, data: parsed.data });
      setLineDrawer(null);
    },
    [data, lineDrawer, lineFormRows, needCheckTonKho, tonKhoMap, totals.overflows, updateMutation],
  );

  const lineDrawerInitial = useMemo(() => {
    if (!lineDrawer) return NHAP_XUAT_KHO_CT_EMPTY_LINE;
    if (lineDrawer.mode === 'add') return NHAP_XUAT_KHO_CT_EMPTY_LINE;
    const row = lineFormRows[lineDrawer.index];
    return row ? { ...NHAP_XUAT_KHO_CT_EMPTY_LINE, ...row } : NHAP_XUAT_KHO_CT_EMPTY_LINE;
  }, [lineDrawer, lineFormRows]);

  const getTonInfoForLine = useCallback(
    (hangHoaId: string) => {
      if (!needCheckTonKho) return null;
      const total = tonKhoMap.get(hangHoaId);
      if (total == null) return null;
      const editingIndex = lineDrawer?.mode === 'edit' ? lineDrawer.index : -1;
      let usedByOtherLines = 0;
      lineFormRows.forEach((line, i) => {
        if (!line || i === editingIndex) return;
        if (line.hang_hoa_id !== hangHoaId) return;
        const sl = Number(line.so_luong ?? 0);
        if (Number.isFinite(sl)) usedByOtherLines += sl;
      });
      return { available: total - usedByOtherLines, usedByOtherLines };
    },
    [needCheckTonKho, tonKhoMap, lineFormRows, lineDrawer],
  );

  const viewedLine = viewLineIndex != null ? lines[viewLineIndex] : null;

  const handleDelete = () => {
    confirm({
      title: txt('matTranNhapXuatKho.deleteTitle'),
      message: txt('matTranNhapXuatKho.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: () => onDelete(data.id),
    });
  };

  const HeaderIcon = loaiPhieuIcon(data.loai_phieu);

  const toolbarActions: DetailToolbarAction[] = useMemo(
    () => [
      {
        label: txt('matTranNhapXuatKho.detail.toolbarPrint'),
        icon: <Printer size={16} />,
        variant: 'info',
        onClick: () => navigate(`${IN_PHIEU_PATH_PREFIX}/${data.id}/in-phieu`),
      },
    ],
    [data.id, navigate],
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

  const subtitleParts = [data.so_phieu, data.ngay_phieu ? formatDate(data.ngay_phieu) : null].filter(
    (s): s is string => Boolean(s),
  );

  return (
    <>
      <GenericDrawer
        onClose={onClose}
        title={txt('matTranNhapXuatKho.detail.title')}
        subtitle={subtitleParts.join(' · ')}
        icon={<HeaderIcon size={18} />}
        maxWidthClass={DRAWER_WIDTH_DETAIL}
        footer={footer}
        footerCompact
      >
        <div className="space-y-5">
          <DetailSummaryCard
            leading={
              <DetailSummaryIconTile>
                <HeaderIcon size={26} className="text-white" aria-hidden />
              </DetailSummaryIconTile>
            }
            title={data.so_phieu}
            subtitle={
              <p className="m-0 text-muted-foreground">
                {data.ten_kho_xuat ?? data.ten_don_vi_cuu_tro ?? '—'}
                {' → '}
                {data.ten_kho_nhap ?? data.ten_dot_cuu_tro ?? '—'}
              </p>
            }
            badge={<EnumBadge value={data.loai_phieu} config={loaiBadge} shape="pill" truncate />}
          />

          <DetailToolbar
            actions={toolbarActions}
            className="bg-card rounded-xl border border-border"
          />

          <DetailSection
            title={txt('matTranNhapXuatKho.detail.sectionMain')}
            icon={<FileText size={14} />}
            variant="primary"
          >
            <DetailFieldGrid>
              <DetailField
                label={txt('matTranNhapXuatKho.detail.soPhieu')}
                value={<span className="font-semibold tracking-tight tabular-nums">{data.so_phieu}</span>}
                icon={<Hash size={12} />}
              />
              <DetailField
                label={txt('matTranNhapXuatKho.detail.loaiPhieu')}
                value={<EnumBadge value={data.loai_phieu} config={loaiBadge} shape="pill" truncate />}
                icon={<HeaderIcon size={12} />}
              />
              <DetailField
                label={txt('matTranNhapXuatKho.detail.ngayPhieu')}
                value={data.ngay_phieu ? formatDate(data.ngay_phieu) : undefined}
                icon={<Calendar size={12} />}
                emptyText={txt('common.emptyCell')}
              />
              <DetailField
                label={txt('matTranNhapXuatKho.detail.soDong')}
                value={<span className="tabular-nums font-semibold text-foreground">{lines.length}</span>}
                icon={<ListOrdered size={12} />}
              />
              {data.ten_kho_xuat || data.kho_xuat_id ? (
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.khoXuat')}
                  value={data.ten_kho_xuat ?? (data.kho_xuat_id ? `#${data.kho_xuat_id}` : undefined)}
                  icon={<Warehouse size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
              ) : null}
              {data.ten_kho_nhap || data.kho_nhap_id ? (
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.khoNhap')}
                  value={data.ten_kho_nhap ?? (data.kho_nhap_id ? `#${data.kho_nhap_id}` : undefined)}
                  icon={<Warehouse size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
              ) : null}
              {data.ten_don_vi_cuu_tro || data.don_vi_cuu_tro_id ? (
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.donViCuuTro')}
                  value={
                    data.ten_don_vi_cuu_tro ??
                    (data.don_vi_cuu_tro_id ? `#${data.don_vi_cuu_tro_id}` : undefined)
                  }
                  icon={<Building2 size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
              ) : null}
              {data.ten_dot_cuu_tro || data.dot_cuu_tro_id ? (
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.dotCuuTro')}
                  value={data.ten_dot_cuu_tro ?? (data.dot_cuu_tro_id ? `#${data.dot_cuu_tro_id}` : undefined)}
                  icon={<HandHeart size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
              ) : null}
              <DetailField
                label={txt('matTranNhapXuatKho.detail.tongTien')}
                value={
                  tongTien > 0 ? (
                    <span className="tabular-nums font-semibold text-foreground">{formatCurrency(tongTien)}</span>
                  ) : undefined
                }
                icon={<Calculator size={12} />}
                emptyText={txt('common.emptyCell')}
              />
              <DetailField
                label={
                  data.loai_phieu === 'xuat_ngoai'
                    ? txt('matTranNhapXuatKho.detail.nguoiNhanHang')
                    : txt('matTranNhapXuatKho.detail.nguoiGiaoHang')
                }
                value={data.nguoi_giao_nhan ?? undefined}
                icon={<User size={12} />}
                emptyText={txt('common.emptyCell')}
              />
              <DetailField
                label={txt('matTranNhapXuatKho.detail.boPhan')}
                value={data.bo_phan ?? undefined}
                icon={<Building2 size={12} />}
                emptyText={txt('common.emptyCell')}
              />
              <DetailField
                label={txt('matTranNhapXuatKho.detail.chungTuGoc')}
                value={data.chung_tu_goc ?? undefined}
                icon={<FileText size={12} />}
                emptyText={txt('common.emptyCell')}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('matTranNhapXuatKho.detail.ghiChu')}
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

          <DetailSection
            title={txt('matTranNhapXuatKho.detail.sectionChiTiet')}
            icon={<Package size={14} />}
            variant="primary"
            headerRight={
              canEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={openAddLine} className="gap-1">
                  <Plus className="w-4 h-4" />
                  {txt('matTranNhapXuatKho.form.addLine')}
                </Button>
              ) : null
            }
          >
            {gridRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{txt('matTranNhapXuatKho.form.chiTietEmptyHint')}</p>
            ) : null}

            {needCheckTonKho && totals.overflows > 0 ? (
              <div className="flex items-center gap-2 mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle size={14} className="shrink-0" aria-hidden />
                <span>
                  {txt('matTranNhapXuatKho.service.tonKhoKhongDu')} ({totals.overflows} dòng)
                </span>
              </div>
            ) : null}

            {gridRows.length > 0 ? (
              <>
                <EmbeddedChildDataGrid<ChiTietDetailRow>
                  rows={gridRows}
                  getRowKey={(r) => r.id}
                  maxVisibleBodyRows={8}
                  tableClassName={NHAP_XUAT_KHO_CHI_TIET_TABLE_CLASS}
                  onRowClick={(r) => setViewLineIndex(r.rowIndex)}
                  labelColumn={{
                    minWidthClass: 'min-w-[16rem] w-[16rem]',
                    header: (
                      <span className="inline-flex items-center gap-1.5">
                        <Package size={12} className="shrink-0 opacity-90" aria-hidden />
                        {txt('matTranNhapXuatKho.form.hangHoa')}
                      </span>
                    ),
                    renderCell: (r) => (
                      <span className={`inline-flex items-center gap-2 min-w-0 ${NHAP_XUAT_KHO_CHI_TIET_CELL_NOWRAP}`}>
                        <Package size={14} className="shrink-0 text-primary/70" aria-hidden />
                        <span className="font-medium text-foreground truncate">{r.tenHangHoa}</span>
                      </span>
                    ),
                    cellClassName: NHAP_XUAT_KHO_CHI_TIET_CELL_NOWRAP,
                  }}
                  columns={[
                    {
                      id: 'don_vi_tinh',
                      header: (
                        <span className="inline-flex items-center gap-1.5">
                          <Ruler size={12} className="shrink-0 opacity-90" aria-hidden />
                          {txt('matTranNhapXuatKho.form.donViTinh')}
                        </span>
                      ),
                      headerClassName: 'min-w-[5rem]',
                      cellClassName: nhapXuatKhoChiTietCellClass('min-w-[5rem]'),
                      renderCell: (r) => (r.don_vi_tinh ? r.don_vi_tinh : txt('common.emptyCell')),
                    },
                    {
                      id: 'so_luong',
                      header: (
                        <span className="inline-flex items-center gap-1.5">
                          <Hash size={12} className="shrink-0 opacity-90" aria-hidden />
                          {txt('matTranNhapXuatKho.form.soLuong')}
                        </span>
                      ),
                      headerClassName: 'min-w-[7rem] text-right',
                      cellClassName: nhapXuatKhoChiTietCellClass('min-w-[7rem] text-right tabular-nums'),
                      renderCell: (r) => {
                        const sl = Number(r.so_luong);
                        const ton = needCheckTonKho ? tonKhoMap.get(r.hang_hoa_id) : undefined;
                        const overflow = ton != null && Number.isFinite(sl) && sl > ton;
                        return (
                          <span className={overflow ? 'text-rose-600 font-semibold dark:text-rose-400' : ''}>
                            {Number.isFinite(sl) ? formatDecimal(sl) : '—'}
                            {overflow ? (
                              <AlertTriangle size={12} className="inline ml-1 -mt-0.5" aria-hidden />
                            ) : null}
                          </span>
                        );
                      },
                    },
                    {
                      id: 'don_gia',
                      header: (
                        <span className="inline-flex items-center gap-1.5">
                          <Coins size={12} className="shrink-0 opacity-90" aria-hidden />
                          {txt('matTranNhapXuatKho.form.donGia')}
                        </span>
                      ),
                      headerClassName: 'min-w-[8rem] text-right',
                      cellClassName: nhapXuatKhoChiTietCellClass('min-w-[8rem] text-right tabular-nums'),
                      renderCell: (r) =>
                        r.don_gia > 0 ? formatCurrency(r.don_gia) : txt('common.emptyCell'),
                    },
                    {
                      id: 'thanh_tien',
                      header: (
                        <span className="inline-flex items-center gap-1.5">
                          <Calculator size={12} className="shrink-0 opacity-90" aria-hidden />
                          {txt('matTranNhapXuatKho.form.thanhTien')}
                        </span>
                      ),
                      headerClassName: 'min-w-[9rem] text-right',
                      cellClassName: nhapXuatKhoChiTietCellClass('min-w-[9rem] text-right tabular-nums font-medium'),
                      renderCell: (r) =>
                        r.thanh_tien > 0 ? formatCurrency(r.thanh_tien) : txt('common.emptyCell'),
                    },
                    {
                      id: 'ghi_chu',
                      header: (
                        <span className="inline-flex items-center gap-1.5">
                          <StickyNote size={12} className="shrink-0 opacity-90" aria-hidden />
                          {txt('matTranNhapXuatKho.form.chiTietGhiChu')}
                        </span>
                      ),
                      headerClassName: 'min-w-[10rem]',
                      cellClassName: nhapXuatKhoChiTietCellClass('min-w-[10rem]'),
                      renderCell: (r) => (r.ghi_chu?.trim() ? r.ghi_chu : txt('common.emptyCell')),
                    },
                  ]}
                  actionsColumn={{
                    header: txt('common.actions'),
                    widthClass: 'w-[5.5rem] min-w-[5.5rem]',
                    renderCell: (r) =>
                      canEdit ? (
                        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
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
                            disabled={lines.length <= 1}
                            onClick={() => handleRemoveLine(r.rowIndex)}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground"> </span>
                      ),
                  }}
                />
                <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                  <span className="text-muted-foreground">{txt('matTranNhapXuatKho.detail.tongTien')}:</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {tongTien > 0 ? formatCurrency(tongTien) : '—'}
                  </span>
                </div>
              </>
            ) : null}
          </DetailSection>

          <DetailSection title={txt('matTranNhapXuatKho.detail.systemInfo')} icon={<Calendar size={14} />}>
            <DetailFieldGrid>
              <DetailField
                label={txt('matTranNhapXuatKho.detail.tgTao')}
                value={data.tg_tao ? formatDateTime(data.tg_tao) : undefined}
                icon={<Calendar size={12} />}
                emptyText={txt('common.emptyCell')}
              />
              <DetailField
                label={txt('matTranNhapXuatKho.detail.tgCapNhat')}
                value={data.tg_cap_nhat ? formatDateTime(data.tg_cap_nhat) : undefined}
                icon={<Calendar size={12} />}
                emptyText={txt('common.emptyCell')}
              />
            </DetailFieldGrid>
          </DetailSection>
        </div>
      </GenericDrawer>

      {viewedLine ? (
        <NhapXuatKhoCtLineDetailDrawer
          line={viewedLine}
          soPhieu={data.so_phieu}
          canEdit={canEdit}
          onClose={() => setViewLineIndex(null)}
          onEdit={() => {
            const idx = viewLineIndex;
            if (idx == null) return;
            openEditLine(idx);
          }}
        />
      ) : null}

      {lineDrawer && canEdit ? (
        <NhapXuatKhoCtLineDrawer
          key={lineDrawer.mode === 'edit' ? `e-${lineDrawer.index}` : 'add'}
          open
          stackLevel={1}
          onClose={() => setLineDrawer(null)}
          mode={lineDrawer.mode}
          initialLine={lineDrawerInitial}
          hangHoaOptions={hangHoaOptions}
          lastDonGia={lastDonGiaMap}
          needCheckTonKho={needCheckTonKho}
          getTonInfo={getTonInfoForLine}
          tonKhoLoading={tonKhoQuery.isLoading}
          isSubmitting={updateMutation.isPending}
          onSave={handleLineDrawerSave}
        />
      ) : null}
    </>
  );
};

export default KhoNhapXuatKhoDetailDrawer;
