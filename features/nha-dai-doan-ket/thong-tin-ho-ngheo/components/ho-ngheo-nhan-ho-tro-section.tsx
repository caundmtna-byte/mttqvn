import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HandCoins, Package } from 'lucide-react';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { formatDisplayDateShort } from '@/lib/display-format';
import DetailSection from '@/components/shared/DetailSection';
import { getNhanHoTroCuaHo } from '../services/nhan-ho-tro-service';

const T = (k: string) => txt(`hoNgheoNhanHoTro.hoDetail.${k}`);
const tien = (n: number | null | undefined) => `${Math.round(n ?? 0).toLocaleString('vi-VN')} đ`;

/**
 * Hộ đã nhận bao nhiêu (mọi năm, chỉ khoản đã trao) + phiếu xuất kho gắn hộ — cùng
 * một nguồn số với tab "Thống kê nhận hỗ trợ" (RPC `get_hngh_nhan_ho_tro_page`).
 */
const HoNgheoNhanHoTroSection: React.FC<{ hoNgheoId: string }> = ({ hoNgheoId }) => {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hoNgheo.nhanHoTroCuaHo(hoNgheoId),
    queryFn: () => getNhanHoTroCuaHo(hoNgheoId),
    enabled: Boolean(hoNgheoId),
    ...transactionalCrudListQueryOptions,
  });
  const t = data?.tong;

  return (
    <>
      <DetailSection title={T('title')} icon={<HandCoins size={14} />} variant="primary">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{txt('common.loading')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { k: 'tong', v: t?.tong_gia_tri, strong: true },
              { k: 'vnn', v: (t?.vnn_tien ?? 0) + (t?.vnn_hien_vat ?? 0) },
              { k: 'nddk', v: t?.nddk_tien },
              { k: 'kho', v: t?.kho_gia_tri },
            ].map((o) => (
              <div key={o.k} className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">{T(o.k)}</p>
                <p className={`tabular-nums text-sm ${o.strong ? 'font-semibold text-foreground' : ''}`}>{tien(o.v)}</p>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title={T('phieuKhoTitle')} icon={<Package size={14} />}>
        {!data || data.phieuKho.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isLoading ? txt('common.loading') : T('phieuKhoTrong')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.phieuKho.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium tabular-nums">{p.so_phieu}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {formatDisplayDateShort(p.ngay_phieu)}
                    {p.ten_chuong_trinh ? ` · ${p.ten_chuong_trinh}` : ''}
                    {p.ten_kho_xuat ? ` · ${p.ten_kho_xuat}` : ''}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{tien(p.tong_tien)}</span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>
    </>
  );
};

export default HoNgheoNhanHoTroSection;
