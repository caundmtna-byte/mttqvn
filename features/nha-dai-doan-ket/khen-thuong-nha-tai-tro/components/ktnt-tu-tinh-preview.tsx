import React from 'react';
import { Calculator } from 'lucide-react';
import { txt } from '@/lib/text';
import { useKtntThanhTich } from '../hooks/use-khen-thuong-nha-tai-tro';
import { formatKtntTien } from '../utils/column-display';
import { docKyNamKtnt, tongGiaTriKtnt } from '../utils/thanh-tich';

const L = (k: string) => txt(`khenThuongNhaTaiTro.store.${k}`);
const F = (k: string) => txt(`khenThuongNhaTaiTro.form.${k}`);

interface Props {
  nhaTaiTroId: string | undefined;
  tuNam: string | undefined;
  denNam: string | undefined;
  /** Chuỗi ô "Đóng góp khác" đang nhập — cộng vào tổng cho người nhập thấy ngay. */
  giaTriKhac: string | undefined;
}

/** Số thành tích máy tự tính theo nhà tài trợ + kỳ đang chọn trong form. */
const KtntTuTinhPreview: React.FC<Props> = ({ nhaTaiTroId, tuNam, denNam, giaTriKhac }) => {
  const ky = docKyNamKtnt(tuNam, denNam);
  const id = nhaTaiTroId?.trim() ?? '';
  const { data, isLoading, isError } = useKtntThanhTich(
    id,
    ky.ok ? ky.tuNam : null,
    ky.ok ? ky.denNam : null,
    { enabled: ky.ok },
  );

  let body: React.ReactNode;
  if (!id) body = <p className="text-muted-foreground">{F('tuTinhChonNhaTaiTro')}</p>;
  else if (!ky.ok) body = <p className="text-muted-foreground">{F('tuTinhNamKhongHopLe')}</p>;
  else if (isError) body = <p className="text-destructive">{F('tuTinhLoi')}</p>;
  else if (isLoading || !data) body = <p className="text-muted-foreground">…</p>;
  else {
    const khac = Number(giaTriKhac);
    const tong = tongGiaTriKtnt(data, giaTriKhac?.trim() && Number.isFinite(khac) ? khac : 0);
    const dong = (label: string, value: string) => (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
    );
    body = (
      <div className="space-y-1">
        {dong(L('tongTienHoTroCol'), formatKtntTien(data.tien_mat))}
        {dong(L('hienVatQuyDoiCol'), formatKtntTien(data.hien_vat_quy_doi))}
        {dong(
          L('giaTriNhapKhoCol'),
          `${formatKtntTien(data.gia_tri_nhap_kho)} · ${data.so_phieu_nhap_kho} ${txt('khenThuongNhaTaiTro.detail.phieuSuffix')}`,
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1 font-semibold">
          <span>{F('tuTinhTong')}</span>
          <span className="tabular-nums">{formatKtntTien(tong)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
        <Calculator size={13} />
        {F('tuTinhTitle')}
      </div>
      {body}
    </div>
  );
};

export default KtntTuTinhPreview;
