import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Box,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import SyncLogTable from '../../components/admin/SyncLogTable';
import PaginationControls from '../../components/PaginationControls';

export default function SyncLogAccess() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') as 'success' | 'failed' | undefined;
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sync-log', 'access', page, status, startDate, endDate],
    queryFn: () =>
      api.getSyncLog(
        page,
        limit,
        'access',
        undefined,
        status,
        startDate || undefined,
        endDate || undefined
      ),
      enabled: isAuthenticated,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params: Record<string, string> = { page: '1' };

    if (updates.status !== undefined) {
      if (updates.status) params.status = updates.status;
    } else if (status) {
      params.status = status;
    }

    if (updates.start_date !== undefined) {
      if (updates.start_date) params.start_date = updates.start_date;
    } else if (startDate) {
      params.start_date = startDate;
    }

    if (updates.end_date !== undefined) {
      if (updates.end_date) params.end_date = updates.end_date;
    } else if (endDate) {
      params.end_date = endDate;
    }

    setSearchParams(params);
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value });
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    updateParams({ [field]: value || undefined });
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    setSearchParams(params);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load sync log</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title="Access Data Sync Log"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' }
        ]}
        showNavBar={false}
      />

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status || ''}
            label="Status"
            onChange={(e) => handleStatusChange(e.target.value)}
            sx={{ height: '56px' }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => handleDateChange('start_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ height: '56px' }}
        />

        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => handleDateChange('end_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ height: '56px' }}
        />
      </Box>

      <SyncLogTable logs={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}