import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { getThongTinToChuc } from '@/features/he-thong/thong-tin-to-chuc/services/thong-tin-to-chuc-service';
import DocumentListPreviewLayout, {
  type DocumentListDownloadFormat,
} from '@/components/shared/DocumentListPreviewLayout';
import { useMttqUyVienUyBanListForNhiemKy } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban';
import { useMttqUyVienUyBanViewer } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import VanBanHanhChinhDocument from '../components/van-ban-hanh-chinh-document';
import { useMttqKyHopDetail } from '../hooks/use-mttq-ky-hop';
import { useDiemDanhForKyHop } from '../hooks/use-mttq-diem-danh';
import { canViewKyHopRow, useMttqKyHopViewer } from '../hooks/use-mttq-ky-hop-viewer';
import { buildDiemDanhDocumentModel } from '../utils/build-diem-danh-document';
import { downloadVanBanDocx } from '../utils/download-van-ban-docx';
import { downloadVanBanPdf } from '../utils/download-van-ban-pdf';
import { downloadVanBanXlsx } from '../utils/download-van-ban-xlsx';
import { printVanBanDocument } from '../utils/print-van-ban';

const KY_HOP_LIST_PATH = '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop';
const PREVIEW_PREFIX = 'mttq-van-ban-preview';
const PRINT_ROOT_ID = 'ky-hop-diem-danh-print-root';

const MttqKyHopInDiemDanhPage: React.FC = () => {
  const { kyHopId: idParam } = useParams<{ kyHopId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranSession');
  const canViewUyVien = useCan('view', 'matTranCommitteeMembers');
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const pdfBusy = useRef(false);

  const id = String(idParam ?? '').trim();
  const { data: kyHop, isLoading, isError } = useMttqKyHopDetail(id || null);
  const kyHopViewer = useMttqKyHopViewer();
  const uyVienViewer = useMttqUyVienUyBanViewer();

  const nhiemKyId = kyHop?.nhiem_ky_id ? String(kyHop.nhiem_ky_id) : '';
  const { data: uyVienRows = [], isLoading: loadingUyVien } = useMttqUyVienUyBanListForNhiemKy(
    nhiemKyId || null,
    { enabled: canViewUyVien && Boolean(nhiemKyId) },
  );
  const { data: diemDanhRows = [], isLoading: loadingDiemDanh } = useDiemDanhForKyHop(id || null, {
    enabled: canView && Boolean(id),
  });

  const { data: company } = useQuery({
    queryKey: queryKeys.thongTinToChuc.singleton,
    queryFn: getThongTinToChuc,
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    if (!user || permissionsLoading || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranKyHop.noViewPermission'));
    navigate(KY_HOP_LIST_PATH, { replace: true });
  }, [user, permissionsLoading, canView, navigate]);

  useEffect(() => {
    if (!id || isLoading) return;
    if (!isError && kyHop === null) {
      toast.error(txt('matTranKyHop.printPreview.notFound'));
      navigate(KY_HOP_LIST_PATH, { replace: true });
    }
  }, [id, isLoading, isError, kyHop, navigate]);

  // Phạm vi dòng kỳ họp: ngoài phạm vi xem thì không mở được bản in.
  useEffect(() => {
    if (!kyHop || permissionsLoading || didRedirect.current) return;
    if (canViewKyHopRow(kyHopViewer, kyHop)) return;
    didRedirect.current = true;
    toast.error(txt('matTranKyHop.noViewPermission'));
    navigate(KY_HOP_LIST_PATH, { replace: true });
  }, [kyHop, kyHopViewer, permissionsLoading, navigate]);

  const docModel = useMemo(
    () =>
      kyHop
        ? buildDiemDanhDocumentModel(kyHop, {
            company,
            viewer: uyVienViewer,
            uyVienRows,
            diemDanhRows,
          })
        : null,
    [kyHop, company, uyVienViewer, uyVienRows, diemDanhRows],
  );

  const fileBase = useMemo(() => {
    const base = txt('matTranKyHop.printPreview.fileName');
    const ky = kyHop?.ky_thu?.trim().replace(/\s+/g, '-');
    return ky ? `${base}-ky-${ky}` : base;
  }, [kyHop?.ky_thu]);

  const handleBack = useCallback(() => {
    navigate(id ? `${KY_HOP_LIST_PATH}?open=${encodeURIComponent(id)}` : KY_HOP_LIST_PATH);
  }, [navigate, id]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById(PRINT_ROOT_ID);
    if (!el) {
      toast.error(txt('common.error'));
      return;
    }
    const ok = printVanBanDocument(el, txt('matTranKyHop.printPreview.pageTitle'));
    if (!ok) toast.error(txt('matTranKyHop.printPreview.printPopupBlocked'));
  }, []);

  const handleDownload = useCallback(
    async (format: DocumentListDownloadFormat) => {
      if (!docModel) return;
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
          await downloadVanBanDocx(docModel, fileBase);
        } else {
          downloadVanBanXlsx(docModel, fileBase);
        }
      } catch {
        toast.error(txt('common.error'));
      } finally {
        pdfBusy.current = false;
      }
    },
    [docModel, fileBase],
  );

  if (!canView || isLoading || loadingUyVien || loadingDiemDanh || !kyHop || !docModel) {
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
      <VanBanHanhChinhDocument model={docModel} rootId={PRINT_ROOT_ID} />
    </DocumentListPreviewLayout>
  );
};

export default MttqKyHopInDiemDanhPage;
