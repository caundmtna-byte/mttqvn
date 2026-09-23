import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Award,
  Building2,
  Calendar,
  CalendarClock,
  CalendarRange,
  Clock,
  Coins,
  Edit,
  ExternalLink,
  FileText,
  HandHeart,
  Hash,
  Landmark,
  Layers,
  ListChecks,
  MapPin,
  StickyNote,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { KhenThuongNhaTaiTro } from '../core/types';
import type { KhenThuongNhaTaiTroStatusChangeValues } from '../core/schema';
import { ktntCapKhenBadge, ktntTrangThaiBadge } from '../core/display-badges';
import { useUpdateKhenThuongNhaTaiTroTrangThai } from '../hooks/use-khen-thuong-nha-tai-tro';
import {
  formatKtntKy,
  formatKtntLoai,
  formatKtntTien,
  getKtntColumnDisplayValue,
  ktntText,
} from '../utils/column-display';
import KtntChuyenTrangThaiDialog from './ktnt-chuyen-trang-thai-dialog';
import { useViNguoiNgheoByDonVi } from '../../vi-nguoi-ngheo/hooks/use-vi-nguoi-ngheo';
import { computeVnnKpis } from '../../vi-nguoi-ngheo/utils/aggregate-vnn-stats';
import { vnnLinhVucBadge, vnnTrangThaiBadge } from '../../vi-nguoi-ngheo/core/display-badges';
import type { ViNguoiNgheo } from '../../vi-nguoi-ngheo/core/types';

const VNN_PATH = '/an-sinh-xa-hoi/vi-nguoi-ngheo/danh-sach';
const L = (k: string) => txt(`khenThuongNhaTaiTro.store.${k}`);

interface Props {
  data: KhenThuongNhaTaiTro;
  onClose: () => void;
  onEdit: (item: KhenThuongNhaTaiTro) => void;
  onDelete: (id: string) => void;
}

function badge(value: string | null | undefined, config: BadgeConfig) {
  const v = value?.trim();
  return v ? <EnumBadge value={v} config={config} shape="pill" truncate /> : undefined;
}

const tabular = (s: string) => (s ? <span className="tabular-nums">{s}</span> : undefined);

const KtntDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { canEdit, canDelete, canApprove } = useResourcePermissions('khenThuongNhaTaiTroList');
  const canViewVnn = useCan('view', 'viNguoiNgheoList');
  const emptyCell = txt('common.emptyCell');

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const statusMutation = useUpdateKhenThuongNhaTaiTroTrangThai();

  /**
   * Thành tích đọc từ Chương trình vì người nghèo — cùng điều kiện với cột tổng
   * hợp trong RPC `get_ktnt_page`, nên số ở đây khớp số trên bảng danh sách.
   */
  const { data: khoanRows = [], isLoading: khoanLoading } = useViNguoiNgheoByDonVi(
    data.nha_tai_tro_id,
    data.nam_thanh_tich_tu,
    data.nam_thanh_tich_den,
  );
  const thanhTich = useMemo(() => computeVnnKpis(khoanRows), [khoanRows]);
  const tongGiaTri = thanhTich.tongSoTien + (data.gia_tri_dong_gop_khac ?? 0);

  const toolbarActions: DetailToolbarAction[] = useMemo(() => {
    // Đã huỷ là kết thúc — không còn bước nào để chuyển.
    if (!canEdit || data.trang_thai === 'Hủy') return [];
    return [
      {
        label: txt('khenThuongNhaTaiTro.detail.actionChangeStatus'),
        icon: <ArrowRightLeft size={16} />,
        variant: 'info' as const,
        onClick: () => setStatusModalOpen(true),
      },
    ];
  }, [canEdit, data.trang_thai]);

  const statusInitial: KhenThuongNhaTaiTroStatusChangeValues = useMemo(
    () => ({ trang_thai: data.trang_thai, ghi_chu: data.ghi_chu ?? undefined }),
    [data.trang_thai, data.ghi_chu],
  );

  const khoanColumns = useMemo(
    () => [
      {
        id: 'nam',
        header: L('namCol'),
        renderCell: (r: ViNguoiNgheo) => <span className="tabular-nums">{r.nam}</span>,
      },
      {
        id: 'xa',
        header: L('xaPhuongCol'),
        renderCell: (r: ViNguoiNgheo) => (
          <span className="truncate">{ktntText(r.ten_xa_phuong) ?? emptyCell}</span>
        ),
      },
      {
        id: 'linh_vuc',
        header: L('linhVucCol'),
        renderCell: (r: ViNguoiNgheo) => badge(r.linh_vuc_ho_tro, vnnLinhVucBadge) ?? emptyCell,
      },
      {
        id: 'so_tien',
        header: L('soTienCol'),
        renderCell: (r: ViNguoiNgheo) => (
          <span className="tabular-nums font-medium whitespace-nowrap">
            {formatKtntTien(r.so_tien) || r.hinh_thuc_ho_tro}
          </span>
        ),
      },
    ],
    [emptyCell],
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
    <GenericDrawer
      title={txt('khenThuongNhaTaiTro.detailTitle')}
      subtitle={`${data.cap_khen} · ${getKtntColumnDisplayValue(data, 'ngay_khen')} · #${data.id}`}
      icon={<Award size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Award size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_nha_tai_tro ?? emptyCell}
          badge={badge(data.trang_thai, ktntTrangThaiBadge)}
          subtitle={
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {badge(data.cap_khen, ktntCapKhenBadge)}
              {formatKtntLoai(data.loai_nha_tai_tro) ? <span>{formatKtntLoai(data.loai_nha_tai_tro)}</span> : null}
            </div>
          }
        />

        {toolbarActions.length > 0 ? (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        ) : null}

        <DetailSection title={txt('khenThuongNhaTaiTro.form.sectionKhen')} icon={<FileText size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={L('noiDungCol')}
              icon={<FileText size={12} />}
              value={
                <p className="whitespace-pre-wrap break-words text-body-sm font-semibold tracking-tight text-foreground">
                  {data.noi_dung_khen}
                </p>
              }
            />
            <DetailField
              label={L('ngayKhenCol')}
              icon={<Calendar size={12} />}
              value={tabular(getKtntColumnDisplayValue(data, 'ngay_khen'))}
              emptyText={emptyCell}
            />
            <DetailField
              label={L('soQuyetDinhCol')}
              icon={<Hash size={12} />}
              value={ktntText(data.so_quyet_dinh) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={L('capKhenCol')}
              icon={<Landmark size={12} />}
              value={badge(data.cap_khen, ktntCapKhenBadge)}
              emptyText={emptyCell}
            />
            <DetailField
              label={L('xaPhuongCol')}
              icon={<MapPin size={12} />}
              value={ktntText(data.ten_xa_phuong) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={L('donViKhenCol')}
              icon={<Building2 size={12} />}
              value={ktntText(data.don_vi_khen) ?? undefined}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('khenThuongNhaTaiTro.detail.sectionThanhTich')}
          icon={<HandHeart size={14} />}
          variant="primary"
          headerRight={
            canViewVnn ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-xs"
                onClick={() => navigate(VNN_PATH)}
              >
                <ExternalLink size={14} />
                {txt('khenThuongNhaTaiTro.detail.openVnn')}
              </Button>
            ) : undefined
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{txt('khenThuongNhaTaiTro.detail.thanhTichHint')}</p>
          <DetailFieldGrid>
            <DetailField
              label={L('kyThanhTichCol')}
              icon={<CalendarRange size={12} />}
              value={formatKtntKy(data, txt('khenThuongNhaTaiTro.detail.kyTatCa'))}
            />
            <DetailField
              label={L('soNguoiCol')}
              icon={<Users size={12} />}
              value={khoanLoading ? '…' : tabular(`${thanhTich.soNguoiNhan} · ${thanhTich.tongSoKhoan} ${txt('khenThuongNhaTaiTro.detail.kySuffix')}`)}
            />
            <DetailField
              label={L('tongTienHoTroCol')}
              icon={<Coins size={12} />}
              value={khoanLoading ? '…' : tabular(formatKtntTien(thanhTich.tongSoTien))}
            />
            <DetailField
              label={L('giaTriKhacCol')}
              icon={<Coins size={12} />}
              value={tabular(formatKtntTien(data.gia_tri_dong_gop_khac))}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={L('tongGiaTriCol')}
              icon={<Coins size={12} />}
              value={
                khoanLoading ? '…' : (
                  <span className="tabular-nums font-semibold text-body-sm text-foreground">
                    {formatKtntTien(tongGiaTri)}
                  </span>
                )
              }
            />
          </DetailFieldGrid>
          <div className="mt-3">
            {khoanRows.length === 0 && !khoanLoading ? (
              <EmptyState title={txt('khenThuongNhaTaiTro.detail.thanhTichEmpty')} />
            ) : (
              <EmbeddedChildDataGrid<ViNguoiNgheo>
                rows={khoanRows}
                getRowKey={(r) => r.id}
                labelColumn={{
                  header: L('nguoiNhanCol'),
                  renderCell: (r) => <span className="truncate font-medium">{r.ho_ten_nguoi_nhan}</span>,
                }}
                columns={khoanColumns}
                // Cột cuối hiện trạng thái khoản: "Đang khảo sát" nghĩa là tiền/quà
                // chưa trao tay dù đã được tính vào thành tích.
                actionsColumn={{
                  header: L('trangThaiCol'),
                  renderCell: (r) => badge(r.trang_thai, vnnTrangThaiBadge) ?? emptyCell,
                }}
              />
            )}
          </div>
        </DetailSection>

        <DetailSection title={txt('khenThuongNhaTaiTro.form.sectionTrangThai')} icon={<ListChecks size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={L('trangThaiCol')}
              icon={<ListChecks size={12} />}
              value={badge(data.trang_thai, ktntTrangThaiBadge)}
              emptyText={emptyCell}
            />
            <DetailField
              label={L('ngayTrangThaiCol')}
              icon={<CalendarClock size={12} />}
              value={tabular(getKtntColumnDisplayValue(data, 'ngay_cap_nhat_trang_thai'))}
              emptyText={emptyCell}
            />
            <DetailField
              label={L('nguoiDuyetCol')}
              icon={<UserCheck size={12} />}
              value={ktntText(data.ho_va_ten_nguoi_duyet) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={L('tgDuyetCol')}
              icon={<CalendarClock size={12} />}
              value={tabular(getKtntColumnDisplayValue(data, 'tg_duyet'))}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={L('ghiChuCol')}
              icon={<StickyNote size={12} />}
              value={
                ktntText(data.ghi_chu) ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.ghi_chu}</p>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('khenThuongNhaTaiTro.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={L('nguoiTaoCol')}
              icon={<User size={12} />}
              value={getKtntColumnDisplayValue(data, 'ho_va_ten_nguoi_tao') || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={L('tgCapNhatCol')}
              icon={<Layers size={12} />}
              value={tabular(getKtntColumnDisplayValue(data, 'tg_cap_nhat'))}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>

      <KtntChuyenTrangThaiDialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        initial={statusInitial}
        canApprove={canApprove}
        isSubmitting={statusMutation.isPending}
        onSave={async (values) => {
          await statusMutation.mutateAsync({ id: data.id, data: values });
        }}
      />
    </GenericDrawer>
  );
};

export default KtntDetail;
