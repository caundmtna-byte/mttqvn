import { useMemo } from 'react';
import { txt } from '@/lib/text';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { DON_VI_GIOI_THIEU_TINH } from '../utils/don-vi-gioi-thieu';

export interface DonViGioiThieuOption {
  label: string;
  value: string;
}

/**
 * Danh sách chọn cho ô "Đơn vị giới thiệu": "MTTQ tỉnh" đứng đầu, sau đó toàn bộ
 * xã/phường theo thứ tự tên tiếng Việt. Ô để trống nghĩa là chưa nhập — đó là
 * trạng thái riêng, không nằm trong danh sách này.
 */
export function useDonViGioiThieuOptions(): { options: DonViGioiThieuOption[]; isLoading: boolean } {
  const { data: xaList = [], isLoading } = useXaPhuongForTab(true, '');

  const options = useMemo(() => {
    const rest = [...xaList]
      .sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
      .map((x) => ({ label: x.ten, value: String(x.id) }));
    return [{ label: txt('matTranDonViCuuTro.tinhCap'), value: DON_VI_GIOI_THIEU_TINH }, ...rest];
  }, [xaList]);

  return { options, isLoading };
}
