import { useQuery } from '@tanstack/react-query';
import { getBranches } from '../services/chi-nhanh-service';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';

// Module lookup-only: không có trang CRUD; dùng trong form nhân viên.
export const useBranches = () => {
  return useQuery({
    queryKey: queryKeys.branches.all,
    queryFn: getBranches,
    ...masterDataQueryOptions,
  });
};
