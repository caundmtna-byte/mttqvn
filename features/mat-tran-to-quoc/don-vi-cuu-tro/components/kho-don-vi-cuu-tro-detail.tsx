import React, { useMemo } from 'react';
import { BadgeCheck, Building2, Edit, Hash, FileText, Landmark, ListOrdered, Mail, MapPin, Phone, Trash2, Type, User, Users, UserRound } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatDecimal } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge from '@/components/ui/EnumBadge';
import { buildKhoDonViCuuTroLoaiBadgeConfig, isKhoDonViCuuTroCaNhan } from '../core/loai';
import type { KhoDonViCuuTroDetail } from '../core/types';
import type { nhomUngHoCuaDonVi } from '../utils/ung-ho-nhom';
import { useNavigate } from 'react-router-dom';
import { useCan } from '@/hooks/use-can';
import { TN_LIST_PATH } from '../../tiep-nhan/core/constants';
import DetailSystemInfo from '@/components/shared/DetailSystemInfo';

interface Props {
  data: KhoDonViCuuTroDetail;
  /** Số ủng hộ của đơn vị này theo từng đợt / nội dung (toàn thời gian), đã sắp. */
  ungHoNhom: ReturnType<typeof nhomUngHoCuaDonVi>;
  onClose: () => void;
  onEdit: (item: KhoDonViCuuTroDetail) => void;
  onDelete: (id: string) => void;
}

const KhoDonViCuuTroDetailDrawer: React.FC<Props> = ({ data, ungHoNhom, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const canViewTiepNhan = useCan('view', 'matTranTiepNhan');
  const { canEdit, canDelete } = useResourcePermissions('matTranReliefSupportUnits');

  const loaiBadge = useMemo(() => buildKhoDonViCuuTroLoaiBadgeConfig(), []);
  const congUngHo = useMemo(
    () =>
      ungHoNhom.reduce(
        (t, r) => ({ tienMat: t.tienMat + r.tienMat, hienVat: t.hienVat + r.hienVat, tong: t.tong + r.tong, soLuot: t.soLuot + r.soLuot }),
        { tienMat: 0, hienVat: 0, tong: 0, soLuot: 0 },
      ),
    [ungHoNhom],
  );
  const U = (k: string) => txt(`matTranDonViCuuTro.ungHo.${k}`);
  const so = (n: number) => formatDecimal(n, 0);

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

  const SummaryIcon = isKhoDonViCuuTroCaNhan(data.loai) ? User : Building2;

  return (
    <GenericDrawer
      title={txt('matTranDonViCuuTro.detail.title')}
      subtitle={`#${data.id}`}
      icon={<SummaryIcon size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <SummaryIcon size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten}
          badge={<EnumBadge value={data.loai} config={loaiBadge} shape="pill" truncate />}
        />

        <DetailSection title={txt('matTranDonViCuuTro.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranDonViCuuTro.store.ttCol')} value={String(data.tt)} icon={<ListOrdered size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.ten')} value={data.ten} icon={<Type size={12} />} />
            <DetailField
              label={txt('matTranDonViCuuTro.form.soNguoi')}
              value={data.so_nguoi == null ? null : String(data.so_nguoi)}
              icon={<Users size={12} />}
            />
            <DetailField
              label={txt('matTranDonViCuuTro.form.nguoiDaiDien')}
              value={data.nguoi_dai_dien}
              icon={<UserRound size={12} />}
            />
            <DetailField label={txt('matTranDonViCuuTro.form.chucVu')} value={data.chuc_vu} icon={<BadgeCheck size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.dienThoai')} value={data.dien_thoai} icon={<Phone size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.diaChi')} value={data.dia_chi} icon={<MapPin size={12} />} />
            <DetailField
              label={txt('matTranDonViCuuTro.form.donViGioiThieu')}
              value={data.don_vi_gioi_thieu_label || null}
              icon={<Landmark size={12} />}
            />
            <DetailField label={txt('matTranDonViCuuTro.form.email')} value={data.email} icon={<Mail size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.maSoThue')} value={data.ma_so_thue} icon={<Hash size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranDonViCuuTro.form.ghiChu')}
              value={data.ghi_chu}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={U('bangTitle')}
          headerRight={
            canViewTiepNhan ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary"
                onClick={() => navigate(`${TN_LIST_PATH}?nha_tai_tro=${encodeURIComponent(data.id)}`)}
              >
                {U('xemTiepNhan')}
              </Button>
            ) : undefined
          }
        >
          {ungHoNhom.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{U('trong')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-body-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{U('colNhom')}</th>
                    <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{U('colTienMat')}</th>
                    <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{U('colHienVat')}</th>
                    <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{U('colTong')}</th>
                    <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{U('colSoLuot')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ungHoNhom.map((r) => (
                    <tr key={r.nhomKey} className="border-t border-border">
                      <td className="px-3 py-2">{r.nhan}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{so(r.tienMat)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{so(r.hienVat)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{so(r.tong)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatDecimal(r.soLuot)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border font-semibold">
                  <tr>
                    <td className="px-3 py-2">{U('cong')}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{so(congUngHo.tienMat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{so(congUngHo.hienVat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{so(congUngHo.tong)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatDecimal(congUngHo.soLuot)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{U('nguonHint')}</p>
        </DetailSection>

        <DetailSystemInfo
          nguoiTao={data.ten_nguoi_tao}
          tgTao={data.tg_tao}
          nguoiCapNhat={data.ten_nguoi_cap_nhat}
          tgCapNhat={data.tg_cap_nhat}
        />
      </div>
    </GenericDrawer>
  );
};

export default KhoDonViCuuTroDetailDrawer;
