import React from 'react';
import { ClipboardList } from 'lucide-react';
import { txt } from '@/lib/text';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { ngayGach, soVN } from '@/lib/bien-ban/bien-ban-model';
import type { VnnLoaiPhieu, VnnPhieuKhaoSat } from '../../core/phieu-khao-sat';
import { useViNguoiNgheoFull } from '../../hooks/use-vi-nguoi-ngheo';
import {
  PKS_CHUNG_CUOI,
  PKS_CHUNG_DAU,
  PKS_MUC_II,
  PKS_Y_KIEN,
  laOTick,
  pksFieldVisible,
  pksNhan,
  type PksField,
} from './pks-field-specs';

function giaTri(p: VnnPhieuKhaoSat, name: string): unknown {
  const [nhanh, key] = name.split('.');
  return (p as unknown as Record<string, Record<string, unknown> | undefined>)[nhanh]?.[key];
}

/** Một ô đã nhập ⇒ chữ hiển thị; trống ⇒ null (không hiện dòng đó). */
function hienThi(p: VnnPhieuKhaoSat, f: Exclude<PksField, { kind: 'nhom' }>): string | null {
  const v = giaTri(p, f.name);
  if (laOTick(f)) {
    const chon = Array.isArray(v) ? (v as string[]) : typeof v === 'string' ? [v] : [];
    const khac = f.khac ? giaTri(p, f.khac) : undefined;
    const all = [...chon, ...(typeof khac === 'string' && khac ? [`${txt('viNguoiNgheo.phieuKhaoSat.khac')} ${khac}`] : [])];
    return all.length > 0 ? all.join('; ') : null;
  }
  if (v == null || v === '') return null;
  if (f.kind === 'date') return ngayGach(String(v));
  if (f.kind === 'tien') return `${soVN(Number(v))} đ`;
  if (f.kind === 'so' || f.kind === 'thapPhan') return soVN(Number(v));
  return String(v);
}

interface Props {
  id: string;
  loai: VnnLoaiPhieu;
  linhVuc: string;
}

/** Dữ liệu phiếu khảo sát ở màn chi tiết — chỉ liệt kê ô đã nhập. */
const VnnPhieuKhaoSatDetailSection: React.FC<Props> = ({ id, loai, linhVuc }) => {
  const { data, isLoading } = useViNguoiNgheoFull(id);
  const p = data?.phieu_khao_sat ?? null;

  const fields = [...PKS_CHUNG_DAU, ...PKS_MUC_II[loai], ...PKS_CHUNG_CUOI, ...PKS_Y_KIEN].filter(
    (f): f is Exclude<PksField, { kind: 'nhom' }> => f.kind !== 'nhom' && pksFieldVisible(f, linhVuc),
  );
  const rows = p
    ? fields.map((f) => ({ f, value: hienThi(p, f) })).filter((r) => r.value != null)
    : [];

  return (
    <DetailSection
      title={txt(`viNguoiNgheo.phieuKhaoSat.tenPhieu.${loai}`)}
      icon={<ClipboardList size={14} />}
      variant="primary"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{txt('viNguoiNgheo.phieuKhaoSat.dangTai')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{txt('viNguoiNgheo.phieuKhaoSat.detailEmpty')}</p>
      ) : (
        <DetailFieldGrid>
          {rows.map(({ f, value }) => (
            <DetailField
              key={f.name}
              className={laOTick(f) || f.full ? DETAIL_FIELD_SPAN_FULL : undefined}
              label={txt(pksNhan(f.name))}
              value={<span className="whitespace-pre-wrap break-words text-body-sm text-foreground">{value}</span>}
            />
          ))}
        </DetailFieldGrid>
      )}
    </DetailSection>
  );
};

export default VnnPhieuKhaoSatDetailSection;
