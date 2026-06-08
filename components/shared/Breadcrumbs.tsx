import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { TFunction } from '../../lib/text';

interface RouteConfig {
  label: string;
  parentPath?: string;
}

const getRouteConfig = (t: TFunction): Record<string, RouteConfig> => ({
  '/': { label: t('breadcrumb.home') },
  '/thong-tin-ban-quyen': { label: t('breadcrumb.licenseInfo'), parentPath: '/' },
  '/mat-tran-to-quoc': { label: t('breadcrumb.matTranToQuoc'), parentPath: '/' },
  '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan': { label: t('breadcrumb.matTranTrainingList'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong': { label: t('breadcrumb.matTranRewardList'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky': { label: t('breadcrumb.matTranTerm'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop': { label: t('breadcrumb.matTranSession'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien': { label: t('breadcrumb.matTranCommitteeMembers'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien': { label: t('breadcrumb.matTranCommitteeMemberStats'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro': { label: t('breadcrumb.matTranReliefCampaign'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/kho-cuu-tro/hang-hoa': { label: t('breadcrumb.matTranReliefGoods'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho': { label: t('breadcrumb.matTranReliefStockTransactions'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/kho-cuu-tro/ton-kho': { label: t('breadcrumb.matTranReliefInventory'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho': { label: t('breadcrumb.matTranReliefWarehouseList'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro': { label: t('breadcrumb.matTranReliefSupportUnits'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/kho-cuu-tro/bao-cao-ho-tro': { label: t('breadcrumb.matTranReliefSupportReport'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo': { label: t('breadcrumb.matTranOfficerList'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo': { label: t('breadcrumb.matTranOfficerStats'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat': { label: t('breadcrumb.matTranSetupSettings'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong': { label: t('breadcrumb.matTranSalaryIncreaseList'), parentPath: '/mat-tran-to-quoc' },
  '/mat-tran-to-quoc/quan-ly-luong/thiet-lap-luong': { label: t('breadcrumb.matTranSalarySetup'), parentPath: '/mat-tran-to-quoc' },
  '/quan-ly-viet-bai': { label: t('breadcrumb.quanLyVietBai'), parentPath: '/' },
  '/quan-ly-viet-bai/bai-viet': { label: t('breadcrumb.articleArticles'), parentPath: '/quan-ly-viet-bai' },
  '/quan-ly-viet-bai/nhuan-but-viet-bai': { label: t('breadcrumb.articleCommission'), parentPath: '/quan-ly-viet-bai' },
  '/quan-ly-viet-bai/bc-thong-ke-bai-viet': { label: t('breadcrumb.articleStats'), parentPath: '/quan-ly-viet-bai' },
  '/quan-ly-viet-bai/thiet-lap-bai-viet': { label: t('breadcrumb.articleSettings'), parentPath: '/quan-ly-viet-bai' },
  '/quan-ly-giao-viec': { label: t('breadcrumb.quanLyGiaoViec'), parentPath: '/' },
  '/quan-ly-giao-viec/chuong-trinh-nam': { label: t('breadcrumb.taskChuongTrinhNam'), parentPath: '/quan-ly-giao-viec' },
  '/quan-ly-giao-viec/cong-viec': { label: t('breadcrumb.taskCongViec'), parentPath: '/quan-ly-giao-viec' },
  '/quan-ly-giao-viec/bao-cao-cong-viec': { label: t('breadcrumb.taskBaoCaoCongViec'), parentPath: '/quan-ly-giao-viec' },
  '/phan-bien-xa-hoi': { label: t('breadcrumb.phanBienXaHoi'), parentPath: '/' },
  '/phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi': { label: t('page.phanBienXaHoiDashboard.thucHien'), parentPath: '/phan-bien-xa-hoi' },
  '/phan-bien-xa-hoi/thiet-lap-danh-muc': { label: t('page.phanBienXaHoiDashboard.thietLapDanhMuc'), parentPath: '/phan-bien-xa-hoi' },
  '/phan-bien-xa-hoi/thong-ke-phan-bien-xa-hoi': { label: t('page.phanBienXaHoiDashboard.thongKe'), parentPath: '/phan-bien-xa-hoi' },
  '/dan-toc-ton-giao': { label: t('breadcrumb.danTocTonGiao'), parentPath: '/' },
  '/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc': { label: t('page.danTocTonGiaoDashboard.thamHoiToChuc'), parentPath: '/dan-toc-ton-giao' },
  '/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan': { label: t('page.danTocTonGiaoDashboard.thamHoiCaNhan'), parentPath: '/dan-toc-ton-giao' },
  '/dan-toc-ton-giao/tham-hoi/thong-ke-tham-hoi': { label: t('page.danTocTonGiaoDashboard.thongKeThamHoi'), parentPath: '/dan-toc-ton-giao' },
  '/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong': { label: t('page.danTocTonGiaoDashboard.thongTinToChucQuanTrong'), parentPath: '/dan-toc-ton-giao' },
  '/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu': { label: t('page.danTocTonGiaoDashboard.thongTinCaNhanTieuBieu'), parentPath: '/dan-toc-ton-giao' },
  '/trang-thong-tin-khac': { label: t('breadcrumb.trangThongTinKhac'), parentPath: '/' },
  '/he-thong': { label: t('breadcrumb.systemAdmin'), parentPath: '/' },
  '/he-thong/nhan-vien': { label: t('breadcrumb.employee'), parentPath: '/he-thong' },
  '/he-thong/phong-ban': { label: t('breadcrumb.department'), parentPath: '/he-thong' },
  '/he-thong/chuc-vu': { label: t('breadcrumb.position'), parentPath: '/he-thong' },
  '/he-thong/thong-tin-to-chuc': { label: t('breadcrumb.companyInfo'), parentPath: '/he-thong' },
  '/he-thong/phan-quyen': { label: t('breadcrumb.permission'), parentPath: '/he-thong' },
  '/he-thong/danh-sach-tinh-thanh': { label: t('breadcrumb.provinceList'), parentPath: '/he-thong' },
  '/ho-so': { label: t('breadcrumb.profile'), parentPath: '/' },
  '/thong-bao': { label: t('notification.title'), parentPath: '/' },
});

/** Cấp cha theo breadcrumb/router (không dùng lịch sử trình duyệt). Dùng cho nút Back / bottom nav. */
export function getParentPath(pathname: string, t: TFunction): string | undefined {
  if (pathname === '/') return undefined;
  if (pathname.startsWith('/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky/diem-danh/')) {
    return '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky';
  }
  if (pathname.startsWith('/ho-so-nhan-vien/')) {
    return '/he-thong/nhan-vien';
  }
  const config = getRouteConfig(t);
  const exact = config[pathname]?.parentPath;
  if (exact !== undefined) return exact;
  return undefined;
}

interface BreadcrumbItem {
  label: string;
  to: string;
  isLast: boolean;
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const ROUTE_CONFIG = useMemo(() => getRouteConfig(txt), []);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const currentPath = location.pathname;
    const items: BreadcrumbItem[] = [];

    if (currentPath.startsWith('/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky/diem-danh/')) {
      return [
        {
          label: ROUTE_CONFIG['/mat-tran-to-quoc'].label,
          to: '/mat-tran-to-quoc',
          isLast: false,
        },
        {
          label: ROUTE_CONFIG['/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky'].label,
          to: '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky',
          isLast: false,
        },
        {
          label: txt('breadcrumb.matTranNhiemKyDiemDanhMatrix'),
          to: currentPath,
          isLast: true,
        },
      ];
    }

    const currentConfig = ROUTE_CONFIG[currentPath];

    if (currentConfig) {
      items.unshift({
        label: currentConfig.label,
        to: currentPath,
        isLast: true,
      });

      if (currentConfig.parentPath) {
        const parentConfig = ROUTE_CONFIG[currentConfig.parentPath];
        if (parentConfig) {
          items.unshift({
            label: parentConfig.label,
            to: currentConfig.parentPath,
            isLast: false,
          });
        }
      }
    } else {
      const pathnames = currentPath.split('/').filter((x) => x);
      pathnames.forEach((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label =
          ROUTE_CONFIG[to]?.label || value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
        items.push({
          label,
          to,
          isLast: index === pathnames.length - 1,
        });
      });
      if (items.length > 0) {
        const firstPath = items[0].to;
        const firstConfig = ROUTE_CONFIG[firstPath];
        if (firstConfig?.parentPath === '/' && ROUTE_CONFIG['/']) {
          items.unshift({
            label: ROUTE_CONFIG['/'].label,
            to: '/',
            isLast: false,
          });
        }
      }
    }

    return items;
  }, [location.pathname, ROUTE_CONFIG, txt]);

  if (location.pathname === '/') {
    return (
      <nav aria-label={txt('breadcrumb.label')}>
        <ol className="flex items-center gap-1 flex-nowrap overflow-hidden">
          <li className="flex items-center gap-1.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-md text-primary" aria-hidden>
              <Home size={14} />
            </span>
            <span
              className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center whitespace-nowrap shadow-sm shadow-primary/20"
              aria-current="page"
            >
              {txt('breadcrumb.home')}
            </span>
          </li>
        </ol>
      </nav>
    );
  }

  const crumbsToShow = breadcrumbs[0]?.to === '/' ? breadcrumbs.slice(1) : breadcrumbs;

  return (
    <nav aria-label={txt('breadcrumb.label')}>
      <ol className="flex items-center gap-1 flex-nowrap overflow-hidden">
        <li className={`flex items-center gap-1.5 ${breadcrumbs.length > 1 ? 'hidden md:flex' : 'flex'}`}>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all px-2 py-0.5"
            title={txt('breadcrumb.goHome')}
          >
            <Home size={14} />
            <span className="text-xs font-normal whitespace-nowrap">{txt('breadcrumb.home')}</span>
          </Link>
        </li>

        {crumbsToShow.map((crumb, index) => {
          const isHiddenOnMobile = crumbsToShow.length > 2 && index < crumbsToShow.length - 2;
          let separatorClass = 'text-muted-foreground shrink-0';
          if (index === 0 && crumbsToShow.length >= 1) {
            separatorClass += ' hidden md:block';
          }

          return (
            <li
              key={crumb.to}
              className={`flex items-center gap-1 ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}
            >
              <ChevronRight size={12} className={separatorClass} />

              {crumb.isLast ? (
                <span
                  className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center whitespace-nowrap shadow-sm shadow-primary/20"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="px-2 py-0.5 rounded-md text-muted-foreground hover:text-primary text-xs font-normal transition-all whitespace-nowrap"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default React.memo(Breadcrumbs);
