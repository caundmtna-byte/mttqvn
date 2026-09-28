import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import DocumentListPreviewLayout, {
  type DocumentListDownloadFormat,
} from '@/components/shared/DocumentListPreviewLayout';
import { downloadVanBanPdf } from '@/features/mat-tran-to-quoc/danh-sach-khen-thuong/utils/download-van-ban-pdf';
import { useHoNgheoFull } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/hooks/use-ho-ngheo';
import { NDDK_LIST_PATH, isNddkLoaiPhieuIn } from '../core/constants';
import { useNhaDaiDoanKetFull } from '../hooks/use-nha-dai-doan-ket';
import { canViewNddkRow, useNddkViewer } from '../hooks/use-nddk-viewer';
import NddkBienBanDocument from '../components/nddk-bien-ban-document';
import { nddkTenPhieuIn } from '../components/nddk-chon-phieu-in-dialog';
import { buildBienBan } from '../utils/bien-ban/build-bien-ban';
import { BIEN_BAN_SCREEN_STYLES } from '../utils/bien-ban/bien-ban-styles';
import { printBienBanDocument } from '../utils/bien-ban/print-bien-ban';
import { downloadBienBanDocx } from '../utils/bien-ban/download-bien-ban-docx';
import { downloadBienBanXlsx } from '../utils/bien-ban/download-bien-ban-xlsx';

/** Dùng lại CSS Ctrl+P sẵn có của văn bản MTTQ trong `index.css`. */
const PREVIEW_PREFIX = 'mttq-van-ban-preview';
const PRINT_ROOT_ID = 'nddk-bien-ban-print-root';

/** Tên file an toàn: bỏ dấu, khoảng trắng thành gạch dưới. */
function fileSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const NddkInBienBanPage: React.FC = () => {
  const { nddkId: idParam, loaiPhieu } = useParams<{ nddkId: string; loaiPhieu: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'nhaDaiDoanKetList');
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — nếu không, sau mỗi
  // lần F5 người dùng bị đá ra ngoài trong lúc quyền chưa về.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const pdfBusy = useRef(false);

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

  const handlePrint = useCallback(() => {
    const el = document.getElementById(PRINT_ROOT_ID);
    if (!el || !model) {
      toast.error(txt('common.error'));
      return;
    }
    if (!printBienBanDocument(el, model.tieuDe)) {
      toast.error(txt('nhaDaiDoanKet.printPreview.printPopupBlocked'));
    }
  }, [model]);

  const handleDownload = useCallback(
    async (format: DocumentListDownloadFormat) => {
      if (!model) return;
      try {
        if (format === 'pdf') {
          if (pdfBusy.current) return;
          pdfBusy.current = true;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const el = document.getElementById(PRINT_ROOT_ID);
          if (!el) {
            toast.error(txt('common.error'));
            return;
          }
          await downloadVanBanPdf(el, fileBase);
        } else if (format === 'docx') {
          await downloadBienBanDocx(model, fileBase);
        } else {
          downloadBienBanXlsx(model, fileBase);
        }
      } catch {
        toast.error(txt('common.error'));
      } finally {
        pdfBusy.current = false;
      }
    },
    [model, fileBase],
  );

  const waitingHo = Boolean(hoId) && hoLoading;
  if (!canView || isLoading || waitingHo || !nddk || !model) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DocumentListPreviewLayout
      previewClassPrefix={PREVIEW_PREFIX}
      onBack={handleBack}
      onPrint={handlePrint}
      onDownload={handleDownload}
      downloadDisabled={false}
    >
      <style>{BIEN_BAN_SCREEN_STYLES}</style>
      <NddkBienBanDocument model={model} rootId={PRINT_ROOT_ID} />
    </DocumentListPreviewLayout>
  );
};

export default NddkInBienBanPage;
