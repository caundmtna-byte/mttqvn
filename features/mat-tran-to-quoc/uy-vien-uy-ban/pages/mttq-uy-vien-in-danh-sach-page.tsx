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
import VanBanHanhChinhDocument from '../components/van-ban-hanh-chinh-document';
import { useMttqUyVienUyBanListForNhiemKy } from '../hooks/use-mttq-uy-vien-uy-ban';
import { useMttqUyVienUyBanViewer } from '../hooks/use-mttq-uy-vien-uy-ban-viewer';
import { buildUyVienNhiemKyDocumentModel } from '../utils/build-uy-vien-nhiem-ky-document';
import { downloadVanBanDocx } from '../utils/download-van-ban-docx';
import { downloadVanBanPdf } from '../utils/download-van-ban-pdf';
import { downloadVanBanXlsx } from '../utils/download-van-ban-xlsx';
import { printVanBanDocument } from '../utils/print-van-ban';

const UY_VIEN_LIST_PATH = '/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien';
const PREVIEW_PREFIX = 'mttq-van-ban-preview';
const PRINT_ROOT_ID = 'uy-vien-nhiem-ky-print-root';

const MttqUyVienInDanhSachPage: React.FC = () => {
  const { nhiemKyId: idParam } = useParams<{ nhiemKyId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranCommitteeMembers');
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const pdfBusy = useRef(false);

  const nhiemKyId = String(idParam ?? '').trim();
  const viewer = useMttqUyVienUyBanViewer();
  const { data: rows = [], isLoading } = useMttqUyVienUyBanListForNhiemKy(nhiemKyId || null, {
    enabled: canView && Boolean(nhiemKyId),
  });

  const { data: company } = useQuery({
    queryKey: queryKeys.thongTinToChuc.singleton,
    queryFn: getThongTinToChuc,
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    if (!user || permissionsLoading || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranUyVienUyBan.noViewPermission'));
    navigate(UY_VIEN_LIST_PATH, { replace: true });
  }, [user, permissionsLoading, canView, navigate]);

  useEffect(() => {
    if (nhiemKyId) return;
    navigate(UY_VIEN_LIST_PATH, { replace: true });
  }, [nhiemKyId, navigate]);

  const docModel = useMemo(
    () => buildUyVienNhiemKyDocumentModel({ company, viewer, rows }),
    [company, viewer, rows],
  );

  const fileBase = useMemo(() => {
    const base = txt('matTranUyVienUyBan.printPreview.fileName');
    const slug = docModel.tenNhiemKy.trim().replace(/\s+/g, '-').slice(0, 30);
    return slug ? `${base}-${slug}` : base;
  }, [docModel.tenNhiemKy]);

  const handleBack = useCallback(() => {
    navigate(UY_VIEN_LIST_PATH);
  }, [navigate]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById(PRINT_ROOT_ID);
    if (!el) {
      toast.error(txt('common.error'));
      return;
    }
    const ok = printVanBanDocument(el, txt('matTranUyVienUyBan.printPreview.pageTitle'));
    if (!ok) toast.error(txt('matTranUyVienUyBan.printPreview.printPopupBlocked'));
  }, []);

  const handleDownload = useCallback(
    async (format: DocumentListDownloadFormat) => {
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

  if (!canView || isLoading) {
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

export default MttqUyVienInDanhSachPage;
