import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import BienBanPreview from '@/components/shared/bien-ban/BienBanPreview';
import { fileSlug } from '@/lib/bien-ban/bien-ban-model';
import { useKhoDonViCuuTroDetail } from '../../don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { TN_LIST_PATH, isTnLoaiPhieuIn } from '../core/constants';
import { useTiepNhanFull } from '../hooks/use-tiep-nhan';
import { buildBienBanXacNhanTaiTro } from '../utils/bien-ban/build-bien-ban-xac-nhan-tai-tro';

/**
 * Xem trước + in / PDF / Word / Excel "Biên bản xác nhận khoản tài trợ" kèm phụ lục.
 * Phạm vi xem do RPC lọc tại máy chủ: khoản ngoài phạm vi ⇒ không tìm thấy.
 */
const TnInBienBanPage: React.FC = () => {
  const { tnId, loaiPhieu } = useParams<{ tnId: string; loaiPhieu: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranTiepNhan');
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — F5 không bị đá ra ngoài.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const id = String(tnId ?? '').trim();
  const { data: tn, isLoading, isError } = useTiepNhanFull(id || null);
  const { data: ntt, isLoading: nttLoading } = useKhoDonViCuuTroDetail(tn?.nha_tai_tro_id ?? null);

  const redirect = useCallback(
    (message: string) => {
      if (didRedirect.current) return;
      didRedirect.current = true;
      toast.error(message);
      navigate(TN_LIST_PATH, { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (user && !permissionsLoading && !canView) redirect(txt('matTranTiepNhan.noViewPermission'));
  }, [user, permissionsLoading, canView, redirect]);
  useEffect(() => {
    if (!isTnLoaiPhieuIn(loaiPhieu)) redirect(txt('matTranTiepNhan.inBienBan.loaiKhongHopLe'));
  }, [loaiPhieu, redirect]);
  useEffect(() => {
    if (id && !isLoading && !isError && tn === null) redirect(txt('matTranTiepNhan.notFound'));
  }, [id, isLoading, isError, tn, redirect]);

  const model = useMemo(
    () =>
      tn
        ? buildBienBanXacNhanTaiTro(
            tn,
            ntt
              ? {
                  ten: ntt.ten,
                  dia_chi: ntt.dia_chi,
                  dien_thoai: ntt.dien_thoai,
                  ma_so_thue: ntt.ma_so_thue ?? null,
                  nguoi_dai_dien: ntt.nguoi_dai_dien,
                }
              : null,
          )
        : null,
    [tn, ntt],
  );

  if (!canView || isLoading || nttLoading || !tn || !model) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const fileBase = [fileSlug(txt('matTranTiepNhan.inBienBan.tenBienBan')), fileSlug(tn.so_phieu)].join('_');
  return <BienBanPreview model={model} fileBase={fileBase} onBack={() => navigate(TN_LIST_PATH)} />;
};

export default TnInBienBanPage;
