import { useQuery } from '@tanstack/react-query';
import { getJobLevels } from '../services/cap-bac-service';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';

// Module lookup-only: không có trang CRUD; dùng trong form nhân viên / chức vụ.
export const useJobLevels = () => {
  return useQuery({
    queryKey: queryKeys.jobLevels.all,
    queryFn: getJobLevels,
    ...masterDataQueryOptions,
  });
};
