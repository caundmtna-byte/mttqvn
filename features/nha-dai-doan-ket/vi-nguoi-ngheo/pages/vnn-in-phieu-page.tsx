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
import { VNN_LIST_PATH, isVnnLoaiPhieuIn } from '../core/constants';
import { vnnLoaiPhieu } from '../core/phieu-khao-sat';
import { useViNguoiNgheoFull } from '../hooks/use-vi-nguoi-ngheo';
import { canViewVnnRow, useVnnViewer } from '../hooks/use-vnn-viewer';
import { vnnTenPhieuIn } from '../components/vnn-chon-phieu-in-dialog';
import { buildPhieuKhaoSat } from '../utils/phieu-khao-sat/build-phieu-khao-sat';
import { buildBienBanBanGiao } from '../utils/bien-ban-ban-giao/build-bien-ban-ban-giao';

/**
 * Xem trước + in / tải giấy in của một khoản hỗ trợ: phiếu khảo sát (chọn theo
 * lĩnh vực) hoặc biên bản bàn giao (mọi lĩnh vực).
 */
const VnnInPhieuPage: React.FC = () => {
  const { vnnId: idParam, loaiPhieu: loaiParam } = useParams<{ vnnId: string; loaiPhieu: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'viNguoiNgheoList');
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — nếu không, sau mỗi
  // lần F5 người dùng bị đá ra ngoài trong lúc quyền chưa về.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const id = String(idParam ?? '').trim();
  const loaiIn = isVnnLoaiPhieuIn(loaiParam) ? loaiParam : null;
  const viewer = useVnnViewer();

  const { data: vnn, isLoading, isError } = useViNguoiNgheoFull(id || null);
  const hoId = vnn?.ho_ngheo_id ?? null;
  const { data: ho, isLoading: hoLoading } = useHoNgheoFull(hoId);
  const loaiKhaoSat = vnn ? vnnLoaiPhieu(vnn.linh_vuc_ho_tro) : null;

  const redirect = useCallback(
    (message: string) => {
      if (didRedirect.current) return;
      didRedirect.current = true;
      toast.error(message);
      navigate(VNN_LIST_PATH, { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (!user || permissionsLoading || canView) return;
    redirect(txt('viNguoiNgheo.noViewPermission'));
  }, [user, permissionsLoading, canView, redirect]);

  useEffect(() => {
    if (!loaiIn) redirect(txt('viNguoiNgheo.inPhieu.loaiPhieuKhongHopLe'));
  }, [loaiIn, redirect]);

  useEffect(() => {
    if (!id || isLoading) return;
    if (!isError && vnn === null) redirect(txt('viNguoiNgheo.phieuKhaoSat.notFound'));
  }, [id, isLoading, isError, vnn, redirect]);

  // Phạm vi dòng: khoản ngoài phạm vi xem thì không được mở bản in.
  useEffect(() => {
    if (!vnn || permissionsLoading) return;
    if (!canViewVnnRow(viewer, vnn)) redirect(txt('viNguoiNgheo.noViewRowPermission'));
  }, [vnn, viewer, permissionsLoading, redirect]);

  useEffect(() => {
    if (vnn && loaiIn === 'khao-sat' && !loaiKhaoSat) {
      redirect(txt('viNguoiNgheo.phieuKhaoSat.khongCoPhieu'));
    }
  }, [vnn, loaiIn, loaiKhaoSat, redirect]);

  const model = useMemo(() => {
    if (!vnn || !loaiIn) return null;
    const nguon = { vnn, ho: ho ?? null };
    return loaiIn === 'ban-giao' ? buildBienBanBanGiao(nguon) : buildPhieuKhaoSat(nguon);
  }, [vnn, ho, loaiIn]);

  const fileBase = useMemo(() => {
    if (!vnn || !loaiIn) return 'Phieu_in';
    const ten =
      loaiIn === 'ban-giao' || !loaiKhaoSat
        ? vnnTenPhieuIn('ban-giao')
        : txt(`viNguoiNgheo.phieuKhaoSat.tenPhieu.${loaiKhaoSat}`);
    return [fileSlug(ten), fileSlug(vnn.ho_ten_nguoi_nhan)].filter(Boolean).join('_');
  }, [loaiIn, loaiKhaoSat, vnn]);

  const handleBack = useCallback(() => navigate(VNN_LIST_PATH), [navigate]);

  const waitingHo = Boolean(hoId) && hoLoading;
  if (!canView || isLoading || waitingHo || !vnn || !model) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <BienBanPreview model={model} fileBase={fileBase} onBack={handleBack} />;
};

export default VnnInPhieuPage;
