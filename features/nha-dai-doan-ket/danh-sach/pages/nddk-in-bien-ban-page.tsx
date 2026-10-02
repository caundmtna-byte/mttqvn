import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import BienBanPreview from '@/components/shared/bien-ban/BienBanPreview';
import { fileSlug } from '@/lib/bien-ban/bien-ban-model';
import { useHoNgheoFull } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/hooks/use-ho-ngheo';
import { NDDK_LIST_PATH, isNddkLoaiPhieuIn } from '../core/constants';
import { useNhaDaiDoanKetFull } from '../hooks/use-nha-dai-doan-ket';
import { canViewNddkRow, useNddkViewer } from '../hooks/use-nddk-viewer';
import { nddkTenPhieuIn } from '../components/nddk-chon-phieu-in-dialog';
import { buildBienBan } from '../utils/bien-ban/build-bien-ban';

const NddkInBienBanPage: React.FC = () => {
  const { nddkId: idParam, loaiPhieu } = useParams<{ nddkId: string; loaiPhieu: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'nhaDaiDoanKetList');
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — nếu không, sau mỗi
  // lần F5 người dùng bị đá ra ngoài trong lúc quyền chưa về.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const id = String(idParam ?? '').trim();
  const loai = isNddkLoaiPhieuIn(loaiPhieu) ? loaiPhieu : null;
  const viewer = useNddkViewer();

  const { data: nddk, isLoading, isError } = useNhaDaiDoanKetFull(id || null);
  const hoId = nddk?.ho_ngheo_id ?? null;
  const { data: ho, isLoading: hoLoading } = useHoNgheoFull(hoId);

  const redirect = useCallback(
    (message: string) => {
      if (didRedirect.current) return;
      didRedirect.current = true;
      toast.error(message);
      navigate(NDDK_LIST_PATH, { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (!user || permissionsLoading || canView) return;
    redirect(txt('nhaDaiDoanKet.noViewPermission'));
  }, [user, permissionsLoading, canView, redirect]);

  useEffect(() => {
    if (!loai) redirect(txt('nhaDaiDoanKet.printPreview.loaiPhieuKhongHopLe'));
  }, [loai, redirect]);

  useEffect(() => {
    if (!id || isLoading) return;
    if (!isError && nddk === null) redirect(txt('nhaDaiDoanKet.printPreview.notFound'));
  }, [id, isLoading, isError, nddk, redirect]);

  // Phạm vi dòng: hồ sơ ngoài phạm vi xem thì không được mở bản in.
  useEffect(() => {
    if (!nddk || permissionsLoading) return;
    if (!canViewNddkRow(viewer, nddk)) redirect(txt('nhaDaiDoanKet.noViewRowPermission'));
  }, [nddk, viewer, permissionsLoading, redirect]);

  const model = useMemo(
    () => (nddk && loai ? buildBienBan(loai, { nddk, ho: ho ?? null }) : null),
    [nddk, ho, loai],
  );

  const fileBase = useMemo(() => {
    if (!loai || !nddk) return 'Bien_ban';
    return [fileSlug(nddkTenPhieuIn(loai)), fileSlug(nddk.ho_ten_chu_ho)].filter(Boolean).join('_');
  }, [loai, nddk]);

  const handleBack = useCallback(() => {
    navigate(id ? `${NDDK_LIST_PATH}?open=${encodeURIComponent(id)}` : NDDK_LIST_PATH);
  }, [navigate, id]);

  const waitingHo = Boolean(hoId) && hoLoading;
  if (!canView || isLoading || waitingHo || !nddk || !model) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <BienBanPreview model={model} fileBase={fileBase} onBack={handleBack} />;
};

export default NddkInBienBanPage;
