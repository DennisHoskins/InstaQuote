import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Box, CircularProgress, TextField } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import MetalsTable from '../../components/admin/MetalsTable';
import PaginationControls from '../../components/PaginationControls';
import ErrorAlert from '../../components/ErrorAlert';

export default function AdminMetals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-metals', page, startDate, endDate],
    queryFn: () => api.getMetals(page, limit, startDate || undefined, endDate || undefined),
    enabled: isAuthenticated,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (field === 'start_date') {
      if (value) params.start_date = value;
      if (endDate) params.end_date = endDate;
    } else {
      if (startDate) params.start_date = startDate;
      if (value) params.end_date = value;
    }
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
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
    return <ErrorAlert message="Failed to load metal prices" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title="Metal Prices"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' }
        ]}
        showNavBar={false}
      />

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
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

      <MetalsTable prices={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}