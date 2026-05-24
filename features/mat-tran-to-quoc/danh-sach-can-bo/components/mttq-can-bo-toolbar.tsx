import React, { useMemo } from 'react';
import {
  Plus,
  Download,
  Upload,
  Tag,
  Users,
  Landmark,
  Building2,
  Briefcase,
  MapPinned,
  UserCircle,
  GraduationCap,
  BookOpen,
  BadgeCheck,
  Binary,
} from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqCanBoStore } from '../store/useMttqCanBoStore';
import { countMttqCanBoColumnSearchActive } from '../utils/column-search-count';
import { normalizeMttqCanBoFilters } from '../utils/mttq-can-bo-filters-normalize';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

export interface MttqCanBoToolbarChipOptions {
  trangThai: ChipOption[];
  gioiTinh: ChipOption[];
  toChuc: ChipOption[];
  phongBan: ChipOption[];
  chucVu: ChipOption[];
  capQuanLy: ChipOption[];
  donVi: ChipOption[];
  danToc: ChipOption[];
  trinhDo: ChipOption[];
  lyLuan: ChipOption[];
  dangVien: ChipOption[];
}

interface Props {
  onPageBack: () => void;
  chipOptions: MttqCanBoToolbarChipOptions;
  onAdd: () => void;
  onExport: () => void;
  onImport?: () => void;
  onDeleteMany: (ids: string[]) => void;
}

/** Chip cố định chiều rộng + `shrink-0` — cùng pattern báo cáo cán bộ (cuộn ngang trên wrapper). */
const chip = (w: string) => `${w} shrink-0`;

