import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getTonKhoMatrix } from '../../ton-kho/services/kho-ton-kho-service';
import { getNhapXuatKhoCtFlatList } from '../../nhap-xuat-kho/services/kho-nhap-xuat-kho-service';
import { getKhoDanhSachKhoList } from '../../danh-sach-kho/services/kho-danh-sach-kho-service';
import { getKhoDanhSachHangHoaList } from '../../hang-hoa/services/kho-danh-sach-hang-hoa-service';
import { getKhoDonViCuuTroList } from '../../don-vi-cuu-tro/services/kho-don-vi-cuu-tro-service';
import { getKhoDotCuuTroList } from '../../dot-cuu-tro/services/kho-dot-cuu-tro-service';

export function useKhoBaoCaoHoTroRawData(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;

  const flatQuery = useQuery({
    queryKey: queryKeys.khoNhapXuatKho.chiTietFlatList,
    queryFn: getNhapXuatKhoCtFlatList,
    enabled,
    ...transactionalCrudListQueryOptions,
  });

  const khoQuery = useQuery({
    queryKey: queryKeys.khoDanhSachKho.all,
    queryFn: getKhoDanhSachKhoList,
    enabled,
    ...transactionalCrudListQueryOptions,
  });

  const hangQuery = useQuery({
    queryKey: queryKeys.khoDanhSachHangHoa.all,
    queryFn: getKhoDanhSachHangHoaList,
    enabled,
    ...transactionalCrudListQueryOptions,
  });

  const donViQuery = useQuery({
    queryKey: queryKeys.khoDonViCuuTro.all,
    queryFn: getKhoDonViCuuTroList,
    enabled,
    ...transactionalCrudListQueryOptions,
  });

  const dotQuery = useQuery({
    queryKey: queryKeys.khoDotCuuTro.all,
    queryFn: getKhoDotCuuTroList,
    enabled,
    ...transactionalCrudListQueryOptions,
  });

  const tonQuery = useQuery({
    queryKey: [...queryKeys.khoBaoCaoHoTro.all, 'ton-matrix'],
    queryFn: getTonKhoMatrix,
    enabled,
    ...transactionalCrudListQueryOptions,
  });

  const isLoading =
    flatQuery.isLoading ||
    khoQuery.isLoading ||
    hangQuery.isLoading ||
    donViQuery.isLoading ||
    dotQuery.isLoading ||
    tonQuery.isLoading;

  const isError =
    flatQuery.isError ||
    khoQuery.isError ||
    hangQuery.isError ||
    donViQuery.isError ||
    dotQuery.isError ||
    tonQuery.isError;

  const error =
    flatQuery.error ??
    khoQuery.error ??
    hangQuery.error ??
    donViQuery.error ??
    dotQuery.error ??
    tonQuery.error;

  return {
    flatLines: flatQuery.data ?? [],
    khoList: khoQuery.data ?? [],
    hangList: hangQuery.data ?? [],
    donViList: donViQuery.data ?? [],
    dotList: dotQuery.data ?? [],
    tonMatrix: tonQuery.data ?? [],
    isLoading,
    isError,
    error,
    refetch: () => {
      void flatQuery.refetch();
      void khoQuery.refetch();
      void hangQuery.refetch();
      void donViQuery.refetch();
      void dotQuery.refetch();
      void tonQuery.refetch();
    },
  };
}
