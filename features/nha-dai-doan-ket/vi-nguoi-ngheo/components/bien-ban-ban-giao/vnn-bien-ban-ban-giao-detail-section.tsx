import React from 'react';
import { HandCoins } from 'lucide-react';
import { txt } from '@/lib/text';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { ngayGach, soVN } from '@/lib/bien-ban/bien-ban-model';
import { thanhTienHienVat, type BbbgHienVat, type VnnBienBanBanGiao } from '../../core/bien-ban-ban-giao';
import { useViNguoiNgheoFull } from '../../hooks/use-vi-nguoi-ngheo';

type Kieu = 'text' | 'date' | 'so';

/** Thứ tự hiển thị = thứ tự trên biên bản. `full` = chiếm cả dòng. */
const TRUONG: { key: keyof VnnBienBanBanGiao; kind?: Kieu; full?: boolean }[] = [
  { key: 'ngay_ban_giao', kind: 'date' },
  { key: 'dia_diem' },
  { key: 'don_vi_ben_giao', full: true },
  { key: 'dai_dien_ho_ten' },
  { key: 'dai_dien_chuc_vu' },
  { key: 'lam_chung_1_ho_ten' },
  { key: 'lam_chung_1_chuc_vu' },
  { key: 'lam_chung_2_ho_ten' },
  { key: 'lam_chung_2_chuc_vu' },
  { key: 'so_quyet_dinh' },
  { key: 'ngay_quyet_dinh', kind: 'date' },
  { key: 'co_quan_quyet_dinh' },
  { key: 've_viec' },
  { key: 'muc_dich', full: true },
  { key: 'so_thang_duy_tri', kind: 'so' },
  { key: 'han_hoan_thanh_nha', kind: 'date' },
];

function hienThi(v: unknown, kind: Kieu = 'text'): string | null {
  if (v == null || v === '') return null;
  if (kind === 'date') return ngayGach(String(v));
  if (kind === 'so') return soVN(Number(v));
  return String(v);
}

/** "Gạo — 20 kg × 15.000 = 300.000 đ (ghi chú)". */
function dongHienVat(d: BbbgHienVat): string {
  const sl = [soVN(d.so_luong), d.dvt].filter(Boolean).join(' ');
  const tt = thanhTienHienVat(d);
  const gia = d.don_gia != null ? ` × ${soVN(d.don_gia)}` : '';
  const tien = tt != null ? ` = ${soVN(tt)} đ` : '';
  const head = [d.ten, sl ? `${sl}${gia}` : null].filter(Boolean).join(' — ') + tien;
  return d.ghi_chu ? `${head} (${d.ghi_chu})` : head;
}

/** Dữ liệu biên bản bàn giao ở màn chi tiết — chỉ liệt kê ô đã nhập. */
const VnnBienBanBanGiaoDetailSection: React.FC<{ id: string }> = ({ id }) => {
  const { data, isLoading } = useViNguoiNgheoFull(id);
  const bb = data?.bien_ban_ban_giao ?? null;
  const rows = bb
    ? TRUONG.map((f) => ({ f, value: hienThi(bb[f.key], f.kind) })).filter((r) => r.value != null)
    : [];
  const hienVat = bb?.hien_vat ?? [];

  return (
    <DetailSection
      title={txt('viNguoiNgheo.bienBanBanGiao.section')}
      icon={<HandCoins size={14} />}
      variant="primary"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{txt('viNguoiNgheo.bienBanBanGiao.dangTai')}</p>
      ) : rows.length === 0 && hienVat.length === 0 ? (
        <p className="text-sm text-muted-foreground">{txt('viNguoiNgheo.bienBanBanGiao.detailEmpty')}</p>
      ) : (
        <DetailFieldGrid>
          {rows.map(({ f, value }) => (
            <DetailField
              key={f.key}
              className={f.full ? DETAIL_FIELD_SPAN_FULL : undefined}
              label={txt(`viNguoiNgheo.bienBanBanGiao.nhan.${f.key}`)}
              value={<span className="whitespace-pre-wrap break-words text-body-sm text-foreground">{value}</span>}
            />
          ))}
          {hienVat.length > 0 ? (
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('viNguoiNgheo.bienBanBanGiao.nhomHienVat')}
              value={
                <ol className="list-decimal space-y-0.5 pl-5 text-body-sm text-foreground">
                  {hienVat.map((d, i) => (
                    <li key={i} className="break-words">
                      {dongHienVat(d)}
                    </li>
                  ))}
                </ol>
              }
            />
          ) : null}
        </DetailFieldGrid>
      )}
    </DetailSection>
  );
};

export default VnnBienBanBanGiaoDetailSection;