const MttqCanBoToolbar: React.FC<Props> = ({
  onPageBack,
  chipOptions,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('matTranOfficerList');

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
  } = useMttqCanBoStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const F = normalizeMttqCanBoFilters(filters);
    const chipN =
      (F.trang_thai_id.length > 0 ? 1 : 0) +
      (F.gioi_tinh.length > 0 ? 1 : 0) +
      (F.to_chuc_id.length > 0 ? 1 : 0) +
      (F.phong_ban_id.length > 0 ? 1 : 0) +
      (F.chuc_vu_id.length > 0 ? 1 : 0) +
      (F.chuc_vu_cap_quan_ly.length > 0 ? 1 : 0) +
      (F.don_vi_id.length > 0 ? 1 : 0) +
      (F.dan_toc_id.length > 0 ? 1 : 0) +
      (F.trinh_do_id.length > 0 ? 1 : 0) +
      (F.ly_luan_chinh_tri_id.length > 0 ? 1 : 0) +
      (F.dang_vien.length > 0 ? 1 : 0);
    return (
      (searchTerm ? 1 : 0) + countMttqCanBoColumnSearchActive(F) + chipN
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    const st = useMttqCanBoStore.getState();
    st.setFilter('columnSearch', {});
    st.setFilter('trang_thai_id', []);
    st.setFilter('gioi_tinh', []);
    st.setFilter('to_chuc_id', []);
    st.setFilter('phong_ban_id', []);
    st.setFilter('chuc_vu_id', []);
    st.setFilter('chuc_vu_cap_quan_ly', []);
    st.setFilter('don_vi_id', []);
    st.setFilter('dan_toc_id', []);
    st.setFilter('trinh_do_id', []);
    st.setFilter('ly_luan_chinh_tri_id', []);
    st.setFilter('dang_vien', []);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={chipOptions.trangThai}
          value={filters.trang_thai_id}
          onChange={(val) => setFilter('trang_thai_id', val)}
          placeholder={txt('matTranCanBo.store.trangThaiCol')}
          icon={Tag}
          className={chip('w-[10.5rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.gioiTinh}
          value={filters.gioi_tinh}
          onChange={(val) => setFilter('gioi_tinh', val)}
          placeholder={txt('matTranCanBo.store.gioiTinhCol')}
          icon={Users}
          className={chip('w-[9rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.toChuc}
          value={filters.to_chuc_id}
          onChange={(val) => setFilter('to_chuc_id', val)}
          placeholder={txt('matTranCanBo.store.toChucCol')}
          icon={Landmark}
          className={chip('w-[10rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.phongBan}
          value={filters.phong_ban_id}
          onChange={(val) => setFilter('phong_ban_id', val)}
          placeholder={txt('matTranCanBo.store.phongBanCol')}
          icon={Building2}
          className={chip('w-[10.5rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.chucVu}
          value={filters.chuc_vu_id}
          onChange={(val) => setFilter('chuc_vu_id', val)}
          placeholder={txt('matTranCanBo.store.chucVuCol')}
          icon={Briefcase}
          className={chip('w-[10.5rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.capQuanLy}
          value={filters.chuc_vu_cap_quan_ly}
          onChange={(val) => setFilter('chuc_vu_cap_quan_ly', val)}
          placeholder={txt('matTranCanBo.store.capQuanLyCol')}
          icon={Binary}
          className={chip('w-[10.5rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.donVi}
          value={filters.don_vi_id}
          onChange={(val) => setFilter('don_vi_id', val)}
          placeholder={txt('matTranCanBo.store.donViCol')}
          icon={MapPinned}
          className={chip('w-[10.5rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.danToc}
          value={filters.dan_toc_id}
          onChange={(val) => setFilter('dan_toc_id', val)}
          placeholder={txt('matTranCanBo.form.danToc')}
          icon={UserCircle}
          className={chip('w-[9.5rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.trinhDo}
          value={filters.trinh_do_id}
          onChange={(val) => setFilter('trinh_do_id', val)}
          placeholder={txt('matTranCanBo.form.trinhDo')}
          icon={GraduationCap}
          className={chip('w-[9.5rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.lyLuan}
          value={filters.ly_luan_chinh_tri_id}
          onChange={(val) => setFilter('ly_luan_chinh_tri_id', val)}
          placeholder={txt('matTranCanBo.form.lyLuanChinhTri')}
          icon={BookOpen}
          className={chip('w-[11rem]')}
        />
        <FilterChipMultiSelect
          options={chipOptions.dangVien}
          value={filters.dang_vien}
          onChange={(val) => setFilter('dang_vien', val)}
          placeholder={txt('matTranCanBo.store.dangVienCol')}
          icon={BadgeCheck}
          className={chip('w-[9rem]')}
        />
      </div>
    ),
    [chipOptions, filters, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai_id',
        label: txt('matTranCanBo.store.trangThaiCol'),
        icon: Tag,
        options: chipOptions.trangThai,
        value: filters.trang_thai_id,
        onChange: (val: string[]) => setFilter('trang_thai_id', val),
      },
      {
        key: 'gioi_tinh',
        label: txt('matTranCanBo.store.gioiTinhCol'),
        icon: Users,
        options: chipOptions.gioiTinh,
        value: filters.gioi_tinh,
        onChange: (val: string[]) => setFilter('gioi_tinh', val),
      },
      {
        key: 'to_chuc_id',
        label: txt('matTranCanBo.store.toChucCol'),
        icon: Landmark,
        options: chipOptions.toChuc,
        value: filters.to_chuc_id,
        onChange: (val: string[]) => setFilter('to_chuc_id', val),
      },
      {
        key: 'phong_ban_id',
        label: txt('matTranCanBo.store.phongBanCol'),
        icon: Building2,
        options: chipOptions.phongBan,
        value: filters.phong_ban_id,
        onChange: (val: string[]) => setFilter('phong_ban_id', val),
      },
      {
        key: 'chuc_vu_id',
        label: txt('matTranCanBo.store.chucVuCol'),
        icon: Briefcase,
        options: chipOptions.chucVu,
        value: filters.chuc_vu_id,
        onChange: (val: string[]) => setFilter('chuc_vu_id', val),
      },
      {
        key: 'chuc_vu_cap_quan_ly',
        label: txt('matTranCanBo.store.capQuanLyCol'),
        icon: Binary,
        options: chipOptions.capQuanLy,
        value: filters.chuc_vu_cap_quan_ly,
        onChange: (val: string[]) => setFilter('chuc_vu_cap_quan_ly', val),
      },
      {
        key: 'don_vi_id',
        label: txt('matTranCanBo.store.donViCol'),
        icon: MapPinned,
        options: chipOptions.donVi,
        value: filters.don_vi_id,
        onChange: (val: string[]) => setFilter('don_vi_id', val),
      },
      {
        key: 'dan_toc_id',
        label: txt('matTranCanBo.form.danToc'),
        icon: UserCircle,
        options: chipOptions.danToc,
        value: filters.dan_toc_id,
        onChange: (val: string[]) => setFilter('dan_toc_id', val),
      },
      {
        key: 'trinh_do_id',
        label: txt('matTranCanBo.form.trinhDo'),
        icon: GraduationCap,
        options: chipOptions.trinhDo,
        value: filters.trinh_do_id,
        onChange: (val: string[]) => setFilter('trinh_do_id', val),
      },
      {
        key: 'ly_luan_chinh_tri_id',
        label: txt('matTranCanBo.form.lyLuanChinhTri'),
        icon: BookOpen,
        options: chipOptions.lyLuan,
        value: filters.ly_luan_chinh_tri_id,
        onChange: (val: string[]) => setFilter('ly_luan_chinh_tri_id', val),
      },
      {
        key: 'dang_vien',
        label: txt('matTranCanBo.store.dangVienCol'),
        icon: BadgeCheck,
        options: chipOptions.dangVien,
        value: filters.dang_vien,
        onChange: (val: string[]) => setFilter('dang_vien', val),
      },
    ],
    [chipOptions, filters, setFilter],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () => [
      ...(canImport && onImport
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [canImport, onImport, canExport, onExport],
  );

  const renderActions = (
    <>
      {(canImport && onImport) || canExport ? (
        <div className="hidden sm:flex items-center gap-2">
          {canImport && onImport ? (
            <Tooltip content={txt('common.import')} placement="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={onImport}
                className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
              >
                <Upload className="w-4 h-4" />
              </Button>
            </Tooltip>
          ) : null}
          {canExport ? (
            <Tooltip content={txt('common.export')} placement="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
              >
                <Download className="w-4 h-4" />
              </Button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{txt('common.addNew')}</span>
        </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
      selectedCount={selectedCount}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranCanBo.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
    />
  );
};

export default MttqCanBoToolbar;
